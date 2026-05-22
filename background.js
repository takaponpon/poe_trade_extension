/**
 * PoE2 Trade Extension - Background Service Worker
 * Handles extension installation events, message passing, and background operations.
 */

chrome.runtime.onInstalled.addListener((details) => {
  console.log("PoE2 Trade Extension: Installed/Updated successfully!");
  
  if (details.reason === chrome.runtime.OnInstalledReason.INSTALL) {
    // Set default configuration values upon installation
    chrome.storage.sync.set({
      poe2_trade_sidebar_collapsed: false,
      poe2_trade_auto_refresh: false,
      poe2_trade_sound_alert: false,
      poe2_trade_price_highlight: null
    }, () => {
      console.log("PoE2 Trade Extension: Initialized default settings.");
    });
  }
});
