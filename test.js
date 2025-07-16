const axios = require('axios');
const FormData = require('form-data');

// Step 1: Tạo FormData
const form = new FormData();
form.append('func', 'check');
form.append('id', '$2y$10$/p9YtBNt9agfhhQpiMP4ZeVhXZqNHut0Qr9DM28RDlYFbm0qhygX6');
form.append('mylang', 'vi');

axios.post('https://baonail.com/contact_info.php', form, {
    headers: {
        ...form.getHeaders(),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:102.0) Gecko/20100101 Firefox/102.0',
        'Cookie': 'PHPSESSID=hmis0ij7hlp56mu3n2cjpjek23; cID=1ba94e2a1b8d278ab96d; _ga=GA1.2.286523.1752638235; _gid=GA1.2.1325294791.1752638235; _ga_X2L9HVVB62=GS2.2.s1752638235$o1$g0$t1752638235$j60$l0$h0'
    }
})

.then(res => console.log(res.data))
.catch(err => console.error(err.response ? err.response.data : err.message));
