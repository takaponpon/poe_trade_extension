import { state, elements } from '../state';
import { STORAGE_KEYS, STORAGE_LIMIT_BYTES, IMPORT_SUCCESS_DISPLAY_MS } from '../constants';
import { storageSet } from '../utils/storage';
import { showToast, generateId } from '../utils/dom';
import { renderSavedList, renderTagFilters } from './saved-searches';

const ICONS = {
  export: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>`,
  import: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
  cancel: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
};

export function syncExportCheckboxes(type, targetId) {
  const shadow = elements.shadow;
  if (!shadow) return;

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

export function updateExportCount() {
  const shadow = elements.shadow;
  if (!shadow) return;

  const itemCheckboxes = shadow.querySelectorAll('.export-item-checkbox');
  const selectedItems = Array.from(itemCheckboxes).filter(cb => cb.checked);
  elements.exportCountLabel.innerText = `選択中: ${selectedItems.length}件`;

  const allCheckboxes = shadow.querySelectorAll('.export-item-checkbox, .export-folder-checkbox');
  if (allCheckboxes.length > 0) {
    const allChecked = Array.from(allCheckboxes).every(cb => cb.checked);
    elements.selectAllCheckbox.checked = allChecked;
  } else {
    elements.selectAllCheckbox.checked = false;
  }
}

function decodeBase64Utf8(str) {
  try {
    return decodeURIComponent(atob(str).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
  } catch (e) {
    return atob(str);
  }
}

function parseBetterTradingBackup(text) {
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('---'));

  const searches = [];
  const folders = [];

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const prefix = line.substring(0, colonIndex).trim();
    if (!/^\d+$/.test(prefix)) continue;

    const base64Str = line.substring(colonIndex + 1).trim();
    try {
      const decodedStr = decodeBase64Utf8(base64Str);
      const groupData = JSON.parse(decodedStr);

      if (!groupData || typeof groupData !== 'object') continue;

      const folderName = groupData.tit || "Better Trading Import";
      const folderId = generateId('folder');

      folders.push({
        id: folderId,
        name: folderName,
        isCollapsed: false
      });

      if (Array.isArray(groupData.trs)) {
        groupData.trs.forEach(tr => {
          const searchName = tr.tit || "Unnamed Search";
          const loc = tr.loc || "";

          let url = "";
          if (loc.startsWith("2:search:")) {
            const queryId = loc.substring(9);
            const hostname = window.location.hostname || "jp.pathofexile.com";
            
            let activeLeague = "Standard";
            try {
              const pathParts = window.location.pathname.split('/').filter(Boolean);
              if (pathParts[0] === 'trade2' && pathParts[1] === 'search' && pathParts[2] === 'poe2' && pathParts[3]) {
                activeLeague = encodeURIComponent(decodeURIComponent(pathParts[3]));
              }
            } catch (err) {
              console.error("Failed to extract active league:", err);
            }
            
            url = `https://${hostname}/trade2/search/poe2/${activeLeague}/${queryId}`;
          } else if (loc.startsWith("1:search:")) {
            const queryId = loc.substring(9);
            const hostname = (window.location.hostname || "jp.pathofexile.com").replace("trade2", "trade");
            
            let activeLeague = "Standard";
            try {
              const pathParts = window.location.pathname.split('/').filter(Boolean);
              if (pathParts[0] === 'trade' && pathParts[1] === 'search' && pathParts[2]) {
                activeLeague = encodeURIComponent(decodeURIComponent(pathParts[2]));
              }
            } catch (err) {
              console.error("Failed to extract active PoE1 league:", err);
            }
            
            url = `https://${hostname}/trade/search/${activeLeague}/${queryId}`;
          } else {
            url = loc;
          }

          searches.push({
            id: generateId('search'),
            name: searchName,
            url: url,
            tags: [],
            folderId: folderId,
            createdAt: Date.now()
          });
        });
      }
    } catch (err) {
      console.warn("Failed to parse Better Trading backup line:", err);
    }
  }

  if (searches.length === 0 && folders.length === 0) {
    return null;
  }

  return {
    version: 1,
    searches,
    folders
  };
}

