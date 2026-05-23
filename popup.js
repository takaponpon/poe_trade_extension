/**
 * PoE2 Trade Extension - Popup Script
 * Primarily for testing/extending settings or interactions within the popup panel.
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log("PoE2 Trade Extension: Popup panel opened.");

  // Dynamically display the extension version from manifest.json
  const versionEl = document.getElementById('popup-version');
  if (versionEl) {
    const version = chrome.runtime.getManifest().version;
    versionEl.textContent = `PoE2 Trade Extension v${version}`;
  }
});
