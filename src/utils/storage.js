import { elements } from '../state';
import { STORAGE_LIMIT_BYTES, STORAGE_WARNING_THRESHOLD } from '../constants';

export function storageSet(data, callback) {
  chrome.storage.local.set(data, () => {
    if (chrome.runtime.lastError) {
      console.error('PoE2 Trade Extension: Storage write error:', chrome.runtime.lastError.message);
    }
    checkStorageUsage();
    if (callback) callback();
  });
}

export function storageGet(keys, callback) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (items) => {
      if (chrome.runtime.lastError) {
        console.error('PoE2 Trade Extension: Storage read error:', chrome.runtime.lastError.message);
      }
      const result = items || {};
      if (callback) callback(result);
      resolve(result);
    });
  });
}

export function checkStorageUsage() {
  const box = elements.storageWarningBox;
  if (!box) return;

  chrome.storage.local.getBytesInUse(null, (bytesInUse) => {
    if (chrome.runtime.lastError) {
      console.error('PoE2 Trade Extension: Error getting storage bytes:', chrome.runtime.lastError.message);
      return;
    }
    
    const percentage = bytesInUse / STORAGE_LIMIT_BYTES;
    if (percentage >= STORAGE_WARNING_THRESHOLD) {
      const percentageString = (percentage * 100).toFixed(1);
      box.innerHTML = `⚠️ 保存容量が残り僅かです (${percentageString}% 使用中)<br>不要な履歴を削除するか、外部保存を実行してください。`;
      box.style.display = 'block';
    } else {
      box.style.display = 'none';
    }
  });
}
