const fs = require('fs');
const path = require('path');

const mapPath = path.join(__dirname, 'stats_translation_map.json');
const translationMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

// Search for "Magic Monsters" in the map
console.log("=== Search 'Magic Monsters' in API Map ===");
for (const [id, info] of Object.entries(translationMap)) {
    if (info.en.toLowerCase().includes("magic monsters") || info.jp.includes("マジックモンスター")) {
        console.log(`ID: ${id}`);
        console.log(`  EN: "${info.en}"`);
        console.log(`  JP: "${info.jp}"`);
        console.log(`  Category: ${info.category}`);
    }
}

console.log("\n=== Search 'Shrines' in API Map ===");
for (const [id, info] of Object.entries(translationMap)) {
    if (info.en.toLowerCase().includes("shrines") && info.en.toLowerCase().includes("chance")) {
        console.log(`ID: ${id}`);
        console.log(`  EN: "${info.en}"`);
        console.log(`  JP: "${info.jp}"`);
    }
}
