const fs = require('fs');
const https = require('https');
const path = require('path');

const url = 'https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js';
const dest = path.join(__dirname, '../pako.min.js');

console.log(`Downloading pako from ${url}...`);

https.get(url, (res) => {
    if (res.statusCode !== 200) {
        console.error(`Failed to download pako: HTTP ${res.statusCode}`);
        return;
    }
    
    const file = fs.createWriteStream(dest);
    res.pipe(file);
    file.on('finish', () => {
        file.close();
        console.log(`Successfully downloaded pako to ${dest}`);
    });
}).on('error', (err) => {
    console.error(`Error downloading pako: ${err.message}`);
});
