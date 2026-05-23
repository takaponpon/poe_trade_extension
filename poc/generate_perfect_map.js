const https = require('https');
const fs = require('fs');
const path = require('path');

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(url);
        const options = {
            hostname: parsedUrl.hostname,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, ' +
                              'Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            }
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
                } else { reject(new Error(`HTTP ${res.statusCode}`)); }
            });
        });
        req.on('error', (err) => { reject(err); });
        req.end();
    });
}

// Simple sequence alignment/matching for lists of different lengths
function alignLists(enList, jpList, isUnique) {
    const typeMap = {};
    const nameMap = {};
    
    let enIdx = 0;
    let jpIdx = 0;

    while (enIdx < enList.length && jpIdx < jpList.length) {
        const enItem = enList[enIdx];
        const jpItem = jpList[jpIdx];

        if (isUnique) {
            // For uniques, we can check if the base types (types) match (after translating the base type)
            // But since we don't have the full base type translation map yet, let's look ahead to see if one list has an extra entry.
            // We can match them based on their relative position and structure.
            // If they are structurally compatible, we map them.
            // Let's do a simple name/text comparison. Uniques usually have very distinct structures.
            // If we think there is a mismatch (e.g. they don't correspond), let's find the best look-ahead.
            
            // To be extremely robust: let's calculate a similarity or check if they align.
            // Since we know the lists are 99% identical with maybe 1 or 2 extra elements:
            // Let's check if the next elements align better.
            const nextEnMatchesCurrentJp = (enIdx + 1 < enList.length) && 
                (enList[enIdx + 1].type && jpItem.type && enList[enIdx + 1].type.toLowerCase() === jpItem.type.toLowerCase()); // not fully translated, but gives a hint if base types are untranslated or similar
            
            // Let's check structural similarity: if the unique names are empty, or they differ.
            // Actually, let's write a simple look-ahead that aligns them by matching their unique properties if possible.
            // Since we only have 1 or 2 mismatches, let's just align them.
            typeMap[enItem.type.trim()] = jpItem.type.trim();
            if (enItem.name && jpItem.name) {
                nameMap[enItem.name.trim()] = jpItem.name.trim();
            }
            
            enIdx++;
            jpIdx++;
        } else {
            // For base types, if they mismatch, we can also look ahead.
            typeMap[enItem.type.trim()] = jpItem.type.trim();
            enIdx++;
            jpIdx++;
        }
    }

    return { typeMap, nameMap };
}

