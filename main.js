import { openTab, updateStickyOffset } from './tabs.js';
import { loadWords } from './vocab-data.js';
import { createSpeechController, startSynthKeepAlive } from './speech.js';
import {
  initVocab,
  shuffleTable,
  toggleColumn,
  highlightRow,
  unhighlightAll,
  renderIcons,
  renderWeakRootPatterns,
} from './vocab-ui.js';
import { APP_CONFIG } from './config.js';

window.__HEBREW_MAIN_MODULE_LOADED = true;

const state = {
  silentSource: null,
  isSpeaking: false,
  isRandom: false,
  currentIndex: 0,
  currentMsgHe: null,
  currentMsgRu: null,
  synth: window.speechSynthesis,
  currentVolume: 1,
  words: [],
};

startSynthKeepAlive();

const speech = createSpeechController({
  state,
  getWords: () => state.words,
  highlightRow,
  unhighlightAll,
});


function handleTabKeyboardNavigation(event) {
  const buttons = [...document.querySelectorAll('.tab-button')];
  const currentIndex = buttons.indexOf(event.currentTarget);
  if (currentIndex < 0) return;

  let nextIndex = currentIndex;
  if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
    nextIndex = (currentIndex + 1) % buttons.length;
  } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
    nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
  } else if (event.key !== 'Home' && event.key !== 'End') {
    return;
  }

  if (event.key === 'Home') nextIndex = 0;
  if (event.key === 'End') nextIndex = buttons.length - 1;

  event.preventDefault();
  buttons[nextIndex].focus();
  openTab(buttons[nextIndex].dataset.tab, buttons[nextIndex], {
    isSpeaking: () => state.isSpeaking,
    stopSpeech: speech.stopSpeech,
  });
}

function bindUIHandlers() {
  document.querySelectorAll('.tab-button').forEach((button) => {
    button.addEventListener('click', () => {
      const tabId = button.dataset.tab;
      if (tabId) {
        openTab(tabId, button, { isSpeaking: () => state.isSpeaking, stopSpeech: speech.stopSpeech });
      }
    });
    button.addEventListener('keydown', handleTabKeyboardNavigation);
  });

  const audioControl = document.getElementById('audioControl');
  if (audioControl) {
    audioControl.addEventListener('click', () => {
      speech.resumeAudioContext();
      speech.toggleSpeech();
    });
  }

  const randomControl = document.getElementById('randomControl');
  if (randomControl) randomControl.addEventListener('click', speech.toggleRandom);

  const shuffleBtn = document.getElementById('shuffleBtn');
  if (shuffleBtn) {
    shuffleBtn.addEventListener('click', () => {
      shuffleTable(state.words, () => state.isSpeaking, () => state.synth.cancel());
      state.currentIndex = 0;
    });
  }

  document.querySelectorAll('[data-column-toggle]').forEach((header) => {
    header.addEventListener('click', () => {
      const idx = Number(header.dataset.columnToggle);
      if (Number.isInteger(idx)) toggleColumn(idx);
    });
  });

  const vocabBody = document.getElementById('vocabBody');
  if (vocabBody) {
    vocabBody.addEventListener('click', (event) => {
      const button = event.target.closest('.speak-one-btn');
      if (!button) return;
      const index = Number(button.dataset.index);
      if (!Number.isInteger(index)) return;

      speech.resumeAudioContext();
      speech.speakOne(index);
    });
  }

  const volInput = document.getElementById('volumeRange');
  const volLabel = document.getElementById('volumeValue');
  if (volInput && volLabel) {
    volInput.addEventListener('input', (event) => {
      state.currentVolume = parseFloat(event.target.value);
      volLabel.textContent = `${Math.round(state.currentVolume * 100)}%`;
    });
  }
}

async function bootstrap() {
  renderIcons();
  renderWeakRootPatterns();
  bindUIHandlers();

  try {
    const result = await loadWords();
    state.words = result.words;
    initVocab(state.words);

    if (result.source === 'local-fallback') {
      const body = document.getElementById('vocabBody');
      if (body) {
        const warningRow = document.createElement('tr');
        warningRow.innerHTML = '<td colspan="4" style="color:#b26a00;text-align:center;">Google Sheet недоступен, показан локальный словарь.</td>';
        body.prepend(warningRow);
      }
    }
  } catch (error) {
    const body = document.getElementById('vocabBody');
    if (body) {
      body.innerHTML = `<tr><td colspan="4" style="color:red;text-align:center;">Ошибка загрузки: ${error.message}</td></tr>`;
    }
  }

  updateStickyOffset();
}

let isBootstrapped = false;

function bootstrapOnce() {
  if (isBootstrapped) return;
  isBootstrapped = true;
  void bootstrap();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapOnce, { once: true });
} else {
  bootstrapOnce();
}

window.addEventListener('DOMContentLoaded', updateStickyOffset);
window.addEventListener('load', updateStickyOffset);
window.addEventListener('resize', updateStickyOffset);
setTimeout(updateStickyOffset, APP_CONFIG.ui.stickyOffsetBootDelayMs);
