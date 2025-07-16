const waitForElement = require("./utils/checkElement");
const fs = require('fs');
const puppeteer = require('puppeteer');
const path = require('path');
const https = require('https');
const axios = require('axios');
const { upload, createComic, createChapter, createComicType, checkSlug } = require("./api");
const createSlug = require("./utils/slug");
const amqp = require('amqplib');
const { count } = require("console");
const { v4: uuidv4 } = require('uuid');


const randomDelay = async (min = 500, max = 1500) => {
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise((resolve) => setTimeout(resolve, delay));
};
const userAgent = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";
const proxyUrl = 'hndc15.proxyxoay.net:38397';  // Replace with your actual proxy URL and port
const proxyUsername = 'louis1258';
const proxyPassword = 'Htn@1258';
const apiKey = 'e2d48a85-ba4a-4bf1-9170-7a2f02cde6ab';
const userAgentList = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
];
async function fetchWithRetry(src, retries = 3, delay = 20000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch(src, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
                    'Referer': 'https://truyenqqto.com/',
                },
                timeout: 10000 // Optional timeout for fetch in milliseconds
            });

            console.log(`Attempt ${attempt}: Fetch Response Status:`, response.status);

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            return await response.arrayBuffer(); // Use response.text() or response.json() if needed
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
async function gotoWithRetry(page, url, maxRetries = 3) {
    let retries = 0;
    while (retries < maxRetries) {
        try {
            await randomDelay(100, 500);
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 200000 });
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
const scraperObject = {
    url: 'https://truyenqqto.com',

    async scraper(browser) {
        const connection = await amqp.connect("amqp://your_username:your_password@77.237.236.3:5672");
        const channel = await connection.createChannel();
        const queue = 'crawlQueue';
        await channel.assertQueue(queue, { durable: true });

        let urls = [];
        const urlRedirect = 'https://truyenqqto.com/truyen-moi-cap-nhat/trang-2.html';

        let dataObj = {};
        browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium-browser', args: ['--disable-gpu', '--disable-setuid-sandbox', '--no-sandbox', '--no-zygote', `--proxy-server=${proxyUrl}`] })
        let page
        try {
            let pageCounter = 0;

            for (let i = 1; i <= 400; i++) { // Thay `5` bằng `maxPageNumber` khi có sẵn số trang lớn nhất
                // Đổi proxy sau mỗi 1 phút hoặc 5 trang

                page = await browser.newPage();
                await page.setExtraHTTPHeaders({
                    'Authorization': `Bearer ${apiKey}`,
                    'Referer': 'https://truyenqqto.com/',
                    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'
                });
                const randomIndex = Math.floor(Math.random() * userAgentList.length);
                userAgentList[randomIndex];
                await page.setUserAgent(userAgentList[randomIndex]);
                await page.authenticate({
                    username: proxyUsername,
                    password: proxyPassword
                });
                await page.setViewport({ width: 1280, height: 800 });

                pageCounter = 0;  // Đặt lại bộ đếm trang

                const pageUrl = `https://truyenqqto.com/truyen-moi-cap-nhat/trang-${i}.html`;
                console.log(`Navigating to ${pageUrl}...`);

                // Kiểm tra xem page có tồn tại trước khi gọi goto
                if (page) {
                    try {
                        await page.goto(pageUrl, { waitUntil: 'networkidle2' });
                        await randomDelay(500, 2000);
                        //#main_homepage > div.list_grid_out > ul > li > div.book_avatar > a
                        await page.waitForSelector('#main_homepage > div.list_grid_out > ul > li > div.book_avatar > a');
                        const newUrls = await page.$$eval('#main_homepage > div.list_grid_out > ul > li > div.book_avatar > a', links => {
                            return links.map(link => link.href);
                        });
                        for (let href of newUrls) {
                            try {
                                await gotoWithRetry(page, href, 3);
                                await randomDelay(100, 500);
                                dataObj['title'] = await page.$eval('.book_detail > .book_info > .book_other > h1', title => title.textContent);
                                const coverImageSrc = await page.$eval(
                                    '.book_detail > .book_info > .book_avatar > img',
                                    img => img ? img.src : null
                                );
                                console.log('Cover Image Source:', coverImageSrc); // Log the image source

                                if (!coverImageSrc) {
                                    console.error('Cover image not found');
                                    return null;
                                }

                                try {
                                    const arrayBuffer = await fetchWithRetry(coverImageSrc); // Get the image as ArrayBuffer
                                    if(!arrayBuffer){
                                        continue
                                    }
                                    const buffer = Buffer.from(arrayBuffer); // Convert ArrayBuffer to Buffer
                                    const base64String = buffer.toString('base64'); // Convert buffer to base64
                                    const ext = coverImageSrc.split('.').pop().split('?')[0]; // Extract the extension from the URL
                                    const fullBase64String = `data:image/${ext};base64,${base64String}`;
                                    const match = fullBase64String.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
                                    if (match) {
                                        const imgExt = match[1];  // Image format
                                        const data = match[2]; // Base64 data
                                        const finalBuffer = Buffer.from(data, 'base64'); // Convert base64 data to buffer
                                        const link = createSlug(href)
                                        const uniqueFileName = `${dataObj['title']}_${link}-${uuidv4()}.${imgExt}`;
                                        const filePath = path.join(__dirname, uniqueFileName);
                                        fs.writeFileSync(filePath, finalBuffer);
                                        const url = await upload(uniqueFileName); // Ensure you use the correct file path for upload
                                        dataObj['coverImage'] = url;
                                    } else {
                                        console.error('Base64 string format is incorrect after construction.');
                                    }
                                } catch (error) {
                                    console.error(`Error fetching or processing the image from ${coverImageSrc}:`, error);
                                    continue
                                }
                                dataObj['genres'] = await page.$$eval('.book_detail > .book_info > .book_other > .list01 .li03 > a', genres => {
                                    return genres.map(genre => genre.textContent.trim() ?? null);  // Extract and trim the text content of each genre
                                });

                                const dataComicType = {
                                    name: 'Truyện tranh',
                                    description: "Thể loại có nội dung trong sáng và cảm động, thường có các tình tiết gây cười, các xung đột nhẹ nhàng",
                                    status: "Active",
                                }
                                let typeComicArray =0
                                try {
                                     typeComicArray = await Promise.all(
                                        dataObj['genres'].map(async (type) => {
                                            dataComicType.name = type;
                                            const typeComic = await createComicType(dataComicType);
                                            return typeComic._id; // Trả về _id của ComicType
                                        })
                                    );
                                } catch (error) {
                                    console.log(error);
                                    continue
                                }
                                
                                
                                dataObj['genres'] = typeComicArray
                                const check = await waitForElement(page, '.book_detail > .story-detail-info.detail-content');
                                dataObj['description'] = await page.evaluate(() => {
                                    const checkInner = document.querySelector('body > div.content > div.div_middle > div.main_content > div.book_detail > div.story-detail-info.detail-content.readmore-js-section.readmore-js-collapsed > p');
                                    if (checkInner)
                                        return checkInner.textContent.trim();
                                    else {
                                        const checkOuter = document.querySelector('body > div.content > div.div_middle > div.main_content > div.book_detail > div.story-detail-info.detail-content > p')
                                        if (checkOuter) {
                                            return checkOuter.textContent.trim();
                                        }
                                        const checkElement = document.querySelector('body > div.content > div.div_middle > div.main_content > div.book_detail > div.story-detail-info.detail-content')
                                        if (checkElement) {
                                            return checkElement.textContent.trim() ?? null;
                                        }
                                        else {
                                            const checkContinue = document.querySelector(' body > div.content > div.div_middle > div.main_content > div.book_detail > div.story-detail-info.detail-content')
                                            return checkContinue ? checkContinue.textContent.trim() : null;
                                        }
                                    }
                                });
                                console.log(dataObj['description']);
                                // Scrape chapters
                                
                                dataObj.slug = createSlug(dataObj.title)
                                let resultComic = 0
                                const existingComic = await checkSlug(dataObj.slug);
                                if (existingComic) {
                                    console.log(`Comic with slug "${dataObj.slug}" already exists.`);
                                    continue
                                }
                                else{
                                     resultComic = await createComic(dataObj);
                                }
                                
                                dataObj['chapter'] = await page.$$eval(
                                    'body > div.content > div.div_middle > div.main_content > div.book_detail > div.list_chapter > div > .works-chapter-item',
                                    chapters => {
                                        return chapters.map(chapter => {
                                            const linkElement = chapter.querySelector('a');
                                            return {
                                                title: linkElement.textContent.trim(),
                                                link: linkElement.href
                                            };
                                        });
                                    }
                                );
                                for (const [index, chapter] of dataObj['chapter'].reverse().entries()) {
                                    console.log(chapter);
                                        const parts = chapter.title.split(" ");
                                        let chapterNumber = null;
                    
                                        for (const part of parts) {
                                            const number = parseFloat(part);
                                            if (!isNaN(number)) {
                                                chapterNumber = number;
                                                break; 
                                            }
                                        }
                                        if (chapterNumber === null) {
                                            console.error(`Invalid chapter number for chapter: ${chapter.title}`);
                                            continue; // Bỏ qua chapter nếu không có số chương hợp lệ
                                        }
                                    
                                        // Kiểm tra nếu chapter.link hợp lệ
                                        if (!chapter.link) {
                                            console.error(`Invalid chapter link for chapter: ${chapter.title}`);
                                            continue; // Bỏ qua chapter nếu không có link
                                        }
                                        const message = {
                                            comic: resultComic._id,  // ID của comic (bộ truyện)
                                            chapter: chapter.link,   // Liên kết đến chapter
                                            order: chapterNumber ?? 0    // Thứ tự chapter (chapterNumber)
                                        };
                                    
                                        // Gửi message vào RabbitMQ
                                        try {
                                            channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });
                                            console.log(`Sent message for chapter ${chapterNumber} to queue.`);
                                            console.log(`Page ${pageCounter}`);
                                        } catch (error) {
                                            console.error(`Failed to send message for chapter ${chapterNumber}:`, error);
                                        }
                                }
                            }
                            catch (e) {
                            }
                        }
                        urls = urls.concat(newUrls);
                        console.log(newUrls);
                        console.log(`Scraped ${newUrls.length} URLs on page ${i}`);

                        pageCounter++;  // Tăng bộ đếm trang
                    } catch (gotoError) {
                        console.error(`Error while navigating to ${pageUrl}:`, gotoError);
                    }
                } else {
                    console.error('Error: page is undefined.');
                }
            }
            console.log(`Scraped ${urls.length} URLs in total.`);
            console.log(`Page ${pageCounter}`);
        } catch (error) {
            console.error(`Error during scraping:`, error);
        } finally {
            await page?.close();
            await channel.close();
            await connection.close();
            await browser.close(); // Đóng trình duyệt sau khi hoàn thành
        }
    }
};

module.exports = scraperObject;
