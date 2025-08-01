const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const baseURL = 'http://0.0.0.0:3001/api/v1/upload';
const AUTH_URL = 'http://0.0.0.0:3001/api/v1/auth/sign_in';

// Token management
let currentToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwaG9uZSI6MSwidXNlcklkIjoiNjgzZGJiYWE4YTk1NjA2NWVlZmExMzJkIiwiZW1haWwiOiJuZ2hpYUBnbWFpbC5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NTQwNDQ3OTgsImV4cCI6MTc1NDA2Mjc5OH0.Hno_vrPIoA9fKqoNIi8Wlmjscl9vqW5zb1r89wLAqpw';
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

const STORE_URL = 'http://0.0.0.0:3001/api/v1/technician/store/crawl';

const getRandomImageFromNailFolder = () => {
    const nailFolderPath = path.join(__dirname, 'Nail');
    const files = fs.readdirSync(nailFolderPath);
    
    const imageFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
    });
    
    if (imageFiles.length === 0) {
        throw new Error('No image files found in Nail folder');
    }
    
    // Select a random image
    const randomIndex = Math.floor(Math.random() * imageFiles.length);
    const selectedImage = imageFiles[randomIndex];
    const imagePath = path.join(nailFolderPath, selectedImage);
    
    return {
        imageName: selectedImage,
        imageBuffer: fs.readFileSync(imagePath),
        imagePath: imagePath  // Add image path for deletion
    };
};

const createStore = async (store) => {
    try {
        const { imageName, imageBuffer, imagePath } = getRandomImageFromNailFolder();
        
        console.log(`Uploading image: ${imageName}`);
        const uploadResponse = await upload(imageName, imageBuffer);
        
        const storeWithImage = {
            ...store,
            image: [uploadResponse.data]
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

const checkStore = async (from_id) => {
    const instance = createAxiosInstance();
    const response = await instance.post('http://0.0.0.0:3001/api/v1/technician/store/check-name', {from_id});
    return response.data;
};
module.exports = { 
    upload, 
    createStore, 
    checkStore, 
    login, 
    createAxiosInstance,
    getValidToken 
};
