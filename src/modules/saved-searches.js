import { state, elements } from '../state';
import { STORAGE_KEYS, ERROR_HIGHLIGHT_MS, DEBOUNCE_DELAY_MS } from '../constants';
import { storageSet } from '../utils/storage';
import { escapeHtml, generateId, showToast, debounce } from '../utils/dom';

const ICONS = {
  eye: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
  externalLink: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`,
  edit: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>`,
  checkSquare: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>`,
  square: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>`,
  trash: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`,
  folder: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`
};

export function persistSavedSearches() {
  storageSet({ [STORAGE_KEYS.savedSearches]: state.savedSearches }, () => {
    renderSavedList();
    renderTagFilters();
    if (state.onSearchesChanged) {
      state.onSearchesChanged();
    }
  });
}

export function saveNewSearch(data) {
  data.id = generateId('search');
  data.createdAt = Date.now();
  state.savedSearches.push(data);
  persistSavedSearches();
}

export function renderTagSuggestions() {
  const list = elements.tagSuggestionsList;
  if (!list) return;
  list.innerHTML = '';
  const allTags = new Set();
  
  state.savedSearches.forEach(search => {
    if (search.tags && Array.isArray(search.tags)) {
      search.tags.forEach(tag => {
        const trimmed = tag.trim();
        if (trimmed && trimmed !== '完了') {
          allTags.add(trimmed.toLowerCase());
        }
      });
    }
  });

  if (allTags.size === 0) {
    list.innerHTML = '<span class="no-tags">タグはまだ登録されていません</span>';
    return;
  }

  allTags.forEach(tag => {
    const bubble = document.createElement('span');
    bubble.className = 'tag-bubble';
    bubble.innerText = tag;
    
    bubble.addEventListener('click', () => {
      const inputVal = elements.saveTagsInput.value.trim();
      if (inputVal === '') {
        elements.saveTagsInput.value = tag;
      } else {
        const tagsArray = inputVal.split(',').map(t => t.trim());
        if (!tagsArray.includes(tag)) {
          tagsArray.push(tag);
          elements.saveTagsInput.value = tagsArray.join(', ');
        }
      }
      elements.saveTagsInput.focus();
    });
    list.appendChild(bubble);
  });
}

export function renderTagFilters() {
  const container = elements.tagFiltersContainer;
  if (!container) return;
  container.innerHTML = '';
  const allTags = new Set();

  state.savedSearches.forEach(search => {
    if (search.tags && Array.isArray(search.tags)) {
      search.tags.forEach(tag => {
        if (tag.trim()) {
          allTags.add(tag.trim().toLowerCase());
        }
      });
    }
  });

  if (allTags.size === 0) {
    container.style.display = 'none';
    return;
  }
  container.style.display = 'flex';

  const tagsArray = Array.from(allTags);
  const hasMoreThanLimit = tagsArray.length > state.maxVisibleTags;
  const visibleTags = (hasMoreThanLimit && !state.showAllTags)
    ? tagsArray.slice(0, state.maxVisibleTags)
    : tagsArray;

  visibleTags.forEach(tag => {
    const pill = document.createElement('span');
    pill.className = 'filter-tag-pill';
    if (state.selectedTags.has(tag)) {
      pill.classList.add('active');
    }
    pill.innerText = tag;

    pill.addEventListener('click', () => {
      if (state.selectedTags.has(tag)) {
        state.selectedTags.delete(tag);
        pill.classList.remove('active');
      } else {
        state.selectedTags.add(tag);
        pill.classList.add('active');
      }
      renderSavedList();
    });
    container.appendChild(pill);
  });

  if (hasMoreThanLimit) {
    const tagToggleBtn = document.createElement('span');
    tagToggleBtn.className = 'toggle-all-tags-btn';
    tagToggleBtn.innerText = state.showAllTags ? '▲ タグを折りたたむ' : `▼ 全てのタグを表示 (${tagsArray.length - state.maxVisibleTags}個+)`;
    
    tagToggleBtn.addEventListener('click', () => {
      state.showAllTags = !state.showAllTags;
      renderTagFilters();
    });
    container.appendChild(tagToggleBtn);
  }
}

function triggerFoldersChanged() {
  if (state.onFoldersChanged) {
    state.onFoldersChanged();
  }
}

