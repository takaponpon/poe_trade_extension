import { state, elements } from '../state';
import { POLLING_INTERVAL_MS } from '../constants';
import { isTeleportButton } from '../utils/dom';

export function startAutoTravel() {
  // 0. Stop manual live search if active
  stopManualLiveSearch();

  // 1. Activate Live Search if not active
  const liveSearchBtn = document.querySelector('.livesearch-btn');
  if (liveSearchBtn) {
    const btnText = liveSearchBtn.textContent || "";
    const isInactive = btnText.includes("アクティベート") || btnText.includes("Activate");
    if (isInactive) {
      liveSearchBtn.click();
    }
  }

  // 2. Set interval to check for warp button every POLLING_INTERVAL_MS
  state.autoTravelInterval = setInterval(() => {
    const now = Date.now();
    const timeSinceLastClick = now - state.lastClickedTime;
    const cooldownMs = state.autoTravelCooldown * 1000;
    if (timeSinceLastClick < cooldownMs) {
      const remainingSec = Math.ceil((cooldownMs - timeSinceLastClick) / 1000);
      elements.autoTravelBtn.innerText = `自動転送の停止 (${remainingSec}秒待機中)`;
      return;
    } else {
      elements.autoTravelBtn.innerText = "自動転送の停止";
    }

    const firstRow = document.querySelector('.resultset .row');
    if (firstRow) {
      const directBtn = firstRow.querySelector('.direct-btn');
      if (directBtn) {
        const btnText = (directBtn.textContent || "").trim();
        if (isTeleportButton(btnText)) {
          directBtn.click();
          state.lastClickedTime = Date.now();
        }
      }
    }
  }, POLLING_INTERVAL_MS);

  // 3. Update button UI
  elements.autoTravelBtn.innerText = "自動転送の停止";
  elements.autoTravelBtn.className = "btn-danger";
}

export function stopAutoTravel() {
  if (state.autoTravelInterval) {
    clearInterval(state.autoTravelInterval);
    state.autoTravelInterval = null;
  }
  state.lastClickedTime = 0; // Clear cooldown immediately on stop
  elements.autoTravelBtn.innerText = "自動転送を有効化";
  elements.autoTravelBtn.className = "btn-gold";
}

// Helper to check if an item was listed "just now"
export function isListedJustNow(row) {
  const indexedEl = row.querySelector('[data-field="indexed"] small');
  if (!indexedEl) return false;
  
  const text = (indexedEl.textContent || "").toLowerCase().trim();
  return (
    text.includes("たった今") ||
    text.includes("数秒前") ||
    text.includes("just now") ||
    text.includes("few seconds") ||
    text.includes("seconds ago")
  );
}

// Manual Live Search Logic
export function startManualLiveSearch() {
  // 1. Mutually exclusive safety: Stop auto travel if active
  stopAutoTravel();

  // 2. Click the search button immediately once
  const searchBtn = document.querySelector('.search-btn');
  if (searchBtn) {
    searchBtn.click();
  }

  // 3. Set interval for automatic clicking of the search button
  const clickIntervalMs = state.manualSearchInterval * 1000;
  state.manualLiveSearchClickInterval = setInterval(() => {
    const searchBtn = document.querySelector('.search-btn');
    if (searchBtn) {
      searchBtn.click();
    }
  }, clickIntervalMs);

  // 4. Set interval to check for "just now" items and auto travel
  state.manualLiveSearchCheckInterval = setInterval(() => {
    const now = Date.now();
    const timeSinceLastClick = now - state.lastClickedTime;
    const cooldownMs = state.autoTravelCooldown * 1000;

    if (timeSinceLastClick < cooldownMs) {
      const remainingSec = Math.ceil((cooldownMs - timeSinceLastClick) / 1000);
      elements.manualLiveSearchBtn.innerText = `手動ライブサーチの停止 (${remainingSec}秒待機中)`;
      return;
    } else {
      elements.manualLiveSearchBtn.innerText = "手動ライブサーチの停止";
    }

    const rows = document.querySelectorAll('.resultset .row');
    for (const row of rows) {
      if (isListedJustNow(row)) {
        const directBtn = row.querySelector('.direct-btn');
        if (directBtn) {
          const btnText = (directBtn.textContent || "").trim();
          if (isTeleportButton(btnText)) {
            directBtn.click();
            state.lastClickedTime = Date.now();
            break; // click once per polling cycle
          }
        }
      }
    }
  }, POLLING_INTERVAL_MS);

  // 5. Update Button UI
  elements.manualLiveSearchBtn.innerText = "手動ライブサーチの停止";
  elements.manualLiveSearchBtn.className = "btn-danger";
}

export function stopManualLiveSearch() {
  if (state.manualLiveSearchClickInterval) {
    clearInterval(state.manualLiveSearchClickInterval);
    state.manualLiveSearchClickInterval = null;
  }
  if (state.manualLiveSearchCheckInterval) {
    clearInterval(state.manualLiveSearchCheckInterval);
    state.manualLiveSearchCheckInterval = null;
  }
  state.lastClickedTime = 0; // Reset cooldown immediately on manual stop
  elements.manualLiveSearchBtn.innerText = "手動ライブサーチを有効化";
  elements.manualLiveSearchBtn.className = "btn-gold";
}

export function initAutoTravel() {
  const autoTravelBtn = elements.autoTravelBtn;
  const manualLiveSearchBtn = elements.manualLiveSearchBtn;

  if (!autoTravelBtn) return;

  autoTravelBtn.addEventListener('click', () => {
    if (state.autoTravelInterval) {
      stopAutoTravel();
    } else {
      startAutoTravel();
    }
  });

  manualLiveSearchBtn.addEventListener('click', () => {
    if (state.manualLiveSearchClickInterval || state.manualLiveSearchCheckInterval) {
      stopManualLiveSearch();
    } else {
      startManualLiveSearch();
    }
  });
}
