const axios = require('axios');

// Token và Bucket ID
const authorizationToken = '4_0038beeab24d9860000000001_01b8e3d7_24d9f9_acct_rT-xV1SH_MJ0RCEkqyLNezHNLaM=';
const bucketId = 'd8bb2e1e3a7ba2049d390816';

// Gửi yêu cầu để lấy upload URL
axios.post('https://api003.backblazeb2.com/b2api/v2/b2_get_upload_url', {
    bucketId: bucketId
}, {
    headers: {
        'Authorization': authorizationToken
    }
}).then(response => {
    console.log('Upload URL:', response.data.uploadUrl);
    console.log('Upload Auth Token:', response);
}).catch(error => {
    console.error('Error:', error.response ? error.response.data : error.message);
});

