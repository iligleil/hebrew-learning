import { updateStickyOffset } from './tabs.js';

const icons = {
  'fem-s': '🤦',
  'masc-s': '🤦‍♂️',
  'fem-p': '🤦🤦',
  'masc-p': '🤦‍♂️🤦‍♂️',
  'self-s': '🤓',
};

export function renderIcons() {
  Object.keys(icons).forEach((key) => {
    document.querySelectorAll(`.${key}`).forEach((el) => {
      el.innerHTML = icons[key];
    });
  });
}

function createWordCell(content, blur) {
  const td = document.createElement('td');
  td.style.fontSize = '16px';
  td.style.border = '1px solid #ccc';
  td.style.padding = '10px';
  td.style.filter = blur ? 'blur(5px)' : 'none';
  td.textContent = content || '—';
  return td;
}

function createSpeakCell(index) {
  const td = document.createElement('td');
  td.style.border = '1px solid #ccc';
  td.style.padding = '10px';
  td.style.textAlign = 'center';

  const button = document.createElement('button');
  button.className = 'speak-one-btn';
  button.dataset.index = String(index);
  button.style.cursor = 'pointer';
  button.style.background = 'none';
  button.style.border = 'none';
  button.style.fontSize = '20px';
  button.setAttribute('aria-label', 'Озвучить слово');
  button.textContent = '🔊';

  td.appendChild(button);
  return td;
}

function createWordRow(word, index, blurStates) {
  const row = document.createElement('tr');
  row.id = `word-row-${index}`;

  const heCell = createWordCell(word.he, blurStates[0]);
  heCell.classList.add('hebrew-text');

  row.appendChild(heCell);
  row.appendChild(createWordCell(word.trans, blurStates[1]));
  row.appendChild(createWordCell(word.ru, blurStates[2]));
  row.appendChild(createSpeakCell(index));

  return row;
}

export function renderWordsTable(words, blurStates = [false, false, false]) {
  const body = document.getElementById('vocabBody');
  if (!body) return;

  const fragment = document.createDocumentFragment();
  words.forEach((word, index) => {
    fragment.appendChild(createWordRow(word, index, blurStates));
  });

  body.innerHTML = '';
  body.appendChild(fragment);
  setTimeout(updateStickyOffset, 100);
}

export function initVocab(words) {
  renderWordsTable(words);
}

export function shuffleTable(words, isSpeaking, cancelSpeech) {
  for (let i = words.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [words[i], words[j]] = [words[j], words[i]];
  }

  const table = document.getElementById('wordsTable');
  const blurStates = [0, 1, 2].map((idx) => {
    const firstRow = table?.querySelector('tbody tr');
    if (!firstRow) return false;
    return firstRow.cells[idx].style.filter === 'blur(5px)';
  });

  renderWordsTable(words, blurStates);

  if (isSpeaking()) cancelSpeech();
}

export function highlightRow(index) {
  unhighlightAll();
  const row = document.getElementById(`word-row-${index}`);
  if (!row) return;

  row.classList.add('speaking-now');

  const controls = document.getElementById('stickyControls');
  const tableHeader = document.querySelector('thead');
  if (!controls || !tableHeader) return;

  const totalOffset = controls.offsetHeight + tableHeader.offsetHeight + 10;
  const elementPosition = row.getBoundingClientRect().top + window.pageYOffset;
  const offsetPosition = elementPosition - totalOffset;

  window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
}

export function unhighlightAll() {
  document.querySelectorAll('#vocabBody tr').forEach((row) => {
    row.classList.remove('speaking-now');
  });
}

export function toggleColumn(index) {
  const table = document.getElementById('wordsTable');
  if (!table) return;

  const rows = table.rows;
  for (let i = 1; i < rows.length; i += 1) {
    const cell = rows[i].cells[index];
    if (!cell) continue;
    cell.style.filter = cell.style.filter === 'blur(5px)' ? 'none' : 'blur(5px)';
  }
}
