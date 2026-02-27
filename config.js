export const APP_CONFIG = {
  ui: {
    stickyOffsetDebounceMs: 80,
    scrollOffsetPaddingPx: 10,
    blurRadiusPx: 5,
    singleWordUnhighlightDelayMs: 500,
    silenceStopDelayMs: 1000,
  },
  speech: {
    keepAliveIntervalMs: 10000,
    loopDelayMs: 800,
    hebrewPitch: 1.6,
    hebrewRate: 0.85,
    silenceLoopVolume: 0.01,
  },
  data: {
    googleCsvUrl:
      'https://docs.google.com/spreadsheets/d/e/2PACX-1vTUqglLjSkwRZAwao-7Rx32nHa1f1MLxY_s_SJTL4ByUMk1Mtx3FRYZgbkoxnOzts3m5vOji5tg1s-6/pub?gid=0&single=true&output=csv',
    cacheBusterParam: 'cacheBuster',
    localFallbackPath: './words.sample.json',
    sourceMode: 'auto', // auto | local | google-only
    googleFetchTimeoutMs: 4000,
  },
};
