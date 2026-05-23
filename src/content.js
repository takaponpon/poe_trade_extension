import { state, elements } from './state';
import { STORAGE_KEYS, DEFAULT_WIDTH, DEFAULT_MAX_VISIBLE_TAGS, DEFAULT_ITEM_HEIGHT } from './constants';
import { storageGet, storageSet, checkStorageUsage } from './utils/storage';
import { initSidebar, updateItemHeightStyles, updatePageLayout } from './modules/sidebar-ui';
import { initSavedSearches, renderSavedList, renderTagFilters } from './modules/saved-searches';
import { initFolderManager } from './modules/folder-manager';
import { initDragDrop } from './modules/drag-drop';
import { initExportImport } from './modules/export-import';
import { initCloudSync, syncPullFromCloud } from './modules/cloud-sync';
import { initAutoTravel } from './modules/auto-travel';
import { applyRuneExcludedDefenseToAll, applyRuneExcludedDefenseToRow } from './modules/rune-defense';
import { initSettings } from './modules/settings';

// 1. Dynamic Style Injection for the Main Document
function injectStyles() {
  const mainStyle = document.createElement('style');
  mainStyle.id = 'poe2-trade-extension-main-styles';
  mainStyle.textContent = `
    .rune-excluded-val {
      color: #c89c3c !important;
      font-size: 0.85em;
      margin-left: 5px;
      font-weight: 600;
      text-shadow: 0 0 3px rgba(200, 156, 60, 0.4);
      display: inline-block;
      animation: poe2-fade-in 0.25s ease-out;
    }
    @keyframes poe2-fade-in {
      from { opacity: 0; transform: translateY(1px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  if (document.head) {
    document.head.appendChild(mainStyle);
  } else {
    document.documentElement.appendChild(mainStyle);
  }
}

// 2. Global Event Listeners
function registerGlobalListeners() {
  // Prevent browser default drag/drop behaviors globally inside the sidebar to stop search engine tab launches
  window.addEventListener('dragover', (e) => {
    const path = e.composedPath();
    const isInsideSidebar = path.some(el => el.id === 'sidebar' || el.id === 'poe2-trade-sidebar-root');
    if (isInsideSidebar) {
      e.preventDefault();
    }
  }, false);

  window.addEventListener('drop', (e) => {
    const path = e.composedPath();
    const isInsideSidebar = path.some(el => el.id === 'sidebar' || el.id === 'poe2-trade-sidebar-root');
    if (isInsideSidebar) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, false);
}

// 3. Boot / Initialization process
async function boot() {
  console.log("PoE2 Trade Extension: Content script initialized.");
  
  // 3.1. Inject Styles & register global drag blockers
  injectStyles();
  registerGlobalListeners();

  // 3.2. Construct Sidebar UI & Cache DOM Elements
  initSidebar();

  // 3.3. Initialize modules
  initSavedSearches();
  initFolderManager();
  initDragDrop();
  initExportImport();
  initCloudSync();
  initAutoTravel();
  initSettings();

  // 3.4. Load initial state on boot
  const items = await storageGet([
    STORAGE_KEYS.collapsed,
    STORAGE_KEYS.sidebarWidth,
    STORAGE_KEYS.savedSearches,
    STORAGE_KEYS.savedFolders,
    STORAGE_KEYS.maxVisibleTags,
    STORAGE_KEYS.itemHeight,
    STORAGE_KEYS.autoTravelCooldown,
    STORAGE_KEYS.manualSearchInterval,
    STORAGE_KEYS.showRuneExcludedDefense,
    STORAGE_KEYS.gasUrl,
    STORAGE_KEYS.gasSyncMode,
    STORAGE_KEYS.excludeCompleted
  ]);

  state.isCollapsed = items[STORAGE_KEYS.collapsed] || false;
  state.currentWidth = items[STORAGE_KEYS.sidebarWidth] || DEFAULT_WIDTH;
  state.savedSearches = items[STORAGE_KEYS.savedSearches] || [];
  state.savedFolders = items[STORAGE_KEYS.savedFolders] || [];
  state.maxVisibleTags = items[STORAGE_KEYS.maxVisibleTags] || DEFAULT_MAX_VISIBLE_TAGS;
  
  if (elements.maxVisibleTagsInput) {
    elements.maxVisibleTagsInput.value = state.maxVisibleTags;
  }
  
  state.itemHeight = items[STORAGE_KEYS.itemHeight] || DEFAULT_ITEM_HEIGHT;
  updateItemHeightStyles(state.itemHeight);

  state.autoTravelCooldown = items[STORAGE_KEYS.autoTravelCooldown] !== undefined ? items[STORAGE_KEYS.autoTravelCooldown] : 30;
  if (elements.autoTravelCooldownInput) {
    elements.autoTravelCooldownInput.value = state.autoTravelCooldown;
  }

  state.manualSearchInterval = items[STORAGE_KEYS.manualSearchInterval] !== undefined ? items[STORAGE_KEYS.manualSearchInterval] : 30;
  if (elements.manualSearchIntervalInput) {
    elements.manualSearchIntervalInput.value = state.manualSearchInterval;
  }

  state.showRuneExcludedDefense = items[STORAGE_KEYS.showRuneExcludedDefense] !== undefined ? items[STORAGE_KEYS.showRuneExcludedDefense] : true;
  if (elements.showRuneExcludedDefenseInput) {
    elements.showRuneExcludedDefenseInput.checked = state.showRuneExcludedDefense;
  }

  const gasUrl = items[STORAGE_KEYS.gasUrl] || "";
  if (elements.gasUrlInput) {
    elements.gasUrlInput.value = gasUrl;
  }

  state.gasSyncMode = items[STORAGE_KEYS.gasSyncMode] || false;
  if (elements.gasSyncModeInput) {
    elements.gasSyncModeInput.checked = state.gasSyncMode;
  }

  state.excludeCompleted = items[STORAGE_KEYS.excludeCompleted] || false;
  if (elements.excludeCompletedInput) {
    elements.excludeCompletedInput.checked = state.excludeCompleted;
  }

  // Apply dynamic width properties immediately
  if (elements.host) {
    elements.host.style.setProperty('--sidebar-width', `${state.currentWidth}px`);
  }

  document.documentElement.style.transition = 'padding-right 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
  document.documentElement.style.boxSizing = 'border-box';

  updatePageLayout(state.isCollapsed);
  renderSavedList();
  renderTagFilters();

  // Initial calculation for any items already rendered on the page
  applyRuneExcludedDefenseToAll();

  // Calculate initial storage usage warning status
  checkStorageUsage();

  // If sync mode is ON, sync pull from cloud silently in background on boot
  if (state.gasSyncMode && gasUrl) {
    state.isPullingFromCloud = true;
    syncPullFromCloud()
      .then(cloudData => {
        state.savedSearches = cloudData.searches;
        state.savedFolders = cloudData.folders;
        storageSet({
          [STORAGE_KEYS.savedSearches]: state.savedSearches,
          [STORAGE_KEYS.savedFolders]: state.savedFolders
        }, () => {
          state.isPullingFromCloud = false;
          renderSavedList();
          renderTagFilters();
          checkStorageUsage();
          console.log('PoE2 Trade Extension: Boot auto-sync completed.');
        });
      })
      .catch(err => {
        state.isPullingFromCloud = false;
        console.error('PoE2 Trade Extension: Boot auto-sync failed:', err);
      });
  }

  // Register MutationObserver to handle dynamically added items (Infinite Scroll / Live Search)
  const observer = new MutationObserver((mutations) => {
    if (!state.showRuneExcludedDefense) return;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.classList.contains('row') && node.closest('.resultset')) {
            applyRuneExcludedDefenseToRow(node);
          } else {
            const rows = node.querySelectorAll('.resultset .row');
            if (rows.length > 0) {
              rows.forEach(row => applyRuneExcludedDefenseToRow(row));
            }
          }
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

boot();
