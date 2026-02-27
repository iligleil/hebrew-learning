function removeNiqqud(text) {
  return text.replace(/[\u0591-\u05C7]/g, '');
}

function clean(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function createWordSchema(rawWord) {
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

function parseCsv(text) {
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

function parseWordsFromCsv(text) {
  const rows = parseCsv(text);
  if (rows.length <= 1) return [];

  return rows
    .slice(1)
    .map(getWordFromColumns)
    .filter(Boolean);
}

async function loadSampleWords() {
  const response = await fetch('./words.sample.json');
  if (!response.ok) throw new Error('Не удалось загрузить локальный словарь');

  const data = await response.json();
  if (!Array.isArray(data)) throw new Error('Локальный словарь имеет неверный формат');

  return data.map(createWordSchema).filter(Boolean);
}

export async function loadWords() {
  const csvUrl =
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vTUqglLjSkwRZAwao-7Rx32nHa1f1MLxY_s_SJTL4ByUMk1Mtx3FRYZgbkoxnOzts3m5vOji5tg1s-6/pub?gid=0&single=true&output=csv' +
    `&cacheBuster=${Date.now()}`;

  try {
    const response = await fetch(csvUrl);
    if (!response.ok) throw new Error('Google Sheet недоступен');

    const data = await response.text();
    const words = parseWordsFromCsv(data);
    if (!words.length) throw new Error('Google Sheet не содержит валидных строк');

    return { words, source: 'google' };
  } catch (error) {
    const words = await loadSampleWords();
    if (!words.length) {
      throw new Error(`Ошибка загрузки словаря: ${error.message}`);
    }

    return { words, source: 'local-fallback' };
  }
}
