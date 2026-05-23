const fs = require('fs');
const path = require('path');

const enHtmlPath = path.join(__dirname, 'stat_filter_en.html');
const jpHtmlPath = path.join(__dirname, 'stat_filter_jp.html');
const mapPath = path.join(__dirname, 'stats_translation_map.json');

const translationMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

// Parse HTML file and get text
function parseHtml(filePath) {
    const html = fs.readFileSync(filePath, 'utf8');
    const regex = /<i class="mutate-type mutate-type-([^"]+)">([^<]+)<\/i>\s*<span>([^<]+)<\/span>/g;
    const results = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
        results.push({
            typeClass: match[1], // e.g. "pseudo", "explicit"
            typeText: match[2].trim(), // e.g. "pseudo", "explicit"
            text: match[3].trim() // e.g. "+#% total to Cold Resistance"
        });
    }
    return results;
}

const htmlEnStats = parseHtml(enHtmlPath);
const htmlJpStats = parseHtml(jpHtmlPath);

// Let's create an reverse map from text to ID using our translationMap
// Key: text.toLowerCase(), Value: Array of { id, category }
const enTextToIdMap = {};
const jpTextToIdMap = {};

for (const [id, info] of Object.entries(translationMap)) {
    if (info.en) {
        const enKey = info.en.toLowerCase().replace(/\s+/g, ' ');
        if (!enTextToIdMap[enKey]) {
            enTextToIdMap[enKey] = [];
        }
        enTextToIdMap[enKey].push({ id, ...info });
    }
    if (info.jp) {
        const jpKey = info.jp.toLowerCase().replace(/\s+/g, ' ');
        if (!jpTextToIdMap[jpKey]) {
            jpTextToIdMap[jpKey] = [];
        }
        jpTextToIdMap[jpKey].push({ id, ...info });
    }
}

console.log(`=== Match English HTML to API Stats ===`);
let matchedEnCount = 0;
let unmatchedEn = [];

htmlEnStats.forEach((stat, index) => {
    const key = stat.text.toLowerCase().replace(/\s+/g, ' ');
    const matches = enTextToIdMap[key] || [];
    
    // Sometimes there can be matches from different categories (e.g. explicit vs fractured)
    // Filter by category type if possible
    let finalMatch = null;
    if (matches.length > 0) {
        // Try to match category (e.g. mutate-type-pseudo maps to pseudo category)
        const expectedCat = stat.typeClass === 'mutate-type-rune' ? 'rune' : stat.typeClass;
        
        const catMatch = matches.find(m => m.category === expectedCat || m.category === stat.typeClass);
        if (catMatch) {
            finalMatch = catMatch;
        } else {
            finalMatch = matches[0]; // fallback
        }
    }

    if (finalMatch) {
        matchedEnCount++;
    } else {
        unmatchedEn.push({ index, text: stat.text, type: stat.typeClass });
    }
});

console.log(`Matched EN stats: ${matchedEnCount} / ${htmlEnStats.length} (${(matchedEnCount/htmlEnStats.length*100).toFixed(1)}%)`);

if (unmatchedEn.length > 0) {
    console.log("\nSome unmatched English stats in HTML (first 5):");
    unmatchedEn.slice(0, 5).forEach(um => {
        console.log(`  [${um.index}] Type: ${um.type}, Text: "${um.text}"`);
    });
}

console.log(`\n=== Match Japanese HTML to API Stats ===`);
let matchedJpCount = 0;
let unmatchedJp = [];

htmlJpStats.forEach((stat, index) => {
    const key = stat.text.toLowerCase().replace(/\s+/g, ' ');
    const matches = jpTextToIdMap[key] || [];
    
    let finalMatch = null;
    if (matches.length > 0) {
        const expectedCat = stat.typeClass === 'mutate-type-rune' ? 'rune' : stat.typeClass;
        const catMatch = matches.find(m => m.category === expectedCat || m.category === stat.typeClass);
        if (catMatch) {
            finalMatch = catMatch;
        } else {
            finalMatch = matches[0];
        }
    }

    if (finalMatch) {
        matchedJpCount++;
    } else {
        unmatchedJp.push({ index, text: stat.text, type: stat.typeClass });
    }
});

console.log(`Matched JP stats: ${matchedJpCount} / ${htmlJpStats.length} (${(matchedJpCount/htmlJpStats.length*100).toFixed(1)}%)`);

if (unmatchedJp.length > 0) {
    console.log("\nSome unmatched Japanese stats in HTML (first 5):");
    unmatchedJp.slice(0, 5).forEach(um => {
        console.log(`  [${um.index}] Type: ${um.type}, Text: "${um.text}"`);
    });
    
    // Let's print out what is wrong with the first unmatched JP to see if we can fix it by fuzzy matching
    const firstUnmatched = unmatchedJp[0];
    const enEquivalent = htmlEnStats[firstUnmatched.index];
    console.log(`\nExample of discrepancy at index ${firstUnmatched.index}:`);
    console.log(`  EN HTML: "${enEquivalent.text}"`);
    console.log(`  JP HTML: "${firstUnmatched.text}"`);
    
    // Let's see if the EN HTML has a match in the API
    const enKey = enEquivalent.text.toLowerCase().replace(/\s+/g, ' ');
    const enMatches = enTextToIdMap[enKey] || [];
    if (enMatches.length > 0) {
        console.log(`  API ID for EN: "${enMatches[0].id}"`);
        console.log(`  API JP Text for that ID: "${enMatches[0].jp}"`);
    }
}
