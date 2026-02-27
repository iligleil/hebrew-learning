(function () {
  // Legacy fallback for environments where ES modules are unavailable.
  if (window.__HEBREW_MAIN_MODULE_LOADED) return;
  window.__HEBREW_LEGACY_APP_LOADED = true;

  const GOOGLE_CSV_URL =
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vTUqglLjSkwRZAwao-7Rx32nHa1f1MLxY_s_SJTL4ByUMk1Mtx3FRYZgbkoxnOzts3m5vOji5tg1s-6/pub?gid=0&single=true&output=csv';

  const EMBEDDED_WORDS = [
    { ru: 'Привет', he: 'שלום', trans: 'шалом' },
    { ru: 'Спасибо', he: 'תודה', trans: 'тода' },
    { ru: 'Дом', he: 'בַּיִת', trans: 'баит' },
  ];

  const state = {
    words: [],
    isSpeaking: false,
    isRandom: false,
    currentIndex: 0,
    currentVolume: 1,
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
      ru_voice: clean(rawWord.ru_voice) || ru,
      he_voice: clean(rawWord.he_voice) || he,
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

  function parseWordsFromCsv(text) {
    const rows = parseCsv(text);
    if (rows.length <= 1) return [];

    return rows
      .slice(1)
      .map((columns) =>
        normalizeWord({
          ru: columns[0],
          ru_voice: columns[1],
          he: columns[2],
          he_voice: columns[3],
          trans: columns[4],
        }),
      )
      .filter(Boolean);
  }

  function getHebrewVoice() {
    const voices = window.speechSynthesis.getVoices();
    return (
      voices.find((voice) => voice.lang === 'he-IL') ||
      voices.find((voice) => typeof voice.lang === 'string' && voice.lang.toLowerCase().startsWith('he')) ||
      null
    );
  }

  function createCell(text, className, preserveEmpty = false) {
    const cell = document.createElement('td');
    cell.style.fontSize = '16px';
    cell.style.border = '1px solid #ccc';
    cell.style.padding = '10px';
    cell.textContent = preserveEmpty ? (text ?? '') : (text || '—');
    if (className) cell.classList.add(className);
    return cell;
  }

  function updateRandomButton() {
    const randomControl = document.getElementById('randomControl');
    if (!randomControl) return;

    randomControl.innerText = state.isRandom
      ? '🎲 Случайный порядок: ВКЛ'
      : '🎲 Случайный порядок: ВЫКЛ';
    randomControl.classList.toggle('active', state.isRandom);
  }

  function highlightRow(index) {
    unhighlightAll();
    const row = document.getElementById(`word-row-${index}`);
    if (!row) return;
    row.classList.add('speaking-now');
  }

  function unhighlightAll() {
    document.querySelectorAll('#vocabBody tr').forEach((row) => {
      row.classList.remove('speaking-now');
    });
  }

  function stopSpeech() {
    state.isSpeaking = false;
    window.speechSynthesis.cancel();

    const audioControl = document.getElementById('audioControl');
    if (audioControl) {
      audioControl.innerText = '▶ Озвучить всё';
      audioControl.classList.remove('active');
    }

    unhighlightAll();
  }

  function speakOne(index, onDone) {
    const word = state.words[index];
    highlightRow(index);
    if (!word) {
      if (typeof onDone === 'function') onDone();
      return;
    }

    const isReverse = document.getElementById('reverseOrder')?.checked;
    const firstText = isReverse ? word.ru_voice : word.he_voice;
    const secondText = isReverse ? word.he_voice : word.ru_voice;
    const firstLang = isReverse ? 'ru-RU' : 'he-IL';
    const secondLang = isReverse ? 'he-IL' : 'ru-RU';

    const firstUtterance = new SpeechSynthesisUtterance(firstText);
    firstUtterance.lang = firstLang;
    firstUtterance.volume = state.currentVolume;
    if (firstLang === 'he-IL') firstUtterance.voice = getHebrewVoice();

    const secondUtterance = new SpeechSynthesisUtterance(secondText);
    secondUtterance.lang = secondLang;
    secondUtterance.volume = state.currentVolume;
    if (secondLang === 'he-IL') secondUtterance.voice = getHebrewVoice();

    firstUtterance.onend = () => window.speechSynthesis.speak(secondUtterance);
    firstUtterance.onerror = () => window.speechSynthesis.speak(secondUtterance);
    secondUtterance.onend = () => {
      if (typeof onDone === 'function') {
        onDone();
      } else {
        setTimeout(unhighlightAll, 500);
      }
    };
    secondUtterance.onerror = () => {
      if (typeof onDone === 'function') {
        onDone();
      } else {
        setTimeout(unhighlightAll, 500);
      }
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(firstUtterance);
  }

  function speakLoop() {
    if (!state.isSpeaking || !state.words.length) {
      stopSpeech();
      return;
    }

    speakOne(state.currentIndex, () => {
      if (!state.isSpeaking) return;

      if (state.isRandom) {
        let nextIndex;
        do {
          nextIndex = Math.floor(Math.random() * state.words.length);
        } while (nextIndex === state.currentIndex && state.words.length > 1);
        state.currentIndex = nextIndex;
      } else {
        state.currentIndex = (state.currentIndex + 1) % state.words.length;
      }

      setTimeout(speakLoop, 500);
    });
  }

  function renderLegacyWords() {
    const body = document.getElementById('vocabBody');
    if (!body) return;

    const fragment = document.createDocumentFragment();

    state.words.forEach((word, index) => {
      const row = document.createElement('tr');
      row.id = `word-row-${index}`;
      row.appendChild(createCell(word.he, 'hebrew-text'));
      row.appendChild(createCell(word.trans));
      row.appendChild(createCell(word.ru));

      const audioCell = createCell('', '', true);
      audioCell.style.textAlign = 'center';
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = '🔊';
      button.style.background = 'none';
      button.style.border = 'none';
      button.style.cursor = 'pointer';
      button.style.fontSize = '20px';
      button.addEventListener('click', () => speakOne(index));
      audioCell.appendChild(button);
      row.appendChild(audioCell);

      fragment.appendChild(row);
    });

    body.replaceChildren(fragment);
  }

  function shuffleWords() {
    for (let i = state.words.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [state.words[i], state.words[j]] = [state.words[j], state.words[i]];
    }
    state.currentIndex = 0;
    renderLegacyWords();
  }

  async function loadLegacyWords() {
    try {
      const csvUrl = `${GOOGLE_CSV_URL}&cacheBuster=${Date.now()}`;
      const response = await fetch(csvUrl);
      if (!response.ok) throw new Error('google sheet unavailable');

      const csv = await response.text();
      const words = parseWordsFromCsv(csv);
      if (words.length) {
        state.words = words;
        return 'Режим совместимости: загружены слова из Google Sheet.';
      }
    } catch (error) {
      // no-op
    }

    try {
      const response = await fetch('./words.sample.json');
      if (!response.ok) throw new Error('local words unavailable');

      const data = await response.json();
      const words = Array.isArray(data) ? data.map(normalizeWord).filter(Boolean) : [];
      if (words.length) {
        state.words = words;
        return 'Режим совместимости: загружен локальный словарь.';
      }
    } catch (error) {
      // no-op
    }

    state.words = EMBEDDED_WORDS.map(normalizeWord).filter(Boolean);
    return 'Режим совместимости: показан встроенный словарь. Для полного функционала запускайте через локальный сервер.';
  }

  function bindControls() {
    const audioControl = document.getElementById('audioControl');
    if (audioControl) {
      audioControl.addEventListener('click', () => {
        if (state.isSpeaking) {
          stopSpeech();
          return;
        }

        if (!state.words.length) return;

        state.isSpeaking = true;
        audioControl.innerText = '■ Остановить';
        audioControl.classList.add('active');
        speakLoop();
      });
    }

    const randomControl = document.getElementById('randomControl');
    if (randomControl) {
      randomControl.addEventListener('click', () => {
        state.isRandom = !state.isRandom;
        updateRandomButton();
      });
    }

    const shuffleBtn = document.getElementById('shuffleBtn');
    if (shuffleBtn) {
      shuffleBtn.addEventListener('click', shuffleWords);
    }

    const volInput = document.getElementById('volumeRange');
    const volLabel = document.getElementById('volumeValue');
    if (volInput && volLabel) {
      state.currentVolume = parseFloat(volInput.value) || 1;
      volLabel.textContent = `${Math.round(state.currentVolume * 100)}%`;
      volInput.addEventListener('input', (event) => {
        state.currentVolume = parseFloat(event.target.value);
        volLabel.textContent = `${Math.round(state.currentVolume * 100)}%`;
      });
    }

    updateRandomButton();
  }

  let isBootstrapped = false;

  async function bootstrapLegacy() {
    if (isBootstrapped) return;
    isBootstrapped = true;

    bindControls();
    await loadLegacyWords();
    renderLegacyWords();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      void bootstrapLegacy();
    }, { once: true });
  } else {
    void bootstrapLegacy();
  }
})();
