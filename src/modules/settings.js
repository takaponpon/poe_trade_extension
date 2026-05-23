import { state, elements } from '../state';
import { STORAGE_KEYS, DEFAULT_MAX_VISIBLE_TAGS, DEFAULT_ITEM_HEIGHT } from '../constants';
import { storageSet } from '../utils/storage';
import { updateItemHeightStyles } from './sidebar-ui';
import { renderTagFilters } from './saved-searches';
import { applyRuneExcludedDefenseToAll } from './rune-defense';

export function initSettings() {
  const settingsBtn = elements.settingsBtn;
  const settingsBackBtn = elements.settingsBackBtn;
  const maxVisibleTagsInput = elements.maxVisibleTagsInput;
  const itemHeightSlider = elements.itemHeightSlider;
  const autoTravelCooldownInput = elements.autoTravelCooldownInput;
  const manualSearchIntervalInput = elements.manualSearchIntervalInput;
  const showRuneExcludedDefenseInput = elements.showRuneExcludedDefenseInput;

  if (!settingsBtn) return;

  settingsBtn.addEventListener('click', () => {
    elements.sidebarContainer.classList.add('settings-mode');
  });

  settingsBackBtn.addEventListener('click', () => {
    elements.sidebarContainer.classList.remove('settings-mode');
  });

  maxVisibleTagsInput.addEventListener('input', (e) => {
    const rawVal = e.target.value.trim();
    if (!rawVal) return;
    let value = parseInt(rawVal, 10);
    if (isNaN(value) || value < 1) {
      value = 1;
    }
    state.maxVisibleTags = value;
    storageSet({ [STORAGE_KEYS.maxVisibleTags]: state.maxVisibleTags }, () => {
      renderTagFilters();
    });
  });

  maxVisibleTagsInput.addEventListener('blur', (e) => {
    let value = parseInt(e.target.value, 10);
    if (isNaN(value) || value < 1) {
      value = DEFAULT_MAX_VISIBLE_TAGS;
    }
    state.maxVisibleTags = value;
    maxVisibleTagsInput.value = state.maxVisibleTags;
    storageSet({ [STORAGE_KEYS.maxVisibleTags]: state.maxVisibleTags }, () => {
      renderTagFilters();
    });
  });

  itemHeightSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10) || DEFAULT_ITEM_HEIGHT;
    state.itemHeight = val;
    updateItemHeightStyles(val);
    storageSet({ [STORAGE_KEYS.itemHeight]: val });
  });

  autoTravelCooldownInput.addEventListener('input', (e) => {
    const rawVal = e.target.value.trim();
    if (!rawVal) return;
    let value = parseInt(rawVal, 10);
    if (isNaN(value) || value < 0) {
      value = 0;
    }
    state.autoTravelCooldown = value;
    storageSet({ [STORAGE_KEYS.autoTravelCooldown]: state.autoTravelCooldown });
  });

  autoTravelCooldownInput.addEventListener('blur', (e) => {
    let value = parseInt(e.target.value, 10);
    if (isNaN(value) || value < 0) {
      value = 30;
    }
    state.autoTravelCooldown = value;
    autoTravelCooldownInput.value = state.autoTravelCooldown;
    storageSet({ [STORAGE_KEYS.autoTravelCooldown]: state.autoTravelCooldown });
  });

  manualSearchIntervalInput.addEventListener('input', (e) => {
    const rawVal = e.target.value.trim();
    if (!rawVal) return;
    let value = parseInt(rawVal, 10);
    if (isNaN(value) || value < 5) {
      value = 5;
    }
    state.manualSearchInterval = value;
    storageSet({ [STORAGE_KEYS.manualSearchInterval]: state.manualSearchInterval });
  });

  manualSearchIntervalInput.addEventListener('blur', (e) => {
    let value = parseInt(e.target.value, 10);
    if (isNaN(value) || value < 5) {
      value = 30;
    }
    state.manualSearchInterval = value;
    manualSearchIntervalInput.value = state.manualSearchInterval;
    storageSet({ [STORAGE_KEYS.manualSearchInterval]: state.manualSearchInterval });
  });

  showRuneExcludedDefenseInput.addEventListener('change', (e) => {
    state.showRuneExcludedDefense = e.target.checked;
    storageSet({ [STORAGE_KEYS.showRuneExcludedDefense]: state.showRuneExcludedDefense }, () => {
      applyRuneExcludedDefenseToAll();
    });
  });
}
