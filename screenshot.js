const fs = require('fs');
const path = require('path');

async function getScreenshotViaPageSpeed() {
    const url = encodeURIComponent('https://mkyang.ai');
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${url}&strategy=desktop&category=performance`;

    console.log('Fetching screenshot via Google PageSpeed API...');
    const res = await fetch(apiUrl, { timeout: 60000 });
    const json = await res.json();

    const screenshot = json.lighthouseResult?.audits?.['final-screenshot']?.details?.data;
    if (!screenshot) {
        console.error('No screenshot in response. Keys:', Object.keys(json));
        throw new Error('Failed to get screenshot from PageSpeed API');
    }

    // screenshot is a data URI like "data:image/jpeg;base64,..."
    const base64Data = screenshot.replace(/^data:image\/\w+;base64,/, '');
    const screenshotPath = path.join(__dirname, 'screenshot.png');
    fs.writeFileSync(screenshotPath, Buffer.from(base64Data, 'base64'));
    console.log('Screenshot saved to:', screenshotPath, '(' + Math.round(base64Data.length / 1024) + 'KB base64)');
    return { path: screenshotPath, base64: base64Data };
}

module.exports = { getScreenshotViaPageSpeed };

if (require.main === module) {
    getScreenshotViaPageSpeed().catch(console.error);
}
