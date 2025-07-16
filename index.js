const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { upload, createComic, createChapter, createComicType, checkSlug } = require("./api");
const path = require('path');
const createSlug = require("./utils/slug");
const waitForElement = require("./utils/checkElement");
puppeteer.use(StealthPlugin());
const axios = require('axios');
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function gotoWithRetry(page, url, maxRetries = 3) {
    let retries = 0;
    while (retries < maxRetries) {
        try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 200000 });
            return true; // Thành công, thoát vòng lặp
        } catch (error) {
            console.error(`Failed to load ${url} (Attempt ${retries + 1} of ${maxRetries}):`, error);
            retries += 1;
            if (retries < maxRetries) {
                console.log(`Retrying ${url}...`);
            } else {
                console.error(`All retry attempts failed for ${url}`);
                return false; // Tất cả retry đều thất bại
            }
        }
    }
}
async function fetchWithRetry(src, retries = 3, delay = 20000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
      try {
          
        const response = await axios.get(src, { responseType: 'arraybuffer' });
          console.log(`Attempt ${attempt}: Fetch Response Status:`, response.status);

          if (response.status !=200) {
              throw new Error(`HTTP error! Status: ${response.status}`);
          }

          return  response.data; // Use response.text() or response.json() if needed
      } catch (error) {
          console.error(`Attempt ${attempt} failed for ${src}:`, error);

          if (attempt < retries) {
              console.log(`Retrying in ${delay} ms...`);
              await new Promise(res => setTimeout(res, delay));
          } else {
              console.error(`Failed to fetch after ${retries} attempts`);
              throw error; // Re-throw the error after the final failed attempt
          }
      }
  }
}

// const proxyUrl = 'hndc41.proxyxoay.net:14455';  
// const proxyUsername = 'louis1258';
// const proxyPassword = 'Htn@1258';
// const apiKey = '927c7ce8-bc0e-4055-81e7-a0873f5b5412';

const proxyHost = '14.225.52.202'; // IP proxy
const proxyPort = '12345'; // Cổng proxy
const proxyUsername = 'sisf9u7p'; // Username proxy
const proxyPassword = 'pQiD4p0l'; // Password proxy

