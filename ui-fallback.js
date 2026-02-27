(function () {
  const icons = {
    'fem-s': '🤦',
    'masc-s': '🤦‍♂️',
    'fem-p': '🤦🤦',
    'masc-p': '🤦‍♂️🤦‍♂️',
    'self-s': '🤓',
  };

  function renderIcons() {
    Object.entries(icons).forEach(([cls, icon]) => {
      document.querySelectorAll(`.${cls}`).forEach((node) => {
        node.textContent = icon;
      });
    });
  }

  function openTab(tabId, activeButton) {
    document.querySelectorAll('.tab-content').forEach((tab) => {
      const isActive = tab.id === tabId;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-hidden', String(!isActive));
    });

    document.querySelectorAll('.tab-button').forEach((button) => {
      const isActive = button === activeButton;
      button.classList.toggle('active', isActive);
      button.setAttribute('aria-selected', String(isActive));
      button.setAttribute('tabindex', isActive ? '0' : '-1');
    });
  }

  function bindTabs() {
    const buttons = Array.from(document.querySelectorAll('.tab-button'));
    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        const tabId = button.dataset.tab;
        if (tabId) openTab(tabId, button);
      });

      button.addEventListener('keydown', (event) => {
        const index = buttons.indexOf(button);
        let nextIndex = index;

        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') nextIndex = (index + 1) % buttons.length;
        if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') nextIndex = (index - 1 + buttons.length) % buttons.length;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = buttons.length - 1;

        if (nextIndex !== index) {
          event.preventDefault();
          buttons[nextIndex].focus();
          const nextTabId = buttons[nextIndex].dataset.tab;
          if (nextTabId) openTab(nextTabId, buttons[nextIndex]);
        }
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (window.__HEBREW_MAIN_MODULE_LOADED) {
      return;
    }

    renderIcons();
    bindTabs();
  });
})();
