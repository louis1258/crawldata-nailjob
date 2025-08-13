const cron = require('node-cron');
const { exec } = require('child_process');

async function runScripts() {
    try {
        console.log('🏪 Running brp-nailjob.js...');
        exec('node brp-nailjob.js', (error, stdout, stderr) => {
            if (error) console.error('❌ brp-nailjob.js failed:', error.message);
            else console.log('✅ brp-nailjob.js completed');
        });
        
        setTimeout(() => {
            console.log('💅 Running brp-salon.js...');
            exec('node brp-salon.js', (error, stdout, stderr) => {
                if (error) console.error('❌ brp-salon.js failed:', error.message);
                else console.log('✅ brp-salon.js completed');
            });
        }, 5 * 60 * 1000);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

cron.schedule('0 0 * * *', runScripts, {
    timezone: "Asia/Ho_Chi_Minh"
});

if (process.argv.includes('--now')) {
    console.log('🚀 Running immediately...');
    runScripts();
} else {
    console.log('⏰ Waiting for next run at 00:00...');
}

process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    process.exit(0);
});