function handleImportFile(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const textContent = e.target.result.trim();
      let importData = null;

      try {
        importData = JSON.parse(textContent);
      } catch (jsonErr) {
        // Attempt parsing as Better PathOfExile Trading backup
        importData = parseBetterTradingBackup(textContent);
      }

      if (!importData || !Array.isArray(importData.searches)) {
        throw new Error("Invalid format");
      }

      const importedSearches = importData.searches;
      const conflicts = importedSearches.filter(imp => 
        state.savedSearches.some(s => s.name.toLowerCase() === imp.name.toLowerCase())
      );

      if (conflicts.length > 0) {
        state.tempImportData = importData;
        elements.importDropZone.style.display = 'none';
        elements.importConflictContainer.style.display = 'flex';
        
        elements.conflictList.innerHTML = '';
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
          elements.conflictList.appendChild(row);
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
  const dropZone = elements.importDropZone;
  if (!dropZone) return;
  dropZone.classList.add('import-error');
  dropZone.innerHTML = `<div class="import-error-text">インポートに失敗しました。<br>正しいJSONファイルを選択してください。</div>`;
  setTimeout(() => {
    dropZone.classList.remove('import-error');
    dropZone.innerHTML = `<div class="import-dropzone-text">JSONファイルをドラッグ＆ドロップ、またはクリックして選択<div style="font-size: 9px; color: var(--poe-gold-bright); margin-top: 4px; opacity: 0.85;">Better PathOfExile Tradingのエクスポートファイルに対応</div></div>`;
  }, 3000);
}

function executeImport(importData, skippedNames) {
  try {
    const importedFolders = Array.isArray(importData.folders) ? importData.folders : [];
    const importedSearches = importData.searches;

    const folderIdMap = {};
    importedFolders.forEach((impFolder) => {
      const existingFolder = state.savedFolders.find(f => f.name.toLowerCase() === impFolder.name.toLowerCase());
      if (existingFolder) {
        folderIdMap[impFolder.id] = existingFolder.id;
      } else {
        const newFolderId = generateId('folder');
        const newFolder = {
          id: newFolderId,
          name: impFolder.name,
          isCollapsed: impFolder.isCollapsed || false
        };
        state.savedFolders.push(newFolder);
        folderIdMap[impFolder.id] = newFolderId;
      }
    });

    let updateCount = 0;
    let insertCount = 0;
    let skipCount = 0;

    importedSearches.forEach(impSearch => {
      const existingSearchIndex = state.savedSearches.findIndex(s => s.name.toLowerCase() === impSearch.name.toLowerCase());
      let finalFolderId = null;
      if (impSearch.folderId) {
        finalFolderId = folderIdMap[impSearch.folderId] || null;
      }

      if (existingSearchIndex !== -1) {
        const isSkipped = skippedNames.includes(impSearch.name.toLowerCase());
        if (isSkipped) {
          skipCount++;
        } else {
          state.savedSearches[existingSearchIndex].url = impSearch.url;
          state.savedSearches[existingSearchIndex].tags = impSearch.tags || [];
          state.savedSearches[existingSearchIndex].folderId = finalFolderId;
          updateCount++;
        }
      } else {
        const newSearchId = generateId('search');
        const newSearch = {
          id: newSearchId,
          name: impSearch.name,
          url: impSearch.url,
          tags: impSearch.tags || [],
          folderId: finalFolderId,
          createdAt: impSearch.createdAt || Date.now()
        };
        state.savedSearches.push(newSearch);
        insertCount++;
      }
    });

    storageSet({
      [STORAGE_KEYS.savedSearches]: state.savedSearches,
      [STORAGE_KEYS.savedFolders]: state.savedFolders
    }, () => {
      renderSavedList();
      renderTagFilters();
      
      elements.importConflictContainer.style.display = 'none';
      elements.importDropZone.style.display = 'flex';
      elements.importDropZone.classList.add('import-success');
      
      let msg = `インポート成功！<br>${insertCount}件追加`;
      if (updateCount > 0) msg += `、${updateCount}件更新`;
      if (skipCount > 0) msg += `、${skipCount}件維持`;
      elements.importDropZone.innerHTML = `<div class="import-success-text">${msg}</div>`;
      
      state.tempImportData = null;

      if (state.onSearchesChanged) state.onSearchesChanged();
      if (state.onFoldersChanged) state.onFoldersChanged();

      setTimeout(() => {
        state.isImportMode = false;
        elements.importBtn.innerHTML = ICONS.import;
        elements.inlineImportForm.classList.remove('active');
        
        setTimeout(() => {
          elements.importDropZone.classList.remove('import-success');
          elements.importDropZone.innerHTML = `<div class="import-dropzone-text">JSONファイルをドラッグ＆ドロップ、またはクリックして選択<div style="font-size: 9px; color: var(--poe-gold-bright); margin-top: 4px; opacity: 0.85;">Better PathOfExile Tradingのエクスポートファイルに対応</div></div>`;
        }, 300);
      }, IMPORT_SUCCESS_DISPLAY_MS);
    });
  } catch (err) {
    console.error("Execute import failed:", err);
    showImportError();
  }
}

export function initExportImport() {
  const exportBtn = elements.exportBtn;
  const importBtn = elements.importBtn;
  const selectAllCheckbox = elements.selectAllCheckbox;
  const exportActionBtn = elements.exportActionBtn;
  const importDropZone = elements.importDropZone;
  const importFileInput = elements.importFileInput;
  const confirmImportBtn = elements.confirmImportBtn;
  const cancelImportBtn = elements.cancelImportBtn;

  if (!exportBtn) return;

  // Bind Export check hook
  state.onExportCheckboxChanged = (type, targetId) => {
    syncExportCheckboxes(type, targetId);
  };

  exportBtn.addEventListener('click', () => {
    elements.inlineSaveForm.classList.remove('active');
    elements.inlineFolderForm.classList.remove('active');
    elements.inlineImportForm.classList.remove('active');
    state.isImportMode = false;
    importBtn.innerHTML = ICONS.import;

    state.isExportMode = !state.isExportMode;
    if (state.isExportMode) {
      exportBtn.innerHTML = ICONS.cancel;
      elements.sidebarContainer.classList.add('export-mode');
      elements.exportActionHeader.style.display = 'flex';
      
      const allCbs = elements.shadow.querySelectorAll('.export-item-checkbox, .export-folder-checkbox');
      allCbs.forEach(cb => cb.checked = false);
      selectAllCheckbox.checked = false;
      updateExportCount();
    } else {
      exportBtn.innerHTML = ICONS.export;
      elements.sidebarContainer.classList.remove('export-mode');
      elements.exportActionHeader.style.display = 'none';
    }
    renderSavedList(); // refresh to show/hide checkboxes
  });

  selectAllCheckbox.addEventListener('change', () => {
    const isChecked = selectAllCheckbox.checked;
    const allCbs = elements.shadow.querySelectorAll('.export-item-checkbox, .export-folder-checkbox');
    allCbs.forEach(cb => {
      cb.checked = isChecked;
    });
    updateExportCount();
  });

  exportActionBtn.addEventListener('click', () => {
    const itemCheckboxes = elements.shadow.querySelectorAll('.export-item-checkbox');
    const selectedItemIds = Array.from(itemCheckboxes)
      .filter(cb => cb.checked)
      .map(cb => cb.getAttribute('data-item-id'));

    if (selectedItemIds.length === 0) {
      showToast('エクスポートする検索結果を選択してください。', 'warning');
      return;
    }

    const exportSearches = state.savedSearches.filter(s => selectedItemIds.includes(s.id));
    const exportFolderIds = [...new Set(exportSearches.map(s => s.folderId).filter(id => id !== null))];
    const exportFolders = state.savedFolders.filter(f => exportFolderIds.includes(f.id));

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

    state.isExportMode = false;
    exportBtn.innerHTML = ICONS.export;
    elements.sidebarContainer.classList.remove('export-mode');
    elements.exportActionHeader.style.display = 'none';
    renderSavedList();
  });

  importBtn.addEventListener('click', () => {
    elements.inlineSaveForm.classList.remove('active');
    elements.inlineFolderForm.classList.remove('active');
    if (state.isExportMode) {
      state.isExportMode = false;
      exportBtn.innerHTML = ICONS.export;
      elements.sidebarContainer.classList.remove('export-mode');
      elements.exportActionHeader.style.display = 'none';
    }

    state.isImportMode = !state.isImportMode;
    if (state.isImportMode) {
      importBtn.innerHTML = ICONS.cancel;
      elements.inlineImportForm.classList.add('active');
    } else {
      importBtn.innerHTML = ICONS.import;
      elements.inlineImportForm.classList.remove('active');
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

  confirmImportBtn.addEventListener('click', () => {
    if (!state.tempImportData) return;
    const skippedNames = [];
    const checkboxes = elements.conflictList.querySelectorAll('.conflict-item-checkbox');
    checkboxes.forEach(cb => {
      if (!cb.checked) {
        skippedNames.push(cb.getAttribute('data-name').toLowerCase());
      }
    });
    executeImport(state.tempImportData, skippedNames);
  });

  cancelImportBtn.addEventListener('click', () => {
    state.tempImportData = null;
    elements.importConflictContainer.style.display = 'none';
    importDropZone.style.display = 'flex';
  });
}
