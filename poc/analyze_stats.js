const fs = require('fs');
const path = require('path');

const jpPath = path.join(__dirname, 'stat_filter_jp.html');
const enPath = path.join(__dirname, 'stat_filter_en.html');

function parseHtml(filePath) {
    const html = fs.readFileSync(filePath, 'utf8');
    
    // Simple regex parser for our specific HTML format:
    // <i class="mutate-type mutate-type-xxx">type</i> <span>text</span>
    const regex = /<i class="mutate-type mutate-type-([^"]+)">([^<]+)<\/i>\s*<span>([^<]+)<\/span>/g;
    
    const results = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
        results.push({
            typeClass: match[1],
            typeText: match[2].trim(),
            text: match[3].trim()
        });
    }
    return results;
}

const jpStats = parseHtml(jpPath);
const enStats = parseHtml(enPath);

console.log(`Parsed JP stats: ${jpStats.length}`);
console.log(`Parsed EN stats: ${enStats.length}`);

// Compare sizes
if (jpStats.length !== enStats.length) {
    console.log("WARNING: Element counts do not match!");
} else {
    console.log("SUCCESS: Element counts match exactly!");
}

// Print first 10 for side-by-side comparison
console.log("\n--- First 10 Elements Side-by-Side ---");
const limit = Math.min(jpStats.length, enStats.length, 15);
for (let i = 0; i < limit; i++) {
    console.log(`[${i}]`);
    console.log(`  JP: [${jpStats[i].typeClass}] ${jpStats[i].text}`);
    console.log(`  EN: [${enStats[i].typeClass}] ${enStats[i].text}`);
}

// Let's also check if there are other tags or structure in the multiselect__element
// Just in case we missed some disabled categories or other text
function parseCategories(filePath) {
    const html = fs.readFileSync(filePath, 'utf8');
    // Find headers like: <span class="multiselect__option multiselect__option--disabled"><span>Explicit</span></span>
    const regex = /multiselect__option--disabled[^>]*>\s*<span>([^<]+)<\/span>/g;
    const categories = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
        categories.push(match[1].trim());
    }
    return categories;
}

const jpCategories = parseCategories(jpPath);
const enCategories = parseCategories(enPath);

console.log("\n--- Categories ---");
console.log("JP Categories:", jpCategories);
console.log("EN Categories:", enCategories);
