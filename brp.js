const { connect } = require('puppeteer-real-browser');
const parseAddressInfo = require('./utils/parseAddressInfo');
const { parseUrlInfo, getStoreId, getStoreName } = require('./utils/parseUrlInfo');
const TARGET_URL = 'https://baonail.com';
const { createStore, checkStore } = require('./api');
const fs = require('fs');
const path = require('path');

const statesMap = new Map([
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
  ['GA', 'Georgia'],
  ['HI', 'Hawaii'],
  ['ID', 'Idaho'],
  ['IL', 'Illinois'],
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
async function crawlSingleUrl(page, href, stateName) {
    const storeId = getStoreId(href);
    const storeName = getStoreName(href);
    
    console.log(`\n🏪 Processing: ${storeName || 'Unknown'} (ID: ${storeId || 'N/A'}) - ${stateName}`);

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            await gotoWithRetry(page, 'https://baonail.com/index.php?stores=Oh-My-Nails&id=75b0c6581b', 3);
            await delay(10000);
            let dataObj = {};

            await page.waitForSelector('div[id^="id"] > div.ellipsis > b');
            const name = await page.$eval('div[id^="id"] > div.ellipsis > b', el => el.textContent.trim());
            const check = await checkStore(storeId, name);
            if (check.data) {
                console.log(`✅ Store ${storeName} đã tồn tại trong ${stateName}`);
                return true;
            }

            dataObj['name'] = name ?? null;

            try {
                await page.click('#ad_vi > a');
                await delay(2000);
                
            } catch (error) {
                await page.click('#ad_vi > a');
                await delay(4000);
            }
            

            await delay(10000);

            let description;
            try {
                description = await page.$eval('div[id^="id"] > div[id^="ad_"]', el => el.textContent.trim());
            } catch (error) {
                description = await page.$eval('div[id^="id"] > div:first-child', el => el.textContent.trim());
            }
            dataObj['description'] = description?.replace('[Translate to English]', '').trim();

            await delay(2000);
            let phoneSelector;
            try {
                await page.waitForSelector('#ad_vi > a');
                phoneSelector = '#ad_vi > a';
            } catch (error) {
                await page.waitForSelector('div[id^="id"] a.contact_info');
                phoneSelector = 'div[id^="id"] a.contact_info';
            }

            const addressText = await page.$eval(
                'div[id^="id"] > div.ellipsis + div',
                el => el.innerText.trim()
            );
            const parsed = parseAddressInfo(addressText);

            dataObj['address'] = parsed.address;
            dataObj['city'] = parsed.city ?? 'N/A';
            dataObj['state'] = stateName; 
            dataObj['zipcode'] = parsed.zipcode ?? 'N/A';
            dataObj['from_id'] = storeId || "7777777"

            let phone;
            phone = await page.$eval(phoneSelector, el => el.textContent.trim());

            dataObj['business_phone'] = phone ?? 'Contact via website';
            dataObj['email'] = 'nailjob.us@gmail.com';

            console.log(`✅ Data scraped (attempt ${attempt}) cho ${stateName}:`, dataObj);
            await createStore(dataObj);
            await delay(30000);

            return true;

        } catch (error) {
            console.error(`❗ Attempt ${attempt} failed cho ${href} trong ${stateName}:`, error.message);
            await delay(5000);
        }
    }

    console.warn(`⛔ Skipping ${href} sau 3 lần thử thất bại trong ${stateName}.`);
    return false;
}

// Hàm crawl tất cả URLs của một state
async function crawlStateUrls(page, stateCode, stateName) {
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
    
    for (let i = 0; i < urls.length; i++) {
        const href = urls[i];
        console.log(`\n📊 Progress: ${i + 1}/${urls.length} (${Math.round((i + 1) / urls.length * 100)}%)`);
        
        const success = await crawlSingleUrl(page, href, stateName);
        if (success) {
            successCount++;
        } else {
            failCount++;
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

const proxies = [
    {
        host: '51.79.191.62',
        port: '8631',
        username: 'nghiaXju1S',
        password: 'syqcGVUb'
    },
];

connect({
    headless: 'auto',
    customConfig: {},
    skipTarget: [],
    fingerprint: true,
    turnstile: true,
    connectOption: {},
    tf: true,
    args: ['--disable-web-security', '--disable-features=IsolateOrigins,site-per-process', '--disable-webgl', '--disable-gpu'],
    proxy: proxies[0]
})
    .then(async response => {
        let { browser, page } = response;

        try {
            for (const [stateCode, stateName] of statesMap) {
                console.log(`\n🚀 Bắt đầu crawl bang: ${stateName} (${stateCode})`);
                
                try {
                    await page.goto(TARGET_URL)
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
                    
                    await crawlStateUrls(page, stateCode, stateName);
                    
                    console.log(`⏳ Đợi 60 giây trước khi chuyển sang bang tiếp theo...`);
                    await delay(60000);
                    
                } catch (error) {
                    console.error(`❌ Lỗi khi xử lý bang ${stateName}:`, error);
                    continue;
                }
            }
            
            console.log(`🎉 Đã hoàn thành crawl tất cả các bang!`);
        } catch (error) {
            console.error(`Error during scraping:`, error);
        }
        finally {
            if (browser) {
                await browser.close();
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
