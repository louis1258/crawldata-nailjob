
const test = require('node:test');
const assert = require('node:assert');
const { connect } = require('puppeteer-real-browser');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { upload, createComic, createChapter, createComicType, checkSlug } = require("./api");
const path = require('path');
const createSlug = require("./utils/slug");
const waitForElement = require("./utils/checkElement");
const axios = require('axios');
const amqp = require('amqplib');
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function gotoWithRetry(page, url, maxRetries = 3) {
    let retries = 0;
    while (retries < maxRetries) {
        try {
            // await delay(8000)
            const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 200000 });
            console.log(res.status() ,'tesasdfsd');
            return true; // Thành công, thoát vòng lặp
        } catch (error) {
            console.error(`Failed to load ${url} (Attempt ${retries + 1} of ${maxRetries}):`, error);
            retries += 1;
            if (retries < maxRetries) {
                console.log(`Retrying ${url}...`);
            } else {
                console.error(`All retry attempts failed for ${url}`);
                return false; // Tất cả retry đều thất bại
            }
        }
    }
}
async function fetchWithRetry(src, retries = 3, delay = 20000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {

            const response = await axios.get(src, { responseType: 'arraybuffer' });
            console.log(`Attempt ${attempt}: Fetch Response Status:`, response.status);

            if (response.status != 200) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            return response.data; // Use response.text() or response.json() if needed
        } catch (error) {
            console.error(`Attempt ${attempt} failed for ${src}:`, error);

            if (attempt < retries) {
                console.log(`Retrying in ${delay} ms...`);
                await new Promise(res => setTimeout(res, delay));
            } else {
                console.error(`Failed to fetch after ${retries} attempts`);
                throw error; // Re-throw the error after the final failed attempt
            }
        }
    }
}

connect({

    headless: 'false',

    args: [],

    customConfig: {},

    skipTarget: [],

    fingerprint: true,

    turnstile: true,

    connectOption: {},

    tf: true,

    // proxy:{
    //     host:'14.225.52.202',
    //     port:'12345',
    //     username:'sisf9u7p',
    //     password:'pQiD4p0l'
    // }

})
    .then(async response => {
        // const connection = await amqp.connect("amqp://your_username:your_password@77.237.236.3:5672");
        // const channel = await connection.createChannel();
        // const queue = 'crawlQueue';
        // await channel.assertQueue(queue, { durable: true });
        let scrapedData = [];
        const queue = 'crawlQueue';
        const connection = await amqp.connect("amqp://your_username:your_password@77.237.236.3:5672");
        const channel = await connection.createChannel();
        await channel.prefetch(1);
        // Ensure the queue exists
        await channel.assertQueue(queue, { durable: true });
        let task
       
        console.log(task);
            const { browser, page } = response
            try {
                const cookies = JSON.parse(fs.readFileSync('cmangal.com_cookies.json', 'utf8'));
                await page.setCookie(...cookies)
                await page.mouse.move(100, 200);
                await page.setExtraHTTPHeaders({
                    // 'Authorization': `Bearer ${apiKey}`,
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Referer': 'https://cmangal.com/',
                });
                await page.setViewport({
                    width: 1280,
                    height: 1080
                })
                await page.setUserAgent('Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36')
                const pageUrl = `https://cmangal.com/album/bat-tu-va-bat-hanh-ban-mau-full-hd/chapter-121-1101922`;
                if (page) {
                    channel.consume(queue, async (message) => {
                        if (message !== null) {
                             task = JSON.parse(message.content.toString()); // Convert string to JSON
                             console.log(`📥 Received task: ${task.chapter}`);
                              // Access the correct href property
                             const currentPageData = await pagePromise(page , task);
                             scrapedData.push(currentPageData);
                            channel.ack(message);
                            }
                    }, {
                        noAck: false // Ensure messages are acknowledged after processing
                    });
                 
                 
                }
            } catch (error) {
                console.error(`Error during scraping:`, error);
            }
            
        
    })
    .catch(error => {
        console.log(error.message)
    })
    async function pagePromise(page , payload) {

        try {
            const chapterPayload = {
                id: payload.comic,
                order: payload.order,
            }
            const existingChapter = await checkChapter(chapterPayload);
            console.log(existingChapter);
            if (existingChapter) {
                console.log(`Chapter with order "${payload.order}" and link "${payload.chapter}" already exists.`);
                await delay(2000)
                return existingChapter;
            }
            await delay(8000);
            const redirect = await gotoWithRetry(page, payload.chapter, 3);
    
            delay(4000)
            // Use $eval to extract image sources for the chapter
    
            await waitForElement(page, 'div.main_content>div#chapter_content_div>div.chapter_content_module>div.chapter_content>img');
            const imagesSrc = await page.$$eval('div.main_content>div#chapter_content_div>div.chapter_content_module>div.chapter_content>img', images => {
                return images.map(img => img.src); // Extract 'src' attributes
            });
            // Process each image source
            console.log(imagesSrc);
            // if (imagesSrc.length === 0) {
            //     throw new Error("Không tìm thấy ảnh trong trang");
            // }
            let uploadedImageResults
            try {
                uploadedImageResults = await Promise.all(
                    imagesSrc.map(async (src, imageIndex) => {
                        try {
                            if (!src) {
                                throw new Error(`Không tìm thấy nguồn ảnh tại index: ${imageIndex}`);
                            }
                            // const response = await axios.get(src, { responseType: 'arraybuffer' }); // Sử dụng arraybuffer để lấy buffer ảnh
                            const fileBuffer = await fetchWithRetry(src)
                            if (!fileBuffer) {
                                throw new Error("Không tìm thấy ảnh tại nguồn");
                            }
                            const uniqueFileName = `${uuidv4()}.jpg`;
            
                            try {
                                const url = await upload(uniqueFileName, fileBuffer); // Đảm bảo `upload` có thể xử lý buffer
                                console.log(url);
                                return url;
                            } catch (error) {
                                throw new Error("Lỗi khi tải lên");
                            }
            
                        } catch (error) {
                            console.error(`Error processing image at index ${imageIndex}:`, error.message);
                            throw new Error("Error upload chapter")
                        }
                    })
                );
            } catch (error) {
                console.error("Image upload failed, stopping process:", error.message);
                throw new Error("failed to upload");
            }
            if (uploadedImageResults.length === 0) {
                throw new Error("Không tải lên được bất kỳ ảnh nào cho chương này.");
            }
            const chapterData = {
                comic: `${payload.comic}`,
                order: `${payload.order}`,
                title: `Chapter ${payload.order}`,
                images: uploadedImageResults // Filter out any null results
            };
            
            // Save chapter data to your database or perform any action with it
            const chapterCreate = await createChapter(chapterData);
            return chapterCreate;
        } catch (err) {
            console.error(`Error scraping link: `, err);
            await page.close();
            throw new Error("Failed to scrape");
        }
        finally {
            console.log("Success")
            // await page.close();
        }
    
    }