import { state, elements } from '../state';
import { STORAGE_KEYS, STORAGE_LIMIT_BYTES } from '../constants';
import { storageSet } from '../utils/storage';
import { showToast } from '../utils/dom';
import { renderSavedList, renderTagFilters } from './saved-searches';

export function syncPushToCloud(searches, folders) {
  const url = elements.gasUrlInput.value.trim();
  if (!url || !url.startsWith('https://script.google.com/')) {
    return Promise.reject(new Error('Invalid or missing GAS URL'));
  }
  
  const payload = { searches, folders };
  
  return fetch(url, {
    method: 'POST',
    mode: 'cors',
    headers: {
      'Content-Type': 'text/plain'
    },
    body: JSON.stringify(payload)
  })
  .then(response => {
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  })
  .then(data => {
    if (data && data.status === 'success') {
      return data;
    } else {
      throw new Error('Sync push returned unsuccessful status');
    }
  });
}

export function syncPullFromCloud() {
  const url = elements.gasUrlInput.value.trim();
  if (!url || !url.startsWith('https://script.google.com/')) {
    return Promise.reject(new Error('Invalid or missing GAS URL'));
  }
  
  return fetch(url, {
    method: 'GET',
    mode: 'cors'
  })
  .then(response => {
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  })
  .then(data => {
    if (data && Array.isArray(data.searches) && Array.isArray(data.folders)) {
      return data;
    } else {
      throw new Error('Invalid format received from cloud');
    }
  });
}

export function autoPushToCloud() {
  syncPushToCloud(state.savedSearches, state.savedFolders)
    .then(() => {
      console.log('PoE2 Trade Extension: Auto-sync push successful.');
    })
    .catch(err => {
      console.error('PoE2 Trade Extension: Auto-sync push error:', err);
    });
}

export function mergeCloudAndLocal(cloud, local) {
  const mergedSearches = [];
  const localSearchMap = new Map();
  local.searches.forEach(s => {
    if (s && s.id) localSearchMap.set(s.id, s);
  });

  local.searches.forEach(s => {
    if (s && s.id) mergedSearches.push(s);
  });
  cloud.searches.forEach(s => {
    if (s && s.id && !localSearchMap.has(s.id)) {
      mergedSearches.push(s);
    }
  });

  const mergedFolders = [];
  const localFolderMap = new Map();
  local.folders.forEach(f => {
    if (f && f.id) localFolderMap.set(f.id, f);
  });
  const cloudFolderMap = new Map();
  cloud.folders.forEach(f => {
    if (f && f.id) cloudFolderMap.set(f.id, f);
  });

  local.folders.forEach(f => {
    if (f && f.id) {
      const cloudFolder = cloudFolderMap.get(f.id);
      if (cloudFolder) {
        const combinedSearchIds = [...new Set([...(f.searchIds || []), ...(cloudFolder.searchIds || [])])];
        mergedFolders.push({
          ...f,
          searchIds: combinedSearchIds
        });
      } else {
        mergedFolders.push(f);
      }
    }
  });
  cloud.folders.forEach(f => {
    if (f && f.id && !localFolderMap.has(f.id)) {
      mergedFolders.push(f);
    }
  });

  return { searches: mergedSearches, folders: mergedFolders };
}

