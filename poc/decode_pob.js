/**
 * Path of Building エクスポート文字列デコーダー (PoC)
 *
 * パイプライン:
 *   1. 入力文字列のクレンジング (空白・改行除去)
 *   2. URL-safe Base64 → 標準 Base64 への逆置換 ( - → + , _ → / )
 *   3. Base64 デコード → 圧縮バイナリ
 *   4. zlib 解凍 → XML テキスト
 *   5. XML パースして頭装備データを抽出
 */

const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// 1. PoB エクスポート文字列をファイルから読み込み
// ---------------------------------------------------------------------------
const codePath = path.join(__dirname, "sample_code.txt");
const POB_CODE = fs.readFileSync(codePath, "utf-8");
console.log(`📄 コードファイル読み込み: ${codePath}`);

// ---------------------------------------------------------------------------
// 2. デコードパイプライン
// ---------------------------------------------------------------------------

/**
 * PoB エクスポート文字列をデコードして XML 文字列を返す
 * @param {string} code - PoBのエクスポートコード
 * @returns {string} デコード済み XML テキスト
 */
function decodePoBExport(code) {
  // Step 1: クレンジング — 空白・改行を除去
  let cleaned = code.replace(/\s+/g, "");
  console.log(`クレンジング後文字列長: ${cleaned.length}`);

  // Step 2: URL-safe Base64 → 標準 Base64
  //   - (ハイフン) → + (プラス)
  //   _ (アンダースコア) → / (スラッシュ)
  let standardBase64 = cleaned.replace(/-/g, "+").replace(/_/g, "/");

  // パディング補完 (Base64 は 4 の倍数長が必要)
  while (standardBase64.length % 4 !== 0) {
    standardBase64 += "=";
  }

  // Step 3: Base64 デコード → バイナリバッファ
  const compressedBuffer = Buffer.from(standardBase64, "base64");

  console.log(`圧縮データサイズ: ${compressedBuffer.length} bytes`);
  console.log(
    `先頭 4 bytes (hex): ${Array.from(compressedBuffer.slice(0, 4))
      .map((b) => "0x" + b.toString(16).padStart(2, "0"))
      .join(" ")}`
  );

  // Step 4: zlib 解凍
  let xmlBuffer;

  // 方法 1: 標準 inflate
  try {
    xmlBuffer = zlib.inflateSync(compressedBuffer);
    console.log("✅ zlib.inflateSync で成功");
  } catch (e) {
    console.log(`⚠ inflate 失敗 (${e.message})`);

    // 方法 2: zlib ヘッダー(2バイト)をスキップして raw inflate (末尾チェックサム除去)
    try {
      const rawData = compressedBuffer.slice(2, -4);
      xmlBuffer = zlib.inflateRawSync(rawData);
      console.log("✅ inflateRaw (ヘッダー+チェックサムスキップ) で成功");
    } catch (e2) {
      console.log(`⚠ inflateRaw 失敗 (${e2.message})`);

      // 方法 3: zlib ヘッダーのみスキップ
      try {
        const rawData2 = compressedBuffer.slice(2);
        xmlBuffer = zlib.inflateRawSync(rawData2);
        console.log("✅ inflateRaw (ヘッダーのみスキップ) で成功");
      } catch (e3) {
        console.log(`❌ 全方式失敗: ${e3.message}`);
        throw new Error("全ての解凍方式が失敗しました");
      }
    }
  }

  // UTF-8 テキストとして返す
  return xmlBuffer.toString("utf-8");
}

// ---------------------------------------------------------------------------
// 3. XML パース & 頭装備データ抽出
// ---------------------------------------------------------------------------

/**
 * ヘルメット (頭装備) 情報を抽出する
 * @param {string} xml - デコード済み XML テキスト
 */
