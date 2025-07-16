
const test = require('node:test');
const assert = require('node:assert');
const { connect } = require('puppeteer-real-browser');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { upload, createComic, createChapter, createComicType, checkSlug, allComics } = require("./api");
const path = require('path');
const createSlug = require("./utils/slug");
const waitForElement = require("./utils/checkElement");
const axios = require('axios');
const amqp = require('amqplib');
const crypto = require('crypto');
const { Readable } = require('node:stream');
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function gotoWithRetry(page, url, maxRetries = 3) {
    let retries = 0;
    while (retries < maxRetries) {
        try {
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
async function fetchWithRetry(src, retries = 3) {
    let attempt = 0;
    while (attempt < retries) {
        try {
            const response = await fetch(src,{
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36',
                    'Referer': 'https://goctruyentranhvui9.com/',
                    'Accept': 'image/webp,*/*',
                    'Cache-Control': 'no-cache',
                    'Accept-Encoding': 'gzip, deflate, br'
                }
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch: ${response.statusText}`);
            }
            return await response.arrayBuffer(); // Trả về ArrayBuffer
        } catch (error) {
            console.error(`Fetch attempt ${attempt + 1} failed: ${error.message}`);
            attempt++;
        }
    }
    throw new Error(`Failed to fetch ${src} after ${retries} attempts`);
}

async function uploadWithRetry(uploadFunction, uniqueFileName, readableStream, options, retries = 3, delay = 2000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            // Gọi hàm upload
            const url = await uploadFunction(uniqueFileName, readableStream, options);
            console.log(`Upload successful: ${url}`);
            
            // Nếu upload thành công, trả về URL
            return url;
        } catch (error) {
            console.error(`Attempt ${attempt} failed for ${uniqueFileName}:`, error.message);

            // Nếu hết số lần thử thì ném lỗi
            if (attempt === retries) {
                throw new Error(`Failed to upload after ${retries} attempts: ${uniqueFileName}`);
            }

            // Chờ trước khi thử lại
            console.log(`Retrying upload in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
}


connect({

    headless: 'auto',


    customConfig: {},

    skipTarget: [],

    fingerprint: true,

    turnstile: true,

    connectOption: {},

    tf: true,

    args: ['--disable-web-security', '--disable-features=IsolateOrigins,site-per-process' ,  '--disable-webgl',
        '--disable-gpu'],
    // 14.225.42.98:37219:VN417980:eWTH4v0s
    proxy:{
        host:'14.225.42.98',
        port:'37219',
        username:'VN417980',
        password:'eWTH4v0s'
    }

})
    .then(async response => {
        const connection = await amqp.connect("amqp://your_username:your_password@77.237.236.3:5672");
        const channel = await connection.createChannel();
        const queue = 'crawlQueue';
        await channel.assertQueue(queue, { durable: true });
        const { browser, page } = response
        // const context = browser.defaultBrowserContext(); 
        try {
            while(true){
               
                await page.goto('https://accounts.google.com/')

                await delay(4000)
                await page.waitForSelector('input[type="email"]')
                await delay(4000)
                await page.click('input[type="email"]')
              
              
                //TODO : change to your email 
                await page.type('input[type="email"]', 'Kinlorento4@gmail.com')
              
                await page.waitForSelector('#identifierNext')

                await delay(4000)

                await page.click('#identifierNext')
              
                await delay(4000)
              
                await page.waitForSelector('input[type="password"]')
                await delay(4000)

                await page.click('input[type="password"]')
              

                //TODO : change to your password
                await page.type('input[type="password"]', 'bkdteam123')
              
                await delay(4000)
                await page.waitForSelector('#passwordNext')
                await page.click('#passwordNext')
                await delay(10000)
                const fileName = `screenshot_${Date.now()}.png`;  // Đặt tên file với timestamp để tránh trùng
                const filePath = path.join(__dirname, fileName);
                await page.screenshot({ path: filePath });
                const fileBuffer = fs.readFileSync(filePath);
                try {
                    const uploadResult = await upload(fileName, fileBuffer);
                    console.log('Upload result:', uploadResult);
                } catch (err) {
                    console.error('Upload failed:', err);
                }
                fs.unlinkSync(filePath);
                await delay(4000)
                await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36")
                await page.setRequestInterception(true);
                page.on('request', (request) => {
                const headers = request.headers();
                request.continue({ headers });
                });
                page.setExtraHTTPHeaders({
                  });
                    await page.mouse.move(100, 200);
                    await page.setExtraHTTPHeaders({
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Referer': 'https://goctruyentranhvui9.com/',
                    });
                    await page.setViewport({
                        width: 1280,
                        height: 1080
                    })
                   

                    browser.on('targetcreated', async (target) => {
                        if (target.type() === 'page') {
                            try {
                                const newPage = await target.page(); // Attempt to access the new page
                                console.log('🔴 Đóng tab mới:', newPage.url());
                    
                                // Add a small delay to ensure the page has fully loaded (optional)
                                await new Promise(resolve => setTimeout(resolve, 500));
                    
                                await newPage.close(); // Close the new tab
                            } catch (error) {
                                if (error.message.includes('Target closed')) {
                                    console.error('⚠️ Target was already closed:', target.url());
                                } else {
                                    console.error('⚠️ An unexpected error occurred:', error);
                                }
                            }
                        }
                    });
                    
                      // Random User-Agent
                    
                      
                    const pageUrl = `https://goctruyentranhvui9.com/trang-chu`;
                    await page.goto(pageUrl, { waitUntil: 'networkidle2' , timeout : 1000000});
                    await delay(10000);
                    
                    const selector = "body > header > div > button.btn-menu-login.btn-default-icon.v-icon-bg.mr-3.show-tag";
                    await page.waitForSelector(selector , {timeout : 1000000})
                    await page.click(selector)
                    await page.waitForSelector("body > main > div > div > div.row.container-1200.m-auto > div > div.comic-list > div.items-wrap.app-window.app-item-group.theme-dark > div > div > div.row.item-card > div > div > a")
                    await delay(4000)
                    page.click("#dialog-user > div > div.dialog-body.pa-0 > div > div.item-user.mb-2.menu-user-name");
                    await delay(4000)
                    page.click("#dialog-login > div > div.dialog-body.pa-0.text-align-center > div.sign-in-ga.mt-3 > button")
                    await delay(4000)
                    while(true){
                        const pageUrl = `https://goctruyentranhvui9.com/trang-chu`;
                        // const userAgents = [
                        //     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
                        //     "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
                        //     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",
                        //     "Mozilla/5.0 (X11; Ubuntu; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
                        //     "Mozilla/5.0 (Macintosh; Intel Mac OS X 12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
                        //     "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
                        //     "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_2_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
                        //     "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
                        //     "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
                        //     "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36",
                        //     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
                        //     "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                        //     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
                        //     "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36",
                        //     "Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36",
                        //     "Mozilla/5.0 (Macintosh; Intel Mac OS X 12_3_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36",
                        //     "Mozilla/5.0 (X11; Ubuntu; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36",
                        //     "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36",
                        //     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36",
                        //     "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Safari/537.36"
                        // ];
                        // const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
                        // await page.setUserAgent(randomUserAgent);
                        await page.goto(pageUrl, { waitUntil: 'networkidle2' });
                        await delay(20000)
                        if (page) {
                            const newUrls = await page.$$eval('body > main > div > div > div.row.container-1200.m-auto > div > div.comic-list > div.items-wrap.app-window.app-item-group.theme-dark > div > div > div.row.item-card > div > div > a', links => {
                                return links.map(link => link.href);
                            });
                            console.log(newUrls);
                            const firstTenUrls = newUrls.slice(0, 1);
                            await delay(2000)
                            for (let href of firstTenUrls) {
                                try {
                                    console.log(firstTenUrls);
                                    console.log(href);
                                    await delay(4000)
                                    let countChapter = 0;
                                    await gotoWithRetry(page, href , 3)
                                    await delay(20000);
                                    let dataObj = {}
                                    await page.waitForSelector('#content > div > div.w-100.zs-bg-1.ele-2.rounded.v-card.v-sheet.theme-dark > div.v-card-title.text-responsive.pb-0.font-weight-bold', { timeout: 100000 });
                                    const title = await page.$$eval('#content > div > div.w-100.zs-bg-1.ele-2.rounded.v-card.v-sheet.theme-dark > div.v-card-title.text-responsive.pb-0.font-weight-bold', title => {
                                        return title.map(text => text.textContent);
                                    });
        
                                    dataObj['title'] = title[0];
                                    dataObj.slug = createSlug(dataObj.title)
        
        
                                    await page.waitForSelector('#content > div > div.w-100.zs-bg-1.ele-2.rounded.v-card.v-sheet.theme-dark > div.v-card-text.pt-1.px-4.pb-4.text-secondary.font-weight-medium');
                                    const des = await page.$$eval('#content > div > div.w-100.zs-bg-1.ele-2.rounded.v-card.v-sheet.theme-dark > div.v-card-text.pt-1.px-4.pb-4.text-secondary.font-weight-medium', des => {
                                        return des.map(des => des.textContent);
                                    });
        
                                    dataObj['description'] = des;
                                    
                                    dataObj['genres'] = await page.$$eval('#content > div > div.w-100.zs-bg-1.ele-2.rounded.v-card.v-sheet.theme-dark > div.px-4.py-0.v-item-group.theme-dark.v-slide-group.v-chip-group.v-chip-group-column > div > div > a > div > span:nth-child(2)', genres => {
                                        return genres.map(genre => genre.textContent.trim() || null);  // Extract and trim the text content of each genre
                                    });
                                    console.log( dataObj['genres']);
                                    console.log(dataObj);
                                    await delay(1000)
                                    const dataComicType = {
                                        name: 'Truyện tranh',
                                        description: "Thể loại có nội dung trong sáng và cảm động, thường có các tình tiết gây cười, các xung đột nhẹ nhàng",
                                        status: "Active",
                                    }
                                    let typeComicArray = 0
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
                                        throw error('Error find genres')
                                    }
                                    dataObj['genres'] = typeComicArray
                                    console.log(dataObj);
                                    let resultComic = 0
                                    const existingComic = await checkSlug(dataObj.slug);
                                    if (existingComic) {
                                        console.log(`Comic with slug "${dataObj.slug}" already exists.`);
                                        resultComic = existingComic;
                                    }
                                    else {
                                        await page.waitForSelector('body > main > div > div.row.mb-5 > div.col-md-4.col-lg-3.col-xl-2.col-12.w-100.p-12.border-box > div.side-bar > div > div > div > img');
                                        let coverImageSrc = await page.$$eval('body > main > div > div.row.mb-5 > div.col-md-4.col-lg-3.col-xl-2.col-12.w-100.p-12.border-box > div.side-bar > div > div > div > img', links => {
                                            return links.map(link => `${link.src}`);
                                        });
                                        coverImageSrc = coverImageSrc[0]
                                        console.log(coverImageSrc);
                                        let url
                                        try {
                                            // const response = await axios.get(coverImageSrc, { responseType: 'arraybuffer' }); // Sử dụng arraybuffer để lấy buffer ảnh
                                            const fileBuffer = await fetchWithRetry(coverImageSrc)
        
                                            const uniqueFileName = `${dataObj.slug}-${uuidv4()}.jpg`;
                                            // const filePath = path.join(__dirname, uniqueFileName);
                                            // fs.writeFileSync(filePath, finalBuffer);
                                            url = await upload(uniqueFileName, fileBuffer); // Ensure you use the correct file path for upload
                                            dataObj['coverImage'] = url;
                                            // const response = await page.goto(coverImageSrc, {
                                            //     waitUntil: 'domcontentloaded',
                                            //     timeout: 200000, // 200 seconds
                                            // });
        
                                            // if (response.ok()) {
                                            //     // Get the image as a buffer
                                            //     const buffer = await response.buffer();
                                            //     const nodeBuffer = Buffer.from(buffer);
                                            //     const hash = crypto.createHash('sha1').update(nodeBuffer).digest('hex');
                                            //     // Optionally save the image to verify it's downloaded
                                            //     const uniqueFileName = `${dataObj.slug}-${uuidv4()}.jpg`;
                                            //     const readableStream = new Readable();
                                            //     readableStream.push(nodeBuffer);
                                            //     readableStream.push(null);
                                            //     // Upload the image using your upload function
                                            //     url = await upload(uniqueFileName, nodeBuffer , {contentType: 'image/jpeg', hash });
                                            //     dataObj['coverImage'] = url;
                                            //     console.log('Uploaded Image URL:', url);
                                            // } else {
                                            //     console.error(`Failed to fetch the image. Status: ${response.status()}`);
                                            // }
        
                                        } catch (error) {
                                            console.error(`Error fetching or processing the image from ${coverImageSrc}:`, error);
                                        }
                                        resultComic = await createComic(dataObj);
        
                                    }
        
                                    await gotoWithRetry(page, href , 3)
                                    await page.waitForSelector('#content > div > div.rounded.w-100.mt-2.mb-3 > div > div.list.row.pa-4 > div > a');
                                    await page.evaluate(async () => {
                                        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
                                    
                                        const element = document.querySelector(
                                            '#content > div > div.rounded.w-100.mt-2.mb-3 > div > div.load-all.row.px-4.pb-2 > button'
                                        );
                                        if (element) {
                                            element.click(); // Dùng click() thay vì page.click()
                                            await delay(2000); // Chờ 2 giây sau khi click
                                        } else {
                                            console.log('Load all chapters button not found');
                                        }
                                    });
                                    
                                    await delay(4000)
                                    await page.waitForSelector('#content > div > div.rounded.w-100.mt-2.mb-3 > div > div.list.row.pa-4 > div > a');
                                    dataObj['chapters'] = await page.$$eval('#content > div > div.rounded.w-100.mt-2.mb-3 > div > div.list.row.pa-4 > div > a', chapters => {
                                        if (!chapters || chapters.length === 0) {
                                            return [];
                                        }
                                       
                                        return chapters.map(chapter => {
                                            return {
                                                title: chapter.textContent.trim(),
                                                link: chapter.href
                                            };
                                        });
                                    });
                                    console.log(dataObj['chapters']);
        
                                    for (const [index, chapter] of dataObj['chapters'].reverse().entries()) {
                                        if (countChapter >= 1) {
                                            break;
                                        }
                                        page.setExtraHTTPHeaders({
                                          });
                                        // await page.goto("https://goctruyentranhvui9.com/truyen/nha-dau-tu-nhin-thay-tuong-lai/chuong-11")
                                        const parts = chapter.title.split(" ");
                                        const match = chapter.title.match(/#(\d+)/);
                                            if (match) {
                                                console.log(match[1]); // Kết quả: 120
                                            }
                                        let chapterNumber = match[1];
        
                                        // for (const part of parts) {
                                        //     const number = parseFloat(part);
                                        //     if (!isNaN(number)) {
                                        //         chapterNumber = number;
                                        //         break;
                                        //     }
                                        // }
                                        chapterNumber = parseFloat(chapterNumber)
                                        if (chapterNumber === null) {
                                            console.error(`Invalid chapter number for chapter: ${chapter.title}`);
                                            continue; // Bỏ qua chapter nếu không có số chương hợp lệ
                                        }
        
        
                                        if (!chapter.link) {
                                            console.error(`Invalid chapter link for chapter: ${chapter.title}`);
                                            continue;
                                        }
    
                                        const message = {
                                            comic: resultComic._id,
                                            chapter: chapter.link,
                                            order: chapterNumber || 0
                                        };
                                        console.log(message);
                                        await delay(1000)
                                        try {
                                            console.log(chapter.link);
                                            const chapterPayload = {
                                                id: resultComic._id,
                                                order: message.order,
                                            }
                                            const existingChapter = await checkChapter(chapterPayload);
                                            if (existingChapter) {
                                                console.log(`Chapter with order "${message.order}" and link "${message.chapter}" already exists.`);
                                                // await delay(2000)
                                                continue;
                                            }
        
        
                                            // const redirect = await gotoWithRetry(page, payload.chapter, 3);
                                            await page.goto(message.chapter, { waitUntil: 'networkidle2' });
                                            // console.log(await page.content());
                                            await delay(1000)
                                            // Use $eval to extract image sources for the chapter
                                            await waitForElement(page, 'body > main > div > div.main-images.container.border-box > div > div > img');
                                            const imagesSrc = await page.$$eval('body > main > div > div.main-images.container.border-box > div > div > img', images => {
                                                return images.map(img => img.src); // Extract 'src' attributes
                                            });
                                            // Process each image source
                                            console.log(imagesSrc);
                                            if (imagesSrc.length === 0) {
                                                countChapter++
                                                // throw new Error("Không tìm thấy ảnh trong trang");
                                                continue
                                            }
                                            let uploadedImageResults
                                            try {
                                                uploadedImageResults = await Promise.all(
                                                    imagesSrc.map(async (src, imageIndex) => {
                                                        try {
                                                            if (!src) {
                                                                throw new Error(`Không tìm thấy nguồn ảnh tại index: ${imageIndex}`);
                                                            }
                                                            // const response = await axios.get(src, { responseType: 'arraybuffer' }); // Sử dụng arraybuffer để lấy buffer ảnh
                                                            const fileBuffer = await fetchWithRetry(src);
                                                            if (!fileBuffer || typeof fileBuffer !== 'object') {
                                                                throw new Error(`Invalid fileBuffer for source: ${src}`);
                                                            }
        
                                                            // Chuyển sang Buffer
                                                            const nodeBuffer = Buffer.from(fileBuffer);
        
                                                            // Kiểm tra Buffer
                                                            if (!Buffer.isBuffer(nodeBuffer)) {
                                                                throw new Error('Invalid Buffer format');
                                                            }
        
                                                            // Tạo hash
                                                            const hash = crypto.createHash('sha1').update(nodeBuffer).digest('hex');
        
                                                            const readableStream = new Readable();
                                                            readableStream.push(nodeBuffer);
                                                            readableStream.push(null);
        
                                                            // Tải lên
                                                            const uniqueFileName = `${uuidv4()}.jpg`;
                                                            try {
                                                                const url = await uploadWithRetry(upload, uniqueFileName, readableStream, { hash });
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
                                                console.log("Không tải lên được bất kỳ ảnh nào cho chương này.");
                                            }
                                            const chapterData = {
                                                comic: `${message.comic}`,
                                                order: `${message.order}`,
                                                title: `Chapter ${message.order}`,
                                                images: uploadedImageResults // Filter out any null results
                                            };
        
                                            // Save chapter data to your database or perform any action with it
                                            const chapterCreate = await createChapter(chapterData);
                                            // return chapterCreate;
        
        
                                        } catch (err) {
                                            console.error(`Error scraping link: `, err);
                                            // await page.close();
                                            continue
                                            // throw new Error("Failed to scrape");
                                        }
        
                                    }
                                } catch (error) {
                                    console.log(error.message);
                                    // throw new Error("Failed to scrape asdfsdfsdf");
                                    continue
                                }
                            }
                        }
                    }
                }
                } catch (error) {
                    console.error(`Error during scraping:`, error);
                }
                finally {
                    // await page?.close();
    
                }
    })
    .catch(error => {
        console.log(error.message)
    })
    