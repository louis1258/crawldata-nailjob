const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const dns = require('dns');
const https = require('https');

const agent = new https.Agent({
    lookup: (hostname, options, cb) => {
      dns.lookup(hostname, { family: 4 }, cb); 
    }
  });

  async function countdownDelay(seconds) {
    return new Promise(resolve => {
      const interval = setInterval(() => {
        process.stdout.write(`\r⏳ Đợi ${seconds}s...  `);
        seconds--;
        if (seconds < 0) {
          clearInterval(interval);
          process.stdout.write('\n✅ Hết thời gian đợi!\n');
          resolve();
        }
      }, 1000);
    });
  }

  const changeIP = async () => {
    try {
      const response = await axios.get('https://api.proxydancu.com/getip/us/9416718afc0daa421c64d1e22bb8db9707650819', {
        httpsAgent: agent
      });
      console.log('🎉 Đổi IP thành công:', response.data);
      return response;
  
    } catch (error) {
      const data = error?.response?.data;
      console.log('❌ Lỗi đổi IP:', data?.error || error.message);
  
      const match = data?.error?.match(/sau (\d+) giây/);
      const waitSeconds = match ? parseInt(match[1]) : 300;
  
      console.log(`🔁 Sẽ thử lại sau ${waitSeconds} giây...`);
      await countdownDelay(waitSeconds);
  
      return await changeIP();
    }
  }
  

const baseURL = 'https://api.staging.nailjob.us/api/v1/upload';
const AUTH_URL = 'https://api.staging.nailjob.us/api/v1/auth/sign_in';

// Token management
let currentToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwaG9uZSI6MSwidXNlcklkIjoiNjgzZGJiYWE4YTk1NjA2NWVlZmExMzJkIiwiZW1haWwiOiJuZ2hpYUBnbWFpbC5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NTQyMDY3MTQsImV4cCI6MTc1NDgxMTUxNH0.jpn2MlHwehUj7wCPX7r2bhX5FNkUPFMzuHmQL7dFlQA';
let refreshToken = null;

// Login credentials 
const LOGIN_CREDENTIALS = {
    account: "nghia@gmail.com",
    password: "12345678"
};

/**
 * Đăng nhập để lấy token mới
 */
const login = async () => {
    try {
        console.log('🔄 Đang đăng nhập để lấy token mới...');
        
        const response = await axios.post(AUTH_URL, LOGIN_CREDENTIALS, {
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.data.statusCode === 201 && response.data.data.token) {
            currentToken = response.data.data.token.accessToken;
            refreshToken = response.data.data.token.refreshToken;
            
            console.log('✅ Đăng nhập thành công, token đã được cập nhật');
            console.log(`👤 User: ${response.data.data.user.email} (${response.data.data.user.role})`);
            
            return currentToken;
        } else {
            throw new Error('Login response format invalid');
        }
    } catch (error) {
        console.error('❌ Lỗi khi đăng nhập:', error.response?.data || error.message);
        throw error;
    }
};

/**
 * Lấy token hiện tại, tự động refresh nếu cần
 */
const getValidToken = async () => {
    return currentToken;
};

/**
 * Tạo axios instance với interceptor để tự động refresh token
 */
const createAxiosInstance = () => {
    const instance = axios.create({
        timeout: 1000000
    });

    // Request interceptor để thêm token
    instance.interceptors.request.use(
        async (config) => {
            const token = await getValidToken();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        (error) => {
            return Promise.reject(error);
        }
    );

    // Response interceptor để xử lý token expired
    instance.interceptors.response.use(
        (response) => {
            return response;
        },
        async (error) => {
            const originalRequest = error.config;

            // Nếu lỗi 401 (Unauthorized) và chưa retry
            if (error.response?.status === 401 && !originalRequest._retry) {
                originalRequest._retry = true;

                try {
                    console.log('🔄 Token hết hạn, đang refresh...');
                    await login();
                    
                    // Retry request với token mới
                    originalRequest.headers.Authorization = `Bearer ${currentToken}`;
                    return instance(originalRequest);
                } catch (refreshError) {
                    console.error('❌ Không thể refresh token:', refreshError.message);
                    return Promise.reject(refreshError);
                }
            }

            return Promise.reject(error);
        }
    );

    return instance;
};

const upload = async (imageName, fileBuffer) => {
    const formData = new FormData();
    formData.append('file', fileBuffer, imageName);

    const config = {
        headers: {
            'Content-Type': `multipart/form-data`,
            ...formData.getHeaders(),
        },
    };
    
    try {
        const instance = createAxiosInstance();
        const response = await instance.post(baseURL, formData, config);
        console.log('Image uploaded successfully:', response.data);

        return response.data;
    } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
    }
};

const STORE_URL = 'https://api.staging.nailjob.us/api/v1/technician/store/crawl';

const getRandomImageUrl = () => {
    const urlsFilePath = path.join(__dirname, 'nail_image_urls.txt');
    
    try {
        const urlsContent = fs.readFileSync(urlsFilePath, 'utf8');
        const urls = urlsContent.trim().split('\n').filter(url => url.trim() !== '');
        
        if (urls.length === 0) {
            throw new Error('No image URLs found in nail_image_urls.txt');
        }
        
        const randomIndex = Math.floor(Math.random() * urls.length);
        const selectedUrl = urls[randomIndex].trim();
        
        console.log(`🎲 Selected random image URL: ${selectedUrl}`);
        
        return selectedUrl;
        
    } catch (error) {
        if (error.code === 'ENOENT') {
            throw new Error('File nail_image_urls.txt not found. Please run upload-all-images.js first to upload images.');
        }
        throw error;
    }
};

const createStore = async (store) => {
    try {
        const randomImageUrl = getRandomImageUrl();
        
        const storeWithImage = {
            ...store,
            image: [randomImageUrl]
        };
        
        console.log('Store payload with image:', storeWithImage);
        
        const instance = createAxiosInstance();
        const response = await instance.post(STORE_URL, storeWithImage, {
            timeout: 60000
        });
        
        return response.data;
        
    } catch (error) {
        console.error('Error in createStore:', error);
        throw error; 
    }
};

const checkStore = async (from_id, from_slug) => {
    const instance = createAxiosInstance();
    const response = await instance.post('https://api.staging.nailjob.us/api/v1/technician/store/check-name', {from_id, from_slug});
    return response.data;
};


module.exports = { 
    upload, 
    createStore, 
    checkStore, 
    login, 
    createAxiosInstance,
    getValidToken,
    changeIP,
    getRandomImageUrl
};