function extractHelmetData(xml) {
  // --- スロット割り当てを確認 ---
  // 実際のXML: <Slot itemPbURL="" name="Helmet" itemId="7"/>
  // name と itemId の間に他の属性が入る可能性があるため柔軟にマッチ
  const slotMatch = xml.match(
    /<Slot\s+[^>]*name="Helmet"[^>]*itemId="(\d+)"[^>]*\/?>/i
  ) || xml.match(
    /<Slot\s+[^>]*itemId="(\d+)"[^>]*name="Helmet"[^>]*\/?>/i
  );

  if (!slotMatch) {
    console.log("⚠ ヘルメットスロットが見つかりませんでした。");
    return extractHelmetFromItems(xml);
  }

  const helmetItemId = slotMatch[1];
  console.log(`\n🎯 ヘルメットスロット itemId: ${helmetItemId}`);

  // 該当 Item を検索
  const itemRegex = new RegExp(
    `<Item\\s+id="${helmetItemId}"[^>]*>([\\s\\S]*?)<\\/Item>`,
    "i"
  );
  const itemMatch = xml.match(itemRegex);

  if (!itemMatch) {
    console.log(`⚠ itemId=${helmetItemId} の Item が見つかりませんでした。`);
    return;
  }

  const itemContent = itemMatch[1].trim();
  console.log("\n" + "=".repeat(60));
  console.log("🪖 頭装備 (Helmet) データ");
  console.log("=".repeat(60));

  // --- アイテムテキストからmod情報をパース ---
  const mods = parseItemMods(itemContent);

  console.log(`  名前:       ${mods.name}`);
  console.log(`  ベース:     ${mods.base}`);
  console.log(`  Rarity:     ${mods.rarity}`);
  console.log(`  Item Level: ${mods.itemLevel}`);
  console.log(`  Quality:    ${mods.quality}`);
  if (mods.corrupted) console.log(`  状態:       Corrupted`);
  console.log("");

  if (mods.implicits.length > 0) {
    console.log("  📌 Implicit Mods:");
    mods.implicits.forEach((m) => {
      const tag = m.tags.length > 0 ? ` [${m.tags.join(", ")}]` : "";
      console.log(`    • ${m.text}${tag}`);
    });
    console.log("");
  }

  if (mods.explicits.length > 0) {
    console.log("  🔧 Explicit Mods:");
    mods.explicits.forEach((m) => {
      const tag = m.tags.length > 0 ? ` [${m.tags.join(", ")}]` : "";
      console.log(`    • ${m.text}${tag}`);
    });
    console.log("");
  }

  console.log("=".repeat(60));
  return mods;
}

/**
 * PoBのアイテムテキストからmod情報を構造化データとしてパースする
 *
 * PoBアイテムテキストの構造:
 *   Rarity: RARE
 *   アイテム名
 *   ベースタイプ名
 *   (各種プロパティ行: Energy Shield, Item Level, Quality, etc.)
 *   Implicits: N   ← N行がimplicit mod
 *   (implicit mod行 × N)
 *   (explicit mod行)
 *   Corrupted       ← オプション
 *
 * mod行のタグ形式: {enchant}{rune}36% increased Armour ...
 *
 * @param {string} text - Item要素の内部テキスト
 * @returns {object} パース済みmod情報
 */
function parseItemMods(text) {
  // ModRange XML タグを除去してテキスト行のみにする
  const cleanText = text.replace(/<[^>]+>/g, "").trim();
  const lines = cleanText.split("\n").map((l) => l.trim()).filter((l) => l);

  const result = {
    rarity: "",
    name: "",
    base: "",
    itemLevel: "",
    quality: "",
    energyShield: "",
    corrupted: false,
    implicits: [],
    explicits: [],
    properties: {},
  };

  let implicitCount = 0;
  let implicitStartIdx = -1;
  let modStartIdx = -1;

  // 各行をパース
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("Rarity: ")) {
      result.rarity = line.replace("Rarity: ", "");
      // 次の2行がアイテム名とベースタイプ
      if (i + 1 < lines.length) result.name = lines[i + 1];
      if (i + 2 < lines.length) result.base = lines[i + 2];
    } else if (line.startsWith("Item Level: ")) {
      result.itemLevel = line.replace("Item Level: ", "");
    } else if (line.startsWith("Quality: ")) {
      result.quality = line.replace("Quality: ", "");
    } else if (line.startsWith("Energy Shield: ")) {
      result.energyShield = line.replace("Energy Shield: ", "");
    } else if (line.startsWith("Implicits: ")) {
      implicitCount = parseInt(line.replace("Implicits: ", ""), 10);
      implicitStartIdx = i + 1;
      modStartIdx = implicitStartIdx + implicitCount;
    } else if (line === "Corrupted") {
      result.corrupted = true;
    } else if (line.startsWith("LevelReq: ") || line.startsWith("Sockets: ") ||
               line.startsWith("Rune: ") || line.startsWith("Unique ID: ")) {
      // メタデータ行 — properties に保存
      const [key, ...vals] = line.split(": ");
      result.properties[key] = vals.join(": ");
    }
  }

  // Implicit mods を抽出
  if (implicitStartIdx >= 0) {
    for (let i = implicitStartIdx; i < implicitStartIdx + implicitCount && i < lines.length; i++) {
      result.implicits.push(parseMod(lines[i]));
    }
  }

  // Explicit mods を抽出 (Implicits の後 〜 Corrupted の前)
  if (modStartIdx >= 0) {
    for (let i = modStartIdx; i < lines.length; i++) {
      const line = lines[i];
      if (line === "Corrupted") break;
      result.explicits.push(parseMod(line));
    }
  }

  return result;
}

