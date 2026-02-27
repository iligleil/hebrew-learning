function removeNiqqud(text) {
  return text.replace(/[\u0591-\u05C7]/g, '');
}

function clean(val) {
  return val ? val.replace(/^"|"$/g, '').trim() : '';
}

function normalizeWord(cols) {
  const he = clean(cols[2]);
  return {
    ru: clean(cols[0]),
    ru_voice: clean(cols[1]) || clean(cols[0]),
    he,
    he_voice: clean(removeNiqqud(he)),
    trans: clean(cols[4]),
  };
}

export async function loadWordsFromSheet() {
  const csvUrl =
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vTUqglLjSkwRZAwao-7Rx32nHa1f1MLxY_s_SJTL4ByUMk1Mtx3FRYZgbkoxnOzts3m5vOji5tg1s-6/pub?gid=0&single=true&output=csv' +
    `&cacheBuster=${Date.now()}`;

  const response = await fetch(csvUrl);
  if (!response.ok) throw new Error('Network response was not ok');

  const data = await response.text();
  const rows = data.split(/\r?\n/).filter((row) => row.trim() !== '');
  const contentRows = rows.slice(1);

  return contentRows
    .map((row) => row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/))
    .map(normalizeWord)
    .filter((word) => word.ru);
}
