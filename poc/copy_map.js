const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'stats_translation_map.json');
const dest = path.join(__dirname, '../stats_translation_map.json');

console.log(`Copying stats_translation_map.json from ${src} to ${dest}...`);

try {
    fs.copyFileSync(src, dest);
    console.log("Success!");
} catch (e) {
    console.error(`Error copying file: ${e.message}`);
}
