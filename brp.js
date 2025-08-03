const { connect } = require('puppeteer-real-browser');
const parseAddressInfo = require('./utils/parseAddressInfo');
const { parseUrlInfo, getStoreId, getStoreName } = require('./utils/parseUrlInfo');
const TARGET_URL = 'https://baonail.com';
const { createStore, checkStore } = require('./api');
const fs = require('fs');
const path = require('path');

const statesMap = new Map([
    ['GA', 'Georgia'],
    ['IL', 'Illinois'],
    ['AR', 'Arkansas'],
    ['AZ', 'Arizona'],
    ['AL', 'Alabama'],
    ['AK', 'Alaska'],
    ['CA', 'California'],
    ['CO', 'Colorado'],
    ['CT', 'Connecticut'],
    ['DE', 'Delaware'],
    ['DC', 'Washington, Dc'],
    ['FL', 'Florida'],
  ['HI', 'Hawaii'],
  ['ID', 'Idaho'],
  ['IN', 'Indiana'],
  ['IA', 'Iowa'],
  ['KS', 'Kansas'],
  ['KY', 'Kentucky'],
  ['LA', 'Louisiana'],
  ['ME', 'Maine'],
  ['MD', 'Maryland'],
  ['MA', 'Massachusetts'],
  ['MI', 'Michigan'],
  ['MN', 'Minnesota'],
  ['MS', 'Mississippi'],
  ['MO', 'Missouri'],
  ['MT', 'Montana'],
  ['NE', 'Nebraska'],
  ['NV', 'Nevada'],
  ['NH', 'New Hampshire'],
  ['NJ', 'New Jersey'],
  ['NM', 'New Mexico'],
  ['NY', 'New York'],
  ['NC', 'North Carolina'],
  ['ND', 'North Dakota'],
  ['OH', 'Ohio'],
  ['OK', 'Oklahoma'],
  ['OR', 'Oregon'],
  ['PA', 'Pennsylvania'],
  ['RI', 'Rhode Island'],
  ['SC', 'South Carolina'],
  ['SD', 'South Dakota'],
  ['TN', 'Tennessee'],
  ['TX', 'Texas'],
  ['UT', 'Utah'],
  ['VT', 'Vermont'],
  ['VA', 'Virginia'],
  ['WA', 'Washington'],
  ['WV', 'West Virginia'],
  ['WI', 'Wisconsin'],
  ['WY', 'Wyoming'],
  ['PR', 'Puerto Rico']
]);

const proxies = [
    {
        host: '51.79.191.62',
        port: '8631',
        username: 'nghiaXju1S',
        password: 'syqcGVUb'
    }
]
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function gotoWithRetry(page, url, maxRetries = 3) {
    let retries = 0;
    while (retries < maxRetries) {
        try {
            await page.goto(url, { waitUntil: 'networkidle0', timeout: 200000 });
            return true;
        } catch (error) {
            console.error(`Failed to load ${url} (Attempt ${retries + 1} of ${maxRetries}):`, error);
            retries += 1;
            if (retries < maxRetries) {
                console.log(`Retrying ${url}...`);
            } else {
                console.error(`All retry attempts failed for ${url}`);
                return false;
            }
        }
    }
}

// Hàm lưu URLs vào file
const saveUrlsToFile = (stateCode, urls) => {
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const filePath = path.join(dataDir, `${stateCode}_urls.json`);
    const data = {
        stateCode,
        stateName: statesMap.get(stateCode),
        totalUrls: urls.length,
        urls: urls,
        timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`💾 Đã lưu ${urls.length} URLs cho ${stateCode} vào file: ${filePath}`);
    return filePath;
};

// Hàm đọc URLs từ file
const loadUrlsFromFile = (stateCode) => {
    const filePath = path.join(__dirname, 'data', `${stateCode}_urls.json`);
    if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        console.log(`📖 Đã đọc ${data.urls.length} URLs cho ${stateCode} từ file: ${filePath}`);
        return data.urls;
    }
    return null;
};