export function initCloudSync() {
  const gasSyncModeInput = elements.gasSyncModeInput;
  const gasSyncNowBtn = elements.gasSyncNowBtn;
  const gasInstructionsToggle = elements.gasInstructionsToggle;
  const gasInstructionsContent = elements.gasInstructionsContent;
  const gasUrlInput = elements.gasUrlInput;

  if (!gasSyncModeInput) return;

  // Bind change hooks to auto synchronise on local saves
  state.onSearchesChanged = () => {
    if (state.gasSyncMode && !state.isPullingFromCloud) {
      autoPushToCloud();
    }
  };
  state.onFoldersChanged = () => {
    if (state.gasSyncMode && !state.isPullingFromCloud) {
      autoPushToCloud();
    }
  };

  gasUrlInput.addEventListener('input', (e) => {
    const val = e.target.value.trim();
    storageSet({ [STORAGE_KEYS.gasUrl]: val });
  });

  gasInstructionsToggle.addEventListener('click', () => {
    const isHidden = gasInstructionsContent.style.display === 'none';
    if (isHidden) {
      gasInstructionsContent.style.display = 'block';
      gasInstructionsToggle.textContent = 'Google Drive連携のセットアップ方法を閉じる';
    } else {
      gasInstructionsContent.style.display = 'none';
      gasInstructionsToggle.textContent = 'Google Drive連携のセットアップ方法を表示';
    }
  });

  gasSyncModeInput.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    const url = gasUrlInput.value.trim();

    if (isChecked) {
      if (!url) {
        showToast('Google Apps ScriptのURLを設定してください。', 'warning');
        gasSyncModeInput.checked = false;
        return;
      }
      if (!url.startsWith('https://script.google.com/')) {
        showToast('無効なURL形式です。Google Apps ScriptのウェブアプリURLを入力してください。', 'warning');
        gasSyncModeInput.checked = false;
        return;
      }

      showToast('同期を開始します。データを取得中...', 'info');

      syncPullFromCloud()
        .then(cloudData => {
          showToast('データをマージ中...', 'info');
          const merged = mergeCloudAndLocal(cloudData, { searches: state.savedSearches, folders: state.savedFolders });
          state.savedSearches = merged.searches;
          state.savedFolders = merged.folders;

          return syncPushToCloud(state.savedSearches, state.savedFolders)
            .then(() => {
              state.gasSyncMode = true;
              storageSet({
                [STORAGE_KEYS.gasSyncMode]: true,
                [STORAGE_KEYS.savedSearches]: state.savedSearches,
                [STORAGE_KEYS.savedFolders]: state.savedFolders
              }, () => {
                renderSavedList();
                renderTagFilters();
                showToast('Google Drive同期モードがONになりました。データをマージしてアップロードしました！', 'info');
              });
            });
        })
        .catch(error => {
          console.warn('PoE2 Trade Extension: Could not pull cloud data, initialising cloud with local data:', error);
          
          syncPushToCloud(state.savedSearches, state.savedFolders)
            .then(() => {
              state.gasSyncMode = true;
              storageSet({
                [STORAGE_KEYS.gasSyncMode]: true
              }, () => {
                showToast('Google Drive同期モードがONになりました。ローカルデータで初期化しました！', 'info');
              });
            })
            .catch(err => {
              console.error('PoE2 Trade Extension: Failed to upload initial data to cloud:', err);
              gasSyncModeInput.checked = false;
              showToast('同期接続に失敗しました。接続設定を確認してください。', 'warning');
            });
        });

    } else {
      if (!url) {
        state.gasSyncMode = false;
        storageSet({ [STORAGE_KEYS.gasSyncMode]: false }, () => {
          showToast('Google Drive同期モードをオフにしました。', 'info');
        });
        return;
      }

      showToast('同期をオフにします。最新データを確認中...', 'info');

      syncPullFromCloud()
        .then(cloudData => {
          const serialized = JSON.stringify(cloudData);
          const size = new Blob([serialized]).size;

          if (size >= STORAGE_LIMIT_BYTES) {
            const warningMsg = `【警告】同期をオフにすると、Google Drive上のデータ(約 ${(size / 1024 / 1024).toFixed(2)} MB)がすべてローカルに移行されます。\n\n` +
                               `しかし、このデータ量はChrome拡張機能のローカル保存容量制限(10MB)を超えているため、一部のデータが欠損します。\n` +
                               `同期をオフにする前に、設定画面からJSONファイルとして手動エクスポートし、バックアップを保存することを強く推奨します。\n\n` +
                               `同期の解除を続行し、データが欠損するリスクを受け入れますか？`;
            const proceed = confirm(warningMsg);
            if (!proceed) {
              gasSyncModeInput.checked = true;
              showToast('同期モード解除をキャンセルしました。', 'info');
              return;
            }
          }

          state.savedSearches = cloudData.searches;
          state.savedFolders = cloudData.folders;
          state.gasSyncMode = false;

          storageSet({
            [STORAGE_KEYS.gasSyncMode]: false,
            [STORAGE_KEYS.savedSearches]: state.savedSearches,
            [STORAGE_KEYS.savedFolders]: state.savedFolders
          }, () => {
            renderSavedList();
            renderTagFilters();
            showToast('Google Drive同期モードをオフにし、データをローカルに保存しました。', 'info');
          });
        })
        .catch(error => {
          console.error('PoE2 Trade Extension: Failed to fetch cloud data during OFF transition:', error);
          const proceed = confirm('Google Driveからの最新データの取得に失敗しました。現在のローカルキャッシュのままで同期をオフにしますか？');
          if (proceed) {
            state.gasSyncMode = false;
            storageSet({ [STORAGE_KEYS.gasSyncMode]: false }, () => {
              showToast('Google Drive同期モードをオフにしました。', 'info');
            });
          } else {
            gasSyncModeInput.checked = true;
          }
        });
    }
  });

  gasSyncNowBtn.addEventListener('click', () => {
    const url = gasUrlInput.value.trim();
    if (!url) {
      showToast('Google Apps ScriptのURLを入力してください。', 'warning');
      return;
    }
    if (!url.startsWith('https://script.google.com/')) {
      showToast('無効なURL形式です。Google Apps ScriptのウェブアプリURLを入力してください。', 'warning');
      return;
    }

    const confirmSync = confirm('Google Driveから最新データを受信して同期しますか？\n現在のローカルデータはクラウドのデータで上書きされます。');
    if (!confirmSync) return;

    showToast('最新データを取得中...', 'info');

    syncPullFromCloud()
      .then(cloudData => {
        state.savedSearches = cloudData.searches;
        state.savedFolders = cloudData.folders;
        
        state.isPullingFromCloud = true;
        storageSet({
          [STORAGE_KEYS.savedSearches]: state.savedSearches,
          [STORAGE_KEYS.savedFolders]: state.savedFolders
        }, () => {
          state.isPullingFromCloud = false;
          renderSavedList();
          renderTagFilters();
          showToast('最新データを正常に受信しました！', 'info');
        });
      })
      .catch(error => {
        console.error('PoE2 Trade Extension: Fetch latest sync error:', error);
        showToast('データの受信に失敗しました。接続設定を確認してください。', 'warning');
      });
  });
}
