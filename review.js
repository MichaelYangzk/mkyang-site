const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const GEMINI_API_KEY = 'AIzaSyBZyPusEyVD65LiQr74XFX1ZfI1mm0UpHQ';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${GEMINI_API_KEY}`;
const SITE_URL = 'https://mkyang-site.vercel.app';
const SCREENSHOT_API = `https://image.thum.io/get/width/1440/crop/900/maxAge/0/wait/3/${SITE_URL}?static`;

function download(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        const get = url.startsWith('https') ? https.get : http.get;
        get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                file.close();
                return download(res.headers.location, dest).then(resolve).catch(reject);
            }
            res.pipe(file);
            file.on('finish', () => { file.close(); resolve(dest); });
        }).on('error', (err) => { fs.unlink(dest, () => {}); reject(err); });
    });
}

async function geminiReview(imagePath) {
    const imageData = fs.readFileSync(imagePath).toString('base64');

    const prompt = `You are an elite web design critic from Awwwards (https://www.awwwards.com/websites/nominees/).
Review this personal website screenshot with the highest standards.

Rate it 1-10 on: Design, Usability, Creativity, Content.

Then give EXACTLY 3 specific, actionable improvements. Be very concrete about:
- Exact CSS changes (colors, sizes, spacing, effects)
- Layout improvements
- Animation/interaction enhancements
- Typography tweaks

Focus on what would make this an Awwwards-worthy site. Think: premium feel, cinematic, immersive.

Format:
SCORES: Design: X/10 | Usability: X/10 | Creativity: X/10 | Content: X/10

IMPROVEMENTS:
1. [specific change with exact CSS/design details]
2. [specific change with exact CSS/design details]
3. [specific change with exact CSS/design details]

If all scores are 9+ say "APPROVED" at the end.`;

    const body = {
        contents: [{
            parts: [
                { text: prompt },
                { inlineData: { mimeType: 'image/png', data: imageData } }
            ]
        }]
    };

    const res = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    const json = await res.json();
    if (json.candidates && json.candidates[0]) {
        return json.candidates[0].content.parts[0].text;
    }
    throw new Error('Gemini API error: ' + JSON.stringify(json));
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function isPlaceholder(filePath) {
    const stats = fs.statSync(filePath);
    // thum.io placeholder is ~660KB white page with spinner
    // Real screenshots of dark sites are typically different sizes
    // Also check first bytes for PNG signature + white dominant images
    const buf = fs.readFileSync(filePath);
    // Check if file is too small (error) or matches known placeholder size range
    if (stats.size > 500000 && stats.size < 800000) {
        // Could be placeholder - check for white-dominant image
        // Simple heuristic: look for "thum.io" in raw bytes (their logo is embedded)
        const str = buf.toString('latin1');
        if (str.includes('thum')) return true;
    }
    return stats.size < 10000; // Too small = error image
}

async function main() {
    const imgPath = path.resolve(__dirname, 'screenshot.png');
    const nonce = Date.now();
    const screenshotUrl = `https://image.thum.io/get/width/1440/crop/900/maxAge/0/wait/10/nonce/${nonce}/${SITE_URL}?static`;

    console.log('Triggering screenshot generation...');
    await download(screenshotUrl, imgPath);

    let attempt = 1;
    const maxAttempts = 4;

    while (attempt <= maxAttempts && isPlaceholder(imgPath)) {
        const waitSec = attempt * 20;
        console.log(`Got placeholder (attempt ${attempt}/${maxAttempts}). Waiting ${waitSec}s...`);
        await sleep(waitSec * 1000);
        const retryUrl = `https://image.thum.io/get/width/1440/crop/900/maxAge/0/wait/10/nonce/${nonce + attempt}/${SITE_URL}?static`;
        await download(retryUrl, imgPath);
        attempt++;
    }

    const stats = fs.statSync(imgPath);
    console.log('Screenshot saved:', imgPath, `(${Math.round(stats.size/1024)}KB)`);

    if (isPlaceholder(imgPath)) {
        console.log('WARNING: Still got placeholder after retries. Proceeding anyway.');
    }

    console.log('Sending to Gemini for review...');
    const review = await geminiReview(imgPath);
    console.log('\n--- REVIEW ---\n');
    console.log(review);
    console.log('\n--- END REVIEW ---');
}

main().catch(console.error);