(async () => {
    const cookies = JSON.parse(fs.readFileSync('cmangal.com_cookies.json', 'utf8'));
    const browser = await puppeteer.launch({
    // executablePath: '/usr/bin/chromium-browser',
     
      headless: false,
      targetFilter: (target) => target.type() !== "other",
    });
    let dataObj = {}
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({
        // 'Authorization': `Bearer ${apiKey}`,
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://cmangal.com/',
    })
    // await page.authenticate({
    //     username: proxyUsername,
    //     password: proxyPassword
    // });
    await page.setUserAgent('Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36')
    // await page.setViewport({ width: 1280, height: 800 });
    await page.setCookie(...cookies)
    await page.mouse.move(100, 200);
    await page.authenticate({
        username: proxyUsername,
        password: proxyPassword,
      });
    await page.mouse.click(100, 200);
    await delay(4000);
    const response  =  await page.goto("https://cmangal.com/album/bat-tu-va-bat-hanh-ban-mau-full-hd/chapter-124-1106334", { waitUntil: 'networkidle2' });
    
    // await gotoWithRetry(page , "https://cmangal.com/album/xuyen-viet-tu-chan-the-gioi-nhung-ta-co-the-luot-mang-60403" , 3)
//   await page.goto("https://cmangal.com/album/hao-quang-pha-kiep-lao-dai-gia-dan-loi-62074/ref/135727", { waitUntil: 'networkidle2' });
console.log(await page.content());
await delay(4000);
  await delay(4000);
  await page.waitForSelector('#content > div > div.book_info > div.book_avatar > img');
  let coverImageSrc =  await page.$$eval('#content > div > div.book_info > div.book_avatar > img', links => {
      return links.map(link => `${link.src}`);
  });
   coverImageSrc = coverImageSrc[0]
   let url 
      try {
        // const response = await axios.get(coverImageSrc, { responseType: 'arraybuffer' }); // Sử dụng arraybuffer để lấy buffer ảnh
        const fileBuffer = await fetchWithRetry(coverImageSrc)
       
            const uniqueFileName = `${uuidv4()}.jpg`;
            // const filePath = path.join(__dirname, uniqueFileName);
            // fs.writeFileSync(filePath, finalBuffer);
             url = await upload(uniqueFileName, fileBuffer); // Ensure you use the correct file path for upload
            dataObj['coverImage'] = url;
        
    } catch (error) {
        console.error(`Error fetching or processing the image from ${coverImageSrc}:`, error);
    }


  await page.waitForSelector('#content > div > div.book_info > div.book_other > h1 > p');
  const title  = await page.$$eval('#content > div > div.book_info > div.book_other > h1 > p', title => {
      return title.map(text => text.textContent);
  });

  dataObj['title'] = title[0];
  dataObj.slug = createSlug(dataObj.title)
  await page.waitForSelector('#book_detail > p');
  const des = await page.$$eval('#book_detail > p', des => {
      return des.map(des => des.textContent);
  });
  dataObj['description'] = des[0];
  dataObj['genres'] = await page.$$eval('#content > div > div.book_info > div.book_other > div.kind > span', genres => {
    return genres.map(genre => genre.textContent.trim() ?? null);  // Extract and trim the text content of each genre
    });

    const dataComicType = {
        name: 'Truyện tranh',
        description: "Thể loại có nội dung trong sáng và cảm động, thường có các tình tiết gây cười, các xung đột nhẹ nhàng",
        status: "Active",
    }
    let typeComicArray =0
    try {
        typeComicArray = await Promise.all(
            dataObj['genres'].map(async (type) => {
                dataComicType.name = type;
                const typeComic = await createComicType(dataComicType);
                return typeComic._id; // Trả về _id của ComicType
            })
        );
    } catch (error) {
        console.log(error);
        return
    }
    dataObj['genres'] = typeComicArray
    console.log(dataObj);
    let resultComic = 0
    const existingComic = await checkSlug(dataObj.slug);
    if (existingComic) {
        console.log(`Comic with slug "${dataObj.slug}" already exists.`);
        resultComic = existingComic;
    }
    else{
            resultComic = await createComic(dataObj);
    }
    
  await page.waitForSelector('#content > div > div.list_chapter.book_menu_module > table > tbody > tr > td > a');
  dataObj['chapters'] = await page.$$eval('#content > div > div.list_chapter.book_menu_module > table > tbody > tr > td > a ', chapters => {
    return chapters.map(chapter => {
        return {
            title: chapter.textContent.trim(),
            link: chapter.href
        };
    });
  });
  console.log(dataObj['chapters']);
  for (const [index, chapter] of dataObj['chapters'].reverse().entries()) {
        const parts = chapter.title.split(" ");
        let chapterNumber = null;

        for (const part of parts) {
            const number = parseFloat(part);
            if (!isNaN(number)) {
                chapterNumber = number;
                break; 
            }
        }
        if (chapterNumber === null) {
            console.error(`Invalid chapter number for chapter: ${chapter.title}`);
            continue; // Bỏ qua chapter nếu không có số chương hợp lệ
        }
    
        
        if (!chapter.link) {
            console.error(`Invalid chapter link for chapter: ${chapter.title}`);
            continue; 
        }
        const payload = {
            comic: resultComic._id,  
            chapter: chapter.link,   
            order: chapterNumber ?? 0    
        };
        try {
            console.log(chapter.link);
            const chapterPayload = {
                id : resultComic._id,
                order: payload.order,
            }
            console.log(chapterPayload);
            const existingChapter = await checkChapter(chapterPayload);
            console.log(existingChapter);
            if (existingChapter) {
                console.log(`Chapter with order "${payload.order}" and link "${payload.chapter}" already exists.`);
                continue; 
            }
            await gotoWithRetry(page, payload.chapter, 3);
            delay(200)
            // Use $eval to extract image sources for the chapter
            await waitForElement(page, 'div.main_content>div#chapter_content_div>div.chapter_content_module>div.chapter_content>img');
            const imagesSrc = await page.$$eval('div.main_content>div#chapter_content_div>div.chapter_content_module>div.chapter_content>img', images => {
                return images.map(img => img.src); // Extract 'src' attributes
            });
            // Process each image source
            console.log(imagesSrc);
            if(imagesSrc.length === 0) {
                throw new Error("Không tìm thấy ảnh trong trang");
            }
            let uploadedImageResults
            try {
                uploadedImageResults = await Promise.all(
                    imagesSrc.map(async (src, imageIndex) => {
                        try {
                            if (!src) {
                                throw new Error(`Không tìm thấy nguồn ảnh tại index: ${imageIndex}`);
                            }
                            // const response = await axios.get(src, { responseType: 'arraybuffer' }); // Sử dụng arraybuffer để lấy buffer ảnh
                            const fileBuffer = await fetchWithRetry(src)
                            if (!fileBuffer){
                                throw new Error("Không tìm thấy ảnh tại nguồn");
                            }
                            const uniqueFileName = `${uuidv4()}.jpg`;
                         
                            try {
                                const url = await upload(uniqueFileName, fileBuffer); // Đảm bảo `upload` có thể xử lý buffer
                                console.log(url);
                                return url;
                            } catch (error) {
                                throw new Error("Lỗi khi tải lên");
                            }
                        
                        } catch (error) {
                            console.error(`Error processing image at index ${imageIndex}:`, error.message);
                            throw new Error("Error upload chapter")
                        }
                    })
                );
            } catch (error) {
                console.error("Image upload failed, stopping process:", error.message);
                throw new Error("failed to upload");
            }
            if (uploadedImageResults.length === 0) {
                throw new Error("Không tải lên được bất kỳ ảnh nào cho chương này.");
            }
            const chapterData = {
                comic: `${payload.comic}`,
                order: `${payload.order}`,
                title: `Chapter ${payload.order}`,
                images: uploadedImageResults // Filter out any null results
            };

            // Save chapter data to your database or perform any action with it
            const chapterCreate = await createChapter(chapterData);
        } catch (err) {
            console.error(`Error scraping link: `, err);
            await page.close();
            throw new Error("Failed to scrape");
        }

}

    })();

