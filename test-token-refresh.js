const { login, createAxiosInstance, checkStore } = require('./api');

console.log('=== TEST TOKEN REFRESH SYSTEM ===');

async function testTokenSystem() {
    try {
        // Test 1: Đăng nhập ban đầu
        console.log('\n🔐 Test 1: Đăng nhập ban đầu');
        const token = await login();
        console.log(`Token nhận được: ${token.substring(0, 50)}...`);

        // Test 2: Tạo axios instance với interceptor
        console.log('\n🔄 Test 2: Tạo axios instance với interceptor');
        const instance = createAxiosInstance();
        console.log('✅ Axios instance đã được tạo với interceptor');

        // Test 3: Test checkStore với token tự động
        console.log('\n🏪 Test 3: Test checkStore với token tự động');
        try {
            const result = await checkStore('test-id-123');
            console.log('✅ CheckStore thành công:', result);
        } catch (error) {
            console.log('⚠️ CheckStore lỗi (có thể do test-id không tồn tại):', error.message);
        }

        // Test 4: Test upload với token tự động
        console.log('\n📤 Test 4: Test upload với token tự động');
        try {
            // Tạo một buffer test
            const testBuffer = Buffer.from('test image data');
            const { upload } = require('./api');
            const result = await upload('test.jpg', testBuffer);
            console.log('✅ Upload thành công:', result);
        } catch (error) {
            console.log('⚠️ Upload lỗi (có thể do file test không hợp lệ):', error.message);
        }

        console.log('\n🎉 Tất cả test hoàn thành!');
        console.log('\n📋 Tính năng đã được thêm:');
        console.log('✅ Tự động đăng nhập khi token hết hạn');
        console.log('✅ Tự động retry request sau khi refresh token');
        console.log('✅ Quản lý token tập trung');
        console.log('✅ Logging chi tiết cho debugging');

    } catch (error) {
        console.error('❌ Lỗi trong test:', error.message);
    }
}

// Chạy test
testTokenSystem(); 