// Hàm lấy tất cả URLs của một state
async function getAllUrlsForState(page, stateCode, stateName) {
    console.log(`\n🔍 Bắt đầu lấy URLs cho bang: ${stateName} (${stateCode})`);
    
    const pageUrl = `${TARGET_URL}/index.php?state=${stateCode}&stype=&stype=1`;
    console.log(`🔗 URL: ${pageUrl}`);
    
    try {
        await page.goto(pageUrl, { waitUntil: 'networkidle2' });
        await delay(2000);
        
        const allUrls = await getAllUrlsFromAllPages(page);
        console.log(`📊 Tổng số URLs tìm thấy cho ${stateName}: ${allUrls.length}`);
        
        saveUrlsToFile(stateCode, allUrls);
        
        return allUrls;
    } catch (error) {
        console.error(`❌ Lỗi khi lấy URLs cho bang ${stateName}:`, error);
        return [];
    }
}

// Hàm crawl một URL cụ thể
async function crawlSingleUrl(browser, href, stateName) {
    const storeId = getStoreId(href);
    const storeName = getStoreName(href);
    
    console.log(`\n🏪 Processing: ${storeName || 'Unknown'} (ID: ${storeId || 'N/A'}) - ${stateName}`);

    // Tạo page mới cho mỗi URL
    const page = await browser.newPage();
    
    try {
        // Thiết lập user agent và headers cho page mới
        const userAgents = [
            "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",
            "Mozilla/5.0 (X11; Ubuntu; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
        ];
        const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
        await page.setUserAgent(randomUserAgent);
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': TARGET_URL,
        });
        await page.setViewport({
            width: 1280,
            height: 1080
        });

        // Thiết lập timeout dài hơn cho VPS
        page.setDefaultTimeout(60000);
        page.setDefaultNavigationTimeout(60000);

        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                console.log(`🔄 Attempt ${attempt}/3: Loading ${href}`);
                await gotoWithRetry(page, href, 3);
                await delay(8000); // Giảm delay để tăng tốc độ
                
                let dataObj = {};


                let name;
                try {
                    name = await page.$eval('div[id^="id"] > div.ellipsis > b', el => el.textContent.trim());
                } catch (error) {
                    try {
                        name = await page.$eval('div[id^="id"] b', el => el.textContent.trim());
                    } catch (error2) {
                        console.log(`❌ Không thể lấy tên store`);
                        return false;
                    }
                }

                if (!name || name.trim() === '') {
                    console.log(`⚠️ Tên store rỗng, bỏ qua`);
                    return false;
                }

                const check = await checkStore(storeId, name);
                if (check.data) {
                    console.log(`✅ Store ${storeName} đã tồn tại trong ${stateName}`);
                    return true;
                }

                dataObj['name'] = name;

                // Click contact info với error handling tốt hơn
                try {
                    await page.waitForSelector('#ad_vi > a.contact_info', { timeout: 10000 });
                    await page.click('#ad_vi > a.contact_info');
                    await delay(8000);
                } catch (error) {
                    try {
                        await page.waitForSelector('#ad_vi > a', { timeout: 10000 });
                        await page.click('#ad_vi > a');
                        await delay(8000);
                    } catch (error2) {
                        console.log(`⚠️ Không thể click contact info, tiếp tục với dữ liệu hiện tại`);
                    }
                }
                
                await delay(5000);

                // Lấy description với error handling
                let description = '';
                try {
                    description = await page.$eval('div[id^="id"] > div[id^="ad_"]', el => el.textContent.trim());
                } catch (error) {
                    try {
                        description = await page.$eval('div[id^="id"] > div:first-child', el => el.textContent.trim());
                    } catch (error2) {
                        description = 'No description available';
                    }
                }
                dataObj['description'] = description?.replace('[Translate to English]', '').trim() || 'No description available';

                await delay(2000);
                
                // Lấy phone với error handling tốt hơn
                let phoneSelector;
                let phone = [];
                try {
                    await page.waitForSelector('a[href^="tel:"]', { timeout: 10000 });
                    phoneSelector = 'a[href^="tel:"]';
                } catch (error) {
                    try {
                        await page.waitForSelector('div[id^="id"] a[href^="tel:"]', { timeout: 10000 });
                        phoneSelector = 'div[id^="id"] a[href^="tel:"]';
                    } catch (error2) {
                        console.log(`⚠️ Không tìm thấy số điện thoại`);
                        phoneSelector = null;
                    }
                }

                if (phoneSelector) {
                    try {
                        phone = await page.$$eval(phoneSelector, links =>
                            Array.from(new Set(
                              links
                                .map(link => link.textContent.trim())
                                .filter(phone => phone !== '')
                            ))
                          );
                    } catch (error) {
                        console.log(`⚠️ Lỗi khi lấy số điện thoại:`, error.message);
                    }
                }

                console.log('Phone numbers found:', phone);
                const firstPhone = phone?.find(p => p !== '');
                dataObj['business_phone'] = firstPhone ?? 'Contact via website';

                // Lấy address với error handling
                let addressText = '';
                try {
                    addressText = await page.$eval(
                        '#ad_vi',
                        el => el.innerText.trim()
                    );
                } catch (error) {
                    console.log(`⚠️ Không thể lấy địa chỉ:`, error.message);
                    addressText = 'Address not available';
                }

                const parsed = parseAddressInfo(addressText);

                dataObj['address'] = parsed.address || 'Address not available';
                dataObj['city'] = parsed.city ?? 'N/A';
                dataObj['state'] = stateName; 
                dataObj['zipcode'] = parsed.zipcode ?? 'N/A';
                dataObj['from_id'] = storeId || "7777777";
                dataObj['email'] = 'nailjob.us@gmail.com';

                console.log(`✅ Data scraped (attempt ${attempt}) cho ${stateName}:`, dataObj);
                
                // Gọi API với error handling
                try {
                    await createStore(dataObj);
                    console.log(`✅ Store created successfully`);
                } catch (apiError) {
                    console.error(`❌ API Error:`, apiError.message);
                    // Vẫn return true vì data đã được scrape thành công
                }
                
                await delay(20000); // Giảm delay

                return true;

            } catch (error) {
                console.error(`❗ Attempt ${attempt} failed cho ${href} trong ${stateName}:`, error.message);
                if (attempt < 3) {
                    await delay(3000); // Giảm delay giữa các attempts
                }
            }
        }

        console.warn(`⛔ Skipping ${href} sau 3 lần thử thất bại trong ${stateName}.`);
        return false;
        
    } catch (error) {
        console.error(`❌ Critical error in crawlSingleUrl:`, error.message);
        return false;
    } finally {
        // Đóng page sau khi hoàn thành
        try {
            await page.close();
        } catch (error) {
            console.log(`⚠️ Error closing page:`, error.message);
        }
    }
}

