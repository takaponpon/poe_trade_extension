/**
 * PoE2 Trade Extension - Content Script
 * Injects a premium, modern, and highly interactive right-side sidebar UI
 * inside a Shadow DOM, and shifts the main website layout dynamically
 * using a draggable left border.
 */

(function () {
  console.log("PoE2 Trade Extension: Content script initialized.");

  // Configuration constants
  const STORAGE_KEYS = {
    collapsed: 'poe2_trade_sidebar_collapsed',
    sidebarWidth: 'poe2_sidebar_width',
    savedSearches: 'poe2_saved_searches',
    savedFolders: 'poe2_saved_folders',
    maxVisibleTags: 'poe2_max_visible_tags',
    itemHeight: 'poe2_item_height',
    autoTravelCooldown: 'poe2_auto_travel_cooldown',
    manualSearchInterval: 'poe2_manual_search_interval',
    showRuneExcludedDefense: 'poe2_show_rune_excluded_defense'
  };

  const DEFAULT_WIDTH = 300;
  const COLLAPSED_WIDTH = 40;
  const MIN_WIDTH = 200;
  const MAX_WIDTH = 600;
  const DEFAULT_MAX_VISIBLE_TAGS = 10;
  const DEFAULT_ITEM_HEIGHT = 36;

  // State Variables
  let currentWidth = DEFAULT_WIDTH;
  let isCollapsed = false;
  let savedSearches = [];
  let savedFolders = [];
  let filterText = '';
  let selectedTags = new Set();
  let tempSearchData = null; // Temp storage during duplicates validation
  let itemToDelete = null;
  let folderToDelete = null;
  let isExportMode = false;
  let isImportMode = false;
  let tempImportData = null;
  let showAllTags = false;
  let maxVisibleTags = DEFAULT_MAX_VISIBLE_TAGS;
  let itemHeight = DEFAULT_ITEM_HEIGHT;
  let autoTravelInterval = null;
  let autoTravelCooldown = 30; // Cooldown between clicks in seconds (default: 30s)
  let lastClickedTime = 0; // Timestamp of the last successful teleport click
  let manualLiveSearchClickInterval = null;
  let manualLiveSearchCheckInterval = null;
  let manualSearchInterval = 30; // Auto search interval in seconds (default: 30s)
  let showRuneExcludedDefense = true; // Show defense stats excluding runes (default: true)

  // Dynamic Style Injection for the Main Document (outside Shadow DOM)
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

  // 4. SVG Icons
  const ICONS = {
    eye: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
    trash: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`,
    search: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
    reset: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.5 3.5a2.121 2.121 0 0 1 3 3L10.5 17.5l-4-4L18.5 3.5z"></path><path d="m8.5 15.5-5 5v3h3l5-5"></path><path d="M3 21.5h18"></path></svg>`,
    folder: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`,
    folderPlus: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>`,
    export: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>`,
    import: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
    cancel: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
    settings: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
    arrowLeft: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>`
  };

  // 5. Create Sidebar DOM Structure
  const sidebarContainer = document.createElement('div');
  sidebarContainer.className = 'sidebar-container';
  sidebarContainer.id = 'sidebar';

  sidebarContainer.innerHTML = `
    <!-- Resize Draggable Handle -->
    <div class="resize-handle" id="resizeHandle"></div>

    <!-- Toggle Button -->
    <button class="toggle-btn" id="toggleBtn">&gt;</button>
    
    <div class="sidebar-content">
      <!-- Save Search & Create Folder Buttons -->
      <div class="sidebar-section">
        <div class="save-controls-wrapper">
          <button class="btn-gold" id="saveSearchBtn" style="flex: 1;">検索結果を保存</button>
          <button class="btn-icon" id="createFolderBtn" title="新規フォルダ作成">
            ${ICONS.folderPlus}
          </button>
          <button class="btn-icon" id="exportBtn" title="エクスポート">
            ${ICONS.export}
          </button>
          <button class="btn-icon" id="importBtn" title="インポート">
            ${ICONS.import}
          </button>
          <button class="btn-icon" id="settingsBtn" title="設定">
            ${ICONS.settings}
          </button>
        </div>

        <!-- Inline Save Search Form (Initially Hidden) -->
        <div class="inline-form-container" id="inlineSaveForm">
          <div class="inline-form-title">検索結果を保存</div>
          
          <div class="form-group">
            <label class="form-label">名前</label>
            <input type="text" class="text-input" id="saveNameInput" placeholder="e.g. Chaos Orbs, Tier 1 Maps">
          </div>
          
          <div class="form-group">
            <label class="form-label">タグ (カンマ区切り)</label>
            <input type="text" class="text-input" id="saveTagsInput" placeholder="e.g. currency, maps, rings">
          </div>

          <!-- Tag suggestions bubble box -->
          <div class="tag-suggestions-box">
            <div class="tag-suggestions-title">既存のタグ</div>
            <div class="tag-suggestions-list" id="tagSuggestionsList"></div>
          </div>

          <!-- Overwrite confirmation warning area (Initially Hidden) -->
          <div class="inline-warning-box" id="overwriteWarningBox">
            <div class="warning-message">同名の保存結果が既に存在します。<br>上書きしますか？</div>
            <div class="inline-buttons">
              <button class="btn-gold btn-sm" id="confirmOverwriteBtn">Overwrite</button>
              <button class="btn-gray btn-sm" id="cancelOverwriteBtn">Cancel</button>
            </div>
          </div>

          <div class="inline-buttons" id="normalSaveButtons">
            <button class="btn-gold btn-sm" id="confirmSaveBtn">Save</button>
            <button class="btn-gray btn-sm" id="cancelSaveBtn">Cancel</button>
          </div>
        </div>

        <!-- Inline Create Folder Form (Initially Hidden) -->
        <div class="inline-form-container" id="inlineFolderForm">
          <div class="inline-form-title">新規フォルダ作成</div>
          
          <div class="form-group">
            <label class="form-label">フォルダ名</label>
            <input type="text" class="text-input" id="folderNameInput" placeholder="e.g. Currency, Maps">
          </div>

          <div class="inline-buttons">
            <button class="btn-gold btn-sm" id="confirmFolderBtn">Create</button>
            <button class="btn-gray" id="cancelFolderBtn">Cancel</button>
          </div>
        </div>

        <!-- Inline Import Form (Initially Hidden) -->
        <div class="inline-form-container" id="inlineImportForm">
          <div class="inline-form-title">インポート</div>
          <div class="import-dropzone" id="importDropZone">
            <div class="import-dropzone-text">JSONファイルをドラッグ＆ドロップ、またはクリックして選択</div>
            <input type="file" id="importFileInput" accept=".json" style="display: none;">
          </div>
          <div class="import-conflict-container" id="importConflictContainer" style="display: none;">
            <div class="conflict-title">重複したアイテムが存在します</div>
            <div class="conflict-desc">上書きするアイテムを選択してください（チェックOFFは既存データを維持します）。</div>
            <div class="conflict-list" id="conflictList"></div>
            <div class="inline-buttons">
              <button class="btn-gold btn-sm" id="confirmImportBtn" style="flex: 1;">確定</button>
              <button class="btn-gray btn-sm" id="cancelImportBtn" style="flex: 1;">キャンセル</button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Filter Inputs -->
      <div class="sidebar-section">
        <div class="section-title collapsible-header" id="filterHeader">
          <span>フィルター</span>
          <span class="chevron-icon" id="filterChevron">▼</span>
        </div>
        
        <div class="collapsible-content active" id="filterContent">
          <div class="filter-controls" style="margin-top: 4px;">
            <div class="search-box-wrapper">
              <span class="search-icon">${ICONS.search}</span>
              <input type="text" class="text-input" id="filterInput" placeholder="Search by name...">
            </div>
            <button class="btn-icon" id="resetFiltersBtn" title="Reset Filters">
              ${ICONS.reset}
            </button>
          </div>
          
          <!-- Filter Tag Pills (Injected dynamically) -->
          <div class="tag-filters-container" id="tagFiltersContainer"></div>
        </div>
      </div>
      
      <!-- Saved List -->
      <div class="sidebar-section flex-fill">
        <!-- Export Action Header (Initially Hidden) -->
        <div class="export-action-header" id="exportActionHeader">
          <label class="export-select-all-label">
            <input type="checkbox" id="selectAllCheckbox">
            <span>すべて選択</span>
          </label>
          <span class="export-count-label" id="exportCountLabel">選択中: 0件</span>
          <button class="btn-gold btn-xs" id="exportActionBtn" style="width: auto; margin-left: auto;">エクスポート実行</button>
        </div>
        <div class="saved-list" id="savedList"></div>
      </div>

      <!-- Tools Section -->
      <div class="sidebar-section">
        <div class="section-title collapsible-header collapsed" id="toolsHeader">
          <span>ツール (Tools)</span>
          <span class="chevron-icon" id="toolsChevron">▼</span>
        </div>
        
        <div class="collapsible-content" id="toolsContent">
          <div style="margin-top: 6px;">
            <button class="btn-gold tooltip-trigger" id="autoTravelBtn" style="width: 100%; margin-bottom: 6px;" data-tooltip="この機能はライブサーチにおける商品のリスティングを検知し、自動で隠れ家に転送する機能です。設定で隠れ家転送のCDを調整可能です。">自動転送を有効化</button>
            <button class="btn-gold tooltip-trigger" id="manualLiveSearchBtn" style="width: 100%;" data-tooltip="この機能はライブサーチを使わずに一定間隔で検索を実行し、検索結果に”たった今”出品されたものがあれば自動で隠れ家に転送する機能です。設定で検索の間隔を調整可能です。">手動ライブサーチを有効化</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Settings Panel (Initially Hidden) -->
    <div class="settings-panel" id="settingsPanel">
      <div class="settings-header">
        <div class="settings-title">拡張機能設定</div>
        <button class="btn-icon" id="settingsBackBtn" title="戻る">
          ${ICONS.arrowLeft}
        </button>
      </div>
      
      <div class="settings-body">
        <div class="settings-section tooltip-trigger" data-tooltip="フィルター欄で初期状態において表示されるタグの最大数です。これを超えるタグは折りたたまれます。">
          <div class="settings-section-title">タグフィルター設定</div>
          <div class="form-group">
            <label class="form-label">最大表示タグ数</label>
            <input type="number" class="text-input" id="maxVisibleTagsInput" min="1" max="100" value="10">
          </div>
        </div>

        <div class="settings-section tooltip-trigger" data-tooltip="一覧内のフォルダおよびアイテムの縦幅（高さ）を調整します。縦幅に応じて文字が縦に見切れないようにフォントサイズ等も自動調整されます。">
          <div class="settings-section-title">レイアウト設定</div>
          <div class="form-group">
            <label class="form-label">アイテム・フォルダの縦幅</label>
            <div class="slider-wrapper" style="display: flex; align-items: center; gap: 10px;">
              <input type="range" id="itemHeightSlider" min="28" max="50" value="36" style="flex: 1; accent-color: var(--poe-gold); cursor: pointer;">
              <span id="itemHeightValue" style="font-size: 11px; color: var(--poe-gold-bright); font-weight: bold; width: 35px; text-align: right; font-family: var(--font-body);">36px</span>
            </div>
          </div>
        </div>

        <div class="settings-section tooltip-trigger" data-tooltip="自動転送ボタンをクリックした後に、次の自動クリックを行わないようにするクールダウン時間です（0秒で待機なし）。">
          <div class="settings-section-title">自動転送設定</div>
          <div class="form-group">
            <label class="form-label">転送後の待機時間（秒）</label>
            <input type="number" class="text-input" id="autoTravelCooldownInput" min="0" max="300" value="30">
          </div>
        </div>

        <div class="settings-section tooltip-trigger" data-tooltip="手動ライブサーチの自動検索を実行する間隔です。最小5秒、デフォルト30秒です。">
          <div class="settings-section-title">手動ライブサーチ設定</div>
          <div class="form-group">
            <label class="form-label">検索の実行間隔（秒）</label>
            <input type="number" class="text-input" id="manualSearchIntervalInput" min="5" max="300" value="30">
          </div>
        </div>

        <div class="settings-section tooltip-trigger" data-tooltip="装備にルーンが装着されている場合、ルーンを除外した本来の品質最大時のステータス値を (XXX) として隣に表示します。">
          <div class="settings-section-title">ルーン除外ステータス表示</div>
          <div class="form-group" style="display: flex; align-items: center; justify-content: flex-end;">
            <label class="switch">
              <input type="checkbox" id="showRuneExcludedDefenseInput" checked>
              <span class="slider round"></span>
            </label>
          </div>
        </div>
      </div>
    </div>
  `;

  shadow.appendChild(sidebarContainer);

  // 6. Select Injected Elements
  const toggleBtn = shadow.getElementById('toggleBtn');
  const resizeHandle = shadow.getElementById('resizeHandle');
  
  const saveSearchBtn = shadow.getElementById('saveSearchBtn');
  const filterInput = shadow.getElementById('filterInput');
  const resetFiltersBtn = shadow.getElementById('resetFiltersBtn');
  const tagFiltersContainer = shadow.getElementById('tagFiltersContainer');
  const savedList = shadow.getElementById('savedList');

  // Filter accordion elements
  const filterHeader = shadow.getElementById('filterHeader');
  const filterContent = shadow.getElementById('filterContent');
  const filterChevron = shadow.getElementById('filterChevron');

  // Inline Forms selection
  const inlineSaveForm = shadow.getElementById('inlineSaveForm');
  const inlineFolderForm = shadow.getElementById('inlineFolderForm');
  const overwriteWarningBox = shadow.getElementById('overwriteWarningBox');
  const normalSaveButtons = shadow.getElementById('normalSaveButtons');

  const saveNameInput = shadow.getElementById('saveNameInput');
  const saveTagsInput = shadow.getElementById('saveTagsInput');
  const tagSuggestionsList = shadow.getElementById('tagSuggestionsList');

  const confirmSaveBtn = shadow.getElementById('confirmSaveBtn');
  const cancelSaveBtn = shadow.getElementById('cancelSaveBtn');
  
  const confirmOverwriteBtn = shadow.getElementById('confirmOverwriteBtn');
  const cancelOverwriteBtn = shadow.getElementById('cancelOverwriteBtn');

  // Folder UI Elements
  const createFolderBtn = shadow.getElementById('createFolderBtn');
  const folderNameInput = shadow.getElementById('folderNameInput');
  const confirmFolderBtn = shadow.getElementById('confirmFolderBtn');
  const cancelFolderBtn = shadow.getElementById('cancelFolderBtn');

  // Export / Import UI Elements
  const exportBtn = shadow.getElementById('exportBtn');
  const importBtn = shadow.getElementById('importBtn');
  const inlineImportForm = shadow.getElementById('inlineImportForm');
  const importDropZone = shadow.getElementById('importDropZone');
  const importFileInput = shadow.getElementById('importFileInput');
  const exportActionHeader = shadow.getElementById('exportActionHeader');
  const selectAllCheckbox = shadow.getElementById('selectAllCheckbox');
  const exportCountLabel = shadow.getElementById('exportCountLabel');
  const exportActionBtn = shadow.getElementById('exportActionBtn');
  const importConflictContainer = shadow.getElementById('importConflictContainer');
  const conflictList = shadow.getElementById('conflictList');
  const confirmImportBtn = shadow.getElementById('confirmImportBtn');
  const cancelImportBtn = shadow.getElementById('cancelImportBtn');
  const settingsBtn = shadow.getElementById('settingsBtn');
  const settingsPanel = shadow.getElementById('settingsPanel');
  const settingsBackBtn = shadow.getElementById('settingsBackBtn');
  const maxVisibleTagsInput = shadow.getElementById('maxVisibleTagsInput');
  const itemHeightSlider = shadow.getElementById('itemHeightSlider');
  const itemHeightValue = shadow.getElementById('itemHeightValue');
  const toolsHeader = shadow.getElementById('toolsHeader');
  const toolsContent = shadow.getElementById('toolsContent');
  const autoTravelBtn = shadow.getElementById('autoTravelBtn');
  const autoTravelCooldownInput = shadow.getElementById('autoTravelCooldownInput');
  const manualLiveSearchBtn = shadow.getElementById('manualLiveSearchBtn');
  const manualSearchIntervalInput = shadow.getElementById('manualSearchIntervalInput');
  const showRuneExcludedDefenseInput = shadow.getElementById('showRuneExcludedDefenseInput');

  function updateItemHeightStyles(height) {
    const h = parseInt(height, 10) || DEFAULT_ITEM_HEIGHT;
    
    // Proportional calculations to guarantee zero text clipping and beautiful balance:
    // H=28: font=10.0px, button=16.0px, icon=10.0px, tag_font=8.0px
    // H=36: font=11.4px, button=18.8px, icon=12.2px, tag_font=8.7px
    // H=50: font=14.0px, button=24.0px, icon=16.0px, tag_font=10.0px
    const fontSize = Math.max(10, Math.min(14, 10 + (h - 28) * 0.18));
    const btnSize = Math.max(16, Math.min(24, 16 + (h - 28) * 0.36));
    const iconSize = Math.max(10, Math.min(16, 10 + (h - 28) * 0.27));
    const tagFontSize = Math.max(8, Math.min(10, 8 + (h - 28) * 0.09));

    host.style.setProperty('--item-height', `${h}px`);
    host.style.setProperty('--item-font-size', `${fontSize}px`);
    host.style.setProperty('--item-btn-size', `${btnSize}px`);
    host.style.setProperty('--item-icon-size', `${iconSize}px`);
    host.style.setProperty('--item-tag-font-size', `${tagFontSize}px`);

    if (itemHeightValue) {
      itemHeightValue.innerText = `${h}px`;
    }
    if (itemHeightSlider) {
      itemHeightSlider.value = h;
    }
  }

  itemHeightSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10) || DEFAULT_ITEM_HEIGHT;
    itemHeight = val;
    updateItemHeightStyles(val);
    chrome.storage.sync.set({ [STORAGE_KEYS.itemHeight]: val });
  });

  // Settings Panel Handlers
  settingsBtn.addEventListener('click', () => {
    sidebarContainer.classList.add('settings-mode');
  });

  settingsBackBtn.addEventListener('click', () => {
    sidebarContainer.classList.remove('settings-mode');
  });

  maxVisibleTagsInput.addEventListener('input', (e) => {
    const rawVal = e.target.value.trim();
    if (!rawVal) return; // Keep empty while typing
    let value = parseInt(rawVal, 10);
    if (isNaN(value) || value < 1) {
      value = 1;
    }
    maxVisibleTags = value;
    chrome.storage.sync.set({ [STORAGE_KEYS.maxVisibleTags]: maxVisibleTags }, () => {
      renderTagFilters();
    });
  });

  maxVisibleTagsInput.addEventListener('blur', (e) => {
    let value = parseInt(e.target.value, 10);
    if (isNaN(value) || value < 1) {
      value = DEFAULT_MAX_VISIBLE_TAGS;
    }
    maxVisibleTags = value;
    maxVisibleTagsInput.value = maxVisibleTags;
    chrome.storage.sync.set({ [STORAGE_KEYS.maxVisibleTags]: maxVisibleTags }, () => {
      renderTagFilters();
    });
  });

  autoTravelCooldownInput.addEventListener('input', (e) => {
    const rawVal = e.target.value.trim();
    if (!rawVal) return;
    let value = parseInt(rawVal, 10);
    if (isNaN(value) || value < 0) {
      value = 0;
    }
    autoTravelCooldown = value;
    chrome.storage.sync.set({ [STORAGE_KEYS.autoTravelCooldown]: autoTravelCooldown });
  });

  autoTravelCooldownInput.addEventListener('blur', (e) => {
    let value = parseInt(e.target.value, 10);
    if (isNaN(value) || value < 0) {
      value = 30;
    }
    autoTravelCooldown = value;
    autoTravelCooldownInput.value = autoTravelCooldown;
    chrome.storage.sync.set({ [STORAGE_KEYS.autoTravelCooldown]: autoTravelCooldown });
  });

  manualSearchIntervalInput.addEventListener('input', (e) => {
    const rawVal = e.target.value.trim();
    if (!rawVal) return;
    let value = parseInt(rawVal, 10);
    if (isNaN(value) || value < 5) {
      value = 5;
    }
    manualSearchInterval = value;
    chrome.storage.sync.set({ [STORAGE_KEYS.manualSearchInterval]: manualSearchInterval });
  });

  manualSearchIntervalInput.addEventListener('blur', (e) => {
    let value = parseInt(e.target.value, 10);
    if (isNaN(value) || value < 5) {
      value = 30;
    }
    manualSearchInterval = value;
    manualSearchIntervalInput.value = manualSearchInterval;
    chrome.storage.sync.set({ [STORAGE_KEYS.manualSearchInterval]: manualSearchInterval });
  });

  showRuneExcludedDefenseInput.addEventListener('change', (e) => {
    showRuneExcludedDefense = e.target.checked;
    chrome.storage.sync.set({ [STORAGE_KEYS.showRuneExcludedDefense]: showRuneExcludedDefense }, () => {
      applyRuneExcludedDefenseToAll();
    });
  });

  // Accordion Toggle Logic
  filterHeader.addEventListener('click', () => {
    const isExpanded = filterContent.classList.contains('active');
    if (isExpanded) {
      filterContent.classList.remove('active');
      filterHeader.classList.add('collapsed');
    } else {
      filterContent.classList.add('active');
      filterHeader.classList.remove('collapsed');
    }
  });

  toolsHeader.addEventListener('click', () => {
    const isExpanded = toolsContent.classList.contains('active');
    if (isExpanded) {
      toolsContent.classList.remove('active');
      toolsHeader.classList.add('collapsed');
    } else {
      toolsContent.classList.add('active');
      toolsHeader.classList.remove('collapsed');
    }
  });

  // 7. Dynamic Width Drag Resizer
  let isResizing = false;

  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    sidebarContainer.classList.add('resizing');
    resizeHandle.classList.add('resizing');

    // Remove transition temporarily to prevent delay/lag during movement
    sidebarContainer.style.transition = 'none';
    document.documentElement.style.transition = 'none';
    
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (!isResizing) return;

    // Calculate sidebar width based on viewport right edge
    const newWidth = window.innerWidth - e.clientX;

    if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
      currentWidth = newWidth;
      updateSidebarWidth(currentWidth);
    }
  });

  window.addEventListener('mouseup', () => {
    if (!isResizing) return;
    isResizing = false;
    sidebarContainer.classList.remove('resizing');
    resizeHandle.classList.remove('resizing');

    // Restore animations
    sidebarContainer.style.transition = '';
    document.documentElement.style.transition = 'padding-right 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';

    // Persist new width
    chrome.storage.sync.set({ [STORAGE_KEYS.sidebarWidth]: currentWidth });
  });

  function updateSidebarWidth(width) {
    if (isCollapsed) return;
    host.style.setProperty('--sidebar-width', `${width}px`);
    sidebarContainer.style.width = `${width}px`;
    document.documentElement.style.paddingRight = `${width}px`;
  }

  function updatePageLayout(collapsed) {
    if (collapsed) {
      sidebarContainer.classList.add('collapsed');
      toggleBtn.innerText = '<';
      document.documentElement.style.paddingRight = `${COLLAPSED_WIDTH}px`;
      sidebarContainer.style.width = `${COLLAPSED_WIDTH}px`;
    } else {
      sidebarContainer.classList.remove('collapsed');
      toggleBtn.innerText = '>';
      document.documentElement.style.paddingRight = `${currentWidth}px`;
      sidebarContainer.style.width = `${currentWidth}px`;
    }
  }

  // 8. Tag Suggestions Rendering inside Save Form
  function renderTagSuggestions() {
    tagSuggestionsList.innerHTML = '';
    const allTags = new Set();
    
    savedSearches.forEach(search => {
      if (search.tags && Array.isArray(search.tags)) {
        search.tags.forEach(tag => {
          if (tag.trim()) {
            allTags.add(tag.trim().toLowerCase());
          }
        });
      }
    });

    if (allTags.size === 0) {
      tagSuggestionsList.innerHTML = '<span class="no-tags">タグはまだ登録されていません</span>';
      return;
    }

    allTags.forEach(tag => {
      const bubble = document.createElement('span');
      bubble.className = 'tag-bubble';
      bubble.innerText = tag;
      
      bubble.addEventListener('click', () => {
        const inputVal = saveTagsInput.value.trim();
        if (inputVal === '') {
          saveTagsInput.value = tag;
        } else {
          const tagsArray = inputVal.split(',').map(t => t.trim());
          if (!tagsArray.includes(tag)) {
            tagsArray.push(tag);
            saveTagsInput.value = tagsArray.join(', ');
          }
        }
        saveTagsInput.focus();
      });
      tagSuggestionsList.appendChild(bubble);
    });
  }

  // 9. Inline Folder Creation Workflow
  createFolderBtn.addEventListener('click', () => {
    // Close other form first
    inlineSaveForm.classList.remove('active');
    
    folderNameInput.value = '';
    inlineFolderForm.classList.toggle('active');
    if (inlineFolderForm.classList.contains('active')) {
      folderNameInput.focus();
    }
  });

  confirmFolderBtn.addEventListener('click', () => {
    const name = folderNameInput.value.trim();
    if (!name) {
      folderNameInput.focus();
      folderNameInput.classList.add('error');
      setTimeout(() => folderNameInput.classList.remove('error'), 1000);
      return;
    }

    // Duplicate Check
    const isDuplicate = savedFolders.some(f => f.name.toLowerCase() === name.toLowerCase());
    if (isDuplicate) {
      folderNameInput.focus();
      folderNameInput.classList.add('error');
      setTimeout(() => folderNameInput.classList.remove('error'), 1000);
      return;
    }

    const newFolder = {
      id: 'folder_' + Date.now(),
      name: name,
      isCollapsed: false
    };

    savedFolders.push(newFolder);
    persistSavedFolders();
    inlineFolderForm.classList.remove('active');
  });

  cancelFolderBtn.addEventListener('click', () => {
    inlineFolderForm.classList.remove('active');
  });

  function persistSavedFolders() {
    chrome.storage.sync.set({ [STORAGE_KEYS.savedFolders]: savedFolders }, () => {
      renderSavedList();
    });
  }

  // 10. Inline Save Search Workflow
  saveSearchBtn.addEventListener('click', () => {
    // Close other form first
    inlineFolderForm.classList.remove('active');
    
    saveNameInput.value = '';
    saveTagsInput.value = '';
    overwriteWarningBox.style.display = 'none';
    normalSaveButtons.style.display = 'flex';
    renderTagSuggestions();
    
    inlineSaveForm.classList.toggle('active');
    if (inlineSaveForm.classList.contains('active')) {
      saveNameInput.focus();
    }
  });

  confirmSaveBtn.addEventListener('click', () => {
    const name = saveNameInput.value.trim();
    if (!name) {
      saveNameInput.focus();
      saveNameInput.classList.add('error');
      setTimeout(() => saveNameInput.classList.remove('error'), 1000);
      return;
    }

    const tagsVal = saveTagsInput.value.trim();
    const tags = tagsVal
      ? [...new Set(tagsVal.split(',').map(t => t.trim().toLowerCase()).filter(t => t !== ''))]
      : [];

    const url = window.location.href;
    tempSearchData = { name, url, tags };

    // Duplicate Check
    const duplicateIndex = savedSearches.findIndex(s => s.name.toLowerCase() === name.toLowerCase());

    if (duplicateIndex !== -1) {
      // Show inline warning instead of a modal
      normalSaveButtons.style.display = 'none';
      overwriteWarningBox.style.display = 'block';
    } else {
      saveNewSearch(tempSearchData);
      inlineSaveForm.classList.remove('active');
      tempSearchData = null;
    }
  });

  cancelSaveBtn.addEventListener('click', () => {
    inlineSaveForm.classList.remove('active');
  });

  // Overwrite confirm
  confirmOverwriteBtn.addEventListener('click', () => {
    if (tempSearchData) {
      const idx = savedSearches.findIndex(s => s.name.toLowerCase() === tempSearchData.name.toLowerCase());
      if (idx !== -1) {
        tempSearchData.id = savedSearches[idx].id;
        tempSearchData.createdAt = savedSearches[idx].createdAt || Date.now();
        savedSearches[idx] = tempSearchData;
        persistSavedSearches();
      }
    }
    overwriteWarningBox.style.display = 'none';
    normalSaveButtons.style.display = 'flex';
    inlineSaveForm.classList.remove('active');
    tempSearchData = null;
  });

  // Overwrite cancel -> returns to normal save input state
  cancelOverwriteBtn.addEventListener('click', () => {
    overwriteWarningBox.style.display = 'none';
    normalSaveButtons.style.display = 'flex';
    saveNameInput.focus();
  });

  function saveNewSearch(data) {
    data.id = 'search_' + Date.now();
    data.createdAt = Date.now();
    savedSearches.push(data);
    persistSavedSearches();
  }

  function persistSavedSearches() {
    chrome.storage.sync.set({ [STORAGE_KEYS.savedSearches]: savedSearches }, () => {
      renderSavedList();
      renderTagFilters();
    });
  }

  // 11. Dual Filtering & List Rendering
  filterInput.addEventListener('input', (e) => {
    filterText = e.target.value.trim().toLowerCase();
    renderSavedList();
  });

  resetFiltersBtn.addEventListener('click', () => {
    filterInput.value = '';
    filterText = '';
    selectedTags.clear();
    
    // De-activate filter pill visuals
    const pills = tagFiltersContainer.querySelectorAll('.filter-tag-pill');
    pills.forEach(p => p.classList.remove('active'));

    renderSavedList();
  });

  function renderTagFilters() {
    tagFiltersContainer.innerHTML = '';
    const allTags = new Set();

    savedSearches.forEach(search => {
      if (search.tags && Array.isArray(search.tags)) {
        search.tags.forEach(tag => {
          if (tag.trim()) {
            allTags.add(tag.trim().toLowerCase());
          }
        });
      }
    });

    if (allTags.size === 0) {
      tagFiltersContainer.style.display = 'none';
      return;
    }
    tagFiltersContainer.style.display = 'flex';

    const tagsArray = Array.from(allTags);
    const hasMoreThanLimit = tagsArray.length > maxVisibleTags;
    const visibleTags = (hasMoreThanLimit && !showAllTags)
      ? tagsArray.slice(0, maxVisibleTags)
      : tagsArray;

    visibleTags.forEach(tag => {
      const pill = document.createElement('span');
      pill.className = 'filter-tag-pill';
      if (selectedTags.has(tag)) {
        pill.classList.add('active');
      }
      pill.innerText = tag;

      pill.addEventListener('click', () => {
        if (selectedTags.has(tag)) {
          selectedTags.delete(tag);
          pill.classList.remove('active');
        } else {
          selectedTags.add(tag);
          pill.classList.add('active');
        }
        renderSavedList();
      });
      tagFiltersContainer.appendChild(pill);
    });

    // Add toggle button if more than limit tags
    if (hasMoreThanLimit) {
      const toggleBtn = document.createElement('span');
      toggleBtn.className = 'toggle-all-tags-btn';
      toggleBtn.innerText = showAllTags ? '▲ タグを折りたたむ' : `▼ 全てのタグを表示 (${tagsArray.length - maxVisibleTags}個+)`;
      
      toggleBtn.addEventListener('click', () => {
        showAllTags = !showAllTags;
        renderTagFilters();
      });
      tagFiltersContainer.appendChild(toggleBtn);
    }
  }

  // --- Drag and Drop Sortable Helpers ---
  function getDragAfterItem(container, y) {
    const draggableElements = [...container.querySelectorAll('.saved-item:not(.dragging)')];
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  function getDragAfterFolder(savedList, y) {
    const draggableElements = [...savedList.querySelectorAll('.folder-group:not(.dragging), .unassigned-group')];
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  function saveNewOrder() {
    // 1. Reconstruct savedFolders order from DOM
    const folderGroups = [...savedList.querySelectorAll('.folder-group')];
    const newFoldersOrder = [];
    folderGroups.forEach(fg => {
      const folderId = fg.dataset.folderId;
      const folderObj = savedFolders.find(f => f.id === folderId);
      if (folderObj) {
        newFoldersOrder.push(folderObj);
      }
    });
    // Fallback: add any folders that might have been missed
    savedFolders.forEach(folder => {
      if (!newFoldersOrder.some(f => f.id === folder.id)) {
        newFoldersOrder.push(folder);
      }
    });
    savedFolders = newFoldersOrder;

    // 2. Reconstruct savedSearches order from DOM
    const visibleItemEls = [...savedList.querySelectorAll('.saved-item')];
    const visibleSearches = [];
    
    visibleItemEls.forEach(itemEl => {
      const itemId = itemEl.dataset.itemId;
      const itemObj = savedSearches.find(s => s.id === itemId);
      if (itemObj) {
        // Determine the folder it currently resides in
        const parentFolderGroup = itemEl.closest('.folder-group');
        if (parentFolderGroup) {
          itemObj.folderId = parentFolderGroup.dataset.folderId;
        } else {
          itemObj.folderId = null;
        }
        visibleSearches.push(itemObj);
      }
    });

    // Keep searches that were not visible (filtered out) in their original relative position
    const hiddenSearches = savedSearches.filter(s => !visibleSearches.some(vs => vs.id === s.id));
    savedSearches = [...visibleSearches, ...hiddenSearches];

    // Clean up drag-hover classes
    shadow.querySelectorAll('.folder-header.drag-hover, .unassigned-group.drag-hover').forEach(el => {
      el.classList.remove('drag-hover');
    });

    // 3. Persist to storage
    chrome.storage.sync.set({
      [STORAGE_KEYS.savedFolders]: savedFolders,
      [STORAGE_KEYS.savedSearches]: savedSearches
    }, () => {
      renderSavedList();
      renderTagFilters();
    });
  }

  // Set up the persistent single listeners on savedList
  savedList.addEventListener('dragover', (e) => {
    e.preventDefault();
    
    const draggingItem = shadow.querySelector('.dragging-item');
    const draggingFolder = shadow.querySelector('.dragging-folder');

    if (draggingItem) {
      const hoverFolderContents = e.target.closest('.folder-contents');
      const hoverFolderHeader = e.target.closest('.folder-header');
      const hoverUnassignedContents = e.target.closest('.unassigned-contents');
      const hoverUnassignedHeader = e.target.closest('.unassigned-header');

      // Clear all drag-hover classes first
      shadow.querySelectorAll('.folder-header.drag-hover, .unassigned-group.drag-hover').forEach(el => {
        el.classList.remove('drag-hover');
      });

      if (hoverFolderContents) {
        const afterElement = getDragAfterItem(hoverFolderContents, e.clientY);
        const placeholder = hoverFolderContents.querySelector('.folder-empty-placeholder');
        if (placeholder) {
          placeholder.remove();
        }
        if (afterElement) {
          hoverFolderContents.insertBefore(draggingItem, afterElement);
        } else {
          hoverFolderContents.appendChild(draggingItem);
        }

        const header = hoverFolderContents.closest('.folder-group').querySelector('.folder-header');
        if (header) {
          header.classList.add('drag-hover');
        }
      } else if (hoverFolderHeader) {
        const folderGroup = hoverFolderHeader.closest('.folder-group');
        const contents = folderGroup.querySelector('.folder-contents');
        if (contents) {
          const placeholder = contents.querySelector('.folder-empty-placeholder');
          if (placeholder) {
            placeholder.remove();
          }
          contents.insertBefore(draggingItem, contents.firstChild);
        }
        hoverFolderHeader.classList.add('drag-hover');
      } else if (hoverUnassignedContents) {
        const afterElement = getDragAfterItem(hoverUnassignedContents, e.clientY);
        const placeholder = hoverUnassignedContents.querySelector('.unassigned-empty-placeholder');
        if (placeholder) {
          placeholder.remove();
        }
        if (afterElement) {
          hoverUnassignedContents.insertBefore(draggingItem, afterElement);
        } else {
          hoverUnassignedContents.appendChild(draggingItem);
        }

        const unassignedGroup = hoverUnassignedContents.closest('.unassigned-group');
        if (unassignedGroup) {
          unassignedGroup.classList.add('drag-hover');
        }
      } else if (hoverUnassignedHeader) {
        const unassignedGroup = hoverUnassignedHeader.closest('.unassigned-group');
        const contents = unassignedGroup.querySelector('.unassigned-contents');
        if (contents) {
          const placeholder = contents.querySelector('.unassigned-empty-placeholder');
          if (placeholder) {
            placeholder.remove();
          }
          contents.insertBefore(draggingItem, contents.firstChild);
        }
        unassignedGroup.classList.add('drag-hover');
      }
    } else if (draggingFolder) {
      const afterElement = getDragAfterFolder(savedList, e.clientY);
      if (afterElement) {
        savedList.insertBefore(draggingFolder, afterElement);
      } else {
        const unassigned = savedList.querySelector('.unassigned-group');
        if (unassigned && draggingFolder !== unassigned) {
          savedList.insertBefore(draggingFolder, unassigned);
        } else {
          savedList.appendChild(draggingFolder);
        }
      }
    }
  });

  savedList.addEventListener('dragleave', (e) => {
    const rect = savedList.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      shadow.querySelectorAll('.folder-header.drag-hover, .unassigned-group.drag-hover').forEach(el => {
        el.classList.remove('drag-hover');
      });
    }
  });

  function renderSavedList() {
    savedList.innerHTML = '';

    // 1. Filter items first
    const filtered = savedSearches.filter(search => {
      const matchesText = search.name.toLowerCase().includes(filterText);
      
      let matchesTags = true;
      if (selectedTags.size > 0) {
        matchesTags = search.tags && search.tags.some(tag => selectedTags.has(tag.toLowerCase()));
      }

      return matchesText && matchesTags;
    });

    if (savedSearches.length === 0) {
      savedList.innerHTML = '<div class="no-items">保存された検索結果はありません</div>';
      return;
    }

    // Helper to generate saved item elements (shared between folders and root)
    function createSavedItemEl(item) {
      const row = document.createElement('div');
      row.className = 'saved-item';
      row.draggable = true;
      row.dataset.itemId = item.id;

      row.addEventListener('dragstart', (e) => {
        if (isExportMode) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData('type', 'item');
        e.dataTransfer.setData('text/plain', item.id);
        row.classList.add('dragging', 'dragging-item');
        setTimeout(() => row.style.opacity = '0.4', 0);
      });

      row.addEventListener('dragend', () => {
        row.classList.remove('dragging', 'dragging-item');
        row.style.opacity = '';
        saveNewOrder();
      });

      let tagsMarkup = '';
      if (item.tags && item.tags.length > 0) {
        tagsMarkup = `
          <div class="saved-item-tags">
            ${item.tags.map(t => `<span class="saved-item-tag-badge">${t}</span>`).join('')}
          </div>
        `;
      }

      row.innerHTML = `
        <input type="checkbox" class="export-item-checkbox" data-item-id="${item.id}" ${item.folderId ? `data-folder-id="${item.folderId}"` : ''}>
        <div class="saved-item-info" title="${item.name}">
          <div class="saved-item-info-row">
            <div class="saved-item-name">${item.name}</div>
            ${tagsMarkup}
          </div>
        </div>
        <div class="saved-item-actions">
          <button class="action-btn eye-btn" title="Navigate to search URL">
            ${ICONS.eye}
          </button>
          <button class="action-btn trash-btn" title="Delete entry">
            ${ICONS.trash}
          </button>
        </div>
      `;

      const checkbox = row.querySelector('.export-item-checkbox');
      checkbox.addEventListener('change', () => {
        syncExportCheckboxes('item', item.id);
      });
      checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      row.querySelector('.eye-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        window.location.href = item.url;
      });

      row.querySelector('.trash-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const actionsContainer = row.querySelector('.saved-item-actions');
        
        // Hide item tags during deletion confirm to save space
        const tagsContainer = row.querySelector('.saved-item-tags');
        if (tagsContainer) {
          tagsContainer.style.display = 'none';
        }
        
        actionsContainer.innerHTML = `
          <span class="in-place-confirm-text">削除？</span>
          <button class="btn-danger btn-xs confirm-delete-btn">確定</button>
          <button class="btn-gray btn-xs cancel-delete-btn">戻る</button>
        `;
        
        actionsContainer.querySelector('.confirm-delete-btn').addEventListener('click', (ev) => {
          ev.stopPropagation();
          savedSearches = savedSearches.filter(s => s.id !== item.id);
          persistSavedSearches();
        });
        
        actionsContainer.querySelector('.cancel-delete-btn').addEventListener('click', (ev) => {
          ev.stopPropagation();
          renderSavedList();
        });
      });

      return row;
    }

    // 3. Render Folders
    savedFolders.forEach(folder => {
      const folderGroup = document.createElement('div');
      folderGroup.className = 'folder-group';
      folderGroup.dataset.folderId = folder.id;

      // Find children belonging to this folder (and matching search filters)
      const children = filtered.filter(s => s.folderId === folder.id);

      const folderHeader = document.createElement('div');
      folderHeader.className = 'folder-header';
      if (folder.isCollapsed) {
        folderHeader.classList.add('collapsed');
      }
      folderHeader.draggable = true;

      // Folder drag and drop handlers
      folderHeader.addEventListener('dragstart', (e) => {
        if (e.target.closest('.export-folder-checkbox') || e.target.closest('.folder-trash-btn') || e.target.closest('.in-place-folder-confirm')) {
          e.preventDefault();
          return;
        }
        if (isExportMode) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData('type', 'folder');
        e.dataTransfer.setData('text/plain', folder.id);
        folderGroup.classList.add('dragging', 'dragging-folder');
        setTimeout(() => folderGroup.style.opacity = '0.4', 0);
      });

      folderHeader.addEventListener('dragend', () => {
        folderGroup.classList.remove('dragging', 'dragging-folder');
        folderGroup.style.opacity = '';
        saveNewOrder();
      });

      // Chevron indicator
      const chevron = '▼';

      folderHeader.innerHTML = `
        <input type="checkbox" class="export-folder-checkbox" data-folder-id="${folder.id}">
        <div class="folder-title-wrapper">
          <span class="folder-icon">${ICONS.folder}</span>
          <span class="folder-name" title="${folder.name}">${folder.name}</span>
        </div>
        <span class="folder-chevron">${chevron}</span>
        <button class="action-btn folder-trash-btn" title="Delete Folder">
          ${ICONS.trash}
        </button>
      `;

      const fCheckbox = folderHeader.querySelector('.export-folder-checkbox');
      fCheckbox.addEventListener('change', () => {
        syncExportCheckboxes('folder', folder.id);
      });
      fCheckbox.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      // Accordion click toggle
      folderHeader.addEventListener('click', (e) => {
        // Prevent toggle if delete button or in-place confirmation was clicked
        if (e.target.closest('.folder-trash-btn') || e.target.closest('.in-place-folder-confirm')) return;
        
        folder.isCollapsed = !folder.isCollapsed;
        persistSavedFolders();
      });

      // Folder delete button click with in-place confirmation
      folderHeader.querySelector('.folder-trash-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        
        const originalChevron = folderHeader.querySelector('.folder-chevron');
        const originalTrash = folderHeader.querySelector('.folder-trash-btn');
        
        const confirmContainer = document.createElement('div');
        confirmContainer.className = 'in-place-folder-confirm';
        confirmContainer.innerHTML = `
          <span class="in-place-confirm-text">削除？</span>
          <button class="btn-danger btn-xs confirm-delete-btn">確定</button>
          <button class="btn-gray btn-xs cancel-delete-btn">戻る</button>
        `;
        
        originalChevron.style.display = 'none';
        originalTrash.style.display = 'none';
        folderHeader.appendChild(confirmContainer);
        
        confirmContainer.querySelector('.confirm-delete-btn').addEventListener('click', (ev) => {
          ev.stopPropagation();
          
          // Safely migrate all child searches back to root
          savedSearches.forEach(search => {
            if (search.folderId === folder.id) {
              search.folderId = null;
            }
          });

          // Remove from folders list
          savedFolders = savedFolders.filter(f => f.id !== folder.id);

          // Save both searches and folders in one sync execution
          chrome.storage.sync.set({
            [STORAGE_KEYS.savedSearches]: savedSearches,
            [STORAGE_KEYS.savedFolders]: savedFolders
          }, () => {
            renderSavedList();
            renderTagFilters();
          });
        });
        
        confirmContainer.querySelector('.cancel-delete-btn').addEventListener('click', (ev) => {
          ev.stopPropagation();
          renderSavedList();
        });
      });

      const folderContents = document.createElement('div');
      folderContents.className = 'folder-contents';
      if (folder.isCollapsed) {
        folderContents.classList.add('collapsed');
      }

      if (children.length === 0) {
        const placeholder = document.createElement('div');
        placeholder.className = 'folder-empty-placeholder';
        placeholder.innerText = 'D&D items here';
        folderContents.appendChild(placeholder);
      } else {
        children.forEach(item => {
          folderContents.appendChild(createSavedItemEl(item));
        });
      }

      folderGroup.appendChild(folderHeader);
      folderGroup.appendChild(folderContents);
      savedList.appendChild(folderGroup);
    });

    // 4. Render Unassigned / Root searches
    // We group them under an "Unassigned" section to keep the D&D target clean
    const unassignedItems = filtered.filter(s => !s.folderId || !savedFolders.some(f => f.id === s.folderId));

    if (unassignedItems.length > 0 || savedFolders.length > 0) {
      const unassignedGroup = document.createElement('div');
      unassignedGroup.className = 'unassigned-group';

      if (savedFolders.length > 0) {
        const unassignedHeader = document.createElement('div');
        unassignedHeader.className = 'unassigned-header';
        unassignedHeader.innerText = '未分類';
        unassignedGroup.appendChild(unassignedHeader);
      }

      const unassignedContents = document.createElement('div');
      unassignedContents.className = 'unassigned-contents';

      if (unassignedItems.length === 0) {
        const placeholder = document.createElement('div');
        placeholder.className = 'unassigned-empty-placeholder';
        placeholder.innerText = 'No unclassified items';
        unassignedContents.appendChild(placeholder);
      } else {
        unassignedItems.forEach(item => {
          unassignedContents.appendChild(createSavedItemEl(item));
        });
      }

      unassignedGroup.appendChild(unassignedContents);
      savedList.appendChild(unassignedGroup);
    }
  }

  // 11.5 Export & Import Logic
  function syncExportCheckboxes(type, targetId) {
    if (type === 'folder') {
      const folderCheckbox = shadow.querySelector(`.export-folder-checkbox[data-folder-id="${targetId}"]`);
      if (folderCheckbox) {
        const isChecked = folderCheckbox.checked;
        const itemCheckboxes = shadow.querySelectorAll(`.export-item-checkbox[data-folder-id="${targetId}"]`);
        itemCheckboxes.forEach(cb => {
          cb.checked = isChecked;
        });
      }
    } else if (type === 'item') {
      const itemCheckbox = shadow.querySelector(`.export-item-checkbox[data-item-id="${targetId}"]`);
      if (itemCheckbox) {
        const folderId = itemCheckbox.getAttribute('data-folder-id');
        if (folderId) {
          const folderCheckbox = shadow.querySelector(`.export-folder-checkbox[data-folder-id="${folderId}"]`);
          if (folderCheckbox) {
            const siblingCheckboxes = shadow.querySelectorAll(`.export-item-checkbox[data-folder-id="${folderId}"]`);
            const anyChecked = Array.from(siblingCheckboxes).some(cb => cb.checked);
            folderCheckbox.checked = anyChecked;
          }
        }
      }
    }
    updateExportCount();
  }

  function updateExportCount() {
    const itemCheckboxes = shadow.querySelectorAll('.export-item-checkbox');
    const selectedItems = Array.from(itemCheckboxes).filter(cb => cb.checked);
    exportCountLabel.innerText = `選択中: ${selectedItems.length}件`;

    const allCheckboxes = shadow.querySelectorAll('.export-item-checkbox, .export-folder-checkbox');
    if (allCheckboxes.length > 0) {
      const allChecked = Array.from(allCheckboxes).every(cb => cb.checked);
      selectAllCheckbox.checked = allChecked;
    } else {
      selectAllCheckbox.checked = false;
    }
  }

  exportBtn.addEventListener('click', () => {
    inlineSaveForm.classList.remove('active');
    inlineFolderForm.classList.remove('active');
    inlineImportForm.classList.remove('active');
    isImportMode = false;
    importBtn.innerHTML = ICONS.import;

    isExportMode = !isExportMode;
    if (isExportMode) {
      exportBtn.innerHTML = ICONS.cancel;
      sidebarContainer.classList.add('export-mode');
      exportActionHeader.style.display = 'flex';
      
      const allCbs = shadow.querySelectorAll('.export-item-checkbox, .export-folder-checkbox');
      allCbs.forEach(cb => cb.checked = false);
      selectAllCheckbox.checked = false;
      updateExportCount();
    } else {
      exportBtn.innerHTML = ICONS.export;
      sidebarContainer.classList.remove('export-mode');
      exportActionHeader.style.display = 'none';
    }
  });

  selectAllCheckbox.addEventListener('change', () => {
    const isChecked = selectAllCheckbox.checked;
    const allCbs = shadow.querySelectorAll('.export-item-checkbox, .export-folder-checkbox');
    allCbs.forEach(cb => {
      cb.checked = isChecked;
    });
    updateExportCount();
  });

  exportActionBtn.addEventListener('click', () => {
    const itemCheckboxes = shadow.querySelectorAll('.export-item-checkbox');
    const selectedItemIds = Array.from(itemCheckboxes)
      .filter(cb => cb.checked)
      .map(cb => cb.getAttribute('data-item-id'));

    if (selectedItemIds.length === 0) {
      alert("エクスポートする検索結果を選択してください。");
      return;
    }

    const exportSearches = savedSearches.filter(s => selectedItemIds.includes(s.id));
    const exportFolderIds = [...new Set(exportSearches.map(s => s.folderId).filter(id => id !== null))];
    const exportFolders = savedFolders.filter(f => exportFolderIds.includes(f.id));

    const exportData = {
      version: 1,
      searches: exportSearches,
      folders: exportFolders
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `poe2_trade_searches_${timestamp}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    isExportMode = false;
    exportBtn.innerHTML = ICONS.export;
    sidebarContainer.classList.remove('export-mode');
    exportActionHeader.style.display = 'none';
  });

  importBtn.addEventListener('click', () => {
    inlineSaveForm.classList.remove('active');
    inlineFolderForm.classList.remove('active');
    if (isExportMode) {
      isExportMode = false;
      exportBtn.innerHTML = ICONS.export;
      sidebarContainer.classList.remove('export-mode');
      exportActionHeader.style.display = 'none';
    }

    isImportMode = !isImportMode;
    if (isImportMode) {
      importBtn.innerHTML = ICONS.cancel;
      inlineImportForm.classList.add('active');
    } else {
      importBtn.innerHTML = ICONS.import;
      inlineImportForm.classList.remove('active');
    }
  });

  importDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    importDropZone.classList.add('drag-hover');
  });

  importDropZone.addEventListener('dragleave', () => {
    importDropZone.classList.remove('drag-hover');
  });

  importDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    importDropZone.classList.remove('drag-hover');
    if (e.dataTransfer.files.length > 0) {
      handleImportFile(e.dataTransfer.files[0]);
    }
  });

  importDropZone.addEventListener('click', () => {
    importFileInput.click();
  });

  importFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleImportFile(e.target.files[0]);
    }
  });

  // Confirm & Cancel buttons for import conflicts
  confirmImportBtn.addEventListener('click', () => {
    if (!tempImportData) return;
    const skippedNames = [];
    const checkboxes = conflictList.querySelectorAll('.conflict-item-checkbox');
    checkboxes.forEach(cb => {
      if (!cb.checked) {
        skippedNames.push(cb.getAttribute('data-name').toLowerCase());
      }
    });
    executeImport(tempImportData, skippedNames);
  });

  cancelImportBtn.addEventListener('click', () => {
    tempImportData = null;
    importConflictContainer.style.display = 'none';
    importDropZone.style.display = 'flex';
  });

  function handleImportFile(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const importData = JSON.parse(e.target.result);
        if (!importData || !Array.isArray(importData.searches)) {
          throw new Error("Invalid format");
        }

        const importedSearches = importData.searches;
        
        // Detect duplicates
        const conflicts = importedSearches.filter(imp => 
          savedSearches.some(s => s.name.toLowerCase() === imp.name.toLowerCase())
        );

        if (conflicts.length > 0) {
          tempImportData = importData;
          importDropZone.style.display = 'none';
          importConflictContainer.style.display = 'flex';
          
          conflictList.innerHTML = '';
          conflicts.forEach(item => {
            const row = document.createElement('div');
            row.className = 'conflict-item-row';
            
            const label = document.createElement('label');
            label.className = 'conflict-item-label';
            
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.className = 'conflict-item-checkbox';
            cb.checked = true;
            cb.setAttribute('data-name', item.name);
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'conflict-item-name';
            nameSpan.innerText = item.name;
            nameSpan.title = item.name;
            
            label.appendChild(cb);
            label.appendChild(nameSpan);
            row.appendChild(label);
            conflictList.appendChild(row);
          });
        } else {
          executeImport(importData, []);
        }

      } catch (err) {
        console.error("Import failed:", err);
        showImportError();
      }
    };
    reader.readAsText(file);
  }

  function showImportError() {
    importDropZone.classList.add('import-error');
    importDropZone.innerHTML = `<div class="import-error-text">インポートに失敗しました。<br>正しいJSONファイルを選択してください。</div>`;
    setTimeout(() => {
      importDropZone.classList.remove('import-error');
      importDropZone.innerHTML = `<div class="import-dropzone-text">JSONファイルをドラッグ＆ドロップ、またはクリックして選択</div>`;
    }, 3000);
  }

  function executeImport(importData, skippedNames) {
    try {
      const importedFolders = Array.isArray(importData.folders) ? importData.folders : [];
      const importedSearches = importData.searches;

      const folderIdMap = {};
      importedFolders.forEach((impFolder, index) => {
        const existingFolder = savedFolders.find(f => f.name.toLowerCase() === impFolder.name.toLowerCase());
        if (existingFolder) {
          folderIdMap[impFolder.id] = existingFolder.id;
        } else {
          const newFolderId = 'folder_' + (Date.now() + index);
          const newFolder = {
            id: newFolderId,
            name: impFolder.name,
            isCollapsed: impFolder.isCollapsed || false
          };
          savedFolders.push(newFolder);
          folderIdMap[impFolder.id] = newFolderId;
        }
      });

      let updateCount = 0;
      let insertCount = 0;
      let skipCount = 0;

      importedSearches.forEach(impSearch => {
        const existingSearchIndex = savedSearches.findIndex(s => s.name.toLowerCase() === impSearch.name.toLowerCase());
        let finalFolderId = null;
        if (impSearch.folderId) {
          finalFolderId = folderIdMap[impSearch.folderId] || null;
        }

        if (existingSearchIndex !== -1) {
          const isSkipped = skippedNames.includes(impSearch.name.toLowerCase());
          if (isSkipped) {
            skipCount++;
          } else {
            // Overwrite
            savedSearches[existingSearchIndex].url = impSearch.url;
            savedSearches[existingSearchIndex].tags = impSearch.tags || [];
            savedSearches[existingSearchIndex].folderId = finalFolderId;
            updateCount++;
          }
        } else {
          // New insert
          const newSearchId = 'search_' + (Date.now() + Math.random().toString(36).substr(2, 9));
          const newSearch = {
            id: newSearchId,
            name: impSearch.name,
            url: impSearch.url,
            tags: impSearch.tags || [],
            folderId: finalFolderId,
            createdAt: impSearch.createdAt || Date.now()
          };
          savedSearches.push(newSearch);
          insertCount++;
        }
      });

      chrome.storage.sync.set({
        [STORAGE_KEYS.savedSearches]: savedSearches,
        [STORAGE_KEYS.savedFolders]: savedFolders
      }, () => {
        renderSavedList();
        renderTagFilters();
        
        // Hide conflict container and show drop zone with success message
        importConflictContainer.style.display = 'none';
        importDropZone.style.display = 'flex';
        importDropZone.classList.add('import-success');
        
        let msg = `インポート成功！<br>${insertCount}件追加`;
        if (updateCount > 0) msg += `、${updateCount}件更新`;
        if (skipCount > 0) msg += `、${skipCount}件維持`;
        importDropZone.innerHTML = `<div class="import-success-text">${msg}</div>`;
        
        tempImportData = null;

        setTimeout(() => {
          isImportMode = false;
          importBtn.innerHTML = ICONS.import;
          inlineImportForm.classList.remove('active');
          
          setTimeout(() => {
            importDropZone.classList.remove('import-success');
            importDropZone.innerHTML = `<div class="import-dropzone-text">JSONファイルをドラッグ＆ドロップ、またはクリックして選択</div>`;
          }, 300);
        }, 2000);
      });
    } catch (err) {
      console.error("Execute import failed:", err);
      showImportError();
    }
  }

  // Auto Hideout Teleport Logic
  function startAutoTravel() {
    // 0. Stop manual live search if active
    stopManualLiveSearch();

    // 1. Activate Live Search if not active
    const liveSearchBtn = document.querySelector('.livesearch-btn');
    if (liveSearchBtn) {
      const btnText = liveSearchBtn.textContent || "";
      // Click only if it shows "アクティベート" or "Activate" (meaning it is currently inactive)
      const isInactive = btnText.includes("アクティベート") || btnText.includes("Activate");
      if (isInactive) {
        liveSearchBtn.click();
      }
    }

    // 2. Set interval to check for warp button every 100ms
    autoTravelInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastClick = now - lastClickedTime;
      const cooldownMs = autoTravelCooldown * 1000;
      if (timeSinceLastClick < cooldownMs) {
        const remainingSec = Math.ceil((cooldownMs - timeSinceLastClick) / 1000);
        autoTravelBtn.innerText = `自動転送の停止 (${remainingSec}秒待機中)`;
        return;
      } else {
        autoTravelBtn.innerText = "自動転送の停止";
      }

      const firstRow = document.querySelector('.resultset .row');
      if (firstRow) {
        const directBtn = firstRow.querySelector('.direct-btn');
        if (directBtn) {
          const btnText = (directBtn.textContent || "").trim();
          const btnTextLower = btnText.toLowerCase();
          if (
            btnTextLower.includes("travel to hideout") ||
            btnTextLower.includes("teleport anyway") ||
            btnTextLower.includes("隠れ家") ||
            btnTextLower.includes("テレポート")
          ) {
            directBtn.click();
            lastClickedTime = Date.now();
          }
        }
      }
    }, 100);

    // 3. Update button UI
    autoTravelBtn.innerText = "自動転送の停止";
    autoTravelBtn.className = "btn-danger";
  }

  function stopAutoTravel() {
    if (autoTravelInterval) {
      clearInterval(autoTravelInterval);
      autoTravelInterval = null;
    }
    lastClickedTime = 0; // Clear cooldown immediately on stop
    autoTravelBtn.innerText = "自動転送を有効化";
    autoTravelBtn.className = "btn-gold";
  }

  autoTravelBtn.addEventListener('click', () => {
    if (autoTravelInterval) {
      stopAutoTravel();
    } else {
      startAutoTravel();
    }
  });

  // Helper to check if an item was listed "just now"
  function isListedJustNow(row) {
    const indexedEl = row.querySelector('[data-field="indexed"] small');
    if (!indexedEl) return false;
    
    const text = (indexedEl.textContent || "").toLowerCase().trim();
    // Match Japanese/English variants of "just now" or "few seconds"
    return (
      text.includes("たった今") ||
      text.includes("数秒前") ||
      text.includes("just now") ||
      text.includes("few seconds") ||
      text.includes("seconds ago")
    );
  }

  // ==========================================
  // Armor Rune-Excluded Status Calculation and Display
  // ==========================================
  function parsePercentageMods(row) {
    const l = { ar: 0, ev: 0, es: 0 };
    const a = { ar: 0, ev: 0, es: 0 };

    // Explicit Mods
    row.querySelectorAll('.explicitMod .lc.s').forEach(el => {
      const text = el.textContent || "";
      const match = text.match(/(\d+)%/);
      if (match) {
        const pct = parseInt(match[1], 10) / 100;
        if (text.includes("増加する") || text.includes("increased")) {
          if (text.includes("アーマー") || text.includes("Armor")) l.ar += pct;
          if (text.includes("回避力") || text.includes("Evasion")) l.ev += pct;
          if (text.includes("エナジーシールド") || text.includes("Energy Shield")) l.es += pct;
        }
      }
    });

    // Rune Mods
    row.querySelectorAll('.runeMod .lc.s').forEach(el => {
      const text = el.textContent || "";
      const match = text.match(/(\d+)%/);
      if (match) {
        const pct = parseInt(match[1], 10) / 100;
        if (text.includes("増加する") || text.includes("increased")) {
          if (text.includes("アーマー") || text.includes("Armor")) a.ar += pct;
          if (text.includes("回避力") || text.includes("Evasion")) a.ev += pct;
          if (text.includes("エナジーシールド") || text.includes("Energy Shield")) a.es += pct;
        }
      }
    });

    return { l, a };
  }

  function applyRuneExcludedDefenseToRow(row) {
    // Clean up existing displays
    row.querySelectorAll('.rune-excluded-val').forEach(el => el.remove());

    if (!showRuneExcludedDefense) {
      return;
    }

    const { l, a } = parsePercentageMods(row);

    // If there are no rune mods with defense % increases, we don't display anything.
    if (a.ar === 0 && a.ev === 0 && a.es === 0) {
      return;
    }

    const additionalContainer = row.querySelector('.itemPopupAdditional.q');

    ['ar', 'ev', 'es'].forEach(type => {
      let V = null;
      let hasQualityMaxStat = false;
      if (additionalContainer) {
        const maxEl = additionalContainer.querySelector(`[data-field="${type}"] .colourDefault, [data-field="${type}"] .colourAugmented`);
        if (maxEl && maxEl.textContent.trim() !== '') {
          V = parseInt(maxEl.textContent.replace(/[^0-9]/g, '').trim(), 10);
          if (!isNaN(V) && V > 0) {
            const title = maxEl.getAttribute('title') || '';
            if (title.includes('品質最大') || title.includes('Max Quality') || title.toLowerCase().includes('max quality')) {
              hasQualityMaxStat = true;
            }
          }
        }
      }

      // Fallback to current value if V is missing or invalid
      if (V === null || isNaN(V) || V <= 0) {
        const propEl = row.querySelector(`.property [data-field="${type}"]`);
        if (propEl) {
          const valEl = propEl.querySelector('.colourAugmented, .colourDefault');
          if (valEl) {
            V = parseInt(valEl.textContent.replace(/[^0-9]/g, '').trim(), 10);
          }
        }
      }

      // If we have V and there is a rune mod percentage increase for this stat
      if (V !== null && !isNaN(V) && V > 0 && a[type] > 0) {
        const formulaVal = Math.round(V * (1 + l[type]) / (1 + l[type] + a[type]));
        
        // Find property element to append the value to
        const propEl = row.querySelector(`.property [data-field="${type}"]`);
        if (propEl) {
          const valEl = propEl.querySelector('.colourAugmented, .colourDefault');
          if (valEl) {
            // Avoid adding duplicate element
            if (!propEl.querySelector('.rune-excluded-val')) {
              const labelText = hasQualityMaxStat ? `ルーンなし+品質最大時: ${formulaVal}` : `ルーンを外した場合: ${formulaVal}`;
              valEl.insertAdjacentHTML('afterend', `<span class="rune-excluded-val"> (${labelText})</span>`);
            }
          }
        }
      }
    });
  }

  function applyRuneExcludedDefenseToAll() {
    const rows = document.querySelectorAll('.resultset .row');
    rows.forEach(row => {
      applyRuneExcludedDefenseToRow(row);
    });
  }

  // Manual Live Search Logic
  function startManualLiveSearch() {
    // 1. Mutually exclusive safety: Stop auto travel if active
    stopAutoTravel();

    // 2. Click the search button immediately once
    const searchBtn = document.querySelector('.search-btn');
    if (searchBtn) {
      searchBtn.click();
    } else {
      console.warn("PoE2 Trade Extension: '.search-btn' not found in document.");
    }

    // 3. Set interval for automatic clicking of the search button
    const clickIntervalMs = manualSearchInterval * 1000;
    manualLiveSearchClickInterval = setInterval(() => {
      const searchBtn = document.querySelector('.search-btn');
      if (searchBtn) {
        searchBtn.click();
      }
    }, clickIntervalMs);

    // 4. Set interval (100ms) to check for "just now" items and auto travel
    manualLiveSearchCheckInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastClick = now - lastClickedTime;
      const cooldownMs = autoTravelCooldown * 1000;

      // Handle cooldown UI updates
      if (timeSinceLastClick < cooldownMs) {
        const remainingSec = Math.ceil((cooldownMs - timeSinceLastClick) / 1000);
        manualLiveSearchBtn.innerText = `手動ライブサーチの停止 (${remainingSec}秒待機中)`;
        return;
      } else {
        manualLiveSearchBtn.innerText = "手動ライブサーチの停止";
      }

      // Check results for "just now" items
      const rows = document.querySelectorAll('.resultset .row');
      for (const row of rows) {
        if (isListedJustNow(row)) {
          const directBtn = row.querySelector('.direct-btn');
          if (directBtn) {
            const btnText = (directBtn.textContent || "").trim();
            const btnTextLower = btnText.toLowerCase();
            if (
              btnTextLower.includes("travel to hideout") ||
              btnTextLower.includes("teleport anyway") ||
              btnTextLower.includes("隠れ家") ||
              btnTextLower.includes("テレポート")
            ) {
              directBtn.click();
              lastClickedTime = Date.now();
              break; // Trigger only one click at a time
            }
          }
        }
      }
    }, 100);

    // 5. Update Button UI
    manualLiveSearchBtn.innerText = "手動ライブサーチの停止";
    manualLiveSearchBtn.className = "btn-danger";
  }

  function stopManualLiveSearch() {
    if (manualLiveSearchClickInterval) {
      clearInterval(manualLiveSearchClickInterval);
      manualLiveSearchClickInterval = null;
    }
    if (manualLiveSearchCheckInterval) {
      clearInterval(manualLiveSearchCheckInterval);
      manualLiveSearchCheckInterval = null;
    }
    lastClickedTime = 0; // Reset cooldown immediately on manual stop
    manualLiveSearchBtn.innerText = "手動ライブサーチを有効化";
    manualLiveSearchBtn.className = "btn-gold";
  }

  manualLiveSearchBtn.addEventListener('click', () => {
    if (manualLiveSearchClickInterval || manualLiveSearchCheckInterval) {
      stopManualLiveSearch();
    } else {
      startManualLiveSearch();
    }
  });


  // 12. Load Initial State on Boot
  chrome.storage.sync.get([
    STORAGE_KEYS.collapsed,
    STORAGE_KEYS.sidebarWidth,
    STORAGE_KEYS.savedSearches,
    STORAGE_KEYS.savedFolders,
    STORAGE_KEYS.maxVisibleTags,
    STORAGE_KEYS.itemHeight,
    STORAGE_KEYS.autoTravelCooldown,
    STORAGE_KEYS.manualSearchInterval,
    STORAGE_KEYS.showRuneExcludedDefense
  ], (items) => {
    isCollapsed = items[STORAGE_KEYS.collapsed] || false;
    currentWidth = items[STORAGE_KEYS.sidebarWidth] || DEFAULT_WIDTH;
    savedSearches = items[STORAGE_KEYS.savedSearches] || [];
    savedFolders = items[STORAGE_KEYS.savedFolders] || [];
    maxVisibleTags = items[STORAGE_KEYS.maxVisibleTags] || DEFAULT_MAX_VISIBLE_TAGS;
    maxVisibleTagsInput.value = maxVisibleTags;
    itemHeight = items[STORAGE_KEYS.itemHeight] || DEFAULT_ITEM_HEIGHT;
    updateItemHeightStyles(itemHeight);

    autoTravelCooldown = items[STORAGE_KEYS.autoTravelCooldown] !== undefined ? items[STORAGE_KEYS.autoTravelCooldown] : 30;
    autoTravelCooldownInput.value = autoTravelCooldown;

    manualSearchInterval = items[STORAGE_KEYS.manualSearchInterval] !== undefined ? items[STORAGE_KEYS.manualSearchInterval] : 30;
    manualSearchIntervalInput.value = manualSearchInterval;

    showRuneExcludedDefense = items[STORAGE_KEYS.showRuneExcludedDefense] !== undefined ? items[STORAGE_KEYS.showRuneExcludedDefense] : true;
    showRuneExcludedDefenseInput.checked = showRuneExcludedDefense;

    // Apply dynamic width properties immediately
    host.style.setProperty('--sidebar-width', `${currentWidth}px`);

    document.documentElement.style.transition = 'padding-right 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
    document.documentElement.style.boxSizing = 'border-box';

    // Collapsing toggle click event handler
    toggleBtn.addEventListener('click', () => {
      isCollapsed = !sidebarContainer.classList.contains('collapsed');
      updatePageLayout(isCollapsed);
      chrome.storage.sync.set({ [STORAGE_KEYS.collapsed]: isCollapsed });
    });

    updatePageLayout(isCollapsed);
    renderSavedList();
    renderTagFilters();

    // Initial calculation for any items already rendered on the page
    applyRuneExcludedDefenseToAll();

    // Register MutationObserver to handle dynamically added items (Infinite Scroll / Live Search)
    const observer = new MutationObserver((mutations) => {
      if (!showRuneExcludedDefense) return;
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
  });

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

})();

