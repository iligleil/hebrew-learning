(function () {
  // Legacy fallback intentionally keeps only bootstrapping logic.
  // Main business logic lives in module-based main.js.
  if (window.__HEBREW_MAIN_MODULE_LOADED) return;

  function showLegacyNotice() {
    const body = document.getElementById('vocabBody');
    if (!body) return;

    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 4;
    cell.style.color = '#b26a00';
    cell.style.textAlign = 'center';
    cell.textContent =
      'Режим совместимости: полный функционал словаря и озвучки доступен в браузерах с поддержкой ES-модулей.';
    row.appendChild(cell);
    body.replaceChildren(row);
  }

  document.addEventListener('DOMContentLoaded', () => {
    showLegacyNotice();
  });
})();
