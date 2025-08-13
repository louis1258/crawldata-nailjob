const { MongoClient } = require('mongodb');
const { Types } = require('mongoose');
const OpenAI = require('openai');
const axios = require('axios');
const parseAddressInfo = require('./utils/parseAddressInfo');
const cron = require('node-cron');

const mongoConfig = {
  // url: 'mongodb://louis1258:Htn%22%401258@34.60.34.86:27017/nailjob?directConnection=true&authSource=admin&appName=mongosh+2.5.3',
  // url: 'mongodb+srv://louis1258:nghiahothanh319@cluster0.2xxsgb1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',  
  url: 'mongodb+srv://nghiahtnailjob:JsjkjjHFMolmu3zF@cluster0.odnmaq4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
  dbName: 'test'
};

const openai = new OpenAI({
});

const GOOGLE_TRANSLATE_BASE_URL = 'https://translation.googleapis.com/language/translate/v2';

async function translateText(text, targetLanguage) {
  try {
    const url = `${GOOGLE_TRANSLATE_BASE_URL}?key=${GOOGLE_TRANSLATE_API_KEY}`;
    const body = {
      q: text,
      target: targetLanguage,
      format: 'text',
    };

    const response = await axios.post(url, body, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.data.data.translations[0].translatedText;
  } catch (error) {
    console.error(`❌ Translation error for ${targetLanguage}:`, error.message);
    return text; // Trả về text gốc nếu dịch fail
  }
}

async function formatDescriptionAndAddressWithGPT(description, address) {
  const prompt = `
Format lại đoạn văn bản sau thành dạng markdown rõ ràng, KHÔNG tạo tiêu đề chính, chỉ chia thành các đoạn văn và bullet points cho dễ đọc:

"${description}"

Yêu cầu:
- KHÔNG tạo tiêu đề chính (#)
- Chia thành các đoạn văn rõ ràng
- Sử dụng bullet points (-) cho các thông tin quan trọng
- Giữ nguyên ý nghĩa và thông tin
- Format chuyên nghiệp và dễ đọc
- Bắt đầu trực tiếp với nội dung, không có heading
- Nếu không có phone number thì sẽ thay thành mặc định 442-888-9999

Và parse địa chỉ sau thành JSON object với các trường:
- address: địa chỉ đường
- city: tên thành phố
- zipcode: mã bưu điện

Địa chỉ: "${address}"

Trả về 2 phần:
1. Description đã format (không có heading)
2. JSON object cho địa chỉ

Ví dụ:
[Description đã format]

{"address": "123 Main St", "city": "New York", "zipcode": "10001"}
    `;

  async function makeRequest() {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 1500,
      temperature: 0.7
    });
    return completion.choices[0].message.content;
  }

  try {
    const response = await makeRequest();
    const parts = response.split('\n\n');
    let formattedDescription = parts[0];
    let addressFields = {};

    const jsonMatch = response.match(/\{.*\}/s);
    if (jsonMatch) {
      try {
        addressFields = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error('❌ Failed to parse address JSON:', parseError.message);
        addressFields = parseAddressInfo(address);
      }
    } else {
      addressFields = parseAddressInfo(address);
    }

    return { formattedDescription, addressFields };
  } catch (error) {
    if (error.message.includes('quota') || error.message.includes('billing')) {
      console.error('❌ OpenAI API quota exceeded. Please check your usage limits.');
    } else if (error.message.includes('rate') || error.message.includes('429')) {
      console.error('❌ Rate limit exceeded. Please wait a moment and try again.');
      console.log('⏳ Waiting 3 seconds before retrying...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      try {
        const retryResponse = await makeRequest();
        const parts = retryResponse.split('\n\n');
        let formattedDescription = parts[0];
        let addressFields = {};

        const jsonMatch = retryResponse.match(/\{.*\}/s);
        if (jsonMatch) {
          try {
            addressFields = JSON.parse(jsonMatch[0]);
          } catch (parseError) {
            addressFields = parseAddressInfo(address);
          }
        } else {
          addressFields = parseAddressInfo(address);
        }

        return { formattedDescription, addressFields };
      } catch (retryError) {
        console.error('❌ Retry also failed:', retryError.message);
        return {
          formattedDescription: description,
          addressFields: parseAddressInfo(address)
        };
      }
    } else {
      console.error('❌ OpenAI API error:', error.message);
      return {
        formattedDescription: description,
        addressFields: parseAddressInfo(address)
      };
    }
  }
}