/////////////////////////// test api



// const { createComic, upload } = require("./api");
// const createSlug = require("./utils/slug")
// const comic = {
//     coverImage: 'https://i.hinhhinh.com/ebook/190x247/sentouin-hakenshimasu_1526349704.jpg?gt=hdfgdfg&mobile=2',
//     title: 'Sentouin, Hakenshimasu!',
//     genres: [ 'Action', 'Fantasy', 'Supernatural', 'Ecchi' ],
//     description: 'Lấy chinh phục thế giới làm mục đích, hơn thế nữa trong vai trò là một chiến binh tiên phong được phái cử tới địa điểm chiến lược, Chiến binh số 6 lại làm các nhà lãnh đạo cuả tổ chức bí mật Kisaragi đau đầu bởi những hành động của mình. Tỷ như chuyện thay đổi cách gọi lễ tế thần tại địa điểm chiến lược thành “lễ hội XXX”, và cơ số những phát ngôn nhảm. Xa hơn nữa là chuyện biết rõ rằng đánh giá của mình thấp, mà cứ sống chết đòi tăng tiền thưởng. Gần đây, lại có lời đồn rằng, hiện nay, có một chủng loài nghĩ rằng mình là con người, muốn tiêu diệt tất cả những kẻ cùng chung đường, lấy danh nghĩa quân đoàn ma vương. “ Một núi không thế có hai hổ, Thế giới không cần hai tổ chức độc ác!” những vũ khí hiện đại nhất được đưa ra, Chiến tranh xâm chiếm thế giới mới cứ thế bắt đầu!!',
//     status :"Đang ra",
//     genres:["66f193d8e667129319d90b31","66f193d8e667129319d90b31","66f193d8e667129319d90b31"],
//     author:"Đang cập nhật"
// }

// comic.slug = createSlug(comic.title)
// async function main() {
//     try {
//         const result = await createComic(comic);
//         console.log('Comic created:', result);
//     } catch (error) {
//         console.error('Error:', error);
//     }
// }
// main();


////////////////////////////////////////test create chapter