// Hàm kiểm tra và restart browser nếu cần
async function checkAndRestartBrowser(browser, page, stateCode, stateName) {
    try {
        // Kiểm tra xem browser còn hoạt động không
        const pages = await browser.pages();
        if (pages.length === 0) {
            console.log(`⚠️ Browser không có pages, restarting...`);
            return false;
        }
        
        // Kiểm tra memory usage (nếu có thể)
        const context = browser.defaultBrowserContext();
        if (context) {
            console.log(`📊 Browser status: OK`);
        }
        
        return true;
    } catch (error) {
        console.log(`❌ Browser error detected:`, error.message);
        return false;
    }
}

// Hàm crawl tất cả URLs của một state
async function crawlStateUrls(browser, page, stateCode, stateName) {
    console.log(`\n🌍 Bắt đầu crawl URLs cho bang: ${stateName} (${stateCode})`);
    
    // Kiểm tra xem có file URLs đã lưu chưa
    let urls = loadUrlsFromFile(stateCode);
    
    if (!urls) {
        console.log(`📥 Không tìm thấy file URLs cho ${stateCode}, sẽ lấy URLs mới...`);
        urls = await getAllUrlsForState(page, stateCode, stateName);
    }
    
    if (urls.length === 0) {
        console.log(`⚠️ Không có URLs nào để crawl cho bang ${stateName}`);
        return;
    }
    
    console.log(`🚀 Bắt đầu crawl ${urls.length} URLs cho ${stateName}`);
    
    let successCount = 0;
    let failCount = 0;
    let consecutiveFailures = 0;
    
    for (let i = 0; i < urls.length; i++) {
        const href = urls[i];
        console.log(`\n📊 Progress: ${i + 1}/${urls.length} (${Math.round((i + 1) / urls.length * 100)}%)`);
        
        // Kiểm tra browser mỗi 10 URLs
        if (i > 0 && i % 10 === 0) {
            const browserOk = await checkAndRestartBrowser(browser, page, stateCode, stateName);
            if (!browserOk) {
                console.log(`⚠️ Browser có vấn đề, cần restart. Dừng crawl.`);
                break;
            }
        }
        
        const success = await crawlSingleUrl(browser, href, stateName);
        if (success) {
            successCount++;
            consecutiveFailures = 0; // Reset counter
        } else {
            failCount++;
            consecutiveFailures++;
            
            // Nếu fail liên tiếp 5 lần, dừng crawl
            if (consecutiveFailures >= 5) {
                console.log(`⚠️ Đã fail liên tiếp ${consecutiveFailures} lần, dừng crawl để tránh lỗi`);
                break;
            }
        }
        
        // Delay giữa các URLs
        if (i < urls.length - 1) {
            await delay(5000);
        }
    }
    
    console.log(`\n🎉 Hoàn thành crawl ${stateName}:`);
    console.log(`✅ Thành công: ${successCount}`);
    console.log(`❌ Thất bại: ${failCount}`);
    console.log(`📊 Tổng cộng: ${urls.length}`);
}


