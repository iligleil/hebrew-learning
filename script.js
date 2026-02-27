(function () {
  // Legacy fallback intentionally keeps only basic UI for browsers/environments
  // where ES modules are unavailable (e.g. file:// in some setups).
  if (window.__HEBREW_MAIN_MODULE_LOADED) return;

  const LEGACY_WORDS = [
    { ru: 'Привет', he: 'שלום', trans: 'шалом' },
    { ru: 'Спасибо', he: 'תודה', trans: 'тода' },
    { ru: 'Дом', he: 'בַּיִת', trans: 'баит' },
  ];

  function createCell(text) {
    const cell = document.createElement('td');
    cell.style.fontSize = '16px';
    cell.style.border = '1px solid #ccc';
    cell.style.padding = '10px';
    cell.textContent = text;
    return cell;
  }

  function renderLegacyWords() {
    const body = document.getElementById('vocabBody');
    if (!body) return;

    const fragment = document.createDocumentFragment();

    const noticeRow = document.createElement('tr');
    const noticeCell = document.createElement('td');
    noticeCell.colSpan = 4;
    noticeCell.style.color = '#b26a00';
    noticeCell.style.textAlign = 'center';
    noticeCell.textContent =
      'Режим совместимости: показан встроенный словарь. Для полного функционала запускайте через локальный сервер.';
    noticeRow.appendChild(noticeCell);
    fragment.appendChild(noticeRow);

    LEGACY_WORDS.forEach((word) => {
      const row = document.createElement('tr');
      row.appendChild(createCell(word.he));
      row.appendChild(createCell(word.trans));
      row.appendChild(createCell(word.ru));
      row.appendChild(createCell('🔊'));
      fragment.appendChild(row);
    });

    body.replaceChildren(fragment);
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderLegacyWords();
  });
})();
