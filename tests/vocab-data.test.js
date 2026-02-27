import test from 'node:test';
import assert from 'node:assert/strict';
import { createWordSchema, parseCsv, parseWordsFromCsv, loadWords } from '../vocab-data.js';

test('parseCsv supports quotes and commas inside cell', () => {
  const csv = 'ru,ru_voice,he,he_voice,trans\n"привет, мир",,שלום,,shalom';
  const rows = parseCsv(csv);
  assert.equal(rows.length, 2);
  assert.equal(rows[1][0], 'привет, мир');
});

test('createWordSchema normalizes mandatory and optional fields', () => {
  const word = createWordSchema({ ru: ' Дом ', he: 'בַּיִת', ru_voice: '', he_voice: '', trans: ' баит ' });
  assert.deepEqual(word, {
    ru: 'Дом',
    he: 'בַּיִת',
    ru_voice: 'Дом',
    he_voice: 'בית',
    trans: 'баит',
  });
});

test('parseWordsFromCsv drops invalid rows', () => {
  const csv = [
    'ru,ru_voice,he,he_voice,trans',
    'Спасибо,,תודה,,тода',
    ',,שלום,,shalom',
  ].join('\n');
  const words = parseWordsFromCsv(csv);
  assert.equal(words.length, 1);
  assert.equal(words[0].ru, 'Спасибо');
});

test('loadWords uses local source when mode=local', async () => {
  const originalFetch = global.fetch;
  try {
    global.fetch = async () => ({
      ok: true,
      json: async () => [{ ru: 'Тест', he: 'בדיקה', trans: 'bdika' }],
    });

    const result = await loadWords({ mode: 'local', localFallbackPath: './words.sample.json' });
    assert.equal(result.source, 'local-forced');
    assert.equal(result.words[0].ru, 'Тест');
  } finally {
    global.fetch = originalFetch;
  }
});
