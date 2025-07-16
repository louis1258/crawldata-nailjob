const puppeteer = require('puppeteer-extra');
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');
const adblocker = AdblockerPlugin({
  blockTrackers: true // default: false
})
puppeteer.use(adblocker)

async function startBrowser(){
    let browser;
    try {
        console.log("Opening the browser......");
        browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium-browser', args: [ '--disable-gpu', '--disable-setuid-sandbox', '--no-sandbox', '--no-zygote' ], headless:'shell' })
    } catch (err) {
        console.error("Could not create a browser instance => ", err);
    }
    return browser;
}

module.exports = {
    startBrowser
};
