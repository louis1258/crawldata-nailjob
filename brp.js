const { connect } = require('puppeteer-real-browser');
const parseAddressInfo = require('./utils/parseAddressInfo');
const TARGET_URL = 'https://baonail.com';
const { createStore, checkStore } = require('./api');

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
        host: '51.79.185.150',
        port: '8902',
        username: 'vPoIinghia',
        password: 'gD5vJdJj'
    },
    {
        host: '103.207.36.217',
        port: '8095',
        username: 'GbO8knghia',
        password: 'XJOLjllA'
    },
    {
        host: '139.99.36.55',
        port: '8154',
        username: '40RMJnghia',
        password: 'If0LqZvU'
    },
];

function getRandomProxy() {
    return proxies[Math.floor(Math.random() * proxies.length)];
}

async function createBrowserWithProxy(proxy) {
    return await connect({
        headless: 'auto',
        customConfig: {},
        skipTarget: [],
        fingerprint: true,
        turnstile: true,
        connectOption: {},
        tf: true,
        args: ['--disable-web-security', '--disable-features=IsolateOrigins,site-per-process', '--disable-webgl', '--disable-gpu'],
        proxy: proxy
    });
}

async function fetchWithRetry(src, retries = 3) {
    let attempt = 0;
    while (attempt < retries) {
        try {
            const response = await fetch(src, {
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
            return await response.arrayBuffer();
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
            const url = await uploadFunction(uniqueFileName, readableStream, options);
            console.log(`Upload successful: ${url}`);
            return url;
        } catch (error) {
            console.error(`Attempt ${attempt} failed for ${uniqueFileName}:`, error.message);
            if (attempt === retries) {
                throw new Error(`Failed to upload after ${retries} attempts: ${uniqueFileName}`);
            }
            console.log(`Retrying upload in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
}

let currentProxy = getRandomProxy();
connect({
    headless: 'auto',
    customConfig: {},
    skipTarget: [],
    fingerprint: true,
    turnstile: true,
    connectOption: {},
    tf: true,
    args: ['--disable-web-security', '--disable-features=IsolateOrigins,site-per-process', '--disable-webgl', '--disable-gpu'],
    proxy: currentProxy
})
    .then(async response => {
        let { browser, page } = response;

        try {
            while (true) {
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
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_2_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
                    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
                    "Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36",
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36",
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_0_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36",
                    "Mozilla/5.0 (Windows NT 6.3; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/106.0.0.0 Safari/537.36",
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 12_3_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/105.0.0.0 Safari/537.36",
                    "Mozilla/5.0 (X11; Ubuntu; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36",
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36",
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/102.0.0.0 Safari/537.36",
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.0.0 Safari/537.36"
                ];
                const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
                await page.setUserAgent(randomUserAgent);
                const pageUrl = `${TARGET_URL}/index.php?state=OH&stype=&stype=1`;
                
                while (true) {
                    await page.goto(pageUrl, { waitUntil: 'networkidle2' });
                    await delay(2000)
                    if (page) {
                        const allUrls = [];
                        const newUrls = await page.$$eval('#uuuuu > div', divs => {
                            return divs
                                .map(div => {
                                    const aTag = div.querySelector('a');
                                    return aTag ? aTag.href : null;
                                })
                                .filter(href => 
                                    href !== null && 
                                    !href.includes('func=banner&act=banners')
                                );
                        });
                        allUrls.push(...newUrls);
                        await delay(5000);
                        await page.waitForSelector('#pageid2 > div > div > a', { timeout: 100000 });
                        await page.click('#pageid2 > div > div > a')
                        const newUrlsPage2 = await page.$$eval('#uuuuu > div', divs => {
                            return divs
                                .map(div => {
                                    const aTag = div.querySelector('a');
                                    return aTag ? aTag.href : null;
                                })
                                .filter(href => 
                                    href !== null && 
                                    !href.includes('func=banner&act=banners')
                                );
                        });
                        allUrls.push(...newUrls, ...newUrlsPage2);
                        
                        await delay(5000);
                        await page.waitForSelector('#pageid3 > div > div > a.btn.btn-default.pull-right', { timeout: 100000 });
                        await page.click('#pageid3 > div > div > a.btn.btn-default.pull-right')
                        const newUrlsPage3 = await page.$$eval('#uuuuu > div', divs => {
                            return divs
                                .map(div => {
                                    const aTag = div.querySelector('a');
                                    return aTag ? aTag.href : null;
                                })
                                .filter(href => 
                                    href !== null && 
                                    !href.includes('func=banner&act=banners')
                                );
                        });

                        allUrls.push(...newUrls, ...newUrlsPage2, ...newUrlsPage3);

                        for (let href of newUrls) {
                            let success = false;
                        
                            for (let attempt = 1; attempt <= 3; attempt++) {
                                try {
                                    if (browser) {
                                        await browser.close();
                                    }
                        
                                    const newProxy = getRandomProxy();
                                    console.log(`🔄 Attempt ${attempt}: Switching to proxy ${newProxy.host}:${newProxy.port} for ${href}`);
                        
                                    const newResponse = await createBrowserWithProxy(newProxy);
                                    browser = newResponse.browser;
                                    page = newResponse.page;
                        
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
                        
                                    await gotoWithRetry(page, href, 3);
                                    await delay(10000);
                                    let dataObj = {};
                        
                                    await page.waitForSelector('div[id^="id"] > div.ellipsis > b');
                                    const name = await page.$eval('div[id^="id"] > div.ellipsis > b', el => el.textContent.trim());
                                    dataObj['name'] = name ?? null;

                                    const check = await checkStore(name);
                                    if (check.data) {
                                        console.log(`✅ Store ${name} already exists`);
                                        break;
                                    }
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
                                    dataObj['city'] = parsed.city ?? 'Cleveland';
                                    dataObj['state'] = parsed.state ?? 'OH';
                                    dataObj['zipcode'] = parsed.zipcode ?? '44113';
                        
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
                        
                                    console.log(`✅ Data scraped (attempt ${attempt}) with proxy ${newProxy.host}:${newProxy.port}:`, dataObj);
                                    await createStore(dataObj);
                                    await delay(30000);
                        
                                    success = true;
                                    break; 
                        
                                } catch (error) {
                                    console.error(`❗ Attempt ${attempt} failed for ${href}:`, error.message);
                                    await delay(5000); 
                                }
                            }
                        
                            if (!success) {
                                console.warn(`⛔ Skipping ${href} after 3 failed attempts.`);
                                continue;
                            }
                        }
                        
                        
                    }
                }
            }
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