export function createSavedItemEl(item) {
  const row = document.createElement('div');
  row.className = 'saved-item';
  row.draggable = true;
  row.dataset.itemId = item.id;

  row.addEventListener('dragstart', (e) => {
    if (state.isExportMode) {
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
    if (state.onDragEnd) {
      state.onDragEnd();
    }
  });

  let tagsMarkup = '';
  if (item.tags && item.tags.length > 0) {
    tagsMarkup = `
      <div class="saved-item-tags">
        ${item.tags.map(t => {
          const isCompleteTag = t.trim() === '完了';
          return `<span class="saved-item-tag-badge ${isCompleteTag ? 'tag-complete' : ''}">${escapeHtml(t)}</span>`;
        }).join('')}
      </div>
    `;
  }

  const isCompleted = item.tags && item.tags.some(t => t.trim() === '完了');
  const completeIcon = isCompleted ? ICONS.square : ICONS.checkSquare;
  const completeTitle = isCompleted ? '未完了に戻す' : '完了にする';
  const completeClass = isCompleted ? 'incomplete-btn' : 'complete-btn';

  row.innerHTML = `
    <input type="checkbox" class="export-item-checkbox" data-item-id="${escapeHtml(item.id)}" ${item.folderId ? `data-folder-id="${escapeHtml(item.folderId)}"` : ''}>
    <div class="saved-item-info" title="${escapeHtml(item.name)}">
      <div class="saved-item-info-row">
        <div class="saved-item-name">${escapeHtml(item.name)}</div>
        ${tagsMarkup}
      </div>
    </div>
    <div class="saved-item-actions">
      <button class="action-btn eye-btn" title="現在のページで開く">
        ${ICONS.eye}
      </button>
      <button class="action-btn external-btn" title="別タブで開く">
        ${ICONS.externalLink}
      </button>
      <button class="action-btn edit-btn" title="編集">
        ${ICONS.edit}
      </button>
      <button class="action-btn ${completeClass}" title="${completeTitle}">
        ${completeIcon}
      </button>
      <button class="action-btn trash-btn" title="削除">
        ${ICONS.trash}
      </button>
    </div>
  `;

  const checkbox = row.querySelector('.export-item-checkbox');
  checkbox.addEventListener('change', () => {
    if (state.onExportCheckboxChanged) {
      state.onExportCheckboxChanged('item', item.id);
    }
  });
  checkbox.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  row.querySelector('.eye-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    window.location.href = item.url;
  });

  row.querySelector('.external-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    window.open(item.url, '_blank');
  });

  row.querySelector('.edit-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    row.draggable = false;
    row.classList.add('editing');
    
    const tagsString = item.tags ? item.tags.join(', ') : '';
    
    row.innerHTML = `
      <div class="edit-item-container" style="display: flex; flex-direction: column; width: 100%; gap: 6px; padding: 4px 0;">
        <div style="display: flex; gap: 6px; width: 100%;">
          <input type="text" class="text-input edit-name-input" value="${escapeHtml(item.name)}" placeholder="名前" style="flex: 1; font-size: 11px; height: 22px; padding: 2px 6px; color: var(--poe-text);">
          <button class="btn-gold btn-xs save-edit-btn" style="height: 22px; line-height: 18px; font-size: 9px; padding: 2px 6px;">保存</button>
          <button class="btn-gray btn-xs cancel-edit-btn" style="height: 22px; line-height: 18px; font-size: 9px; padding: 2px 6px;">戻る</button>
        </div>
        <div style="display: flex; gap: 6px; width: 100%; align-items: center;">
          <span style="font-size: 9px; color: var(--poe-text-muted); white-space: nowrap;">タグ:</span>
          <input type="text" class="text-input edit-tags-input" value="${escapeHtml(tagsString)}" placeholder="タグ (カンマ区切り)" style="flex: 1; font-size: 10px; height: 20px; padding: 2px 6px; color: var(--poe-text);">
        </div>
      </div>
    `;

    // Prevent dragging from within editing container
    row.querySelector('.edit-item-container').addEventListener('mousedown', (ev) => {
      ev.stopPropagation();
    });

    row.querySelector('.cancel-edit-btn').addEventListener('click', (ev) => {
      ev.stopPropagation();
      renderSavedList();
    });

    row.querySelector('.save-edit-btn').addEventListener('click', (ev) => {
      ev.stopPropagation();
      const newName = row.querySelector('.edit-name-input').value.trim();
      if (!newName) {
        row.querySelector('.edit-name-input').focus();
        return;
      }
      
      const tagsVal = row.querySelector('.edit-tags-input').value.trim();
      const newTags = tagsVal
        ? [...new Set(tagsVal.split(',').map(t => t.trim()).filter(t => t !== ''))]
        : [];
      
      item.name = newName;
      item.tags = newTags;
      
      persistSavedSearches();
    });
  });

  const completeBtn = row.querySelector('.complete-btn, .incomplete-btn');
  completeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!item.tags) {
      item.tags = [];
    }
    
    if (isCompleted) {
      item.tags = item.tags.filter(t => t.trim() !== '完了');
    } else {
      if (!item.tags.some(t => t.trim() === '完了')) {
        item.tags.push('完了');
      }
    }
    
    persistSavedSearches();
  });

  row.querySelector('.trash-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    const actionsContainer = row.querySelector('.saved-item-actions');
    
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
      state.savedSearches = state.savedSearches.filter(s => s.id !== item.id);
      persistSavedSearches();
    });
    
    actionsContainer.querySelector('.cancel-delete-btn').addEventListener('click', (ev) => {
      ev.stopPropagation();
      renderSavedList();
    });
  });

  return row;
}