/**
 * 個別のmod行をパースして { text, tags } を返す
 * 例: "{fractured}17% increased Rarity" → { text: "17% increased Rarity", tags: ["fractured"] }
 */
function parseMod(line) {
  const tags = [];
  let text = line;

  // {tag} パターンを全て抽出して除去
  const tagRegex = /\{([^}]+)\}/g;
  let match;
  while ((match = tagRegex.exec(line)) !== null) {
    tags.push(match[1]);
  }
  text = line.replace(tagRegex, "").trim();

  return { text, tags };
}

/**
 * フォールバック: Items 内から Helmet タイプの Item を探す
 */
function extractHelmetFromItems(xml) {
  const allItems = xml.match(/<Item\s+id="\d+"[^>]*>[\s\S]*?<\/Item>/gi);
  if (!allItems) {
    console.log("⚠ Item 要素が見つかりませんでした。");
    return;
  }

  for (const item of allItems) {
    if (/helmet/i.test(item)) {
      console.log("\n" + "=".repeat(60));
      console.log("🪖 頭装備 (Helmet) データ (フォールバック検索)");
      console.log("=".repeat(60));
      console.log(item);
      console.log("=".repeat(60));
      return item;
    }
  }

  console.log("⚠ Helmet 関連のアイテムが見つかりませんでした。");
}

// ---------------------------------------------------------------------------
// 4. 実行
// ---------------------------------------------------------------------------
try {
  console.log("\n📦 PoB エクスポート文字列をデコード中...\n");

  const xml = decodePoBExport(POB_CODE);

  // XML プレビュー
  console.log("\n--- XML プレビュー (先頭 500 文字) ---");
  console.log(xml.substring(0, 500));
  console.log("...\n");

  // Items セクションを確認
  const itemsMatch = xml.match(/<Items[^>]*>([\s\S]*?)<\/Items>/i);
  if (itemsMatch) {
    console.log("--- Items セクション発見 ---");

    // Slot 一覧
    const slotMatches = itemsMatch[0].match(/<Slot\s+[^>]+\/?>/gi);
    if (slotMatches) {
      console.log("\n📋 スロット一覧:");
      slotMatches.forEach((s) => console.log("  " + s));
    }

    // Item 数
    const itemTags = itemsMatch[0].match(/<Item\s+id="\d+"[^>]*>/gi);
    if (itemTags) {
      console.log(`\n📦 Item 数: ${itemTags.length}`);
    }
    console.log("");
  } else {
    console.log("⚠ <Items> セクションが見つかりません。");
    console.log(`XML 全体サイズ: ${xml.length} 文字`);

    // XML にどんなタグがあるか確認
    const topTags = xml.match(/<([A-Za-z][A-Za-z0-9]*)\s/g);
    if (topTags) {
      const unique = [...new Set(topTags)];
      console.log("XML 内の主要タグ:", unique.slice(0, 20).join(", "));
    }
  }

  // 頭装備データを抽出
  extractHelmetData(xml);
} catch (err) {
  console.error("❌ デコードエラー:", err.message);
  console.error(err.stack);
}
