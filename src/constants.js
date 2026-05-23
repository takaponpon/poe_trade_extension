export const STORAGE_KEYS = {
  collapsed: 'poe2_trade_sidebar_collapsed',
  sidebarWidth: 'poe2_sidebar_width',
  savedSearches: 'poe2_saved_searches',
  savedFolders: 'poe2_saved_folders',
  maxVisibleTags: 'poe2_max_visible_tags',
  itemHeight: 'poe2_item_height',
  autoTravelCooldown: 'poe2_auto_travel_cooldown',
  manualSearchInterval: 'poe2_manual_search_interval',
  showRuneExcludedDefense: 'poe2_show_rune_excluded_defense',
  gasUrl: 'poe2_trade_gas_url',
  gasSyncMode: 'poe2_trade_gas_sync_mode',
  excludeCompleted: 'poe2_exclude_completed'
};

export const DEFAULT_WIDTH = 300;
export const COLLAPSED_WIDTH = 40;
export const MIN_WIDTH = 200;
export const MAX_WIDTH = 600;
export const DEFAULT_MAX_VISIBLE_TAGS = 10;
export const DEFAULT_ITEM_HEIGHT = 36;
export const STORAGE_LIMIT_BYTES = 10485760; // 10MB default limit
export const STORAGE_WARNING_THRESHOLD = 0.97; // 97% threshold

export const POLLING_INTERVAL_MS = 500;
export const TOAST_DURATION_MS = 3000;
export const IMPORT_SUCCESS_DISPLAY_MS = 2000;
export const IMPORT_RESET_DELAY_MS = 300;
export const ERROR_HIGHLIGHT_MS = 1000;
export const DEBOUNCE_DELAY_MS = 150;
