(function () {
  const icons = {
    'fem-s': '🤦',
    'masc-s': '🤦‍♂️',
    'fem-p': '🤦🤦',
    'masc-p': '🤦‍♂️🤦‍♂️',
    'self-s': '🤓',
  };

  const embeddedFallbackWords = [
    { ru: 'Привет', he: 'שלום', trans: 'шалом' },
    { ru: 'Спасибо', he: 'תודה', trans: 'тода' },
    { ru: 'Дом', he: 'בַּיִת', trans: 'баит' },
  ];

  const fallbackState = {
    words: [],
    isSpeaking: false,
    isRandom: false,
    currentIndex: 0,
    currentLang: 'he',
  };

  function clean(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function normalizeWord(rawWord) {
    const ru = clean(rawWord.ru);
    const he = clean(rawWord.he);
    if (!ru || !he) return null;
    return {
      ru,
      he,
      trans: clean(rawWord.trans),
    };
  }

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

  function getHebrewVoice() {
    const voices = window.speechSynthesis.getVoices();
    return (
      voices.find(
        (voice) =>
          (voice.lang === 'he-IL' || voice.lang.toLowerCase().startsWith('he')) &&
          (voice.name.includes('Hila') || voice.name.includes('Female') || voice.name.includes('Google')),
      ) || voices.find((voice) => voice.lang === 'he-IL' || voice.lang.toLowerCase().startsWith('he'))
    );
  }

  async function loadFallbackWords() {
    if (window.location.protocol === 'file:') {
      return embeddedFallbackWords.map(normalizeWord).filter(Boolean);
    }

    try {
      const response = await fetch('./words.sample.json');
      if (!response.ok) throw new Error('Local words are unavailable');
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Local words format is invalid');

      const normalized = data.map(normalizeWord).filter(Boolean);
      if (normalized.length) return normalized;
    } catch (error) {
      // no-op: fall back to embedded list
    }

    return embeddedFallbackWords.map(normalizeWord).filter(Boolean);
  }

  function renderFallbackWords(words) {
    const body = document.getElementById('vocabBody');
    if (!body || body.querySelector('tr')) return;

    const noticeRow = document.createElement('tr');
    const noticeCell = document.createElement('td');
    noticeCell.colSpan = 4;
    noticeCell.style.color = '#b26a00';
    noticeCell.style.textAlign = 'center';
    noticeCell.textContent = 'Загружен локальный словарь (fallback-режим).';
    noticeRow.appendChild(noticeCell);

    const rows = words.map((word) => {
      const row = document.createElement('tr');

      const heCell = document.createElement('td');
      heCell.textContent = word.he;

      const trCell = document.createElement('td');
      trCell.textContent = word.trans;

      const ruCell = document.createElement('td');
      ruCell.textContent = word.ru;

      const audioCell = document.createElement('td');
      audioCell.textContent = '—';
      audioCell.style.textAlign = 'center';

      row.append(heCell, trCell, ruCell, audioCell);
      return row;
    });

    body.replaceChildren(noticeRow, ...rows);
    fallbackState.words = words;
  }

  function updateRandomButton() {
    const randomControl = document.getElementById('randomControl');
    if (!randomControl) return;

    randomControl.innerText = fallbackState.isRandom
      ? '🎲 Случайный порядок: ВКЛ'
      : '🎲 Случайный порядок: ВЫКЛ';
    randomControl.classList.toggle('active', fallbackState.isRandom);
  }

  function stopFallbackSpeech() {
    fallbackState.isSpeaking = false;
    window.speechSynthesis.cancel();

    const audioControl = document.getElementById('audioControl');
    if (!audioControl) return;
    audioControl.innerText = '▶ Озвучить всё';
    audioControl.classList.remove('active');
  }

  function speakNextFallbackWord() {
    if (!fallbackState.isSpeaking) return;
    if (!fallbackState.words.length) {
      stopFallbackSpeech();
      return;
    }

    const word = fallbackState.words[fallbackState.currentIndex];
    const hebrewText = clean(word.he);
    const russianText = clean(word.ru);
    if (!hebrewText && !russianText) {
      stopFallbackSpeech();
      return;
    }

    const prepareNext = () => {
      if (!fallbackState.isSpeaking) return;

      if (fallbackState.isRandom) {
        fallbackState.currentIndex = Math.floor(Math.random() * fallbackState.words.length);
      } else {
        fallbackState.currentIndex = (fallbackState.currentIndex + 1) % fallbackState.words.length;
      }

      fallbackState.currentLang = 'he';
      setTimeout(speakNextFallbackWord, 500);
    };

    const text = fallbackState.currentLang === 'he' ? hebrewText : russianText;
    if (!text) {
      if (fallbackState.currentLang === 'he') {
        fallbackState.currentLang = 'ru';
        speakNextFallbackWord();
      } else {
        prepareNext();
      }
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    if (fallbackState.currentLang === 'he') {
      utterance.lang = 'he-IL';
      utterance.voice = getHebrewVoice() || null;
    } else {
      utterance.lang = 'ru-RU';
    }

    utterance.onend = () => {
      if (!fallbackState.isSpeaking) return;

      if (fallbackState.currentLang === 'he') {
        fallbackState.currentLang = 'ru';
        speakNextFallbackWord();
      } else {
        prepareNext();
      }
    };
    utterance.onerror = () => {
      if (fallbackState.currentLang === 'he') {
        fallbackState.currentLang = 'ru';
        speakNextFallbackWord();
      } else {
        prepareNext();
      }
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function toggleFallbackSpeech() {
    const audioControl = document.getElementById('audioControl');
    if (!audioControl) return;

    if (fallbackState.isSpeaking) {
      stopFallbackSpeech();
      return;
    }

    if (!fallbackState.words.length) return;

    fallbackState.isSpeaking = true;
    fallbackState.currentLang = 'he';
    audioControl.innerText = '■ Остановить';
    audioControl.classList.add('active');
    speakNextFallbackWord();
  }

  function bindFallbackControls() {
    const audioControl = document.getElementById('audioControl');
    if (audioControl) {
      audioControl.addEventListener('click', toggleFallbackSpeech);
    }

    const randomControl = document.getElementById('randomControl');
    if (randomControl) {
      randomControl.addEventListener('click', () => {
        fallbackState.isRandom = !fallbackState.isRandom;
        updateRandomButton();
      });
    }

    updateRandomButton();
  }

  function scheduleVocabFallback() {
    setTimeout(async () => {
      if (window.__HEBREW_MAIN_MODULE_LOADED || window.__HEBREW_LEGACY_APP_LOADED) return;
      const body = document.getElementById('vocabBody');
      if (!body || body.querySelector('tr')) return;
      const words = await loadFallbackWords();
      renderFallbackWords(words);
    }, 1200);
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (window.__HEBREW_MAIN_MODULE_LOADED || window.__HEBREW_LEGACY_APP_LOADED) {
      return;
    }

    renderIcons();
    bindTabs();
    bindFallbackControls();
    scheduleVocabFallback();
  });
})();