async function processStoreDescription(description, address) {
  console.log('🔄 Processing store description and address...');

  console.log('  📝 Step 1: Formatting description and parsing address with GPT...');
  const { formattedDescription, addressFields } = await formatDescriptionAndAddressWithGPT(description, address);
  console.log('  ✅ GPT formatting and address parsing completed');

  console.log('  🌐 Step 2: Translating with Google Translate...');
  const languages = ['en', 'vi', 'es', 'zh'];
  const translatedDescriptions = {};

  translatedDescriptions['vi'] = formattedDescription;

  for (const lang of languages) {
    if (lang !== 'vi') {
      console.log(`    Translating to ${lang}...`);
      const translated = await translateText(formattedDescription, lang);
      translatedDescriptions[lang] = translated;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log('  ✅ Translation completed');
  return { translatedDescriptions, addressFields };
}

async function updateStoreDescriptions() {
  let mongoClient;

  try {
    mongoClient = new MongoClient(mongoConfig.url);
    await mongoClient.connect();
    const db = mongoClient.db(mongoConfig.dbName);
    const storesCollection = db.collection('stores');

    const stores = await storesCollection.find({ is_modify: false }).toArray();

    console.log(`📊 Found ${stores.length} stores to update (is_modify = false)`);

    for (let i = 0; i < stores.length; i++) {
      const store = stores[i];
      console.log(`\n🔄 Processing store ${i + 1}/${stores.length}: ${store.name}`);

      if (store.description && store.description.vi) {
        const originalDescription = store.description.vi;
        const address = store.address;
        const { translatedDescriptions, addressFields } = await processStoreDescription(originalDescription, address);

        const result = await storesCollection.updateOne(
          { _id: new Types.ObjectId(store._id) },
          {
            $set: {
              description: translatedDescriptions,
              address: addressFields.address || address,
              city: addressFields.city || '',
              zipcode: addressFields.zipcode || '',
              is_modify: true
            }
          }
        );

        if (result.modifiedCount > 0) {
          console.log(`  ✅ Updated description for ${store.name}`);
          console.log(`     Languages: ${Object.keys(translatedDescriptions).join(', ')}`);
          console.log(`     AI Parsed Address: ${addressFields.address || 'N/A'} | ${addressFields.city || 'N/A'} | ${addressFields.zipcode || 'N/A'}`);
          console.log(`     is_modify: true`);
        } else {
          console.log(`  ⚠️  No changes made for ${store.name}`);
        }

        await new Promise(resolve => setTimeout(resolve, 2000));

      }
    }

    console.log('\n✅ All store descriptions updated successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    if (mongoClient) await mongoClient.close();
  }
}

function startCronJob() {
  console.log('🚀 Starting cron scheduler...');
  console.log('📅 Schedule: Every hour at minute 0');
  console.log('⏰ Timezone: Asia/Ho_Chi_Minh (Vietnam)');
  console.log('💡 Press Ctrl+C to stop the scheduler');
  
  cron.schedule('0 * * * *', async () => {
    console.log(`\n⏰ [${new Date().toLocaleString()}] Running scheduled task...`);
    try {
      await updateStoreDescriptions();
      console.log(`✅ Scheduled task completed at ${new Date().toLocaleString()}`);
    } catch (error) {
      console.error(`❌ Scheduled task failed: ${error.message}`);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Ho_Chi_Minh"
  });
  
  console.log('✅ Cron scheduler is running...');
  console.log('🔄 Next execution: Every hour at minute 0');
}

const args = process.argv.slice(2);
const isCronMode = args.includes('--cron') || args.includes('-c');

if (isCronMode) {
  startCronJob();
  
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down cron scheduler...');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down cron scheduler...');
    process.exit(0);
  });
} else {
  console.log('🔄 Running update once...');
  updateStoreDescriptions();
}
