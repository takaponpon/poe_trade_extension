import { state, elements } from '../state';
import { STORAGE_KEYS, COLLAPSED_WIDTH, MIN_WIDTH, MAX_WIDTH, DEFAULT_ITEM_HEIGHT, DEFAULT_WIDTH } from '../constants';
import { storageSet } from '../utils/storage';
import { renderSavedList } from './saved-searches';

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

export function updateItemHeightStyles(height) {
  const h = parseInt(height, 10) || DEFAULT_ITEM_HEIGHT;
  const fontSize = Math.max(10, Math.min(14, 10 + (h - 28) * 0.18));
  const btnSize = Math.max(16, Math.min(24, 16 + (h - 28) * 0.36));
  const iconSize = Math.max(10, Math.min(16, 10 + (h - 28) * 0.27));
  const tagFontSize = Math.max(8, Math.min(10, 8 + (h - 28) * 0.09));

  const host = elements.host;
  if (!host) return;
  host.style.setProperty('--item-height', `${h}px`);
  host.style.setProperty('--item-font-size', `${fontSize}px`);
  host.style.setProperty('--item-btn-size', `${btnSize}px`);
  host.style.setProperty('--item-icon-size', `${iconSize}px`);
  host.style.setProperty('--item-tag-font-size', `${tagFontSize}px`);

  if (elements.itemHeightValue) {
    elements.itemHeightValue.innerText = `${h}px`;
  }
  if (elements.itemHeightSlider) {
    elements.itemHeightSlider.value = h;
  }
}

export function updateSidebarWidth(width) {
  if (state.isCollapsed) return;
  const host = elements.host;
  const sidebar = elements.sidebarContainer;
  if (!host || !sidebar) return;
  host.style.setProperty('--sidebar-width', `${width}px`);
  sidebar.style.width = `${width}px`;
  document.documentElement.style.paddingRight = `${width}px`;
}

export function updatePageLayout(collapsed) {
  const sidebar = elements.sidebarContainer;
  const toggleBtn = elements.toggleBtn;
  if (!sidebar || !toggleBtn) return;

  if (collapsed) {
    sidebar.classList.add('collapsed');
    toggleBtn.innerText = '<';
    document.documentElement.style.paddingRight = `${COLLAPSED_WIDTH}px`;
    sidebar.style.width = `${COLLAPSED_WIDTH}px`;
  } else {
    sidebar.classList.remove('collapsed');
    toggleBtn.innerText = '>';
    document.documentElement.style.paddingRight = `${state.currentWidth}px`;
    sidebar.style.width = `${state.currentWidth}px`;
  }
}