function normalizeKey(str) {
    if (!str) return "";
    let norm = str.replace(/&apos;/g, "'").replace(/&quot;/g, '"');
    return norm.toLowerCase().replace(/['"`’‘“”]/g, "").replace(/\s+/g, " ").trim();
}

function sanitizeJp(str) {
    if (!str) return "";
    // Remove Unicode replacement characters (e.g. \ufffd\ufffd麻のサンダル -> 麻のサンダル)
    let clean = str.replace(/\ufffd/g, '');
    return clean.trim();
}

const categoryMap = [
    // FEET (足防具)
    { cat: 'feet', en: 'boots', jp: 'ブーツ' },
    { cat: 'feet', en: 'sandals', jp: 'サンダル' },
    { cat: 'feet', en: 'slippers', jp: '履物' },
    { cat: 'feet', en: 'shoes', jp: '靴' },
    { cat: 'feet', en: 'shoes', jp: 'シューズ' },
    { cat: 'feet', en: 'greaves', jp: 'グリーヴ' },
    { cat: 'feet', en: 'sabatons', jp: 'サバトン' },

    // HANDS (手防具)
    { cat: 'hands', en: 'bracers', jp: '弓籠手' },
    { cat: 'hands', en: 'wraps', jp: 'ラップ' },
    { cat: 'hands', en: 'gloves', jp: '手袋' },
    { cat: 'hands', en: 'mitts', jp: 'ミット' },
    { cat: 'hands', en: 'gauntlets', jp: 'ガントレット' },
    { cat: 'hands', en: 'cuffs', jp: 'カフス' },

    // HEAD (頭防具)
    { cat: 'head', en: 'visage', jp: '顔飾り' },
    { cat: 'head', en: 'hood', jp: 'フード' },
    { cat: 'head', en: 'cap', jp: '帽子' },
    { cat: 'head', en: 'mask', jp: '仮面' },
    { cat: 'head', en: 'circlet', jp: 'サークレット' },
    { cat: 'head', en: 'tiara', jp: 'ティアラ' },
    { cat: 'head', en: 'crown', jp: '冠' },
    { cat: 'head', en: 'helmet', jp: 'ヘルメット' },
    { cat: 'head', en: 'helm', jp: '兜' },
    { cat: 'head', en: 'helm', jp: 'ヘルム' },
    { cat: 'head', en: 'greathelm', jp: 'グレートヘルム' },
    { cat: 'head', en: 'burgonet', jp: 'バーゴネット' },
    { cat: 'head', en: 'tricorne', jp: 'トリコーン' },

    // SHIELD (盾 & 矢筒)
    { cat: 'shield', en: 'shield', jp: 'シールド' },
    { cat: 'shield', en: 'shield', jp: '盾' },
    { cat: 'shield', en: 'buckler', jp: 'バックラー' },
    { cat: 'shield', en: 'crest', jp: 'クレスト' },
    { cat: 'shield', en: 'targe', jp: 'タージ' },
    { cat: 'shield', en: 'quiver', jp: '矢筒' },

    // BODY (胴防具)
    { cat: 'body', en: 'vest', jp: 'ベスト' },
    { cat: 'body', en: 'tunic', jp: 'チュニック' },
    { cat: 'body', en: 'robe', jp: 'ローブ' },
    { cat: 'body', en: 'coat', jp: 'コート' },
    { cat: 'body', en: 'raiment', jp: '装束' },
    { cat: 'body', en: 'hauberk', jp: 'ホーバーク' },
    { cat: 'body', en: 'jacket', jp: 'ジャケット' },
    { cat: 'body', en: 'brigandine', jp: 'ブリガンダイン' },
    { cat: 'body', en: 'doublet', jp: 'ダブレット' },
    { cat: 'body', en: 'chestplate', jp: '胸当て' },
    { cat: 'body', en: 'cuirass', jp: '胴鎧' },
    { cat: 'body', en: 'armour', jp: 'アーマー' },
    { cat: 'body', en: 'armour', jp: '鎧' },
    { cat: 'body', en: 'plate', jp: 'プレート' },
    { cat: 'body', en: 'mail', jp: 'メイル' },
    { cat: 'body', en: 'regalia', jp: 'レガリア' },
    { cat: 'body', en: 'vestments', jp: '祭服' },
    { cat: 'body', en: 'mantle', jp: '外套' },
    { cat: 'body', en: 'garment', jp: 'ガーメント' },
    { cat: 'body', en: 'leather', jp: '服' }
];

function getCategory(name, lang) {
    const lower = name.toLowerCase();
    for (const cat of categoryMap) {
        const word = lang === 'en' ? cat.en : cat.jp;
        if (lower.includes(word)) {
            return cat.cat;
        }
    }
    return 'unknown';
}


async function main() {
    console.log("Fetching English items...");
    const enData = await fetchUrl('https://www.pathofexile.com/api/trade2/data/items');
    console.log("Fetching Japanese items...");
    const jpData = await fetchUrl('https://jp.pathofexile.com/api/trade2/data/items');

    const finalTypeMap = {};
    const finalNameMap = {};

    for (let i = 0; i < enData.result.length; i++) {
        const enGroup = enData.result[i];
        const jpGroup = jpData.result.find(g => g.id === enGroup.id);

        if (!jpGroup) {
            console.warn(`Warning: Group ${enGroup.id} not found in Japanese data.`);
            continue;
        }

        const enEntries = enGroup.entries || [];
        const jpEntries = jpGroup.entries || [];

        // Separate base types and uniques
        const enBases = enEntries.filter(e => !(e.flags && e.flags.unique));
        const enUniques = enEntries.filter(e => (e.flags && e.flags.unique));

        const jpBases = jpEntries.filter(e => !(e.flags && e.flags.unique));
        const jpUniques = jpEntries.filter(e => (e.flags && e.flags.unique));

        console.log(`Group: ${enGroup.id}`);
        console.log(`  Bases   - EN: ${enBases.length}, JP: ${jpBases.length}`);
        console.log(`  Uniques - EN: ${enUniques.length}, JP: ${jpUniques.length}`);

        // Align base types
        let baseEnIdx = 0;
        let baseJpIdx = 0;

        if (enGroup.id === 'armour') {
            // Highly robust alignment for armour bases using suffix categorization
            while (baseEnIdx < enBases.length || baseJpIdx < jpBases.length) {
                if (baseEnIdx >= enBases.length) {
                    console.log(`    [Alignment] Skipping extra JP base at index ${baseJpIdx}: type="${jpBases[baseJpIdx].type}"`);
                    baseJpIdx++;
                    continue;
                }
                if (baseJpIdx >= jpBases.length) {
                    console.log(`    [Alignment] Skipping extra EN base at index ${baseEnIdx}: type="${enBases[baseEnIdx].type}"`);
                    baseEnIdx++;
                    continue;
                }

                const enB = enBases[baseEnIdx];
                const jpB = jpBases[baseJpIdx];

                const enCat = getCategory(enB.type, 'en');
                const jpCat = getCategory(jpB.type, 'jp');

                if (enCat === jpCat) {
                    const enTypeRaw = enB.type.trim();
                    const normKey = normalizeKey(enTypeRaw);
                    finalTypeMap[normKey] = {
                        en: enTypeRaw,
                        jp: sanitizeJp(jpB.type)
                    };
                    baseEnIdx++;
                    baseJpIdx++;
                } else {
                    // Look ahead in EN list to see if we find jpCat
                    let enLookAhead = -1;
                    for (let i = baseEnIdx + 1; i < Math.min(enBases.length, baseEnIdx + 15); i++) {
                        if (getCategory(enBases[i].type, 'en') === jpCat) {
                            enLookAhead = i;
                            break;
                        }
                    }

                    // Look ahead in JP list to see if we find enCat
                    let jpLookAhead = -1;
                    for (let i = baseJpIdx + 1; i < Math.min(jpBases.length, baseJpIdx + 15); i++) {
                        if (getCategory(jpBases[i].type, 'jp') === enCat) {
                            jpLookAhead = i;
                            break;
                        }
                    }

                    if (enLookAhead !== -1 && (jpLookAhead === -1 || (enLookAhead - baseEnIdx < jpLookAhead - baseJpIdx))) {
                        // Skip unmatched EN bases
                        for (let i = baseEnIdx; i < enLookAhead; i++) {
                            console.log(`    [Alignment] Skipping unmatched EN base at index ${i}: type="${enBases[i].type}"`);
                        }
                        baseEnIdx = enLookAhead;
                    } else if (jpLookAhead !== -1) {
                        // Skip unmatched JP bases
                        for (let i = baseJpIdx; i < jpLookAhead; i++) {
                            console.log(`    [Alignment] Skipping unmatched JP base at index ${i}: type="${jpBases[i].type}"`);
                        }
                        baseJpIdx = jpLookAhead;
                    } else {
                        // Hard mismatch fallback
                        console.warn(`    [Alignment] Hard mismatch: EN "${enB.type}" (Cat: ${enCat}) vs JP "${jpB.type}" (Cat: ${jpCat})`);
                        const enTypeRaw = enB.type.trim();
                        const normKey = normalizeKey(enTypeRaw);
                        finalTypeMap[normKey] = {
                            en: enTypeRaw,
                            jp: sanitizeJp(jpB.type)
                        };
                        baseEnIdx++;
                        baseJpIdx++;
                    }
                }
            }
        } else {
            // General group (no mismatch expected)
            while (baseEnIdx < enBases.length && baseJpIdx < jpBases.length) {
                const enB = enBases[baseEnIdx];
                const jpB = jpBases[baseJpIdx];
                const enTypeRaw = enB.type.trim();
                const normKey = normalizeKey(enTypeRaw);
                finalTypeMap[normKey] = {
                    en: enTypeRaw,
                    jp: sanitizeJp(jpB.type)
                };
                baseEnIdx++;
                baseJpIdx++;
            }
        }

        // Align uniques
        // Since unique lists might have a mismatch (e.g. 604 vs 603 in armour), let's use a robust alignment
        let uniqEnIdx = 0;
        let uniqJpIdx = 0;
        while (uniqEnIdx < enUniques.length && uniqJpIdx < jpUniques.length) {
            const enU = enUniques[uniqEnIdx];
            const jpU = jpUniques[uniqJpIdx];

            // Let's check if the next EN unique matches this JP unique better (meaning enU is an extra unique only in EN)
            if (uniqEnIdx + 1 < enUniques.length) {
                const currentEnType = enU.type.trim();
                const currentJpType = jpU.type.trim();
                
                // Let's look ahead in JP to see if current EN matches a future JP
                let foundMatchInJp = -1;
                for (let k = uniqJpIdx; k < Math.min(jpUniques.length, uniqJpIdx + 5); k++) {
                    const translatedBase = finalTypeMap[normalizeKey(currentEnType)]?.jp;
                    if (translatedBase === jpUniques[k].type.trim()) {
                        foundMatchInJp = k;
                        break;
                    }
                }

                if (foundMatchInJp > uniqJpIdx) {
                    // JP has some extra elements before the match! Skip them.
                    console.log(`    [Alignment] Skipping JP unique at index ${uniqJpIdx}: type="${jpUniques[uniqJpIdx].type}", name="${jpUniques[uniqJpIdx].name}"`);
                    uniqJpIdx = foundMatchInJp;
                    continue;
                }

                // Let's look ahead in EN to see if current JP matches a future EN
                let foundMatchInEn = -1;
                for (let k = uniqEnIdx; k < Math.min(enUniques.length, uniqEnIdx + 5); k++) {
                    const translatedBase = finalTypeMap[normalizeKey(enUniques[k].type.trim())]?.jp;
                    if (translatedBase === currentJpType) {
                        foundMatchInEn = k;
                        break;
                    }
                }

                if (foundMatchInEn > uniqEnIdx) {
                    // EN has some extra elements before the match! Skip them.
                    console.log(`    [Alignment] Skipping EN unique at index ${uniqEnIdx}: type="${enUniques[uniqEnIdx].type}", name="${enUniques[uniqEnIdx].name}"`);
                    uniqEnIdx = foundMatchInEn;
                    continue;
                }
            }

            // Map them!
            const enTypeRaw = enU.type.trim();
            const normTypeKey = normalizeKey(enTypeRaw);
            finalTypeMap[normTypeKey] = {
                en: enTypeRaw,
                jp: sanitizeJp(jpU.type)
            };
            if (enU.name && jpU.name) {
                const enNameRaw = enU.name.trim();
                const normNameKey = normalizeKey(enNameRaw);
                finalNameMap[normNameKey] = {
                    en: enNameRaw,
                    jp: sanitizeJp(jpU.name)
                };
            }
            
            uniqEnIdx++;
            uniqJpIdx++;
        }
    }

    console.log(`\nTotal mapped base types: ${Object.keys(finalTypeMap).length}`);
    console.log(`Total mapped unique names: ${Object.keys(finalNameMap).length}`);

    // Verification
    console.log("\n--- Verification ---");
    console.log("Jade Talisman ->", finalTypeMap[normalizeKey("Jade Talisman")]);
    console.log("Expert Soldier Boots ->", finalTypeMap[normalizeKey("Expert Soldier Boots")]);
    console.log("Andvarius ->", finalNameMap[normalizeKey("Andvarius")]);
    console.log("Tabula Rasa ->", finalNameMap[normalizeKey("Tabula Rasa")]);

    const translationMaps = {
        types: finalTypeMap,
        names: finalNameMap
    };

    const outputPath = path.join(__dirname, '..', 'items_translation_map.json');
    fs.writeFileSync(outputPath, JSON.stringify(translationMaps, null, 2), 'utf8');
    console.log(`Saved perfect translation maps to ${outputPath}`);
}

main().catch(err => {
    console.error("Fatal error:", err);
});
