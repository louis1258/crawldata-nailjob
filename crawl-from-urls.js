const { connect } = require('puppeteer-real-browser');
const parseAddressInfo = require('./utils/parseAddressInfo');
const { parseUrlInfo, getStoreId, getStoreName } = require('./utils/parseUrlInfo');
const { createStore, checkStore } = require('./api');
const fs = require('fs');
const path = require('path');

const statesMap = new Map([
  ['AL', 'Alabama'],
  ['AK', 'Alaska'],
  ['AZ', 'Arizona'],
  ['AR', 'Arkansas'],
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
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 200000 });
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

// Hàm crawl một URL cụ thể
async function crawlSingleUrl(page, href, stateName) {
    const storeId = getStoreId(href);
    const storeName = getStoreName(href);
    
    console.log(`\n🏪 Processing: ${storeName || 'Unknown'} (ID: ${storeId || 'N/A'}) - ${stateName}`);

    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            await gotoWithRetry(page, href, 3);
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
                await page.click('div[id^="id"] a[href^="tel:"]');
            } catch (error) {
                await page.click('div[id^="id"] a.contact_info');
            }

            await delay(2000);

            await page.waitForSelector('div[id^="id"]', { timeout: 100000 });

            let description;
            try {
                description = await page.$eval('div[id^="id"] > div[id^="ad_"]', el => el.textContent.trim());
            } catch (error) {
                description = await page.$eval('div[id^="id"] > div:first-child', el => el.textContent.trim());
            }
            dataObj['description'] = description?.replace('[Translate to English]', '').trim();

            await delay(1000);
            let phoneSelector;
            try {
                await page.waitForSelector('div[id^="id"] a[href^="tel:"]', { timeout: 5000 });
                phoneSelector = 'div[id^="id"] a[href^="tel:"]';
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
            dataObj['city'] = parsed.city ?? 'Unknown';
            dataObj['state'] = stateName; 
            dataObj['zipcode'] = parsed.zipcode ?? 'Unknown';
            dataObj['from_id'] = storeId || "7777777"

            let phone;
            if (phoneSelector.includes('tel:')) {
                phone = await page.$eval(phoneSelector, el => el.textContent.trim());
            } else {
                const phoneRegex = /(\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/;
                const phoneMatch = addressText.match(phoneRegex);
                phone = phoneMatch ? phoneMatch[1] : "Contact via website";
            }

            dataObj['business_phone'] = phone ?? null;
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
    
    // Đọc URLs từ file
    const urls = loadUrlsFromFile(stateCode);
    
    if (!urls || urls.length === 0) {
        console.log(`⚠️ Không tìm thấy URLs nào cho bang ${stateName}`);
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

// Main function
async function crawlFromUrls() {
    console.log('🚀 Bắt đầu crawl từ URLs đã lưu...');
    
    connect({
        headless: 'true',
        customConfig: {},
        skipTarget: [],
        fingerprint: true,
        turnstile: true,
        connectOption: {},
        tf: true,
        args: ['--disable-web-security', '--disable-features=IsolateOrigins,site-per-process', '--disable-webgl', '--disable-gpu'],
    })
    .then(async response => {
        let { browser, page } = response;

        try {
            for (const [stateCode, stateName] of statesMap) {
                console.log(`\n🚀 Bắt đầu crawl bang: ${stateName} (${stateCode})`);
                
                try {
                    await page.goto('https://baonail.com')
                    await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36")
                    await page.setExtraHTTPHeaders({
                        'Accept-Language': 'en-US,en;q=0.9',
                        'Referer': 'https://baonail.com',
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
}

// Chạy script
crawlFromUrls(); 