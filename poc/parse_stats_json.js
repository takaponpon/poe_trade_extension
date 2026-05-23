const fs = require('fs');
const path = require('path');

const enJsonPath = path.join(__dirname, 'stats_en_trade2.json');
const jpJsonPath = path.join(__dirname, 'stats_jp_trade2.json');

const enData = JSON.parse(fs.readFileSync(enJsonPath, 'utf8'));
const jpData = JSON.parse(fs.readFileSync(jpJsonPath, 'utf8'));

console.log("=== API Structure Analysis ===");
console.log(`EN result categories: ${enData.result.length}`);
console.log(`JP result categories: ${jpData.result.length}`);

// Print category IDs and labels
for (let i = 0; i < enData.result.length; i++) {
    const enCat = enData.result[i];
    const jpCat = jpData.result[i];
    console.log(`Category [${i}]:`);
    console.log(`  EN ID: ${enCat.id}, Label: ${enCat.label}, Entries: ${enCat.entries ? enCat.entries.length : 0}`);
    console.log(`  JP ID: ${jpCat.id}, Label: ${jpCat.label}, Entries: ${jpCat.entries ? jpCat.entries.length : 0}`);
    
    // Print first entry sample
    if (enCat.entries && enCat.entries.length > 0) {
        console.log(`    Sample EN entry:`, enCat.entries[0]);
        console.log(`    Sample JP entry:`, jpCat.entries[0]);
    }
}

// Build translation map
// Structure:
// id -> { enText: string, jpText: string, type: string }
const translationMap = {};

enData.result.forEach((enCat, catIdx) => {
    const jpCat = jpData.result[catIdx];
    if (!jpCat || enCat.id !== jpCat.id) {
        console.log(`WARNING: Category ID mismatch at index ${catIdx}: ${enCat.id} vs ${jpCat ? jpCat.id : 'undefined'}`);
        return;
    }
    
    const jpEntriesMap = new Map();
    if (jpCat.entries) {
        jpCat.entries.forEach(entry => {
            if (entry && entry.id) {
                jpEntriesMap.set(entry.id, entry.text);
            }
        });
    }

    if (enCat.entries) {
        enCat.entries.forEach(entry => {
            if (entry && entry.id) {
                const enText = entry.text;
                const jpText = jpEntriesMap.get(entry.id) || null;
                translationMap[entry.id] = {
                    en: enText,
                    jp: jpText,
                    category: enCat.id
                };
            }
        });
    }
});

const totalMapped = Object.keys(translationMap).length;
const totalWithJp = Object.values(translationMap).filter(v => v.jp !== null).length;
console.log(`\nCreated Translation Map. Total entries: ${totalMapped}, Mapped to JP: ${totalWithJp}`);

// Write a small sample map to check
const sampleMap = {};
let sampleCount = 0;
for (const [id, value] of Object.entries(translationMap)) {
    sampleMap[id] = value;
    sampleCount++;
    if (sampleCount >= 10) break;
}
console.log("\nSample Map:", sampleMap);

// Save the full map
fs.writeFileSync(path.join(__dirname, 'stats_translation_map.json'), JSON.stringify(translationMap, null, 2), 'utf8');
console.log("\nSaved full translation map to stats_translation_map.json");
