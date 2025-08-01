const url = require('url');

function parseUrlInfo(urlString) {
    try {
        const parsedUrl = new URL(urlString);
        const queryParams = {};
        
        for (const [key, value] of parsedUrl.searchParams) {
            queryParams[key] = value;
        }
        
        return {
            protocol: parsedUrl.protocol,
            hostname: parsedUrl.hostname,
            pathname: parsedUrl.pathname,
            search: parsedUrl.search,
            queryParams: queryParams,
            // Các thông tin cụ thể cho baonail.com
            storeName: queryParams.stores || null,
            storeId: queryParams.id || null,
            state: queryParams.state || null,
            stype: queryParams.stype || null
        };
    } catch (error) {
        console.error('Lỗi khi parse URL:', error);
        return null;
    }
}

function getStoreId(urlString) {
    const urlInfo = parseUrlInfo(urlString);
    return urlInfo ? urlInfo.storeId : null;
}


function getStoreName(urlString) {
    const urlInfo = parseUrlInfo(urlString);
    return urlInfo ? urlInfo.storeName : null;
}


function buildUrl(baseUrl, newParams = {}) {
    try {
        const parsedUrl = new URL(baseUrl);
        
        // Thêm hoặc cập nhật parameters
        for (const [key, value] of Object.entries(newParams)) {
            parsedUrl.searchParams.set(key, value);
        }
        
        return parsedUrl.toString();
    } catch (error) {
        console.error('Lỗi khi build URL:', error);
        return baseUrl;
    }
}

module.exports = {
    parseUrlInfo,
    getStoreId,
    getStoreName,
    buildUrl
}; 