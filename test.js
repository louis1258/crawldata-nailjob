const { v4: uuidv4 } = require('uuid');
const { upload, createComic, createChapter, createComicType, checkSlug } = require("./api");
const fetchWithTimeout = (url, options, timeout = 10000) => {
    return Promise.race([
        fetch(url, options),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timed out')), timeout)
        )
    ]);
};

const imageUrl = 'https://scontent.fsgn2-9.fna.fbcdn.net/v/t39.30808-1/278246634_351044933708661_1357101858945036765_n.jpg?stp=cp0_dst-jpg_s50x50_tt6&_nc_cat=1&ccb=1-7&_nc_sid=fe756c&_nc_eui2=AeEYBxIIiL03q5Q-vFPZ_2_iCw7TDzTdrLsLDtMPNN2su1eSzlZ9MW-cCxVf0ToncejbSz-Jqc1WqTRJP7GTozvI&_nc_ohc=aIifpzyum0UQ7kNvgFpUNBc&_nc_oc=AdiOhgKDux7N1wgQ8FiveJWLhIv2MeDab__z9fEuOegB_oO-59AuStr76SeI_blU63AepIRkIxUMrbimX67qQFWZ&_nc_zt=24&_nc_ht=scontent.fsgn2-9.fna&_nc_gid=A9NBjr0a9y_Yev65Y2fYEla&oh=00_AYBtwZMK2edhm6NM3Bj-yq86gzW--900HLpnMunvl_7e2Q&oe=678DBA1F';
const fs = require('fs');
const { Readable } = require('stream');

fetchWithTimeout(imageUrl, {
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.82 Safari/537.36',
        'Referer': 'https://goctruyentranhvui9.com/',
        'Accept': 'image/webp,*/*',
        'Cache-Control': 'no-cache',
        'Accept-Encoding': 'gzip, deflate, br'
    }
})
    .then(async response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const buffer = await response.arrayBuffer();
        const nodeBuffer = Buffer.from(buffer);
        const uniqueFileName = `${uuidv4()}.jpg`;
        // const hash = crypto.createHash('sha1').update(nodeBuffer).digest('hex');
        // Optionally save the image to verify it's downloaded
        const readableStream = new Readable();
        readableStream.push(nodeBuffer);
        readableStream.push(null);
        const url = await upload(uniqueFileName, readableStream); // Đảm bảo `upload` có thể xử lý buffer
        console.log(url);
        fs.writeFileSync('downloaded_image.webp', Buffer.from(buffer));
        console.log('Image saved as downloaded_image.webp');
    })
    .catch(error => {
        console.error('Error fetching image:', error.message);
    });

//     await gotoWithRetry(page, payload.chapter, 3);
// delay(200)
// // Use $eval to extract image sources for the chapter
// await waitForElement(page, 'div.main_content>div#chapter_content_div>div.chapter_content_module>div.chapter_content>img');
// const imagesSrc = await page.$$eval('div.main_content>div#chapter_content_div>div.chapter_content_module>div.chapter_content>img', images => {
//     return images.map(img => img.src); // Extract 'src' attributes
// });
// // Process each image source
// console.log(imagesSrc);
// if (imagesSrc.length === 0) {
//     throw new Error("Không tìm thấy ảnh trong trang");
// }
// let uploadedImageResults
// try {
//     uploadedImageResults = await Promise.all(
//         imagesSrc.map(async (src, imageIndex) => {
//             try {
//                 if (!src) {
//                     throw new Error(`Không tìm thấy nguồn ảnh tại index: ${imageIndex}`);
//                 }
//                 // const response = await axios.get(src, { responseType: 'arraybuffer' }); // Sử dụng arraybuffer để lấy buffer ảnh
//                 const fileBuffer = await fetchWithRetry(src)
//                 if (!fileBuffer) {
//                     throw new Error("Không tìm thấy ảnh tại nguồn");
//                 }
//                 const uniqueFileName = `${uuidv4()}.jpg`;

//                 try {
//                     const url = await upload(uniqueFileName, fileBuffer); // Đảm bảo `upload` có thể xử lý buffer
//                     console.log(url);
//                     return url;
//                 } catch (error) {
//                     throw new Error("Lỗi khi tải lên");
//                 }

//             } catch (error) {
//                 console.error(`Error processing image at index ${imageIndex}:`, error.message);
//                 throw new Error("Error upload chapter")
//             }
//         })
//     );
// } catch (error) {
//     console.error("Image upload failed, stopping process:", error.message);
//     throw new Error("failed to upload");
// }
// if (uploadedImageResults.length === 0) {
//     throw new Error("Không tải lên được bất kỳ ảnh nào cho chương này.");
// }
// const chapterData = {
//     comic: `${payload.comic}`,
//     order: `${payload.order}`,
//     title: `Chapter ${payload.order}`,
//     images: uploadedImageResults // Filter out any null results
// };

// // Save chapter data to your database or perform any action with it
// const chapterCreate = await createChapter(chapterData);