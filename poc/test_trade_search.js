const fs = require('fs');
const path = require('path');
const https = require('https');

// Helper to perform HTTPS POST or GET request
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
                        resolve(data); // Return raw if not JSON
                    }
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 300)}`));
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
    console.log("=== Trade API Query Simulation ===");
    
    let activeLeague = 'Standard';
    try {
        console.log("Fetching active PoE2 leagues...");
        const leagueData = await makeRequest('https://www.pathofexile.com/api/trade2/data/leagues', 'GET');
        console.log("Available leagues in PoE2:", leagueData.result.map(l => l.id));
        if (leagueData.result && leagueData.result.length > 0) {
            // Find a temporary league or fallback to Standard
            const challengeLeague = leagueData.result.find(l => l.id !== 'Standard' && l.id !== 'Hardcore');
            if (challengeLeague) {
                activeLeague = challengeLeague.id;
            } else {
                activeLeague = leagueData.result[0].id;
            }
        }
    } catch (e) {
        console.log(`Failed to fetch leagues, falling back to 'Standard'. Error: ${e.message}`);
    }

    console.log(`Using League: "${activeLeague}"`);

    // Define the query JSON
    // We are querying for:
    // - Category: armour.helmet (兜)
    // - Mod 1: explicit.stat_3917489142 (Rarity of Items found) >= 17
    // - Mod 2: explicit.stat_3489782002 (to maximum Energy Shield) >= 71
    // - Mod 3: explicit.stat_4015621042 (increased Energy Shield) >= 137
    // - Mod 4: explicit.stat_1050105434 (to maximum Mana) >= 37
    // - Mod 5: explicit.stat_587431675 (increased Critical Hit Chance) >= 34
    // - Mod 6: explicit.stat_1671376347 (to Lightning Resistance) >= 45
    const searchQuery = {
        "query": {
            "status": {
                "option": "any" // "any" instead of "online" to ensure we get results even if offline
            },
            "filters": {
                "type_filters": {
                    "filters": {
                        "category": {
                            "option": "armour.helmet"
                        }
                    }
                }
            },
            "stats": [
                {
                    "type": "and",
                    "filters": [
                        { "id": "explicit.stat_3917489142", "value": { "min": 17 } },
                        { "id": "explicit.stat_3489782002", "value": { "min": 71 } },
                        { "id": "explicit.stat_4015621042", "value": { "min": 137 } },
                        { "id": "explicit.stat_1050105434", "value": { "min": 37 } },
                        { "id": "explicit.stat_587431675", "value": { "min": 34 } },
                        { "id": "explicit.stat_1671376347", "value": { "min": 45 } }
                    ]
                }
            ]
        },
        "sort": {
            "price": "asc"
        }
    };

    console.log("\nSending Search Request payload to PoE2 API...");
    console.log(JSON.stringify(searchQuery, null, 2));

    try {
        const searchUrl = `https://www.pathofexile.com/api/trade2/search/${encodeURIComponent(activeLeague)}`;
        const result = await makeRequest(searchUrl, 'POST', searchQuery);
        
        console.log("\n🎉 Success!");
        console.log(`Search ID (Hash): ${result.id}`);
        console.log(`Total items matching query: ${result.total}`);
        
        const webSearchUrl = `https://www.pathofexile.com/trade2/search/${encodeURIComponent(activeLeague)}/${result.id}`;
        console.log(`\nGenerated Search URL (English):`);
        console.log(webSearchUrl);
        
        const webSearchUrlJp = `https://jp.pathofexile.com/trade2/search/${encodeURIComponent(activeLeague)}/${result.id}`;
        console.log(`Generated Search URL (Japanese):`);
        console.log(webSearchUrlJp);
        
    } catch (e) {
        console.error(`❌ Search API request failed: ${e.message}`);
    }
}

main();
