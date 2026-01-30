const fs = require('fs');
const path = require('path');

const GEMINI_API_KEY = 'AIzaSyBZyPusEyVD65LiQr74XFX1ZfI1mm0UpHQ';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent?key=${GEMINI_API_KEY}`;

async function geminiCodeReview(htmlContent) {
    const prompt = `You are an elite web design critic from Awwwards (https://www.awwwards.com/websites/nominees/).
Review this personal website HTML/CSS code. Visualize how it would render in a browser and evaluate it with the highest standards.

This is a single-page personal site with:
- Dark space background (#050510) with parallax starfield + nebula glow effects
- Film grain noise overlay
- Editorial serif typography (Playfair Display) with metallic gradient
- Glassmorphism dock for social links
- Breathing green status dot
- Staggered entrance animations
- Scroll indicator

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

If all scores are 9+ say "APPROVED" at the end.

Here is the full HTML:

${htmlContent}`;

    const body = {
        contents: [{
            parts: [{ text: prompt }]
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

async function main() {
    const htmlPath = path.resolve(__dirname, 'index.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

    console.log('Sending HTML to Gemini for code-based review...');
    const review = await geminiCodeReview(htmlContent);
    console.log('\n--- REVIEW ---\n');
    console.log(review);
    console.log('\n--- END REVIEW ---');
}

main().catch(console.error);
