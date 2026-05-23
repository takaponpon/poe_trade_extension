const fs = require('fs');
const path = require('path');

const mapPath = path.join(__dirname, 'stats_translation_map.json');
const translationMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));

// Sample PoB mods from the user
const inputMods = [
    "17% increased Rarity of Items found",
    "+71 to maximum Energy Shield",
    "137% increased Energy Shield",
    "+37 to maximum Mana",
    "34% increased Critical Hit Chance",
    "+45% to Lightning Resistance"
];

// Helper to normalize PoB text into PoE Trade API search keys (using '#' placeholders)
// It extracts the values and converts numbers to '#'
function parseAndNormalizeMod(modText) {
    // We want to replace numbers with '#'
    // Values can be: "+71", "137%", "17%", "34%" etc.
    // Let's replace numeric sequences with '#' while keeping the surrounding characters
    
    // First, let's capture the numbers so we can set them as min values in the filter
    const numRegex = /([+-]?\d+(?:\.\d+)?)/g;
    const values = [];
    let match;
    while ((match = numRegex.exec(modText)) !== null) {
        values.push(parseFloat(match[1]));
    }

    // To construct the query string, we replace numbers with '#'
    // In PoE stats:
    // "+71 to maximum Energy Shield" -> "+# to maximum Energy Shield" (but API might be "# to maximum Energy Shield" or "+# to maximum Energy Shield")
    // Let's test different representations to see what matches the API best
    
    let normalized = modText;
    
    // Replace numbers with '#'
    // Be careful with signs. "+71" -> "+#" or "#" depending on how GGG defines it in API.
    // If it's "+71 to maximum Energy Shield", the API definition is "# to maximum Energy Shield" (without plus).
    // Let's look at standard replacements.
    
    // Let's first strip '+' signs in front of numbers because API text usually doesn't have '+' for explicit mods
    // e.g. "+71 to maximum Energy Shield" -> "71 to maximum Energy Shield" -> "# to maximum Energy Shield"
    normalized = normalized.replace(/\+(\d+)/g, '$1');
    
    // Replace all numbers with '#'
    normalized = normalized.replace(/\d+(?:\.\d+)?/g, '#');
    
    return {
        original: modText,
        normalized: normalized,
        values: values
    };
}

// Build index of API English texts for fast lookup
// Key: normalized English text, Value: list of { id, original_en, jp, category }
const enLookupMap = {};

for (const [id, info] of Object.entries(translationMap)) {
    if (info.en) {
        // Normalize the API text for matching:
        // E.g. strip '+' signs, make lowercase, replace multiple spaces with single
        let apiNormalized = info.en.toLowerCase()
            .replace(/\s+/g, ' ')
            .replace(/\+#/g, '#'); // API sometimes has +#, sometimes just #. We normalize both to #
            
        if (!enLookupMap[apiNormalized]) {
            enLookupMap[apiNormalized] = [];
        }
        enLookupMap[apiNormalized].push({ id, original_en: info.en, jp: info.jp, category: info.category });
    }
}

console.log("=== POB Mod Mapping Simulation ===");

inputMods.forEach(rawMod => {
    const parsed = parseAndNormalizeMod(rawMod);
    const searchKey = parsed.normalized.toLowerCase().replace(/\s+/g, ' ').replace(/\+#/g, '#');
    
    console.log(`\nInput POB Mod: "${rawMod}"`);
    console.log(`  Normalized for search: "${searchKey}"`);
    console.log(`  Extracted Value(s): ${JSON.stringify(parsed.values)}`);
    
    const matches = enLookupMap[searchKey] || [];
    if (matches.length > 0) {
        console.log(`  Matches found in API (${matches.length}):`);
        matches.forEach(m => {
            console.log(`    - [${m.category}] ID: ${m.id}`);
            console.log(`      EN API Text: "${m.original_en}"`);
            console.log(`      JP API Text: "${m.jp}"`);
        });
    } else {
        // Try fuzzy match (e.g. check if the searchKey is contained in API texts, or do minor tweaks)
        console.log(`  ❌ No direct match found. Performing fuzzy check...`);
        // Let's try to remove '+' from searchKey
        const searchKeyNoPlus = searchKey.replace(/\+/g, '');
        const altMatches = enLookupMap[searchKeyNoPlus] || [];
        if (altMatches.length > 0) {
            console.log(`    Fuzzy Matches (ignoring signs) (${altMatches.length}):`);
            altMatches.forEach(m => {
                console.log(`      - [${m.category}] ID: ${m.id}`);
                console.log(`        EN API Text: "${m.original_en}"`);
                console.log(`        JP API Text: "${m.jp}"`);
            });
        } else {
            console.log(`    Fuzzy match failed.`);
        }
    }
});