connect({
    headless: 'auto',
    customConfig: {},
    skipTarget: [],
    fingerprint: true,
    turnstile: true,
    connectOption: {
        timeout: 60000,
        retries: 3
    },
    tf: true,
    args: [
        '--disable-web-security', 
        '--disable-features=IsolateOrigins,site-per-process', 
        '--disable-webgl', 
        '--disable-gpu',
        '--no-sandbox',
    ],
    // proxy: proxies[0]
})
    .then(async response => {
        let { browser, page } = response;

        try {
            let stateIndex = 0;
            for (const [stateCode, stateName] of statesMap) {
                stateIndex++;
                console.log(`\n🚀 Bắt đầu crawl bang: ${stateName} (${stateCode}) - ${stateIndex}/${statesMap.size}`);
                
                try {
                    // Kiểm tra browser trước khi bắt đầu
                    const browserOk = await checkAndRestartBrowser(browser, page, stateCode, stateName);
                    if (!browserOk) {
                        console.log(`⚠️ Browser không ổn định, bỏ qua bang ${stateName}`);
                        continue;
                    }
                    
                    await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 30000 });
                    await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36")
                    await page.setExtraHTTPHeaders({
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Referer': TARGET_URL,
                    });
                    await page.setViewport({
                        width: 1280,
                        height: 1080
                    })

                    const userAgents = [
                        "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36",
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
                        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36",
                        "Mozilla/5.0 (X11; Ubuntu; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
                        "Mozilla/5.0 (Macintosh; Intel Mac OS X 12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
                        "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
                    ];
                    const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
                    await page.setUserAgent(randomUserAgent);
                    
                    await crawlStateUrls(browser, page, stateCode, stateName);
                    
                    console.log(`⏳ Đợi 30 giây trước khi chuyển sang bang tiếp theo...`);
                    await delay(30000);
                    
                } catch (error) {
                    console.error(`❌ Lỗi khi xử lý bang ${stateName}:`, error.message);
                    
                    // Thử restart browser nếu có lỗi nghiêm trọng
                    try {
                        console.log(`🔄 Thử restart browser...`);
                        await browser.close();
                        // Browser sẽ được restart tự động bởi puppeteer-real-browser
                        await delay(10000);
                    } catch (restartError) {
                        console.error(`❌ Không thể restart browser:`, restartError.message);
                    }
                    
                    continue;
                }
            }
            
            console.log(`🎉 Đã hoàn thành crawl tất cả các bang!`);
        } catch (error) {
            console.error(`Error during scraping:`, error);
        }
        finally {
            if (browser) {
                try {
                    await browser.close();
                } catch (error) {
                    console.log(`⚠️ Error closing browser:`, error.message);
                }
            }
        }
    })
    .catch(error => {
        console.log(error.message)
    })

