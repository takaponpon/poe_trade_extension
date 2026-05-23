const https = require('https');

function makeRequest(url, method, payload = null) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: method,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
            }
        };

        if (payload) {
            const bodyStr = JSON.stringify(payload);
            options.headers['Content-Type'] = 'application/json';
            options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
        }

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
                        resolve(data);
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        if (payload) {
            req.write(JSON.stringify(payload));
        }
        req.end();
    });
}

async function main() {
    console.log("=== JP Trade Search API Test ===");
    
    const activeLeague = "Fate of the Vaal";
    const searchQuery = {
        "query": {
            "status": {
                "option": "any"
            },
            "name": "Hyrri's Ire",
            "type": "Armoured Vest"
        },
        "sort": {
            "price": "asc"
        }
    };

    const url = `https://jp.pathofexile.com/api/trade2/search/${encodeURIComponent(activeLeague)}`;
    console.log(`Sending POST to: ${url}`);
    
    try {
        const result = await makeRequest(url, 'POST', searchQuery);
        console.log("🎉 Success!");
        console.log(result);
    } catch (e) {
        console.error("❌ Failed!");
        console.error(e.message);
    }
}

main();
