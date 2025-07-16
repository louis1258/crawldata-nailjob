const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// API endpoint for uploading the file
const baseURL = 'http://77.237.236.3:9000/api/upload';

const upload = async (imageName, fileBuffer) => {
    const formData = new FormData();
    formData.append('file', fileBuffer, imageName);  // Use the buffer directly and provide the filename
    formData.append('type', 'comic_cover');

    const config = {
        headers: {
            'Content-Type': `multipart/form-data`,  // Axios handles the boundary automatically
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Im1pbmhwaG9uZ2hwMjAwMyIsInVzZXJJZCI6IjY3NGYzMDJmODA4YzhlM2U3ZDI4YjM3MyIsImVtYWlsIjoibmd1eWVubmd1eWVuQGdtYWlsLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTczMzY1MjIwMSwiZXhwIjoxNzM2MjQ0MjAxfQ.5r8ho_errD2gYDios2EP4j7VkN5GXeFVj5fTdVL4pQE`,  // Token if required
            ...formData.getHeaders(),  // Automatically set multipart headers
        },
    };
    try {
        const instance = axios.create({
            timeout: 1000000
          });
        const response = await instance.post(baseURL, formData, config);
        console.log('Image uploaded successfully:', response.data);

        return response.data;  // Return the response data (e.g., URL of the uploaded image)
    } catch (error) {
        console.error('Error uploading image:', error);
        throw error;  // Rethrow the error to handle it in the calling code
    }
};

const COMIC_URL = 'http://77.237.236.3:9000/api/comics';
const createComic = (comic) => {
    const config = {
        headers: {
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Im1pbmhwaG9uZ2hwMjAwMyIsInVzZXJJZCI6IjY3NGYzMDJmODA4YzhlM2U3ZDI4YjM3MyIsImVtYWlsIjoibmd1eWVubmd1eWVuQGdtYWlsLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTczMzY1MjIwMSwiZXhwIjoxNzM2MjQ0MjAxfQ.5r8ho_errD2gYDios2EP4j7VkN5GXeFVj5fTdVL4pQE`,  // Add your token here if needed
        },
        timeout: 60000
    };

    return axios.post(COMIC_URL, comic, config)
        .then(response => {
            return response.data;  // Trả về data từ response
        })
        .catch(error => {
            console.error('Error uploading comic:', error);
            throw error;  // Ném lỗi ra ngoài để xử lý ở nơi gọi hàm
        });

}


const CHAPTER_URL = 'http://77.237.236.3:9000/api/chapters';
const createChapter = (chapter) => {
    const config = {
        headers: {
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Im1pbmhwaG9uZ2hwMjAwMyIsInVzZXJJZCI6IjY3NGYzMDJmODA4YzhlM2U3ZDI4YjM3MyIsImVtYWlsIjoibmd1eWVubmd1eWVuQGdtYWlsLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTczMzY1MjIwMSwiZXhwIjoxNzM2MjQ0MjAxfQ.5r8ho_errD2gYDios2EP4j7VkN5GXeFVj5fTdVL4pQE`
        },
        timeout: 60000
    }
    return axios.post(CHAPTER_URL, chapter, config)
    .then(response => {
        return response.data;  // Trả về data từ response
    })
    .catch(error => {
        console.error('Error uploading comic:', error);
        throw error;  // Ném lỗi ra ngoài để xử lý ở nơi gọi hàm
    });
}



const COMICTYPE_URL = 'http://77.237.236.3:9000/api/comic-types/findName';
const createComicType = (type) => {
    const config = {
        headers: {
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Im1pbmhwaG9uZ2hwMjAwMyIsInVzZXJJZCI6IjY3NGYzMDJmODA4YzhlM2U3ZDI4YjM3MyIsImVtYWlsIjoibmd1eWVubmd1eWVuQGdtYWlsLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTczMzY1MjIwMSwiZXhwIjoxNzM2MjQ0MjAxfQ.5r8ho_errD2gYDios2EP4j7VkN5GXeFVj5fTdVL4pQE`
        },
        timeout: 60000
    }
    return axios.post(COMICTYPE_URL, type, config)
    .then(response => {
        return response.data;  // Trả về data từ response
    })
    .catch(error => {
        console.error('Error create comic type :', error);
        throw error;  // Ném lỗi ra ngoài để xử lý ở nơi gọi hàm
    });
}

const COMIC_SLUG = 'http://77.237.236.3:9000/api/comics/check-slug';
const checkSlug = (slug) => {
    const config = {
        headers: {
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Im1pbmhwaG9uZ2hwMjAwMyIsInVzZXJJZCI6IjY3NGYzMDJmODA4YzhlM2U3ZDI4YjM3MyIsImVtYWlsIjoibmd1eWVubmd1eWVuQGdtYWlsLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTczMzY1MjIwMSwiZXhwIjoxNzM2MjQ0MjAxfQ.5r8ho_errD2gYDios2EP4j7VkN5GXeFVj5fTdVL4pQE`
        },
        timeout: 60000
    }
    return axios.get(`${COMIC_SLUG}?slug=${slug}`, config)
    .then(response => {
        return response.data;  // Trả về data từ response
    })
    .catch(error => {
        console.error('Error create comic type :', error);
        throw error;  // Ném lỗi ra ngoài để xử lý ở nơi gọi hàm
    });
}
// Export the function using CommonJS

const EXITS_CHAPTER = 'http://77.237.236.3:9000/api/chapters/order';
checkChapter =  async(payload) =>{
    const config = {
        headers: {
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Im1pbmhwaG9uZ2hwMjAwMyIsInVzZXJJZCI6IjY3NGYzMDJmODA4YzhlM2U3ZDI4YjM3MyIsImVtYWlsIjoibmd1eWVubmd1eWVuQGdtYWlsLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTczMzY1MjIwMSwiZXhwIjoxNzM2MjQ0MjAxfQ.5r8ho_errD2gYDios2EP4j7VkN5GXeFVj5fTdVL4pQE`
        },
        timeout: 60000
    }
    return axios.post(`${EXITS_CHAPTER}`, payload ,  config)
    .then(response => {
        return response.data;  // Trả về data từ response
    })
    .catch(error => {
        console.error('Error create comic type :', error);
        throw error;  // Ném lỗi ra ngoài để xử lý ở nơi gọi hàm
    });
}

const ALL_COMICS = 'http://localhost:9000/api/comics';
allComics =  async(payload) =>{
    const config = {
        headers: {
            'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Im1pbmhwaG9uZ2hwMjAwMyIsInVzZXJJZCI6IjY3NGYzMDJmODA4YzhlM2U3ZDI4YjM3MyIsImVtYWlsIjoibmd1eWVubmd1eWVuQGdtYWlsLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTczMzY1MjIwMSwiZXhwIjoxNzM2MjQ0MjAxfQ.5r8ho_errD2gYDios2EP4j7VkN5GXeFVj5fTdVL4pQE`
        },
        timeout: 60000
    }
    return axios.get(`${ALL_COMICS}` ,  config)
    .then(response => {
        return response.data;  // Trả về data từ response
    })
    .catch(error => {
        console.error('Error create comic type :', error);
        throw error;  // Ném lỗi ra ngoài để xử lý ở nơi gọi hàm
    });
}
module.exports = { upload, createComic,createChapter, createComicType,checkSlug , allComics};
