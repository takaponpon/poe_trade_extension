import { DEFAULT_WIDTH, DEFAULT_MAX_VISIBLE_TAGS, DEFAULT_ITEM_HEIGHT } from './constants';

export const state = {
  currentWidth: DEFAULT_WIDTH,
  isCollapsed: false,
  savedSearches: [],
  savedFolders: [],
  filterText: '',
  selectedTags: new Set(),
  excludeCompleted: false,
  tempSearchData: null,
  itemToDelete: null,
  folderToDelete: null,
  isExportMode: false,
  isImportMode: false,
  tempImportData: null,
  gasSyncMode: false,
  isPullingFromCloud: false,
  showAllTags: false,
  maxVisibleTags: DEFAULT_MAX_VISIBLE_TAGS,
  itemHeight: DEFAULT_ITEM_HEIGHT,
  autoTravelInterval: null,
  autoTravelCooldown: 30,
  lastClickedTime: 0,
  manualLiveSearchClickInterval: null,
  manualLiveSearchCheckInterval: null,
  manualSearchInterval: 30,
  showRuneExcludedDefense: true
};

export const elements = {};
