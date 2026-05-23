const fs = require('fs');
const path = require('path');
const https = require('https');

// We will fetch from:
// 1. https://www.pathofexile.com/api/trade/data/stats (English PoE1/PoE2?)
// 2. https://www.pathofexile.com/api/trade2/data/stats (English PoE2?)
// 3. https://jp.pathofexile.com/api/trade/data/stats (Japanese PoE1?)
// 4. https://jp.pathofexile.com/api/trade2/data/stats (Japanese PoE2?)

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
                        reject(new Error(`Failed to parse JSON from ${url}: ${e.message}. Data snippet: ${data.substring(0, 100)}`));
                    }
                } else {
                    reject(new Error(`Request to ${url} failed with status: ${res.statusCode}. Body snippet: ${data.substring(0, 100)}`));
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
    const urls = {
        en_trade: 'https://www.pathofexile.com/api/trade/data/stats',
        en_trade2: 'https://www.pathofexile.com/api/trade2/data/stats',
        jp_trade: 'https://jp.pathofexile.com/api/trade/data/stats',
        jp_trade2: 'https://jp.pathofexile.com/api/trade2/data/stats'
    };

    for (const [key, url] of Object.entries(urls)) {
        try {
            const data = await fetchUrl(url);
            const filename = `stats_${key}.json`;
            const destPath = path.join(__dirname, filename);
            fs.writeFileSync(destPath, JSON.stringify(data, null, 2), 'utf8');
            console.log(`Successfully fetched and saved to ${filename}. Entries count: ${data.result ? data.result.length : 'unknown'}`);
            
            if (data.result && data.result.length > 0) {
                console.log(`  Categories: ${data.result.map(r => `${r.label} (${r.entries ? r.entries.length : 0})`).join(', ')}`);
            }
        } catch (err) {
            console.error(`Error fetching ${key}: ${err.message}`);
        }
    }
}

main();
