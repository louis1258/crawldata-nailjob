const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const baseURL = 'http://localhost:3000/api/v1/upload';

const upload = async (imageName, fileBuffer) => {
    const formData = new FormData();
    formData.append('file', fileBuffer, imageName);

    const config = {
        headers: {
            'Content-Type': `multipart/form-data`,
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwaG9uZSI6MSwidXNlcklkIjoiNjgzMDRhOGJjNjA5ZjJkNzU0NDUwN2M3IiwiZW1haWwiOiJuZ2hpYUBnbWFpbC5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NTI2NjEyNDAsImV4cCI6MTc1MjY4Mjg0MH0.GLZvAsD0bfPl_EF3Lw6EGYe90EPNF7-PWw7X25uiumA`,  // Token if required
            ...formData.getHeaders(),
        },
    };
    try {
        const instance = axios.create({
            timeout: 1000000
          });
        const response = await instance.post(baseURL, formData, config);
        console.log('Image uploaded successfully:', response.data);

        return response.data;
    } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
    }
};

const STORE_URL = 'http://localhost:3000/api/v1/technician/store/crawl';

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
        
        try {
            fs.unlinkSync(imagePath);
            console.log(`Image deleted from Nail folder: ${imageName}`);
        } catch (deleteError) {
            console.error(`Error deleting image ${imageName}:`, deleteError);
            // Don't throw error here, just log it since upload was successful
        }
        
        // Add the image URL to the store payload
        const storeWithImage = {
            ...store,
            image: [uploadResponse.data]
        };
        
        console.log('Store payload with image:', storeWithImage);
        
        const config = {
            headers: {
                'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwaG9uZSI6MSwidXNlcklkIjoiNjgzMDRhOGJjNjA5ZjJkNzU0NDUwN2M3IiwiZW1haWwiOiJuZ2hpYUBnbWFpbC5jb20iLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NTI2NjEyNDAsImV4cCI6MTc1MjY4Mjg0MH0.GLZvAsD0bfPl_EF3Lw6EGYe90EPNF7-PWw7X25uiumA`,  // Add your token here if needed
            },
            timeout: 60000
        };

        const response = await axios.post(STORE_URL, storeWithImage, config);
        return response.data;
        
    } catch (error) {
        console.error('Error in createStore:', error);
        throw error; 
    }
};

module.exports = { upload, createStore};
