function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function waitForElement(page, selector, maxAttempts = 10) {
    let attempts = 0;
    while (attempts < maxAttempts) {
      attempts++;
        element = await page.$(selector);
      if (element) {
        await delay(2000); // Đợi 2 giây trước khi trả về element
        return true;
      }
      await delay(2000); // Đợi 2 giây trước khi thử lại
    }

    // console.log('Max attempts reached. Element not found.');
    return null;
}


module.exports = waitForElement