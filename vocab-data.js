import { APP_CONFIG } from './config.js';

const EMBEDDED_FALLBACK_WORDS = [
  { ru: 'Привет', ru_voice: 'Привет', he: 'שלום', he_voice: 'שלום', trans: 'шалом' },
  { ru: 'Спасибо', ru_voice: 'Спасибо', he: 'תודה', he_voice: 'תודה', trans: 'тода' },
  { ru: 'Дом', ru_voice: 'Дом', he: 'בַּיִת', he_voice: 'בית', trans: 'баит' },
];

function removeNiqqud(text) {
  return text.replace(/[\u0591-\u05C7]/g, '');
}

function clean(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

export function createWordSchema(rawWord) {
  const ru = clean(rawWord.ru);
  const he = clean(rawWord.he);

  if (!ru || !he) return null;

  const normalizedHeVoice = clean(rawWord.he_voice) || clean(removeNiqqud(he)) || he;

  return {
    ru,
    he,
    ru_voice: clean(rawWord.ru_voice) || ru,
    he_voice: normalizedHeVoice,
    trans: clean(rawWord.trans),
  };
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i += 1;
      row.push(cell);
      if (row.some((value) => clean(value) !== '')) rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((value) => clean(value) !== '')) rows.push(row);

  return rows;
}

function getWordFromColumns(columns) {
  return createWordSchema({
    ru: columns[0],
    ru_voice: columns[1],
    he: columns[2],
    he_voice: columns[3],
    trans: columns[4],
  });
}

export function parseWordsFromCsv(text) {
  const rows = parseCsv(text);
  if (rows.length <= 1) return [];

  return rows.slice(1).map(getWordFromColumns).filter(Boolean);
}

function resolveDataSource(overrides = {}) {
  const runtimeConfig = {
    mode: APP_CONFIG.data.sourceMode,
    googleCsvUrl: APP_CONFIG.data.googleCsvUrl,
    localFallbackPath: APP_CONFIG.data.localFallbackPath,
    googleFetchTimeoutMs: APP_CONFIG.data.googleFetchTimeoutMs,
    ...overrides,
  };

  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const sourceParam = params.get('dataSource');
    if (sourceParam) runtimeConfig.mode = sourceParam;
    if (window.__HEBREW_DATA_SOURCE) runtimeConfig.mode = window.__HEBREW_DATA_SOURCE;
  }

  return runtimeConfig;
}

async function loadSampleWords(path = APP_CONFIG.data.localFallbackPath) {
  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error('Не удалось загрузить локальный словарь');

    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Локальный словарь имеет неверный формат');

    return data.map(createWordSchema).filter(Boolean);
  } catch (error) {
    return EMBEDDED_FALLBACK_WORDS.map(createWordSchema).filter(Boolean);
  }
}

export async function loadWords(overrides = {}) {
  const sourceConfig = resolveDataSource(overrides);

  if (sourceConfig.mode === 'local') {
    const words = await loadSampleWords(sourceConfig.localFallbackPath);
    return { words, source: 'local-forced' };
  }

  const csvUrl = `${sourceConfig.googleCsvUrl}&${APP_CONFIG.data.cacheBusterParam}=${Date.now()}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), sourceConfig.googleFetchTimeoutMs);

    const response = await fetch(csvUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error('Google Sheet недоступен');

    const data = await response.text();
    const words = parseWordsFromCsv(data);
    if (!words.length) throw new Error('Google Sheet не содержит валидных строк');

    return { words, source: 'google' };
  } catch (error) {
    if (sourceConfig.mode === 'google-only') {
      throw new Error(`Ошибка загрузки словаря: ${error.message}`);
    }

    const words = await loadSampleWords(sourceConfig.localFallbackPath);
    if (!words.length) {
      throw new Error(`Ошибка загрузки словаря: ${error.message}`);
    }

    return { words, source: 'local-fallback' };
  }
}
