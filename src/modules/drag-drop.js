import { state, elements } from '../state';
import { STORAGE_KEYS } from '../constants';
import { storageSet } from '../utils/storage';
import { renderSavedList, renderTagFilters } from './saved-searches';

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

export function saveNewOrder() {
  const savedList = elements.savedList;
  if (!savedList) return;

  // 1. Reconstruct savedFolders order from DOM
  const folderGroups = [...savedList.querySelectorAll('.folder-group')];
  const newFoldersOrder = [];
  folderGroups.forEach(fg => {
    const folderId = fg.dataset.folderId;
    const folderObj = state.savedFolders.find(f => f.id === folderId);
    if (folderObj) {
      newFoldersOrder.push(folderObj);
    }
  });
  // Fallback: add any folders that might have been missed
  state.savedFolders.forEach(folder => {
    if (!newFoldersOrder.some(f => f.id === folder.id)) {
      newFoldersOrder.push(folder);
    }
  });
  state.savedFolders = newFoldersOrder;

  // 2. Reconstruct savedSearches order from DOM
  const visibleItemEls = [...savedList.querySelectorAll('.saved-item')];
  const visibleSearches = [];
  
  visibleItemEls.forEach(itemEl => {
    const itemId = itemEl.dataset.itemId;
    const itemObj = state.savedSearches.find(s => s.id === itemId);
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
  const hiddenSearches = state.savedSearches.filter(s => !visibleSearches.some(vs => vs.id === s.id));
  state.savedSearches = [...visibleSearches, ...hiddenSearches];

  // Clean up drag-hover classes
  const shadow = elements.shadow;
  if (shadow) {
    shadow.querySelectorAll('.folder-header.drag-hover, .unassigned-group.drag-hover').forEach(el => {
      el.classList.remove('drag-hover');
    });
  }

  // 3. Persist to storage
  storageSet({
    [STORAGE_KEYS.savedFolders]: state.savedFolders,
    [STORAGE_KEYS.savedSearches]: state.savedSearches
  }, () => {
    renderSavedList();
    renderTagFilters();
    if (state.onSearchesChanged) state.onSearchesChanged();
    if (state.onFoldersChanged) state.onFoldersChanged();
  });
}

export function initDragDrop() {
  const savedList = elements.savedList;
  const shadow = elements.shadow;
  if (!savedList || !shadow) return;

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

  savedList.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  // Register callback in state to tie createSavedItemEl drag end
  state.onDragEnd = () => {
    saveNewOrder();
  };
}
