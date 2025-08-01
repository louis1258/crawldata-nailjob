const { connect } = require('puppeteer-real-browser');
const parseAddressInfo = require('./utils/parseAddressInfo');
const { parseUrlInfo, getStoreId, getStoreName } = require('./utils/parseUrlInfo');
const TARGET_URL = 'https://baonail.com';
const { createStore, checkStore } = require('./api');

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

const proxies = [
    {
        host: '51.79.191.62',
        port: '8205',
        username: 'nghiaCSem6',
        password: 'D0q3VrBe'
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
                    
                    await crawlState(page, stateCode, stateName);
                    
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
                !href.includes('func=banner&act=banners')
                && !href.includes('qc')
            );
    });
    return newUrls;
}

async function getTotalPages(page) {
    try {
        const paginationButtons = await page.$$eval('div[id^="pageid"] > div > div > a', buttons => {
            return buttons.map(button => {
                const text = button.textContent.trim();
                const pageNumber = parseInt(text);
                return isNaN(pageNumber) ? null : pageNumber;
            }).filter(num => num !== null);
        });
        
        return Math.max(...paginationButtons, 1);
    } catch (error) {
        console.log('Không thể xác định số trang, mặc định là 1 trang');
        return 1;
    }
}

async function navigateToPage(page, pageNumber) {
    if (pageNumber === 1) {
        return;
    }
    
    try {
        const selectors = [
            `#pageid${pageNumber} > div > div > a`,
            `#pageid${pageNumber} > div > div > a.btn.btn-default.pull-right`,
            `a[href*="page=${pageNumber}"]`,
            `a[onclick*="page=${pageNumber}"]`
        ];
        
        let clicked = false;
        for (const selector of selectors) {
            try {
                await page.waitForSelector(selector, { timeout: 10000 });
                await page.click(selector);
                clicked = true;
                console.log(`✅ Đã chuyển đến trang ${pageNumber} với selector: ${selector}`);
                break;
            } catch (error) {
                console.log(`❌ Không thể click với selector: ${selector}`);
                continue;
            }
        }
        
        if (!clicked) {
            console.log(`⚠️ Không thể chuyển đến trang ${pageNumber}`);
        }
        
        await delay(5000);
    } catch (error) {
        console.error(`Lỗi khi chuyển đến trang ${pageNumber}:`, error);
    }
}

async function getAllUrlsFromAllPages(page) {
    const allUrls = [];
    
    const totalPages = await getTotalPages(page);
    console.log(`📄 Tổng số trang phát hiện được: ${totalPages}`);
    
    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
        console.log(`🔄 Đang xử lý trang ${pageNumber}/${totalPages}`);
        
        await navigateToPage(page, pageNumber);
        
        const pageUrls = await getUrlsFromPage(page, pageNumber);
        allUrls.push(...pageUrls);
        
        console.log(`✅ Đã lấy được ${pageUrls.length} URLs từ trang ${pageNumber}`);
        
        if (pageNumber < totalPages) {
            await delay(3000);
        }
    }
    
    console.log(`🎉 Tổng cộng đã lấy được ${allUrls.length} URLs từ ${totalPages} trang`);
    return allUrls;
}

async function crawlState(page, stateCode, stateName) {
    console.log(`\n🌍 Bắt đầu crawl bang: ${stateName} (${stateCode})`);
    
    const pageUrl = `${TARGET_URL}/index.php?state=${stateCode}&stype=&stype=1`;
    console.log(`🔗 URL: ${pageUrl}`);
    
    try {
        await page.goto(pageUrl, { waitUntil: 'networkidle2' });
        await delay(2000);
        
        if (page) {
            const allUrls = await getAllUrlsFromAllPages(page);
            console.log(`📊 Tổng số URLs tìm thấy cho ${stateName}: ${allUrls.length}`);
            
            if (allUrls.length === 0) {
                console.log(`⚠️ Không tìm thấy URLs nào cho bang ${stateName}`);
                return;
            }
            
            for (let href of allUrls) {
                let success = false;
                
                const storeId = getStoreId(href);
                const storeName = getStoreName(href);
                
                console.log(`\n🏪 Processing: ${storeName || 'Unknown'} (ID: ${storeId || 'N/A'}) - ${stateName}`);

                for (let attempt = 1; attempt <= 3; attempt++) {
                    try {
                        const check = await checkStore(storeId);
                        if (check.data) {
                            console.log(`✅ Store ${storeName} đã tồn tại trong ${stateName}`);
                            break;
                        }

                        await gotoWithRetry(page, href, 3);
                        await delay(10000);
                        let dataObj = {};

                        await page.waitForSelector('div[id^="id"] > div.ellipsis > b');
                        const name = await page.$eval('div[id^="id"] > div.ellipsis > b', el => el.textContent.trim());
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
                        dataObj['from_id'] = storeId;

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

                        console.log(`✅ Data scraped (attempt ${attempt}) cho ${stateName} với proxy ${proxies[0].host}:${proxies[0].port}:`, dataObj);
                        await createStore(dataObj);
                        await delay(30000);

                        success = true;
                        break;

                    } catch (error) {
                        console.error(`❗ Attempt ${attempt} failed cho ${href} trong ${stateName}:`, error.message);
                        await delay(5000);
                    }
                }

                if (!success) {
                    console.warn(`⛔ Skipping ${href} sau 3 lần thử thất bại trong ${stateName}.`);
                    continue;
                }
            }
        }
    } catch (error) {
        console.error(`❌ Lỗi khi crawl bang ${stateName}:`, error);
    }
}
