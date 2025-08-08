const { connect } = require('puppeteer-real-browser');
const parseAddressInfo = require('./utils/parseAddressInfo');
const { parseUrlInfo, getStoreId, getStoreName } = require('./utils/parseUrlInfo');
const TARGET_URL = 'https://baonail.com';
const { createStore, checkStore, changeIP } = require('./api');
const fs = require('fs');
const path = require('path');

const statesMap = new Map([
    ['TN', 'Tennessee'],
    ['TX', 'Texas'],
    ['UT', 'Utah'],
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
    ['ID', 'Idaho'],
    ['IN', 'Indiana'],
    ['VT', 'Vermont'],
    ['VA', 'Virginia'],
    ['WA', 'Washington'],
    ['WV', 'West Virginia'],
    ['WI', 'Wisconsin'],
    ['WY', 'Wyoming'],
    ['PR', 'Puerto Rico'],
    ['IL', 'Illinois'],
    ['LA', 'Louisiana'],
    ['HI', 'Hawaii'],
    ['GA', 'Georgia'],
    ['IA', 'Iowa'],
    ['KS', 'Kansas'],
    ['KY', 'Kentucky'],
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
]);

const proxy =
    {
        host: '51.79.184.78',
        port: '8109',
        username: 'nghiaNbZPe',
        password: 'irccrvYn'
    }

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Hàm tạo browser mới
async function createNewBrowser() {
    const response = await connect({
        headless: false,
        defaultViewport: null,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection',
            '--disable-web-security',
            `--proxy-server=${proxy.host}:${proxy.port}`,
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-webgl',
            '--disable-gpu',
            '--no-sandbox',
        ],
    });
    
    const { browser, page } = response;
    
    // Cấu hình page mới
    await page.authenticate({
        username: proxy.username,
        password: proxy.password
    });
    
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
    
    // Navigate to TARGET_URL with retry mechanism
    const maxRetries = 3;
    let navigationSuccess = false;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔄 Navigating to TARGET_URL (attempt ${attempt}/${maxRetries})...`);
            await page.goto(TARGET_URL, { waitUntil: 'networkidle2', timeout: 30000 });
            console.log('✅ New browser navigated to TARGET_URL successfully');
            navigationSuccess = true;
            break;
        } catch (error) {
            console.log(`⚠️ Error navigating to TARGET_URL (attempt ${attempt}/${maxRetries}):`, error.message);
            
            if (attempt < maxRetries) {
                console.log(`🔄 Retrying navigation... (${attempt + 1}/${maxRetries})`);
                await delay(2000); // Wait 2 seconds before retry
            } else {
                console.log('❌ Failed to navigate to TARGET_URL after all retries');
            }
        }
    }
    
    if (!navigationSuccess) {
        console.log('⚠️ Warning: Browser created but navigation to TARGET_URL failed. Cookie operations may not work properly.');
    }
    await page.setCookie({
        name: 'mylang',
        value: 'en',
    });
    return { browser, page };
}
async function gotoWithRetry(page, url, maxRetries = 3) {
    let retries = 0;
    while (retries < maxRetries) {
        try {
            console.log(`Going to ${url}...`);
            await page.goto(url, { waitUntil: 'networkidle0', timeout: 200000 });
            return true;
        } catch (error) {
            const errMsg = error.message || error.toString();
            console.error(`Failed to load ${url} (Attempt ${retries + 1} of ${maxRetries}):`, errMsg);

            if (errMsg.includes('net::ERR_PROXY_CONNECTION_FAILED')) {
                console.log(`Detected proxy failure. Switching IP or proxy...`);
                await changeIP();
            }

            retries += 1;
            if (retries < maxRetries) {
                console.log(`Retrying ${url}...`);
                await new Promise(res => setTimeout(res, 2000)); // chờ 2s trước khi retry
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
async function crawlSingleUrl(browser, page, href, stateName) {
    const storeId = getStoreId(href);
    const storeSlug = getStoreName(href);
    const check = await checkStore(storeId, storeSlug);
    if (check.data) {
        console.log(`✅ Store ${storeSlug} đã tồn tại trong ${stateName}`);
        return {success: true};
    }
    console.log(`\n🏪 Processing: ${storeSlug || 'Unknown'} (ID: ${storeId || 'N/A'}) - ${stateName}`);

    try {
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Referer': TARGET_URL,
        });
        await page.setViewport({
            width: 1280,
            height: 1080
        });
        await page.setCookie({
            name: 'mylang',
            value: 'en',
        });
        page.setDefaultTimeout(60000);
        page.setDefaultNavigationTimeout(60000);

        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                console.log(`🔄 Attempt ${attempt}/3: Loading ${href}`);
                await gotoWithRetry(page, href, 3);
                await delay(4000);

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

                dataObj['name'] = name;

                // Click contact info với error handling tốt hơn
                try {
                    await page.waitForSelector('#ad_en > a.contact_info', { timeout: 10000 });
                    await page.click('#ad_en > a.contact_info');
                    await delay(8000);
                } catch (error) {
                    try {
                        await delay(8000);
                        await page.waitForSelector('div[id^="id"] > div > a.contact_info', { timeout: 10000 });
                        await page.click('div[id^="id"] > div > a.contact_info');
                    } catch (error2) {
                        console.log(`⚠️ Không thể click contact info, tiếp tục với dữ liệu hiện tại`);
                    }
                }

                await delay(10000);

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

                // Lấy phone với retry logic - thử tối đa 3 lần
                let phoneSelector;
                let phone = [];
                let firstPhone = null;
                let retryCount = 0;
                const maxRetries = 3;

                while (retryCount < maxRetries && !firstPhone) {
                    retryCount++;
                    console.log(`🔄 Lần thử ${retryCount}/${maxRetries} lấy số điện thoại...`);
                    
                    phoneSelector = null;
                    phone = [];
                    
                    try {
                        await page.waitForSelector('a[href^="tel:"]', { timeout: 10000 });
                        phoneSelector = 'a[href^="tel:"]';
                    } catch (error) {
                        try {
                            await page.waitForSelector('div[id^="id"] a[href^="tel:"]', { timeout: 10000 });
                            phoneSelector = 'div[id^="id"] a[href^="tel:"]';
                        } catch (error2) {
                            console.log(`⚠️ Không tìm thấy số điện thoại (lần thử ${retryCount})`);
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
                            console.log(`⚠️ Lỗi khi lấy số điện thoại (lần thử ${retryCount}):`, error.message);
                        }
                    }
                
                    console.log(`Phone numbers found (lần thử ${retryCount}):`, phone);
                    firstPhone = phone?.find(p => p !== '');
                    
                    // Nếu không tìm thấy phone và chưa hết lần thử, đợi một chút rồi thử lại
                    if (!firstPhone && retryCount < maxRetries) {
                        console.log(`⏳ Không tìm thấy số điện thoại, đợi 3 giây trước khi thử lại...`);
                        await delay(3000);
                        // Refresh trang để thử lại
                        try {
                            await page.reload({ waitUntil: 'networkidle0', timeout: 30000 });
                            await delay(2000);
                        } catch (error) {
                            console.log(`⚠️ Lỗi khi refresh trang:`, error.message);
                        }
                    }
                }

                // Nếu sau 3 lần thử vẫn không có phone thì thay đổi IP và browser
                if (!firstPhone) {
                    console.log(`❌ Không thể lấy số điện thoại sau ${maxRetries} lần thử`);
                    await changeIP();
                    try {
                        console.log('🔄 Đóng browser hiện tại và tạo browser mới...');
                        await browser.close();
                        // Tạo browser mới với IP mới
                        const newBrowserData = await createNewBrowser();
                        browser = newBrowserData.browser;
                        page = newBrowserData.page;
                        console.log('✅ Browser mới đã được tạo thành công');
                        // Trả về browser và page mới
                        return { success: false, browser, page };
                        
                    } catch (browserError) {
                        console.error('❌ Lỗi khi tạo browser mới:', browserError.message);
                        throw new Error(`Browser restart failed: ${browserError.message}`);
                    }
                    continue
                }
                
                console.log(`✅ Thành công lấy số điện thoại sau ${retryCount} lần thử:`, firstPhone);
                dataObj['business_phone'] = firstPhone ?? 'Contact via website';

                let checkIsBlock = '';
                try {
                    checkIsBlock = await page.$eval(
                        '#ad_en',
                        el => el.innerText.trim()
                    );
                } catch (error) {
                    console.log(`⚠️ Không thể lấy địa chỉ:`, error.message);
                    await changeIP();
                    try {
                        console.log('🔄 Đóng browser hiện tại và tạo browser mới...');
                        await browser.close();
                        // Tạo browser mới với IP mới
                        const newBrowserData = await createNewBrowser();
                        browser = newBrowserData.browser;
                        page = newBrowserData.page;
                        console.log('✅ Browser mới đã được tạo thành công');
                        // Trả về browser và page mới
                        return { success: false, browser, page };
                        
                    } catch (browserError) {
                        console.error('❌ Lỗi khi tạo browser mới:', browserError.message);
                        throw new Error(`Browser restart failed: ${browserError.message}`);
                    }
                    continue
                }

                const results = await page.$$eval('div[id^="id"]', divs => {
                    return divs.map(div => {
                      const titleDiv = div.querySelector('div.ellipsis > b');
                      const title = titleDiv ? titleDiv.textContent.trim() : null;
                  
                      let nextDiv = null;
                      const children = Array.from(div.children);
                      for (let i = 0; i < children.length - 1; i++) {
                        if (children[i].querySelector('b')) {
                          nextDiv = children[i + 1];
                          break;
                        }
                      }
                  
                      const nextContent = nextDiv ? nextDiv.textContent.trim() : null;
                  
                      return {
                        title,
                        nextContent
                      };
                    }).filter(item => item.title);
                  });
                
                  console.log(results, 'results')
                dataObj['address'] = results?.filter(item => item?.nextContent!=null)[0]?.nextContent || stateName;
                dataObj['city'] = 'N/A';
                dataObj['state'] = stateName;
                dataObj['zipcode'] = 'N/A';
                dataObj['from_id'] = storeId || "7777777";
                dataObj['email'] = 'nailjob.us@gmail.com';
                dataObj['from_slug'] = storeSlug || "nailjob-us";
                dataObj['has_job'] = true ;
                // dataObj['is_selling'] = true
                


                console.log(`✅ Data scraped (attempt ${attempt}) cho ${stateName}:`, dataObj);

                // Gọi API với error handling
                try {
                    await createStore(dataObj);
                    console.log(`✅ Store created successfully`);
                } catch (apiError) {
                    console.error(`❌ API Error:`, apiError.message);
                    // Vẫn return true vì data đã được scrape thành công
                }

                await delay(10000); // Giảm delay

                return { success: true };

            } catch (error) {
                console.error(`❗ Attempt ${attempt} failed cho ${href} trong ${stateName}:`, error.message);
                if (attempt < 3) {
                    await delay(3000); // Giảm delay giữa các attempts
                }
            }
        }

        console.warn(`⛔ Skipping ${href} sau 3 lần thử thất bại trong ${stateName}.`);
        return { success: false };

    } catch (error) {
        console.error(`❌ Critical error in crawlSingleUrl:`, error.message);
        return { success: false };
    } finally {
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

        // Kiểm tra browser và page còn hoạt động không
        try {
            if (!browser || !page || page.isClosed()) {
                console.log('🔄 Browser/Page đã đóng, tạo mới...');
                if (browser) {
                    try {
                        await browser.close();
                    } catch (e) {
                        console.log('Browser đã đóng rồi');
                    }
                }
                const newBrowserData = await createNewBrowser();
                browser = newBrowserData.browser;
                page = newBrowserData.page;
            }
        } catch (error) {
            console.log('🔄 Lỗi khi kiểm tra browser, tạo mới...', error.message);
            const newBrowserData = await createNewBrowser();
            browser = newBrowserData.browser;
            page = newBrowserData.page;
        }

        // Retry logic cho từng link - thử tối đa 3 lần
        let linkSuccess = false;
        let linkRetryCount = 0;
        const maxLinkRetries = 3;
        
        while (!linkSuccess && linkRetryCount < maxLinkRetries) {
            linkRetryCount++;
            console.log(`🔗 Thử crawl link lần ${linkRetryCount}/${maxLinkRetries}: ${href}`);
            
            const result = await crawlSingleUrl(browser, page, href, stateName);
            
            if (result && result.success) {
                linkSuccess = true;
                successCount++;
                consecutiveFailures = 0;
                console.log(`✅ Thành công crawl link sau ${linkRetryCount} lần thử`);
            } else {
                console.log(`❌ Lần thử ${linkRetryCount} thất bại cho link: ${href}`);
                
                // Nếu result có browser và page mới, cập nhật chúng
                if (result && result.browser && result.page) {
                    browser = result.browser;
                    page = result.page;
                    console.log('🔄 Đã cập nhật browser và page mới từ crawlSingleUrl');
                }
                
                // Nếu chưa hết lần thử, đợi một chút rồi thử lại
                if (linkRetryCount < maxLinkRetries) {
                    console.log(`⏳ Đợi 5 giây trước khi thử lại link...`);
                    await delay(5000);
                }
            }
        }
        
        // Nếu sau tất cả lần thử vẫn fail
        if (!linkSuccess) {
            failCount++;
            consecutiveFailures++;
            console.log(`⛔ Bỏ qua link sau ${maxLinkRetries} lần thử thất bại: ${href}`);
        }

        if (consecutiveFailures >= 5) {
            console.log(`⚠️ Đã fail liên tiếp ${consecutiveFailures} lần, reset browser và tiếp tục...`);
            try {
                await browser.close();
            } catch (e) {
                console.log('Browser đã đóng rồi');
            }
            const newBrowserData = await createNewBrowser();
            browser = newBrowserData.browser;
            page = newBrowserData.page;
            consecutiveFailures = 0; // Reset consecutive failures
            continue;
        }

        if (i < urls.length - 1) {
            await delay(5000);
        }
    }

    console.log(`\n🎉 Hoàn thành crawl ${stateName}:`);
    console.log(`✅ Thành công: ${successCount}`);
    console.log(`❌ Thất bại: ${failCount}`);
    console.log(`📊 Tổng cộng: ${urls.length}`);
    
    // Trả về browser và page hiện tại để có thể sử dụng tiếp
    return { browser, page };
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
        `--proxy-server=${proxy.host}:${proxy.port}`,
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-webgl',
        '--disable-gpu',
        '--no-sandbox',
    ],
    // proxy: proxy
})
    .then(async response => {
        let { browser, page } = response;

        try {
            let stateIndex = 0;
            for (const [stateCode, stateName] of statesMap) {
                stateIndex++;
                console.log(`\n🚀 Bắt đầu crawl bang: ${stateName} (${stateCode}) - ${stateIndex}/${statesMap.size}`);

                try {
                    await page.authenticate({
                    username: proxy.username,
                    password: proxy.password
                    });
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

                    const result = await crawlStateUrls(browser, page, stateCode, stateName);
                    // Cập nhật browser và page nếu có thay đổi
                    if (result && result.browser && result.page) {
                        browser = result.browser;
                        page = result.page;
                    }

                    console.log(`⏳ Đợi 30 giây trước khi chuyển sang bang tiếp theo...`);
                    await delay(30000);

                } catch (error) {

                    const newBrowserData = await createNewBrowser();
                    browser = newBrowserData.browser;
                    page = newBrowserData.page;

                    await crawlStateUrls(browser, page, stateCode, stateName);
                }
            }

            console.log(`🎉 Đã hoàn thành crawl tất cả các bang!`);
        } catch (error) {
            console.error(`Error during scraping:`, error);
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
    let maxPages = 10;
    let consecutiveEmptyPages = 0;

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
