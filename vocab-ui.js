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

export function initVocab(words) {
  const body = document.getElementById('vocabBody');
  if (!body) return;

  body.innerHTML = '';
  words.forEach((word, index) => {
    const row = `<tr id="word-row-${index}">
      <td class="hebrew-text">${word.he}</td>
      <td style="font-size: 16px;">${word.trans}</td>
      <td style="font-size: 16px;">${word.ru}</td>
      <td><button class="speak-one-btn" data-index="${index}" style="cursor: pointer; background: none; border: none; font-size: 20px;" aria-label="Озвучить слово">🔊</button></td>
    </tr>`;
    body.innerHTML += row;
  });

  setTimeout(updateStickyOffset, 100);
}

export function shuffleTable(words, isSpeaking, cancelSpeech) {
  for (let i = words.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [words[i], words[j]] = [words[j], words[i]];
  }

  const table = document.getElementById('wordsTable');
  const blurStates = [0, 1, 2].map((idx) => {
    const firstRow = table?.querySelector('tbody tr');
    if (!firstRow) return false;
    return firstRow.cells[idx].style.filter === 'blur(5px)';
  });

  const container = document.getElementById('vocabBody');
  if (!container) return;

  container.innerHTML = '';
  words.forEach((word, index) => {
    const row = document.createElement('tr');
    row.id = `word-row-${index}`;
    row.innerHTML = `
      <td style="border: 1px solid #ccc; padding: 10px; ${blurStates[0] ? 'filter: blur(5px);' : ''}">${word.he}</td>
      <td style="border: 1px solid #ccc; padding: 10px; ${blurStates[1] ? 'filter: blur(5px);' : ''}">${word.trans}</td>
      <td style="border: 1px solid #ccc; padding: 10px; ${blurStates[2] ? 'filter: blur(5px);' : ''}">${word.ru}</td>
      <td style="border: 1px solid #ccc; padding: 10px; text-align: center;">
        <button class="speak-one-btn" data-index="${index}" style="cursor: pointer; background: none; border: none; font-size: 20px;" aria-label="Озвучить слово">🔊</button>
      </td>
    `;
    container.appendChild(row);
  });

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
  for (let i = 1; i < rows.length; i++) {
    const cell = rows[i].cells[index];
    if (!cell) continue;
    cell.style.filter = cell.style.filter === 'blur(5px)' ? 'none' : 'blur(5px)';
  }
}