export function initSidebar() {
  // 1. Create Host Element in the Document root
  const host = document.createElement('div');
  host.id = 'poe2-trade-sidebar-root';
  document.documentElement.appendChild(host);
  elements.host = host;

  // 2. Attach Shadow Root
  const shadow = host.attachShadow({ mode: 'open' });
  elements.shadow = shadow;

  // 3. Inject Stylesheet Link
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = chrome.runtime.getURL('content.css');
  shadow.appendChild(link);

  // 4. Create Sidebar DOM Structure
  const sidebarContainer = document.createElement('div');
  sidebarContainer.className = 'sidebar-container';
  sidebarContainer.id = 'sidebar';
  elements.sidebarContainer = sidebarContainer;

  sidebarContainer.innerHTML = `
    <!-- Resize Draggable Handle -->
    <div class="resize-handle" id="resizeHandle"></div>

    <!-- Toggle Button -->
    <button class="toggle-btn" id="toggleBtn">&gt;</button>
    
    <div class="sidebar-content">
      <!-- Save Search & Create Folder Buttons -->
      <div class="sidebar-section">
        <div class="save-controls-wrapper">
          <button class="btn-gold" id="saveSearchBtn" style="flex: 1;">現在表示している検索結果を保存</button>
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
        
        <!-- Storage capacity warning box (Initially Hidden) -->
        <div class="storage-warning-box" id="storageWarningBox" style="display: none;"></div>

        <!-- Inline Save Search Form (Initially Hidden) -->
        <div class="inline-form-container" id="inlineSaveForm">
          <div class="inline-form-title">検索結果を保存</div>
          
          <div class="form-group">
            <label class="form-label">名前</label>
            <input type="text" class="text-input" id="saveNameInput">
          </div>
          
          <div class="form-group">
            <label class="form-label">タグ (カンマ区切り)</label>
            <input type="text" class="text-input" id="saveTagsInput">
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
            <input type="text" class="text-input" id="folderNameInput" placeholder="例：カレンシー、マップ">
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
            <div class="import-dropzone-text">
              JSONファイルをドラッグ＆ドロップ、またはクリックして選択
              <div style="font-size: 9px; color: var(--poe-gold-bright); margin-top: 4px; opacity: 0.85;">Better PathOfExile Tradingのエクスポートファイルに対応</div>
            </div>
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
              <input type="text" class="text-input" id="filterInput" placeholder="名前で検索...">
            </div>
            <button class="btn-icon" id="resetFiltersBtn" title="Reset Filters">
              ${ICONS.reset}
            </button>
          </div>
          
          <!-- Filter Tag Pills (Injected dynamically) -->
          <div class="tag-filters-container" id="tagFiltersContainer"></div>

          <!-- Exclude Completed Toggle -->
          <div class="exclude-completed-wrapper" style="display: flex; align-items: center; justify-content: flex-start; gap: 8px; margin-top: 8px; padding-top: 6px; border-top: 1px solid rgba(200, 156, 60, 0.1);">
            <span class="form-label" style="margin-bottom: 0; font-size: 10px;">完了項目を除外</span>
            <label class="switch">
              <input type="checkbox" id="excludeCompletedInput">
              <span class="slider round"></span>
            </label>
          </div>
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
            <button class="btn-gold tooltip-trigger" id="showInJapaneseBtn" style="width: 100%; margin-top: 6px;">現在の検索結果を日本語で表示</button>
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

        <div class="settings-section tooltip-trigger" data-tooltip="ブラウザのクリーンアップやアンインストールによるデータ消失を防ぐための自動バックアップ機能です。また、Googleドライブと連携することで、自宅のPCやノートPCなど、異なる端末間で保存した検索結果やフォルダをリアルタイムに自動同期・共有することが可能になります。">
          <div class="settings-section-title">外部ストレージ (Google Drive同期)</div>
          <div class="form-group" style="flex-direction: column; align-items: stretch; gap: 8px;">
            <label class="form-label" style="margin-bottom: 2px;">Google Apps Script Web App URL</label>
            <input type="url" class="text-input" id="gasUrlInput" placeholder="https://script.google.com/macros/s/.../exec" style="font-size: 11px;">
            
            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 4px;">
              <span class="form-label" style="margin-bottom: 0;">Google Drive同期モード</span>
              <label class="switch">
                <input type="checkbox" id="gasSyncModeInput">
                <span class="slider round"></span>
              </label>
            </div>
            
            <div style="display: flex; gap: 8px; margin-top: 4px;">
              <button class="btn-gold btn-sm" id="gasSyncNowBtn" style="flex: 1; font-size: 11px; padding: 6px;">今すぐ最新データを受信</button>
            </div>
            
            <span class="setup-instruction-toggle" id="gasInstructionsToggle">Google Drive連携のセットアップ方法を表示</span>
            <div class="gas-instructions-content" id="gasInstructionsContent" style="display: none;">
              1. Google Driveにアクセスし、新規 ➔ その他 ➔ <strong>Google Apps Script</strong> を選択します。<br>
              2. エディタに以下のコードを貼り付けます。<br>
              <pre class="gas-code-block" id="gasCodeTemplate">function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var folder = DriveApp.getRootFolder();
  var files = folder.getFilesByName("poe2_trade_backup.json");
  var file = files.hasNext() ? files.next().setContent(JSON.stringify(data)) 
                             : folder.createFile("poe2_trade_backup.json", JSON.stringify(data), MimeType.PLAIN_TEXT);
  return ContentService.createTextOutput(JSON.stringify({status: "success"})).setMimeType(ContentService.MimeType.JSON);
}
function doGet(e) {
  var folder = DriveApp.getRootFolder();
  var files = folder.getFilesByName("poe2_trade_backup.json");
  var data = {searches: [], folders: []};
  if (files.hasNext()) { data = JSON.parse(files.next().getAs("text/plain").getDataAsString()); }
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}</pre>
              3. 右上の「デプロイ」➔「新しいデプロイ」をクリックします。<br>
              4. 種類の選択で「ウェブアプリ」を選択します。<br>
              5. 設定を以下のように変更します：<br>
              &nbsp;&nbsp;- 次のユーザーとして実行: <strong>「自分」</strong><br>
              &nbsp;&nbsp;- アクセスできるユーザー: <strong>「全員」</strong><br>
              6. 「デプロイ」ボタンを押し、表示された「ウェブアプリのURL」をコピーして、上記の入力欄に貼り付けます。
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  shadow.appendChild(sidebarContainer);

  // Toast notification element (inside Shadow DOM)
  const toastEl = document.createElement('div');
  toastEl.className = 'toast-notification';
  shadow.appendChild(toastEl);
  elements.toastEl = toastEl;

  // 6. Select Injected Elements and cache them in elements registry
  elements.toggleBtn = shadow.getElementById('toggleBtn');
  elements.resizeHandle = shadow.getElementById('resizeHandle');
  elements.saveSearchBtn = shadow.getElementById('saveSearchBtn');
  elements.filterInput = shadow.getElementById('filterInput');
  elements.resetFiltersBtn = shadow.getElementById('resetFiltersBtn');
  elements.tagFiltersContainer = shadow.getElementById('tagFiltersContainer');
  elements.excludeCompletedInput = shadow.getElementById('excludeCompletedInput');
  elements.savedList = shadow.getElementById('savedList');

  // Filter accordion elements
  elements.filterHeader = shadow.getElementById('filterHeader');
  elements.filterContent = shadow.getElementById('filterContent');
  elements.filterChevron = shadow.getElementById('filterChevron');

  // Inline Forms selection
  elements.inlineSaveForm = shadow.getElementById('inlineSaveForm');
  elements.inlineFolderForm = shadow.getElementById('inlineFolderForm');
  elements.overwriteWarningBox = shadow.getElementById('overwriteWarningBox');
  elements.normalSaveButtons = shadow.getElementById('normalSaveButtons');

  elements.saveNameInput = shadow.getElementById('saveNameInput');
  elements.saveTagsInput = shadow.getElementById('saveTagsInput');
  elements.tagSuggestionsList = shadow.getElementById('tagSuggestionsList');

  elements.confirmSaveBtn = shadow.getElementById('confirmSaveBtn');
  elements.cancelSaveBtn = shadow.getElementById('cancelSaveBtn');
  elements.confirmOverwriteBtn = shadow.getElementById('confirmOverwriteBtn');
  elements.cancelOverwriteBtn = shadow.getElementById('cancelOverwriteBtn');

  // Folder UI Elements
  elements.createFolderBtn = shadow.getElementById('createFolderBtn');
  elements.folderNameInput = shadow.getElementById('folderNameInput');
  elements.confirmFolderBtn = shadow.getElementById('confirmFolderBtn');
  elements.cancelFolderBtn = shadow.getElementById('cancelFolderBtn');

  // Export / Import UI Elements
  elements.exportBtn = shadow.getElementById('exportBtn');
  elements.importBtn = shadow.getElementById('importBtn');
  elements.inlineImportForm = shadow.getElementById('inlineImportForm');
  elements.importDropZone = shadow.getElementById('importDropZone');
  elements.importFileInput = shadow.getElementById('importFileInput');
  elements.exportActionHeader = shadow.getElementById('exportActionHeader');
  elements.selectAllCheckbox = shadow.getElementById('selectAllCheckbox');
  elements.exportCountLabel = shadow.getElementById('exportCountLabel');
  elements.exportActionBtn = shadow.getElementById('exportActionBtn');
  elements.importConflictContainer = shadow.getElementById('importConflictContainer');
  elements.conflictList = shadow.getElementById('conflictList');
  elements.confirmImportBtn = shadow.getElementById('confirmImportBtn');
  elements.cancelImportBtn = shadow.getElementById('cancelImportBtn');
  elements.settingsBtn = shadow.getElementById('settingsBtn');
  elements.settingsPanel = shadow.getElementById('settingsPanel');
  elements.settingsBackBtn = shadow.getElementById('settingsBackBtn');
  elements.maxVisibleTagsInput = shadow.getElementById('maxVisibleTagsInput');
  elements.itemHeightSlider = shadow.getElementById('itemHeightSlider');
  elements.itemHeightValue = shadow.getElementById('itemHeightValue');
  elements.toolsHeader = shadow.getElementById('toolsHeader');
  elements.toolsContent = shadow.getElementById('toolsContent');
  elements.autoTravelBtn = shadow.getElementById('autoTravelBtn');
  elements.autoTravelCooldownInput = shadow.getElementById('autoTravelCooldownInput');
  elements.manualLiveSearchBtn = shadow.getElementById('manualLiveSearchBtn');
  elements.manualSearchIntervalInput = shadow.getElementById('manualSearchIntervalInput');
  elements.showRuneExcludedDefenseInput = shadow.getElementById('showRuneExcludedDefenseInput');
  elements.showInJapaneseBtn = shadow.getElementById('showInJapaneseBtn');

  // Google Drive & Storage warning selectors
  elements.storageWarningBox = shadow.getElementById('storageWarningBox');
  elements.gasUrlInput = shadow.getElementById('gasUrlInput');
  elements.gasSyncModeInput = shadow.getElementById('gasSyncModeInput');
  elements.gasSyncNowBtn = shadow.getElementById('gasSyncNowBtn');
  elements.gasInstructionsToggle = shadow.getElementById('gasInstructionsToggle');
  elements.gasInstructionsContent = shadow.getElementById('gasInstructionsContent');

  // Bind UI structural events
  bindUIEvents();
}

function bindUIEvents() {
  const toggleBtn = elements.toggleBtn;
  const resizeHandle = elements.resizeHandle;
  const sidebarContainer = elements.sidebarContainer;
  const filterHeader = elements.filterHeader;
  const filterContent = elements.filterContent;
  const toolsHeader = elements.toolsHeader;
  const toolsContent = elements.toolsContent;

  // Toggle Collapse/Expand
  toggleBtn.addEventListener('click', () => {
    state.isCollapsed = !state.isCollapsed;
    storageSet({ [STORAGE_KEYS.collapsed]: state.isCollapsed }, () => {
      updatePageLayout(state.isCollapsed);
    });
  });

  // Accordion Toggles
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

  // Dynamic Width Drag Resizer
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
      state.currentWidth = newWidth;
      updateSidebarWidth(state.currentWidth);
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
    storageSet({ [STORAGE_KEYS.sidebarWidth]: state.currentWidth });
  });

  if (elements.excludeCompletedInput) {
    elements.excludeCompletedInput.addEventListener('change', (e) => {
      state.excludeCompleted = e.target.checked;
      storageSet({ [STORAGE_KEYS.excludeCompleted]: state.excludeCompleted }, () => {
        renderSavedList();
        if (state.onSearchesChanged) {
          state.onSearchesChanged();
        }
      });
    });
  }

  // Show in Japanese button setup and transition logic
  const showInJapaneseBtn = elements.showInJapaneseBtn;
  if (showInJapaneseBtn) {
    const isJapanese = window.location.hostname === 'jp.pathofexile.com';
    if (isJapanese) {
      showInJapaneseBtn.classList.add('disabled');
      showInJapaneseBtn.setAttribute('disabled', 'true');
      showInJapaneseBtn.setAttribute('data-tooltip', '現在のページは既に日本語版です。');
    } else {
      showInJapaneseBtn.setAttribute('data-tooltip', '現在の検索結果を日本語版のサイトに遷移して表示します。');
      showInJapaneseBtn.addEventListener('click', () => {
        const currentUrl = new URL(window.location.href);
        currentUrl.hostname = 'jp.pathofexile.com';
        window.location.href = currentUrl.toString();
      });
    }
  }
}