async function getUrlsFromPage(page, pageNumber = 1) {
    const newUrls = await page.$$eval('#uuuuu > div', divs => {
        return divs
            .map(div => {
                const aTag = div.querySelector('a');
                return aTag ? aTag.href : null;
            })
            .filter(href =>
                href !== null &&
                !href.includes('func=banner')
                && !href.includes('qc')
            );
    });
    return newUrls;
}

async function getAllUrlsFromAllPages(page) {
    const allUrls = [];
    let currentPage = 1;
    let hasMorePages = true;
    let maxPages = 10; // Giới hạn tối đa 10 trang để tránh vòng lặp vô hạn
    let consecutiveEmptyPages = 0; // Đếm số trang liên tiếp không có dữ liệu mới
    
    console.log(`🔄 Bắt đầu thu thập URLs từ tất cả trang...`);
    
    while (hasMorePages && currentPage <= maxPages) {
        console.log(`🔄 Đang xử lý trang ${currentPage}`);
        
        // Lấy URLs từ trang hiện tại
        const pageUrls = await getUrlsFromPage(page, currentPage);
        
        // Kiểm tra xem có URLs mới không
        const newUrls = pageUrls.filter(url => !allUrls.includes(url));
        
        if (newUrls.length === 0) {
            consecutiveEmptyPages++;
            console.log(`⚠️ Trang ${currentPage} không có URLs mới (${consecutiveEmptyPages} trang liên tiếp)`);
            
            if (consecutiveEmptyPages >= 2) {
                console.log(`⚠️ Đã có ${consecutiveEmptyPages} trang liên tiếp không có dữ liệu mới, dừng thu thập`);
                hasMorePages = false;
                break;
            }
        } else {
            consecutiveEmptyPages = 0; // Reset counter
            allUrls.push(...newUrls);
            console.log(`✅ Đã lấy được ${newUrls.length} URLs mới từ trang ${currentPage} (tổng: ${allUrls.length})`);
        }
        
        // Kiểm tra xem có trang tiếp theo không
        const nextPageExists = await checkNextPageExists(page, currentPage);
        
        if (nextPageExists) {
            // Chuyển đến trang tiếp theo
            const navigationSuccess = await navigateToNextPage(page, currentPage);
            if (navigationSuccess) {
                currentPage++;
                await delay(3000); // Đợi trang load
            } else {
                console.log(`⚠️ Không thể chuyển đến trang ${currentPage + 1}, dừng thu thập`);
                hasMorePages = false;
            }
        } else {
            console.log(`✅ Đã đến trang cuối (trang ${currentPage})`);
            hasMorePages = false;
        }
    }
    
    if (currentPage > maxPages) {
        console.log(`⚠️ Đã đạt giới hạn ${maxPages} trang, dừng thu thập`);
    }
    
    console.log(`🎉 Tổng cộng đã lấy được ${allUrls.length} URLs từ ${currentPage} trang`);
    return allUrls;
}

async function checkNextPageExists(page, currentPage) {
    try {
        await delay(2000);

        const nextButton = await page.$('a[rel="next"]');

        if (nextButton) {
            const nextUrl = await page.evaluate(el => el.href, nextButton);
            console.log('Next page URL:', nextUrl);
            console.log(`✅ Tìm thấy Next button ở trang ${currentPage} với selector linh hoạt`);
            return true;
        } else {
            console.log(`❌ Không tìm thấy nút next ở trang ${currentPage}`);
            return false;
        }

    } catch (error) {
        console.log(`❌ Lỗi khi kiểm tra trang tiếp theo: ${error.message}`);
        return false;
    }
}


// Hàm chuyển đến trang tiếp theo
async function navigateToNextPage(page, currentPage) {
    try {
        console.log(`🔄 Đang chuyển từ trang ${currentPage} đến trang ${currentPage + 1}...`);
        
        const nextUrl = await page.$eval('a[rel="next"]', el => el.href);
        console.log('Next page URL:', nextUrl);
        await page.goto(nextUrl, { waitUntil: 'networkidle2' });
        await delay(3000);
        if (nextUrl) {
            return true;
        }
        return false;
        
    } catch (error) {
        console.log(`❌ Lỗi khi chuyển trang: ${error.message}`);
        return false;
    }
}
