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
