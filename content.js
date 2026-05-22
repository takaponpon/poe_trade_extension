/**
 * PoE2 Trade Extension - Content Script
 * Injects a premium, modern, and highly interactive right-side sidebar UI
 * inside a Shadow DOM, and shifts the main website layout by 10% (or fixed equivalent)
 * to prevent overlay overlap.
 */

(function () {
  console.log("PoE2 Trade Extension: Content script initialized.");

  // Configuration constants
  const STORAGE_KEYS = {
    collapsed: 'poe2_trade_sidebar_collapsed',
    autoRefresh: 'poe2_trade_auto_refresh',
    soundAlert: 'poe2_trade_sound_alert',
    priceHighlight: 'poe2_trade_price_highlight'
  };

  const SIDEBAR_WIDTH = '250px';
  const COLLAPSED_WIDTH = '40px';

  // 1. Create Host Element in the Document root (isolates from page refreshes/clears)
  const host = document.createElement('div');
  host.id = 'poe2-trade-sidebar-root';
  document.documentElement.appendChild(host);

  // 2. Attach Shadow Root
  const shadow = host.attachShadow({ mode: 'open' });

  // 3. Inject Stylesheet Link (registered in manifest.json web_accessible_resources)
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = chrome.runtime.getURL('content.css');
  shadow.appendChild(link);

  // 4. Create Sidebar DOM Structure
  const sidebarContainer = document.createElement('div');
  sidebarContainer.className = 'sidebar-container';
  sidebarContainer.id = 'sidebar';

  sidebarContainer.innerHTML = `
    <button class="toggle-btn" id="toggleBtn">&gt;</button>
    
    <div class="sidebar-header">
      <h1 class="sidebar-title">POE2 TRADE</h1>
      <p class="sidebar-subtitle">Overlay Helper</p>
    </div>
    
    <div class="sidebar-content">
      <div class="sidebar-section">
        <h2 class="section-title">General Settings</h2>
        
        <div class="control-group">
          <label class="control-label" for="autoRefresh">Auto-Refresh</label>
          <label class="switch">
            <input type="checkbox" id="autoRefresh">
            <span class="slider"></span>
          </label>
        </div>
        
        <div class="control-group">
          <label class="control-label" for="soundAlert">Sound Alerts</label>
          <label class="switch">
            <input type="checkbox" id="soundAlert">
            <span class="slider"></span>
          </label>
        </div>
      </div>
      
      <div class="sidebar-section">
        <h2 class="section-title">Price Alerts</h2>
        <div class="control-group" style="flex-direction: column; align-items: stretch; gap: 8px;">
          <label class="control-label" for="priceHighlight">Highlight Below (Chaos)</label>
          <input type="number" class="text-input" id="priceHighlight" placeholder="e.g. 10" min="0">
        </div>
      </div>
      
      <button class="btn-gold" id="saveBtn">Apply Settings</button>
    </div>
    
    <div class="sidebar-footer">
      PoE2 Trade Extension v1.0.0
    </div>
  `;

  shadow.appendChild(sidebarContainer);

  // 5. Select Injected Elements
  const toggleBtn = shadow.getElementById('toggleBtn');
  const autoRefreshChk = shadow.getElementById('autoRefresh');
  const soundAlertChk = shadow.getElementById('soundAlert');
  const priceHighlightInput = shadow.getElementById('priceHighlight');
  const saveBtn = shadow.getElementById('saveBtn');

  // 6. Setup Smooth Layout Shifting on the Page HTML Element
  // We use CSS transition on padding-right to shift the website content dynamically.
  document.documentElement.style.transition = 'padding-right 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
  document.documentElement.style.boxSizing = 'border-box';

  function updatePageLayout(collapsed) {
    if (collapsed) {
      document.documentElement.style.paddingRight = COLLAPSED_WIDTH;
    } else {
      document.documentElement.style.paddingRight = SIDEBAR_WIDTH;
    }
  }

  // 7. Load Initial Settings State
  chrome.storage.sync.get([
    STORAGE_KEYS.collapsed,
    STORAGE_KEYS.autoRefresh,
    STORAGE_KEYS.soundAlert,
    STORAGE_KEYS.priceHighlight
  ], (items) => {
    // Default: expanded (collapsed = false)
    const isCollapsed = items[STORAGE_KEYS.collapsed] || false;
    
    // Set Sidebar collapsed state class
    if (isCollapsed) {
      sidebarContainer.classList.add('collapsed');
      toggleBtn.innerText = '<';
    } else {
      sidebarContainer.classList.remove('collapsed');
      toggleBtn.innerText = '>';
    }
    
    // Update Page layout immediately
    updatePageLayout(isCollapsed);

    // Restore form values
    autoRefreshChk.checked = items[STORAGE_KEYS.autoRefresh] || false;
    soundAlertChk.checked = items[STORAGE_KEYS.soundAlert] || false;
    priceHighlightInput.value = items[STORAGE_KEYS.priceHighlight] || '';
  });

  // 8. Collapsible Toggle Event Handler
  toggleBtn.addEventListener('click', () => {
    const willCollapse = !sidebarContainer.classList.contains('collapsed');
    
    if (willCollapse) {
      sidebarContainer.classList.add('collapsed');
      toggleBtn.innerText = '<';
    } else {
      sidebarContainer.classList.remove('collapsed');
      toggleBtn.innerText = '>';
    }

    // Shift Layout
    updatePageLayout(willCollapse);

    // Save collapsed state
    chrome.storage.sync.set({ [STORAGE_KEYS.collapsed]: willCollapse });
  });

  // 9. Save Button Event Handler
  saveBtn.addEventListener('click', () => {
    const settings = {
      [STORAGE_KEYS.autoRefresh]: autoRefreshChk.checked,
      [STORAGE_KEYS.soundAlert]: soundAlertChk.checked,
      [STORAGE_KEYS.priceHighlight]: parseInt(priceHighlightInput.value, 10) || null
    };

    chrome.storage.sync.set(settings, () => {
      console.log('PoE2 Trade Extension: Settings saved!', settings);
      
      // Visual feedback on the button
      const originalText = saveBtn.innerText;
      saveBtn.innerText = 'SAVED!';
      saveBtn.style.background = 'linear-gradient(180deg, var(--poe-success) 0%, #27ae60 100%)';
      saveBtn.style.borderColor = '#27ae60';
      saveBtn.style.color = '#ffffff';

      setTimeout(() => {
        saveBtn.innerText = originalText;
        saveBtn.style.background = '';
        saveBtn.style.borderColor = '';
        saveBtn.style.color = '';
      }, 1500);
    });
  });

})();