export function renderSavedList() {
  const savedList = elements.savedList;
  if (!savedList) return;
  savedList.innerHTML = '';

  const filtered = state.savedSearches.filter(search => {
    const matchesText = search.name.toLowerCase().includes(state.filterText);
    let matchesTags = true;
    if (state.selectedTags.size > 0) {
      matchesTags = search.tags && search.tags.some(tag => state.selectedTags.has(tag.toLowerCase()));
    }
    let matchesCompleted = true;
    if (state.excludeCompleted) {
      const hasCompletedTag = search.tags && search.tags.some(t => t.trim() === '完了');
      if (hasCompletedTag) {
        matchesCompleted = false;
      }
    }
    return matchesText && matchesTags && matchesCompleted;
  });

  if (state.savedSearches.length === 0) {
    savedList.innerHTML = '<div class="no-items">保存された検索結果はありません</div>';
    return;
  }

  // Render Folders
  state.savedFolders.forEach(folder => {
    const folderGroup = document.createElement('div');
    folderGroup.className = 'folder-group';
    folderGroup.dataset.folderId = folder.id;

    const children = filtered.filter(s => s.folderId === folder.id);

    const folderHeader = document.createElement('div');
    folderHeader.className = 'folder-header';
    if (folder.isCollapsed) {
      folderHeader.classList.add('collapsed');
    }
    folderHeader.draggable = true;

    folderHeader.addEventListener('dragstart', (e) => {
      if (e.target.closest('.export-folder-checkbox') || e.target.closest('.folder-trash-btn') || e.target.closest('.in-place-folder-confirm')) {
        e.preventDefault();
        return;
      }
      if (state.isExportMode) {
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
      if (state.onDragEnd) {
        state.onDragEnd();
      }
    });

    folderHeader.innerHTML = `
      <input type="checkbox" class="export-folder-checkbox" data-folder-id="${escapeHtml(folder.id)}">
      <div class="folder-title-wrapper">
        <span class="folder-icon">${ICONS.folder}</span>
        <span class="folder-name" title="${escapeHtml(folder.name)}">${escapeHtml(folder.name)}</span>
      </div>
      <span class="folder-chevron">▼</span>
      <button class="action-btn folder-trash-btn" title="フォルダを削除">
        ${ICONS.trash}
      </button>
    `;

    const fCheckbox = folderHeader.querySelector('.export-folder-checkbox');
    fCheckbox.addEventListener('change', () => {
      if (state.onExportCheckboxChanged) {
        state.onExportCheckboxChanged('folder', folder.id);
      }
    });
    fCheckbox.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    folderHeader.addEventListener('click', (e) => {
      if (e.target.closest('.folder-trash-btn') || e.target.closest('.in-place-folder-confirm')) return;
      folder.isCollapsed = !folder.isCollapsed;
      triggerFoldersChanged();
    });

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
        
        state.savedSearches.forEach(search => {
          if (search.folderId === folder.id) {
            search.folderId = null;
          }
        });

        state.savedFolders = state.savedFolders.filter(f => f.id !== folder.id);

        storageSet({
          [STORAGE_KEYS.savedSearches]: state.savedSearches,
          [STORAGE_KEYS.savedFolders]: state.savedFolders
        }, () => {
          renderSavedList();
          renderTagFilters();
          if (state.onSearchesChanged) state.onSearchesChanged();
          if (state.onFoldersChanged) state.onFoldersChanged();
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
      placeholder.innerText = 'ここにアイテムをドラッグ＆ドロップ';
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

  // Render Unassigned / Root searches
  const unassignedItems = filtered.filter(s => !s.folderId || !state.savedFolders.some(f => f.id === s.folderId));

  if (unassignedItems.length > 0 || state.savedFolders.length > 0) {
    const unassignedGroup = document.createElement('div');
    unassignedGroup.className = 'unassigned-group';

    if (state.savedFolders.length > 0) {
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
      placeholder.innerText = '未分類のアイテムはありません';
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

export function initSavedSearches() {
  const saveSearchBtn = elements.saveSearchBtn;
  const confirmSaveBtn = elements.confirmSaveBtn;
  const cancelSaveBtn = elements.cancelSaveBtn;
  const confirmOverwriteBtn = elements.confirmOverwriteBtn;
  const cancelOverwriteBtn = elements.cancelOverwriteBtn;
  const filterInput = elements.filterInput;
  const resetFiltersBtn = elements.resetFiltersBtn;

  if (!saveSearchBtn) return;

  saveSearchBtn.addEventListener('click', () => {
    if (elements.inlineFolderForm) elements.inlineFolderForm.classList.remove('active');
    
    elements.saveNameInput.value = '';
    elements.saveTagsInput.value = '';
    elements.overwriteWarningBox.style.display = 'none';
    elements.normalSaveButtons.style.display = 'flex';
    renderTagSuggestions();
    
    elements.inlineSaveForm.classList.toggle('active');
    if (elements.inlineSaveForm.classList.contains('active')) {
      elements.saveNameInput.focus();
    }
  });

  confirmSaveBtn.addEventListener('click', () => {
    const name = elements.saveNameInput.value.trim();
    if (!name) {
      elements.saveNameInput.focus();
      elements.saveNameInput.classList.add('error');
      setTimeout(() => elements.saveNameInput.classList.remove('error'), ERROR_HIGHLIGHT_MS);
      return;
    }

    const tagsVal = elements.saveTagsInput.value.trim();
    const tags = tagsVal
      ? [...new Set(tagsVal.split(',').map(t => t.trim().toLowerCase()).filter(t => t !== ''))]
      : [];

    const url = window.location.href;
    state.tempSearchData = { name, url, tags };

    const duplicateIndex = state.savedSearches.findIndex(s => s.name.toLowerCase() === name.toLowerCase());

    if (duplicateIndex !== -1) {
      elements.normalSaveButtons.style.display = 'none';
      elements.overwriteWarningBox.style.display = 'block';
    } else {
      saveNewSearch(state.tempSearchData);
      elements.inlineSaveForm.classList.remove('active');
      state.tempSearchData = null;
    }
  });

  cancelSaveBtn.addEventListener('click', () => {
    elements.inlineSaveForm.classList.remove('active');
  });

  confirmOverwriteBtn.addEventListener('click', () => {
    if (state.tempSearchData) {
      const idx = state.savedSearches.findIndex(s => s.name.toLowerCase() === state.tempSearchData.name.toLowerCase());
      if (idx !== -1) {
        state.tempSearchData.id = state.savedSearches[idx].id;
        state.tempSearchData.createdAt = state.savedSearches[idx].createdAt || Date.now();
        state.savedSearches[idx] = state.tempSearchData;
        persistSavedSearches();
      }
    }
    elements.overwriteWarningBox.style.display = 'none';
    elements.normalSaveButtons.style.display = 'flex';
    elements.inlineSaveForm.classList.remove('active');
    state.tempSearchData = null;
  });

  cancelOverwriteBtn.addEventListener('click', () => {
    elements.overwriteWarningBox.style.display = 'none';
    elements.normalSaveButtons.style.display = 'flex';
    elements.saveNameInput.focus();
  });

  const debouncedRender = debounce(() => {
    renderSavedList();
  }, DEBOUNCE_DELAY_MS);

  filterInput.addEventListener('input', (e) => {
    state.filterText = e.target.value.trim().toLowerCase();
    debouncedRender();
  });

  resetFiltersBtn.addEventListener('click', () => {
    filterInput.value = '';
    state.filterText = '';
    state.selectedTags.clear();
    
    const pills = elements.tagFiltersContainer.querySelectorAll('.filter-tag-pill');
    pills.forEach(p => p.classList.remove('active'));

    renderSavedList();
  });
}
