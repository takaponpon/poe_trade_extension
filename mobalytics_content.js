/**
 * PoE2 Trade Extension - Mobalytics Content Script
 * Injects a premium, modern, and highly interactive right-side sidebar UI
 * that parses a character's PoB code from Mobalytics pages, provides one-click
 * Japanese trade search for all equipped gear, and adds a page-translation bypass helper.
 */

(async function () {
  console.log("PoE2 Trade Extension: Mobalytics content script initialized.");

  // Configuration constants (shared with main extension)
  const STORAGE_KEYS = {
    collapsed: 'poe2_trade_sidebar_collapsed',
    sidebarWidth: 'poe2_sidebar_width',
  };

  const DEFAULT_WIDTH = 320;
  const COLLAPSED_WIDTH = 40;
  const MIN_WIDTH = 240;
  const MAX_WIDTH = 600;

  // State Variables
  let currentWidth = DEFAULT_WIDTH;
  let isCollapsed = false;
  let translationMap = null; // Loaded dynamically from extension
  let itemsTranslationMap = null; // Loaded dynamically from extension
  let activeLeague = 'Standard';
  let pobCodeLoaded = false;
  let parsedGear = null;

  // Helper to normalize league names from Mobalytics/PoB to official PoE2 API league IDs
  function normalizeLeagueName(urlLeague) {
    if (!urlLeague) return "Standard";
    const lower = urlLeague.toLowerCase().trim();
    const map = {
      "vaal": "Fate of the Vaal",
      "hc-vaal": "HC Fate of the Vaal",
      "hc_vaal": "HC Fate of the Vaal",
      "standard": "Standard",
      "hardcore": "Hardcore"
    };
    return map[lower] || urlLeague;
  }

  // 1. Check URL Matching
  function isTargetUrl() {
    const url = window.location.href.toLowerCase();
    return url.includes('mobalytics.gg/poe-2/') || url.includes('mobalytics.gg/poe2/');
  }

  console.log(`PoE2 Trade Extension: Initializing sidebar components for Mobalytics...`);

  // 2. Create Host Element in the Document root
  const host = document.createElement('div');
  host.id = 'poe2-trade-sidebar-root';
  document.documentElement.appendChild(host);

  // 3. Attach Shadow Root
  const shadow = host.attachShadow({ mode: 'open' });

  // 4. Inject Stylesheet Link
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = chrome.runtime.getURL('poe_ninja_content.css');
  shadow.appendChild(link);

  // 5. Create Sidebar DOM Structure
  const sidebarContainer = document.createElement('div');
  sidebarContainer.className = 'sidebar-container';
  sidebarContainer.id = 'sidebar';

  sidebarContainer.innerHTML = `
    <!-- Resize Draggable Handle -->
    <div class="resize-handle" id="resizeHandle"></div>

    <!-- Toggle Button -->
    <button class="toggle-btn" id="toggleBtn">&gt;</button>
    
    <div class="sidebar-header">
      <div class="sidebar-title">PoE2 Gear Exporter</div>
      <div class="sidebar-subtitle">Japanese Trade Search</div>
      
      <!-- Translate Unlock Button -->
      <button class="translate-unlock-btn" id="translateUnlockBtn" title="和訳ができないバグを解除し、ブラウザ機能で翻訳可能にします">
        <svg viewBox="0 0 24 24">
          <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v2h11.17C11.5 7.69 10.56 9.18 9.5 10.5c-.66-.74-1.2-1.53-1.62-2.38H5.78c.55 1.25 1.34 2.41 2.3 3.44L2.83 16l1.41 1.41 5.26-5.26 2.54 2.54 3.32 3.32.08-.07V15.07zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
        </svg>
        <span>ページ和訳バグを解除</span>
      </button>
    </div>

    <div class="sidebar-content" id="sidebarContent">
      <div class="status-box" id="statusBox">
        <div class="status-loading">
          <div class="spinner"></div>
          <span>ページ内のPoBリンクを検出中...</span>
        </div>
        <div class="manual-input-box" style="margin-top: 15px; border-top: 1px solid var(--poe-border); padding-top: 12px; display: flex; flex-direction: column; gap: 8px;">
          <span style="font-size: 10px; color: var(--poe-text-muted); text-align: left;">見つからない場合は、PoBリンクまたはコードを貼り付けてください：</span>
          <input type="text" id="manualPobInput" placeholder="https://pobb.in/... または PoBコード" style="background: rgba(0,0,0,0.3); border: 1px solid var(--poe-border); border-radius: 4px; padding: 6px 10px; color: var(--poe-text); font-family: inherit; font-size: 11px; outline: none; width: 100%; box-sizing: border-box; transition: border-color 0.2s;" />
          <button id="manualPobSubmit" style="background: var(--poe-bg-panel); border: 1px solid var(--poe-gold); border-radius: 4px; color: var(--poe-gold-bright); padding: 6px; font-size: 10px; font-weight: bold; cursor: pointer; transition: all 0.2s; outline: none;">読み込む</button>
        </div>
      </div>
      <div class="gear-list-container" id="gearListContainer" style="display: none;"></div>
    </div>

    <!-- Toast notification element -->
    <div class="toast-notification" id="toastEl"></div>
  `;

  shadow.appendChild(sidebarContainer);

  // Toast Notification handler
  const toastEl = shadow.getElementById('toastEl');
  function showToast(message, type = 'info') {
    toastEl.textContent = message;
    toastEl.className = 'toast-notification';
    if (type === 'warning') toastEl.classList.add('toast-warning');
    if (type === 'success') {
      toastEl.style.borderColor = '#2ecc71';
      toastEl.style.color = '#2ecc71';
    } else {
      toastEl.style.borderColor = '';
      toastEl.style.color = '';
    }
    toastEl.classList.add('visible');
    setTimeout(() => {
      toastEl.classList.remove('visible');
    }, 4000);
  }

  // UI Element Selectors
  const toggleBtn = shadow.getElementById('toggleBtn');
  const resizeHandle = shadow.getElementById('resizeHandle');
  const statusBox = shadow.getElementById('statusBox');
  const gearListContainer = shadow.getElementById('gearListContainer');
  const sidebarContent = shadow.getElementById('sidebarContent');
  const translateUnlockBtn = shadow.getElementById('translateUnlockBtn');

  // Register manual POB input listeners
  const manualPobInput = shadow.getElementById('manualPobInput');
  const manualPobSubmit = shadow.getElementById('manualPobSubmit');
  
  if (manualPobInput && manualPobSubmit) {
    manualPobInput.addEventListener('focus', () => {
      manualPobInput.style.borderColor = 'var(--poe-gold)';
    });
    manualPobInput.addEventListener('blur', () => {
      manualPobInput.style.borderColor = 'var(--poe-border)';
    });
    manualPobInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        manualPobSubmit.click();
      }
    });
    manualPobSubmit.addEventListener('click', () => {
      const code = manualPobInput.value.trim();
      if (code) {
        handlePobCode(code);
      } else {
        showToast("PoBリンクまたはコードを入力してください", "warning");
      }
    });
    manualPobSubmit.addEventListener('mouseenter', () => {
      manualPobSubmit.style.background = 'var(--poe-gold)';
      manualPobSubmit.style.color = 'var(--poe-bg-darker)';
      manualPobSubmit.style.boxShadow = '0 0 8px var(--poe-gold-glow)';
    });
    manualPobSubmit.addEventListener('mouseleave', () => {
      manualPobSubmit.style.background = 'var(--poe-bg-panel)';
      manualPobSubmit.style.color = 'var(--poe-gold-bright)';
      manualPobSubmit.style.boxShadow = '';
    });
  }

  // Load Translation Map in background
  async function loadTranslationMap() {
    try {
      const url = chrome.runtime.getURL('stats_translation_map.json');
      const response = await fetch(url);
      translationMap = await response.json();
      console.log(`PoE2 Trade Extension: Loaded stats translation map with ${Object.keys(translationMap).length} entries.`);

      const itemsUrl = chrome.runtime.getURL('items_translation_map.json');
      const itemsResponse = await fetch(itemsUrl);
      itemsTranslationMap = await itemsResponse.json();
      console.log(`PoE2 Trade Extension: Loaded items translation map with ${Object.keys(itemsTranslationMap.types).length} types and ${Object.keys(itemsTranslationMap.names).length} names.`);
      
      // Re-render the gear list to apply Japanese translation once loaded
      if (parsedGear) {
        console.log("PoE2 Trade Extension: Re-rendering sidebar with Japanese translations.");
        renderGearList(parsedGear);
      }
    } catch (e) {
      console.error("PoE2 Trade Extension: Failed to load translation maps:", e);
      showToast("翻訳データの読み込みに失敗しました", "warning");
    }
  }
  loadTranslationMap();

  // Register Translate Unlock Handler
  translateUnlockBtn.addEventListener('click', () => {
    try {
      let count = 0;
      // Staticize all contenteditable rich-text elements on the page (Lexical editor elements)
      document.querySelectorAll('[contenteditable]').forEach(el => {
        const clone = el.cloneNode(true);
        clone.removeAttribute('contenteditable');
        clone.removeAttribute('data-lexical-editor');
        clone.querySelectorAll('[contenteditable]').forEach(child => {
          child.removeAttribute('contenteditable');
          child.removeAttribute('data-lexical-editor');
        });
        el.parentNode.replaceChild(clone, el);
        count++;
      });
      
      if (count > 0) {
        showToast("和訳バグを解除しました！ブラウザの翻訳機能を実行してください。", "success");
      } else {
        showToast("解除可能な要素が見つかりませんでした。（すでに実行済みか、エディタ要素がありません）", "info");
      }
    } catch (err) {
      console.error("Error in translation unlock:", err);
      showToast("和訳バグの解除中にエラーが発生しました", "warning");
    }
  });

  // 6. Sidebar Resize / Collapse Functionality
  function updatePageLayout(collapsed) {
    if (collapsed) {
      sidebarContainer.classList.add('collapsed');
      toggleBtn.innerHTML = '&lt;';
      document.documentElement.style.paddingRight = `${COLLAPSED_WIDTH}px`;
    } else {
      sidebarContainer.classList.remove('collapsed');
      toggleBtn.innerHTML = '&gt;';
      document.documentElement.style.paddingRight = `${currentWidth}px`;
    }
  }

  // Resizing logic
  let isResizing = false;
  let startX = 0;
  let startWidth = 0;

  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = currentWidth;
    resizeHandle.classList.add('resizing');
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const deltaX = startX - e.clientX; // drag left to increase width on right-side sidebar
    let newWidth = startWidth + deltaX;

    if (newWidth < MIN_WIDTH) newWidth = MIN_WIDTH;
    if (newWidth > MAX_WIDTH) newWidth = MAX_WIDTH;

    currentWidth = newWidth;
    host.style.setProperty('--sidebar-width', `${currentWidth}px`);
    if (!isCollapsed) {
      document.documentElement.style.paddingRight = `${currentWidth}px`;
    }
  });

  window.addEventListener('mouseup', () => {
    if (!isResizing) return;
    isResizing = false;
    resizeHandle.classList.remove('resizing');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    chrome.storage.local.set({ [STORAGE_KEYS.sidebarWidth]: currentWidth });
  });

  toggleBtn.addEventListener('click', () => {
    isCollapsed = !sidebarContainer.classList.contains('collapsed');
    updatePageLayout(isCollapsed);
    chrome.storage.local.set({ [STORAGE_KEYS.collapsed]: isCollapsed });
  });

  // Boot Load State
  chrome.storage.local.get([STORAGE_KEYS.collapsed, STORAGE_KEYS.sidebarWidth], (items) => {
    isCollapsed = items[STORAGE_KEYS.collapsed] || false;
    currentWidth = items[STORAGE_KEYS.sidebarWidth] || DEFAULT_WIDTH;
    host.style.setProperty('--sidebar-width', `${currentWidth}px`);
    
    document.documentElement.style.transition = 'padding-right 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
    document.documentElement.style.boxSizing = 'border-box';
    updatePageLayout(isCollapsed);
  });

  // 7. POB Code Extraction & Decryption Pipeline
  function decodePoBExport(code) {
    let cleaned = code.replace(/\s+/g, "");
    let standardBase64 = cleaned.replace(/-/g, "+").replace(/_/g, "/");

    while (standardBase64.length % 4 !== 0) {
      standardBase64 += "=";
    }

    const binaryString = atob(standardBase64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    let decompressed;
    try {
      decompressed = pako.inflate(bytes, { to: 'string' });
    } catch (e) {
      console.warn("pako standard inflate failed, trying raw inflate with header skip", e);
      try {
        const rawBytes = bytes.subarray(2);
        decompressed = pako.inflateRaw(rawBytes, { to: 'string' });
      } catch (e2) {
        console.error("pako raw inflate failed too", e2);
        throw new Error("PoBコードの解凍に失敗しました");
      }
    }

    return decompressed;
  }

  // Parse PoB Item XML to structured gear list
  function parsePoBXml(xml) {
    const gearList = {};
    
    // 1. Get slot assignments
    const slotRegex = /<Slot\s+[^>]*name="([^"]+)"[^>]*itemId="(\d+)"[^>]*\/?>/gi;
    const slotMap = {};
    let match;
    while ((match = slotRegex.exec(xml)) !== null) {
      slotMap[match[1]] = parseInt(match[2], 10);
    }

    // Secondary match in case attributes are reversed
    const slotRegexRev = /<Slot\s+[^>]*itemId="(\d+)"[^>]*name="([^"]+)"[^>]*\/?>/gi;
    while ((match = slotRegexRev.exec(xml)) !== null) {
      slotMap[match[2]] = parseInt(match[1], 10);
    }

    // Passive tree socket assignments for Jewels (nodeId and itemId)
    const socketRegex = /<Socket\s+[^>]*nodeId="(\d+)"[^>]*itemId="(\d+)"[^>]*\/?>/gi;
    let jewelCounter = 1;
    while ((match = socketRegex.exec(xml)) !== null) {
      const itemId = parseInt(match[2], 10);
      if (itemId > 0) {
        slotMap[`Jewel ${jewelCounter}`] = itemId;
        jewelCounter++;
      }
    }

    const socketRegexRev = /<Socket\s+[^>]*itemId="(\d+)"[^>]*nodeId="(\d+)"[^>]*\/?>/gi;
    while ((match = socketRegexRev.exec(xml)) !== null) {
      const itemId = parseInt(match[1], 10);
      if (itemId > 0) {
        while (slotMap[`Jewel ${jewelCounter}`] !== undefined) {
          jewelCounter++;
        }
        slotMap[`Jewel ${jewelCounter}`] = itemId;
        jewelCounter++;
      }
    }

    // 2. Parse all Items
    const itemMap = {};
    const itemRegex = /<Item\s+id="(\d+)"[^>]*>([\s\S]*?)<\/Item>/gi;
    while ((match = itemRegex.exec(xml)) !== null) {
      const id = parseInt(match[1], 10);
      itemMap[id] = parseItemText(match[2].trim());
    }

    return { slotMap, itemMap };
  }

  // Parse raw PoB Item text block to structured JS object
  function parseItemText(text) {
    const cleanText = text.replace(/<[^>]+>/g, "").trim();
    const lines = cleanText.split("\n").map((l) => l.trim()).filter((l) => l);

    const result = {
      rarity: "NORMAL",
      name: "",
      base: "",
      implicits: [],
      explicits: [],
      rawText: text
    };

    let implicitCount = 0;
    let implicitStartIdx = -1;
    let modStartIdx = -1;
    const runeLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith("Rarity: ")) {
        result.rarity = line.replace("Rarity: ", "").toUpperCase();
        if (i + 1 < lines.length) result.name = lines[i + 1];
        if (i + 2 < lines.length) result.base = lines[i + 2];
      } else if (line.startsWith("Implicits: ")) {
        implicitCount = parseInt(line.replace("Implicits: ", ""), 10);
        implicitStartIdx = i + 1;
        modStartIdx = implicitStartIdx + implicitCount;
      } else if (line.startsWith("Rune: ")) {
        runeLines.push(line.replace("Rune: ", "").trim().toLowerCase());
      }
    }

    // Determine if this item can actually hold an enchant (Weapons and Armours only in PoE2)
    let isBaseEnchantable = true;
    const baseName = (result.base || result.name || "").toLowerCase();
    const nonEnchantableKeywords = ["ring", "amulet", "belt", "flask", "charm", "jewel", "talisman"];
    for (const kw of nonEnchantableKeywords) {
      if (baseName.includes(kw)) {
        isBaseEnchantable = false;
        break;
      }
    }

    // Extract Implicit Mods
    if (implicitStartIdx >= 0) {
      for (let i = implicitStartIdx; i < implicitStartIdx + implicitCount && i < lines.length; i++) {
        result.implicits.push(parseModLine(lines[i], "implicit", isBaseEnchantable, runeLines));
      }
    }

    // Extract Explicit Mods
    if (modStartIdx >= 0) {
      for (let i = modStartIdx; i < lines.length; i++) {
        const line = lines[i];
        if (line === "Corrupted" || line.startsWith("Unique ID:")) break;
        result.explicits.push(parseModLine(line, "explicit", isBaseEnchantable, runeLines));
      }
    } else {
      let metadataDone = false;
      for (let i = 3; i < lines.length; i++) {
        const line = lines[i];
        if (line === "Corrupted" || line.startsWith("Unique ID:")) break;
        if (line.startsWith("Item Level:") || line.startsWith("Quality:") || line.startsWith("LevelReq:") || line.startsWith("Sockets:") || line.startsWith("Rune:")) {
          continue;
        }
        result.explicits.push(parseModLine(line, "explicit", isBaseEnchantable, runeLines));
      }
    }

    return result;
  }

  function parseModLine(line, defaultCategory = "explicit", isEnchantable = true, runeLines = []) {
    const tags = [];
    let text = line;

    const tagRegex = /\{([^}]+)\}/g;
    let match;
    while ((match = tagRegex.exec(line)) !== null) {
      tags.push(match[1]);
    }
    text = line.replace(tagRegex, "").trim();

    let sourceCategory = defaultCategory;
    const normalizedText = text.toLowerCase();
    let isRealRuneEnchant = false;
    const isCrafted = tags.includes("crafted") || tags.includes("enchant") || tags.includes("enchanted");
    
    if (isEnchantable && isCrafted) {
      const modLower = text.toLowerCase();
      isRealRuneEnchant = runeLines.some(runeText => {
        const rNorm = runeText.replace(/[^a-zA-Z]/g, "");
        const mNorm = modLower.replace(/[^a-zA-Z]/g, "");
        return rNorm === mNorm || modLower.includes(runeText) || runeText.includes(modLower);
      });
    }

    if (isEnchantable && (normalizedText.startsWith("enchant: ") || normalizedText.startsWith("enchantment: ") || isRealRuneEnchant)) {
      sourceCategory = "enchant";
      if (text.toLowerCase().startsWith("enchant: ")) text = text.substring(9).trim();
      else if (text.toLowerCase().startsWith("enchantment: ")) text = text.substring(13).trim();
    } else if (normalizedText.startsWith("desecrated: ") || tags.includes("desecrated") || tags.includes("scourged") || tags.includes("scourge") || tags.includes("corrupted")) {
      sourceCategory = "desecrated";
      if (text.toLowerCase().startsWith("desecrated: ")) text = text.substring(12).trim();
    } else if (tags.includes("implicit") || tags.includes("implicits")) {
      sourceCategory = "implicit";
    }

    if (isCrafted && !isRealRuneEnchant) {
      tags.push("fake_enchant_augment");
    }

    return { text, tags, sourceCategory };
  }

  // 8. Gear Slots Mapping Definition (Order of rendering in Sidebar)
  const TARGET_SLOTS = [
    { key: "Weapon 1", label: "武器セット 1 (メイン)" },
    { key: "Weapon 2", label: "武器セット 1 (オフハンド/盾/矢筒)" },
    { key: "Weapon 1 Swap", label: "武器セット 2 (裏メイン)" },
    { key: "Weapon 2 Swap", label: "武器セット 2 (裏オフハンド/盾/矢筒)" },
    { key: "Helmet", label: "兜 (Helmet)" },
    { key: "Body Armour", label: "鎧 (Body Armour)" },
    { key: "Gloves", label: "手袋 (Gloves)" },
    { key: "Boots", label: "靴 (Boots)" },
    { key: "Amulet", label: "アミュレット" },
    { key: "Belt", label: "ベルト" },
    { key: "Ring 1", label: "指輪 1" },
    { key: "Ring 2", label: "指輪 2" },
    { key: "Ring 3", label: "指輪 3" },
    { key: "Charm 1", label: "チャーム 1" },
    { key: "Charm 2", label: "チャーム 2" },
    { key: "Charm 3", label: "チャーム 3" },
    { key: "Flask 1", label: "フラスコ 1" },
    { key: "Flask 2", label: "フラスコ 2" }
  ];

  function getJewelSlots(slotMap) {
    const jewels = [];
    for (let i = 1; i <= 40; i++) {
      const key1 = `Jewel ${i}`;
      const key2 = `PassiveJewel ${i}`;
      if (slotMap[key1] !== undefined) {
        jewels.push({ key: key1, label: `ジュエル ${i}` });
      } else if (slotMap[key2] !== undefined) {
        jewels.push({ key: key2, label: `ジュエル ${i}` });
      }
    }
    return jewels;
  }

  // Translate item details to Japanese
  function translateItemDetails(item) {
    let jpName = item.name;
    let jpBase = item.base;

    if (itemsTranslationMap) {
      if (item.rarity === "UNIQUE" && item.name && item.name.trim() !== "") {
        const rawName = item.name.trim();
        const normRawName = normalizeKey(rawName);
        jpName = itemsTranslationMap.names[normRawName]?.jp || rawName;
      }

      const rawBase = (item.base && item.base.trim() !== "") ? item.base.trim() : (item.name && item.name.trim() !== "" ? item.name.trim() : null);
      if (rawBase) {
        let prefix = "";
        let coreBase = rawBase;
        if (rawBase.startsWith("Expert ")) {
          prefix = "\u719f\u7df4\u306e";
          coreBase = rawBase.substring(7);
        } else if (rawBase.startsWith("Sturdy ")) {
          prefix = "\u9811\u4e08\u306a";
          coreBase = rawBase.substring(7);
        } else if (rawBase.startsWith("Simple ")) {
          prefix = "\u7c21\u6613\u306a";
          coreBase = rawBase.substring(7);
        }

        const normCoreBase = normalizeKey(coreBase);
        const translatedCore = itemsTranslationMap.types[normCoreBase]?.jp || coreBase;
        jpBase = prefix + translatedCore;
      }
    }

    return { name: jpName, base: jpBase };
  }

  // Render Gear List
  function renderGearList(pobData) {
    const { slotMap, itemMap } = pobData;
    parsedGear = pobData; // cache globally

    let html = '';
    const groups = [
      { title: "武器 & 防具", slots: TARGET_SLOTS.slice(0, 8) },
      { title: "アクセサリー", slots: TARGET_SLOTS.slice(8, 13) },
      { title: "チャーム & フラスコ", slots: TARGET_SLOTS.slice(13, 18) }
    ];

    const jewelSlots = getJewelSlots(slotMap);
    if (jewelSlots.length > 0) {
      groups.push({ title: "ジュエル (Jewels)", slots: jewelSlots });
    }

    groups.forEach((group, index) => {
      const groupId = `gear_group_${index}`;
      
      html += `
        <div class="gear-section">
          <div class="gear-section-header collapsible-header" data-target="${groupId}">
            <span class="gear-section-title">${group.title}</span>
            <span class="chevron-icon">▼</span>
          </div>
          <div class="gear-section-content collapsible-content active" id="${groupId}">
      `;
      
      group.slots.forEach(slot => {
        const itemId = slotMap[slot.key];
        const item = itemId ? itemMap[itemId] : null;

        if (item) {
          const rarityClass = `rarity-${item.rarity.toLowerCase()}`;
          const jpItem = translateItemDetails(item);
          
          html += `
            <div class="gear-item ${rarityClass}" data-slot="${slot.key}" data-item-id="${itemId}">
              <div class="gear-item-header">
                <span class="gear-slot-label">${slot.label}</span>
              </div>
              <div class="gear-item-name">${jpItem.name} <span class="gear-item-base" style="margin-left: 6px;">${jpItem.base}</span></div>
            </div>
          `;
        } else {
          html += `
            <div class="gear-item empty-slot">
              <div class="gear-item-header">
                <span class="gear-slot-label">${slot.label}</span>
              </div>
              <div class="gear-item-name">未装備</div>
            </div>
          `;
        }
      });

      html += `
          </div>
        </div>
      `;
    });

    gearListContainer.innerHTML = html;
    statusBox.style.display = 'none';
    gearListContainer.style.display = 'flex';
    gearListContainer.style.flexDirection = 'column';
    gearListContainer.style.gap = '10px';

    const headers = gearListContainer.querySelectorAll('.collapsible-header');
    headers.forEach(header => {
      header.addEventListener('click', () => {
        const targetId = header.getAttribute('data-target');
        const content = gearListContainer.querySelector(`#${targetId}`);
        if (content.classList.contains('active')) {
          header.classList.add('collapsed');
          content.classList.remove('active');
        } else {
          header.classList.remove('collapsed');
          content.classList.add('active');
        }
      });
    });

    const items = gearListContainer.querySelectorAll('.gear-item:not(.empty-slot)');
    items.forEach(el => {
      el.addEventListener('click', () => {
        const slotKey = el.getAttribute('data-slot');
        const itemId = parseInt(el.getAttribute('data-item-id'), 10);
        handleGearClick(slotKey, itemId);
      });
    });
  }

  function normalizeModTextForLookup(text) {
    let norm = text.replace(/\+(\d+)/g, '$1');
    norm = norm.replace(/\d+(?:\.\d+)?/g, '#');
    return norm.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function normalizeKey(str) {
    if (!str) return "";
    let norm = str.replace(/&apos;/g, "'").replace(/&quot;/g, '"');
    return norm.toLowerCase().replace(/['"`’‘“”]/g, "").replace(/\s+/g, " ").trim();
  }

  // 9. Build Query and Call Official Trade API on Click
  async function handleGearClick(slotKey, itemId) {
    try {
      if (!translationMap) {
        showToast("翻訳データを読み込み中です。少々お待ちください...", "warning");
        return;
      }

      const item = parsedGear.itemMap[itemId];
      if (!item) {
        showToast("アイテム情報が見つかりませんでした", "warning");
        return;
      }

      showToast(`${item.name} の検索結果を構築中...`);

      let category = null;
      if (slotKey.startsWith("Helmet")) category = "armour.helmet";
      else if (slotKey.startsWith("Body Armour")) category = "armour.body";
      else if (slotKey.startsWith("Gloves")) category = "armour.gloves";
      else if (slotKey.startsWith("Boots")) category = "armour.boots";
      else if (slotKey.startsWith("Amulet")) category = "accessory.amulet";
      else if (slotKey.startsWith("Belt")) category = "accessory.belt";
      else if (slotKey.startsWith("Ring")) category = "accessory.ring";
      else if (slotKey.startsWith("Flask")) category = "flask";
      else if (slotKey.startsWith("Charm")) category = "charm";
      else if (slotKey.startsWith("Jewel") || slotKey.startsWith("PassiveJewel")) category = "jewel";
      else if (slotKey.startsWith("Shield")) category = "armour.shield";

      const apiFilters = [];
      const allMods = [...item.implicits, ...item.explicits];
      const enLookupMap = {};
      
      for (const [id, info] of Object.entries(translationMap)) {
        if (info.en) {
          const key = info.en.toLowerCase().replace(/\s+/g, ' ').replace(/\+#/g, '#');
          if (!enLookupMap[key]) {
            enLookupMap[key] = [];
          }
          enLookupMap[key].push({ id, ...info });
        }
      }

      allMods.forEach(mod => {
        const isSocketedOrAugmented = mod.sourceCategory === "enchant" || 
                                     mod.tags.includes("crafted") || 
                                     mod.tags.includes("augmented") || 
                                     mod.tags.includes("augment") ||
                                     mod.tags.includes("fake_enchant_augment");

        if (isSocketedOrAugmented) {
          console.log("PoE2 Trade Extension: Skipping socketed Rune / Augment mod:", mod.text);
          return;
        }

        const normalizedText = mod.text.toLowerCase();
        if (normalizedText.includes("augmented") || normalizedText.includes("augment")) {
          console.log("PoE2 Trade Extension: Skipping Augment mod based on text:", mod.text);
          return;
        }

        const numRegex = /([+-]?\d+(?:\.\d+)?)/g;
        const values = [];
        let m;
        while ((m = numRegex.exec(mod.text)) !== null) {
          values.push(parseFloat(m[1]));
        }

        let searchKey = normalizeModTextForLookup(mod.text).replace(/\+#/g, '#');
        
        const baseLower = (item.base || item.name || "").toLowerCase();
        const isQuiverOrShield = baseLower.includes("quiver") || baseLower.includes("shield") || baseLower.includes("矢筒") || baseLower.includes("盾");
        
        const isWeaponOrArmour = (slotKey.startsWith("Weapon") || 
                                 slotKey.startsWith("Shield") || 
                                 slotKey.startsWith("Helmet") || 
                                 slotKey.startsWith("Body Armour") || 
                                 slotKey.startsWith("Gloves") || 
                                 slotKey.startsWith("Boots")) && !isQuiverOrShield;
        
        if (isWeaponOrArmour) {
          const localSearchKey = searchKey + " (local)";
          if (enLookupMap[localSearchKey]) {
            searchKey = localSearchKey;
          }
        }

        let matches = enLookupMap[searchKey] || [];
        if (matches.length === 0) {
          const searchKeyNoPlus = searchKey.replace(/\+/g, '');
          matches = enLookupMap[searchKeyNoPlus] || [];
        }

        let finalMatch = null;
        if (matches.length > 0) {
          const expectedPrefix = (mod.sourceCategory || "explicit") + ".";
          let categoryMatch = matches.find(m => m.id.startsWith(expectedPrefix));
          
          // If looking for an implicit mod but no implicit. match exists, check if there's an enchant. match
          // (which represents corrupted implicits in PoE 2 trade API)
          if (!categoryMatch && mod.sourceCategory === "implicit") {
            categoryMatch = matches.find(m => m.id.startsWith("enchant."));
          }
          
          if (categoryMatch) {
            finalMatch = categoryMatch;
          } else {
            finalMatch = matches[0];
          }
        }

        if (finalMatch) {
          const filterObj = { id: finalMatch.id };
          if (values.length > 0) {
            const filterVal = {};
            const rawVal = values[0];
            if (rawVal > 10) {
              filterVal.min = Math.floor(rawVal * 0.9);
            } else {
              filterVal.min = rawVal;
            }
            filterObj.value = filterVal;
          }
          apiFilters.push(filterObj);
        }
      });

      const queryPayload = {
        "query": {
          "status": {
            "option": "securable"
          }
        },
        "sort": {
          "price": "asc"
        }
      };

      if (apiFilters.length > 0) {
        queryPayload.query.stats = [
          {
            "type": "and",
            "filters": apiFilters
          }
        ];
      }

      const hasBaseType = (item.base && item.base.trim() !== "") || (item.name && item.name.trim() !== "");
      if (category && !hasBaseType) {
        queryPayload.query.filters = {
          "type_filters": {
            "filters": {
              "category": {
                "option": category
              }
            }
          }
        };
      }

      const enName = item.name ? item.name.trim() : null;
      const enBase = (item.base && item.base.trim() !== "") ? item.base.trim() : (item.name && item.name.trim() !== "" ? item.name.trim() : null);

      let jpName = null;
      let jpBase = null;

      if (itemsTranslationMap) {
        if (item.rarity === "UNIQUE" && enName) {
          const normRawName = normalizeKey(enName);
          const nameEntry = itemsTranslationMap.names[normRawName];
          if (nameEntry) {
            jpName = nameEntry.jp;
          }
        }

        if (enBase) {
          let prefix = "";
          let coreBase = enBase;
          if (enBase.startsWith("Expert ")) {
            prefix = "\u719f\u7df4\u306e";
            coreBase = enBase.substring(7);
          } else if (enBase.startsWith("Sturdy ")) {
            prefix = "\u9811\u4e08\u306a";
            coreBase = enBase.substring(7);
          } else if (enBase.startsWith("Simple ")) {
            prefix = "\u7c21\u6613\u306a";
            coreBase = enBase.substring(7);
          }

          const normCoreBase = normalizeKey(coreBase);
          const typeEntry = itemsTranslationMap.types[normCoreBase];
          if (typeEntry) {
            jpBase = prefix + typeEntry.jp;
          }
        }
      }

      let isTranslated = false;
      if (item.rarity === "UNIQUE") {
        if (jpName && jpBase) {
          isTranslated = true;
        }
      } else {
        if (jpBase) {
          isTranslated = true;
        }
      }

      if (isTranslated) {
        if (item.rarity === "UNIQUE") {
          queryPayload.query.name = jpName;
          queryPayload.query.type = jpBase;
        } else {
          queryPayload.query.type = jpBase;
        }
      } else {
        const originalEnName = (item.rarity === "UNIQUE" && enName) ? (itemsTranslationMap?.names[normalizeKey(enName)]?.en || enName) : enName;
        const originalEnBase = enBase ? (itemsTranslationMap?.types[normalizeKey(enBase)]?.en || enBase) : enBase;

        if (item.rarity === "UNIQUE") {
          queryPayload.query.name = originalEnName;
          queryPayload.query.type = originalEnBase;
        } else {
          queryPayload.query.type = originalEnBase;
        }
      }

      console.log("PoE2 Trade Extension: Sending query payload:", queryPayload);

      chrome.runtime.sendMessage(
        {
          type: "POB_TRADE_SEARCH",
          league: activeLeague,
          query: queryPayload,
          useEnglish: !isTranslated
        },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error("PoE2 Trade Extension: Runtime message error:", chrome.runtime.lastError.message);
            showToast(`メッセージエラー: ${chrome.runtime.lastError.message}`, "warning");
            return;
          }

          if (response && response.success) {
            const result = response.data;
            console.log("PoE2 Trade Extension: Search registered via background proxy. Hash:", result.id);
            const domain = !isTranslated ? "www.pathofexile.com" : "jp.pathofexile.com";
            const jpSearchUrl = `https://${domain}/trade2/search/poe2/${encodeURIComponent(activeLeague)}/${result.id}`;
            window.open(jpSearchUrl, '_blank');
            showToast(`検索結果を新しいタブ(${!isTranslated ? "英語" : "日本語"})で開きました！`);
          } else {
            const errMsg = response ? response.error : "Unknown background proxy error";
            console.error("PoE2 Trade Extension: Proxy search failed:", errMsg);
            showToast(`API送信エラー: ${errMsg.substring(0, 50)}`, "warning");
          }
        }
      );
    } catch (err) {
      console.error("PoE2 Trade Extension: Fatal crash in handleGearClick:", err);
      showToast(`致命的エラー: ${err.message}`, "warning");
    }
  }

  // 10. Watcher to poll Mobalytics POB input element and detect page links
  let checkInterval = null;
  function watchPobInput() {
    if (checkInterval) clearInterval(checkInterval);

    checkInterval = setInterval(() => {
      // 1. Try to find the element with ID 'poe2PobCode' (just in case it gets added/set)
      const input = document.getElementById('poe2PobCode');
      if (input && input.value && !pobCodeLoaded) {
        console.log("PoE2 Trade Extension: Found POB code from poe2PobCode input.");
        handlePobCode(input.value);
        return;
      }

      // 2. Automatically find any pobb.in or pathofbuilding.community links on the page!
      const links = document.querySelectorAll('a[href*="pobb.in"], a[href*="pathofbuilding.community"]');
      for (const link of links) {
        if (link.href && !pobCodeLoaded) {
          console.log("PoE2 Trade Extension: Found POB link in DOM:", link.href);
          handlePobCode(link.href);
          return;
        }
      }
    }, 1000);
  }

  async function handlePobCode(code) {
    if (pobCodeLoaded) return;
    pobCodeLoaded = true;
    console.log("PoE2 Trade Extension: Found POB Import code. Length:", code.length);

    if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
    }

    try {
      let rawCode = code.trim();
      
      // If code is a link (like pobb.in or other URL), fetch the raw content
      if (rawCode.startsWith('http://') || rawCode.startsWith('https://')) {
        let fetchUrl = rawCode;
        if (rawCode.includes('pobb.in/')) {
          const match = rawCode.match(/pobb\.in\/([^/]+)/);
          if (match) {
            fetchUrl = `https://pobb.in/${match[1]}/raw`;
          }
        }
        
        statusBox.innerHTML = `
          <div class="status-loading">
            <div class="spinner"></div>
            <span>リンク先からPoBコードを取得中...</span>
          </div>
        `;
        showToast("リンク先からPoBコードを取得中...");
        
        const res = await fetch(fetchUrl);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        rawCode = await res.text();
        rawCode = rawCode.trim();
      }

      const xml = decodePoBExport(rawCode);
      
      // Parse active league directly from PoB XML
      const leagueMatch = xml.match(/<Build\s+[^>]*league="([^"]+)"/i);
      if (leagueMatch) {
        activeLeague = normalizeLeagueName(decodeURIComponent(leagueMatch[1]));
        console.log(`PoE2 Trade Extension: League detected from PoB XML: "${activeLeague}"`);
      } else {
        activeLeague = 'Standard';
      }

      const parsedData = parsePoBXml(xml);
      console.log("PoE2 Trade Extension: Successfully parsed PoB XML. Gear found:", Object.keys(parsedData.itemMap).length);
      
      renderGearList(parsedData);
      showToast("装備品リストを読み込みました");
    } catch (e) {
      console.error("PoE2 Trade Extension: Failed to parse POB XML:", e);
      statusBox.innerHTML = `<span style="color: #e74c3c;">PoBコードの解析に失敗しました。</span>`;
      showToast("PoBコードのデコードに失敗しました", "warning");
      
      // Restart watching in case code changes or user tries again
      pobCodeLoaded = false;
      watchPobInput();
    }
  }

  // SPA routing observer
  let lastUrl = window.location.href;

  function checkUrlChange() {
    const currentUrl = window.location.href;
    const target = isTargetUrl();
    const isDisplayed = host.style.display !== 'none' && sidebarContainer.style.display !== 'none';
    
    if (target && !isDisplayed) {
      console.log("PoE2 Trade Extension: Target URL active but sidebar was hidden. Restoring UI visibility.");
      host.style.display = 'block';
      sidebarContainer.style.display = 'block';
      updatePageLayout(isCollapsed);
      
      if (parsedGear) {
        statusBox.style.display = 'none';
        gearListContainer.style.display = 'flex';
      } else {
        lastUrl = currentUrl;
        handleUrlChange();
      }
    } else if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      handleUrlChange();
    }
  }

  function handleUrlChange() {
    console.log(`PoE2 Trade Extension: URL changed to ${window.location.href}`);
    
    if (isTargetUrl()) {
      host.style.display = 'block';
      sidebarContainer.style.display = 'block';
      statusBox.style.display = 'block';
      statusBox.innerHTML = `
        <div class="status-loading">
          <div class="spinner"></div>
          <span>PoBコードを探しています...</span>
        </div>
      `;
      gearListContainer.style.display = 'none';
      
      pobCodeLoaded = false;
      parsedGear = null;
      
      updatePageLayout(isCollapsed);
      watchPobInput();
    } else {
      host.style.display = 'none';
      document.documentElement.style.paddingRight = '0px';
      
      if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
      }
      pobCodeLoaded = false;
      parsedGear = null;
    }
  }

  // Start polling for URL changes (SPA support)
  setInterval(checkUrlChange, 1000);

  // Initial trigger
  handleUrlChange();

})();
