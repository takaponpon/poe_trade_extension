import { state, elements } from '../state';
import { STORAGE_KEYS, ERROR_HIGHLIGHT_MS } from '../constants';
import { storageSet } from '../utils/storage';
import { generateId } from '../utils/dom';
import { renderSavedList } from './saved-searches';

export function persistSavedFolders() {
  storageSet({ [STORAGE_KEYS.savedFolders]: state.savedFolders }, () => {
    renderSavedList();
    if (state.onFoldersChanged) {
      state.onFoldersChanged();
    }
  });
}

export function initFolderManager() {
  const createFolderBtn = elements.createFolderBtn;
  const folderNameInput = elements.folderNameInput;
  const confirmFolderBtn = elements.confirmFolderBtn;
  const cancelFolderBtn = elements.cancelFolderBtn;

  if (!createFolderBtn) return;

  createFolderBtn.addEventListener('click', () => {
    if (elements.inlineSaveForm) elements.inlineSaveForm.classList.remove('active');
    
    folderNameInput.value = '';
    elements.inlineFolderForm.classList.toggle('active');
    if (elements.inlineFolderForm.classList.contains('active')) {
      folderNameInput.focus();
    }
  });

  confirmFolderBtn.addEventListener('click', () => {
    const name = folderNameInput.value.trim();
    if (!name) {
      folderNameInput.focus();
      folderNameInput.classList.add('error');
      setTimeout(() => folderNameInput.classList.remove('error'), ERROR_HIGHLIGHT_MS);
      return;
    }

    // Duplicate Check
    const isDuplicate = state.savedFolders.some(f => f.name.toLowerCase() === name.toLowerCase());
    if (isDuplicate) {
      folderNameInput.focus();
      folderNameInput.classList.add('error');
      setTimeout(() => folderNameInput.classList.remove('error'), ERROR_HIGHLIGHT_MS);
      return;
    }

    const newFolder = {
      id: generateId('folder'),
      name: name,
      isCollapsed: false
    };

    state.savedFolders.push(newFolder);
    persistSavedFolders();
    elements.inlineFolderForm.classList.remove('active');
  });

  cancelFolderBtn.addEventListener('click', () => {
    elements.inlineFolderForm.classList.remove('active');
  });
}
