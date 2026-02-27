import { APP_CONFIG } from './config.js';

export function startSynthKeepAlive() {
  setInterval(() => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }
  }, APP_CONFIG.speech.keepAliveIntervalMs);
}

export function createSpeechController({ state, getWords, highlightRow, unhighlightAll }) {
  function getHebrewVoice() {
    const allVoices = state.synth.getVoices();
    return (
      allVoices.find(
        (v) =>
          (v.lang === 'he-IL' || v.lang.includes('he_')) &&
          (v.name.includes('Hila') || v.name.includes('Female') || v.name.includes('Google')),
      ) || allVoices.find((v) => v.lang === 'he-IL')
    );
  }

  function resumeAudioContext() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();

    if (ctx.state === 'suspended') ctx.resume();
    if (state.silentSource) return;

    const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    state.silentSource = ctx.createBufferSource();
    state.silentSource.buffer = buffer;
    state.silentSource.loop = true;
    state.silentSource.connect(ctx.destination);
    state.silentSource.start();
  }

  function stopSpeech() {
    state.isSpeaking = false;
    const btn = document.getElementById('audioControl');
    if (btn) {
      btn.innerText = '▶ Озвучить всё';
      btn.classList.remove('active');
    }

    const silencePlayer = document.getElementById('silenceLoop');
    if (silencePlayer) {
      silencePlayer.pause();
      silencePlayer.currentTime = 0;
    }

    state.synth.cancel();
    unhighlightAll();
  }

  function speakLoop() {
    if (!state.isSpeaking) return;
    const words = getWords();
    if (!words.length) return;

    highlightRow(state.currentIndex);
    const word = words[state.currentIndex];
    const isReverse = document.getElementById('reverseOrder')?.checked;

    const hebrewSpeechText = word.he_voice || word.he;
    state.currentMsgHe = new SpeechSynthesisUtterance(hebrewSpeechText);
    state.currentMsgHe.lang = 'he-IL';
    state.currentMsgHe.voice = getHebrewVoice();
    state.currentMsgHe.pitch = APP_CONFIG.speech.hebrewPitch;
    state.currentMsgHe.rate = APP_CONFIG.speech.hebrewRate;
    state.currentMsgHe.volume = state.currentVolume;

    const speechText = word.ru_voice || word.ru;
    state.currentMsgRu = new SpeechSynthesisUtterance(speechText);
    state.currentMsgRu.lang = 'ru-RU';
    state.currentMsgRu.volume = state.currentVolume;

    const prepareNext = () => {
      if (!state.isSpeaking) return;

      if (state.isRandom) {
        let nextIndex;
        do {
          nextIndex = Math.floor(Math.random() * words.length);
        } while (nextIndex === state.currentIndex && words.length > 1);
        state.currentIndex = nextIndex;
      } else {
        state.currentIndex += 1;
        if (state.currentIndex >= words.length) state.currentIndex = 0;
      }

      setTimeout(speakLoop, APP_CONFIG.speech.loopDelayMs);
    };

    if (isReverse) {
      state.currentMsgRu.onend = () => state.isSpeaking && state.synth.speak(state.currentMsgHe);
      state.currentMsgRu.onerror = () => state.isSpeaking && state.synth.speak(state.currentMsgHe);
      state.currentMsgHe.onend = prepareNext;
      state.currentMsgHe.onerror = prepareNext;
      state.synth.speak(state.currentMsgRu);
    } else {
      state.currentMsgHe.onend = () => state.isSpeaking && state.synth.speak(state.currentMsgRu);
      state.currentMsgHe.onerror = () => state.isSpeaking && state.synth.speak(state.currentMsgRu);
      state.currentMsgRu.onend = prepareNext;
      state.currentMsgRu.onerror = prepareNext;
      state.synth.speak(state.currentMsgHe);
    }
  }

  function toggleSpeech() {
    const btn = document.getElementById('audioControl');
    const silencePlayer = document.getElementById('silenceLoop');

    if (!state.isSpeaking) {
      state.synth.cancel();
      state.isSpeaking = true;
      if (btn) {
        btn.innerText = '■ Остановить';
        btn.classList.add('active');
      }

      if (silencePlayer) {
        silencePlayer.volume = APP_CONFIG.speech.silenceLoopVolume;
        silencePlayer.play().catch(() => {});
      }

      speakLoop();
    } else {
      stopSpeech();
    }
  }

  function toggleRandom() {
    state.isRandom = !state.isRandom;
    const btn = document.getElementById('randomControl');
    if (!btn) return;

    if (state.isRandom) {
      btn.innerText = '🎲 Случайный порядок: ВКЛ';
      btn.classList.add('active');
    } else {
      btn.innerText = '🎲 Случайный порядок: ВЫКЛ';
      btn.classList.remove('active');
    }
  }

  function speakOne(index) {
    if (state.synth.speaking) state.synth.cancel();

    const silencePlayer = document.getElementById('silenceLoop');
    if (silencePlayer?.paused) {
      silencePlayer.volume = APP_CONFIG.speech.silenceLoopVolume;
      silencePlayer.play().catch(() => {});
    }

    const words = getWords();
    const word = words[index];
    if (!word) return;

    highlightRow(index);
    const isReverse = document.getElementById('reverseOrder')?.checked;

    const hebrewSpeechText = word.he_voice || word.he;
    state.currentMsgHe = new SpeechSynthesisUtterance(hebrewSpeechText);
    state.currentMsgHe.lang = 'he-IL';
    state.currentMsgHe.voice = getHebrewVoice();
    state.currentMsgHe.pitch = APP_CONFIG.speech.hebrewPitch;
    state.currentMsgHe.rate = APP_CONFIG.speech.hebrewRate;
    state.currentMsgHe.volume = state.currentVolume;

    const speechText = word.ru_voice || word.ru;
    state.currentMsgRu = new SpeechSynthesisUtterance(speechText);
    state.currentMsgRu.lang = 'ru-RU';
    state.currentMsgRu.volume = state.currentVolume;

    const finalizeOne = () => {
      setTimeout(unhighlightAll, APP_CONFIG.ui.singleWordUnhighlightDelayMs);
      if (!state.isSpeaking) {
        setTimeout(() => {
          if (!state.synth.speaking && silencePlayer) {
            silencePlayer.pause();
            silencePlayer.currentTime = 0;
          }
        }, APP_CONFIG.ui.silenceStopDelayMs);
      }
    };

    if (isReverse) {
      state.currentMsgRu.onend = () => state.synth.speak(state.currentMsgHe);
      state.currentMsgRu.onerror = () => state.synth.speak(state.currentMsgHe);
      state.currentMsgHe.onend = finalizeOne;
      state.currentMsgHe.onerror = finalizeOne;
      state.synth.speak(state.currentMsgRu);
    } else {
      state.currentMsgHe.onend = () => state.synth.speak(state.currentMsgRu);
      state.currentMsgHe.onerror = () => state.synth.speak(state.currentMsgRu);
      state.currentMsgRu.onend = finalizeOne;
      state.currentMsgRu.onerror = finalizeOne;
      state.synth.speak(state.currentMsgHe);
    }
  }

  return { resumeAudioContext, toggleSpeech, toggleRandom, speakOne, stopSpeech };
}
