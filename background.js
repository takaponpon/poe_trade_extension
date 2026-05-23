/**
 * PoE2 Trade Extension - Background Service Worker
 * Handles extension installation events, message passing, and background operations.
 */

chrome.runtime.onInstalled.addListener((details) => {
  console.log("PoE2 Trade Extension: Installed/Updated successfully!");
  
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    // Set default configuration values upon installation
    // These keys must match STORAGE_KEYS in content.js
    chrome.storage.local.set({
      poe2_trade_sidebar_collapsed: false,
      poe2_sidebar_width: 300,
      poe2_saved_searches: [],
      poe2_saved_folders: [],
      poe2_max_visible_tags: 10,
      poe2_item_height: 36,
      poe2_auto_travel_cooldown: 30,
      poe2_manual_search_interval: 30,
      poe2_show_rune_excluded_defense: true,
      poe2_trade_gas_url: "",
      poe2_trade_gas_sync_mode: false
    }, () => {
      if (chrome.runtime.lastError) {
        console.error("PoE2 Trade Extension: Failed to initialize settings:", chrome.runtime.lastError.message);
        return;
      }
      console.log("PoE2 Trade Extension: Initialized default settings.");
    });
  }
});

// Proxy Trade API Search requests to bypass CORS restrictions in Content Scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "POB_TRADE_SEARCH") {
    const { league, query, useEnglish } = message;
    const domain = useEnglish ? "www.pathofexile.com" : "jp.pathofexile.com";
    const url = `https://${domain}/api/trade2/search/poe2/${encodeURIComponent(league)}`;

    console.log(`PoE2 Trade Extension [Background]: Proxying search request for league "${league}" on ${domain}`);

    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body: JSON.stringify(query)
    })
    .then(async (res) => {
      const text = await res.text();
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      try {
        return JSON.parse(text);
      } catch (e) {
        throw new Error(`Failed to parse JSON: ${text}`);
      }
    })
    .then(data => {
      console.log("PoE2 Trade Extension [Background]: Search request succeeded. Hash:", data.id);
      sendResponse({ success: true, data });
    })
    .catch(error => {
      console.error("PoE2 Trade Extension [Background]: Search request failed:", error);
      sendResponse({ success: false, error: error.message });
    });

    return true; // Keep message channel open for asynchronous sendResponse
  }
});