// const { createComic, upload , createChapter} = require("./api");
// const createSlug = require("./utils/slug")
// const chapter = {
//     comic:"6704de46bc71b7e80a26000f",
// 	order:1,
// 	title: "Chapter 1",
// 	content:"Chapter 1 introduces the research problem and the evidence supporting the existence of the problem. It outlines an initial review of the literature on the study topic and articulates the purpose of the study. The definitions of any technical terms necessary for the reader to understand are essential. Chapter 1 also presents the research questions and theoretical foundation (Ph.D.) or conceptual framework (Applied Doctorate) and provides an overview of the research methods (qualitative or quantitative) being used in the study.  ",
// 	images:["https://comics.7f4ce06509889e40c13749bb7df4345f.r2.cloudflarestorage.com/uploads/66f193bee667129319d90b25/6a938655-efab-4bd3-a897-ab12f62a5e98.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=4fae3be834378236e18cec452378eb90%2F20241022%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20241022T132017Z&X-Amz-Expires=604800&X-Amz-Signature=3b3d72ac077cc1f89d73ec24941bd1e3d52b7f9651a7a59f256d91848e40ac10&X-Amz-SignedHeaders=host",
//         "https://comics.7f4ce06509889e40c13749bb7df4345f.r2.cloudflarestorage.com/uploads/66f193bee667129319d90b25/6a938655-efab-4bd3-a897-ab12f62a5e98.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=4fae3be834378236e18cec452378eb90%2F20241022%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20241022T132017Z&X-Amz-Expires=604800&X-Amz-Signature=3b3d72ac077cc1f89d73ec24941bd1e3d52b7f9651a7a59f256d91848e40ac10&X-Amz-SignedHeaders=host",
//         "https://comics.7f4ce06509889e40c13749bb7df4345f.r2.cloudflarestorage.com/uploads/66f193bee667129319d90b25/6a938655-efab-4bd3-a897-ab12f62a5e98.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=4fae3be834378236e18cec452378eb90%2F20241022%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20241022T132017Z&X-Amz-Expires=604800&X-Amz-Signature=3b3d72ac077cc1f89d73ec24941bd1e3d52b7f9651a7a59f256d91848e40ac10&X-Amz-SignedHeaders=host",
//     ]
	
// }

// async function main() {
//     try {
//         const result = await createChapter(chapter);
//         console.log('Comic created:', result);
//     } catch (error) {
//         console.error('Error:', error);
//     }
// }
// main();






////////////////////////////////////Queue/////////////////////////////////////////////////////




// const amqp = require('amqplib');

// async function sendToQueue(storyId) {
//   const connection = await amqp.connect("amqp://localhost"); // Thay đổi IP nếu cần
//   console.info("Kết nối tới RabbitMQ thành công");

//   const channel = await connection.createChannel();
//   const queue = 'crawlQueue'; // Tên hàng đợi

//   await channel.assertQueue(queue, { durable: true }); // Tạo hàng đợi nếu chưa có
  
//   // Gửi công việc (truyện) vào hàng đợi
//   const message = { storyId };
//   channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });

//   console.log(`Đã gửi truyện ${storyId} vào hàng đợi.`);
//   await channel.close();
//   await connection.close();
// }

// // Thêm 15 ID truyện vào hàng đợi
// async function sendMultipleStories() {
//   for (let i = 1; i <= 15; i++) {
//     await sendToQueue(i); // Gửi ID truyện từ 1 đến 15
//   }
// }

// sendMultipleStories().catch(console.error);

// const amqp = require('amqplib');

// async function startWorker() {
//   const connection = await amqp.connect("amqp://localhost"); // Thay đổi IP nếu cần
//   const channel = await connection.createChannel();
//   const queue = 'crawlQueue'; // Tên hàng đợi

//   await channel.assertQueue(queue, { durable: true }); // Tạo hàng đợi nếu chưa có
//   channel.prefetch(1); // Giới hạn số lượng message được gửi đến worker tại một thời điểm

//   console.log("Waiting for messages in %s. To exit press CTRL+C", queue);

//   channel.consume(queue, (msg) => {
//     const message = JSON.parse(msg.content.toString());
//     console.log(`Đã nhận truyện ID: ${message.storyId}`);

//     // Xác nhận rằng message đã được xử lý
//     channel.ack(msg);
//   }, { noAck: false }); // Không tự động xác nhận
// }

// startWorker().catch(console.error);

