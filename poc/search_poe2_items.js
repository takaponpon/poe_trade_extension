const https = require('https');
const fs = require('fs');
const path = require('path');

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        console.log(`Fetching: ${url}`);
        const parsedUrl = new URL(url);
        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error(`Failed to parse JSON: ${e.message}`));
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        req.end();
    });
}

async function main() {
    console.log("=== PoE2 Items Data Search ===");
    
    let data;
    const cachePath = path.join(__dirname, 'poe2_items.json');
    
    if (fs.existsSync(cachePath)) {
        console.log("Loading from cache...");
        data = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
    } else {
        try {
            data = await fetchUrl('https://www.pathofexile.com/api/trade2/data/items');
            fs.writeFileSync(cachePath, JSON.stringify(data, null, 2), 'utf8');
        } catch (e) {
            console.error(`Failed to fetch items data: ${e.message}`);
            return;
        }
    }

    console.log(`Loaded items data. Result groups: ${data.result.length}`);

    // Search for "Talisman" or "Jade"
    console.log("\nSearching for 'Talisman' in PoE2 Items...");
    data.result.forEach(group => {
        if (group.entries) {
            group.entries.forEach(entry => {
                const nameMatch = entry.name && entry.name.toLowerCase().includes('talisman');
                const typeMatch = entry.type && entry.type.toLowerCase().includes('talisman');
                if (nameMatch || typeMatch) {
                    console.log(`Group: ${group.label}`);
                    console.log(`  Name: "${entry.name}"`);
                    console.log(`  Type: "${entry.type}"`);
                    console.log(`  Text: "${entry.text}"`);
                }
            });
        }
    });

    console.log("\nSearching for 'Jade' in PoE2 Items...");
    data.result.forEach(group => {
        if (group.entries) {
            group.entries.forEach(entry => {
                const nameMatch = entry.name && entry.name.toLowerCase().includes('jade');
                const typeMatch = entry.type && entry.type.toLowerCase().includes('jade');
                if (nameMatch || typeMatch) {
                    console.log(`Group: ${group.label}`);
                    console.log(`  Name: "${entry.name}"`);
                    console.log(`  Type: "${entry.type}"`);
                    console.log(`  Text: "${entry.text}"`);
                }
            });
        }
    });
}

main();
