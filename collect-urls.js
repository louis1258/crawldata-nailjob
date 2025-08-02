const { connect } = require('puppeteer-real-browser');
const fs = require('fs');
const path = require('path');

const TARGET_URL = 'https://baonail.com';

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
        
        // Lưu URLs vào file
        saveUrlsToFile(stateCode, allUrls);
        
        return allUrls;
    } catch (error) {
        console.error(`❌ Lỗi khi lấy URLs cho bang ${stateName}:`, error);
        return [];
    }
}

// Main function
async function collectAllUrls() {
    console.log('🚀 Bắt đầu thu thập URLs cho tất cả các bang...');
    
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
            let totalUrls = 0;
            
            for (const [stateCode, stateName] of statesMap) {
                console.log(`\n🚀 Bắt đầu thu thập URLs cho bang: ${stateName} (${stateCode})`);
                
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
                    
                    const urls = await getAllUrlsForState(page, stateCode, stateName);
                    totalUrls += urls.length;
                    
                    console.log(`⏳ Đợi 30 giây trước khi chuyển sang bang tiếp theo...`);
                    await delay(30000);
                    
                } catch (error) {
                    console.error(`❌ Lỗi khi xử lý bang ${stateName}:`, error);
                    continue;
                }
            }
            
            console.log(`\n🎉 Hoàn thành thu thập URLs!`);
            console.log(`📊 Tổng số URLs đã thu thập: ${totalUrls}`);
            console.log(`📁 Tất cả URLs đã được lưu trong thư mục: ./data/`);
            
        } catch (error) {
            console.error(`Error during URL collection:`, error);
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
collectAllUrls(); 