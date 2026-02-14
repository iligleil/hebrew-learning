let silentSource = null; // Глобальная переменная для управления тишиной
const keepAliveMsg = new SpeechSynthesisUtterance(" ");
keepAliveMsg.volume = 0.01; // Почти ноль, но не полный 0 (некоторые системы игнорируют 0)
keepAliveMsg.rate = 10; // Максимально быстро, чтобы не занимать очередь
let isSpeaking = false;
let isRandom = false;
let currentIndex = 0;
let currentMsgHe;
let currentMsgRu;
const synth = window.speechSynthesis;
const silencePlayer = document.getElementById('silenceLoop');
let currentVolume = 1;

let voices = [];
let myWords = [];

// Патч для борьбы с "засыпанием" синтезатора
setInterval(() => {
   if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
   }
}, 10000); // Раз в 10 секунд "встряхиваем" очередь

document.addEventListener('DOMContentLoaded', () => {
   const volInput = document.getElementById('volumeRange');
   const volLabel = document.getElementById('volumeValue');
   
   if (volInput && volLabel) {
      volInput.addEventListener('input', (e) => {
         currentVolume = parseFloat(e.target.value);
         volLabel.textContent = Math.round(currentVolume * 100) + '%';
      });
   }
});

const icons = {
   'fem-s': '🤦', // Фейспалм женщина
   'masc-s': '🤦‍♂️', // Фейспалм мужчина
   'fem-p': '🤦🤦', // Фейспалм женщины (две штуки)
   'masc-p': '🤦‍♂️🤦‍♂️', // Фейспалм мужчины (две штуки)
   'self-s': '🤓'
};

function removeNiqqud(text) {
   return text.replace(/[\u0591-\u05C7]/g, "");
}

function resumeAudioContext() {
   const AudioContext = window.AudioContext || window.webkitAudioContext;
   const ctx = new AudioContext();

   if (ctx.state === 'suspended') {
      ctx.resume();
   }

   // Если тишина уже запущена, не создаем еще одну
   if (silentSource) return;

   // Создаем пустой буфер (1 секунда тишины)
   const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
   silentSource = ctx.createBufferSource();
   silentSource.buffer = buffer;
   silentSource.loop = true; // Зацикливаем

   // Подключаем к выходу, но не воспроизводим громкость (хотя там и так тишина)
   silentSource.connect(ctx.destination);
   silentSource.start();

   console.log("Бесшумный генератор запущен (CPU-friendly)");
}

function openTab(tabId) {
   document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
   document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
   document.getElementById(tabId).classList.add('active');
   event.currentTarget.classList.add('active');
   if (tabId !== 'vocabulary' && isSpeaking) toggleSpeech(); // Стоп при уходе со вкладки
   setTimeout(updateStickyOffset, 10);
}

Object.keys(icons).forEach(key => {
   document.querySelectorAll('.' + key).forEach(el => {
      el.innerHTML = icons[key];
   });
});

async function loadWordsFromSheet() {
   const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTUqglLjSkwRZAwao-7Rx32nHa1f1MLxY_s_SJTL4ByUMk1Mtx3FRYZgbkoxnOzts3m5vOji5tg1s-6/pub?gid=0&single=true&output=csv" + "&cacheBuster=" + new Date().getTime();;

   // Добавляем прокси только для локальной разработки, если fetch не проходит
   // Но для начала попробуем обычный запрос
   try {
      const response = await fetch(csvUrl);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.text();

      // Парсим CSV (учитываем переносы строк и запятые)
      const rows = data.split(/\r?\n/).filter(row => row.trim() !== "");
      const contentRows = rows.slice(1); // Убираем заголовки

      myWords = contentRows.map(row => {
         // Разделяем по запятым, но игнорируем те, что внутри кавычек
         const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

         const clean = (val) => val ? val.replace(/^"|"$/g, '').trim() : "";

         return {
            ru: clean(cols[0]),
            ru_voice: clean(cols[1]) || clean(cols[0]),
            he: clean(cols[2]),
            he_voice: clean(removeNiqqud(cols[2].trim())), //берем значения из he и чистим
            trans: clean(cols[4])
         };
      }).filter(word => word.ru);

      console.log("Загружено слов:", myWords.length);

      // ВЫЗЫВАЕМ ТВОЮ ФУНКЦИЮ ОТРИСОВКИ:
      initVocab();

      // И обновляем отступы кнопок, раз таблица изменилась
      setTimeout(updateStickyOffset, 100);

   } catch (error) {
      console.error("Ошибка:", error);
      const body = document.getElementById('vocabBody');
      if (body) {
         body.innerHTML = `<tr><td colspan="4" style="color:red;text-align:center;">Ошибка загрузки: ${error.message}</td></tr>`;
      }
   }
}

function shuffleTable() {
   // 1. Алгоритм перемешивания массива
   for (let i = myWords.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [myWords[i], myWords[j]] = [myWords[j], myWords[i]];
   }

   // 2. Узнаем, какие колонки сейчас заблюрены, ГЛЯДЯ НА ЗАГОЛОВКИ
   // (Мы будем ориентироваться на прозрачность или какой-то признак у th, 
   // но проще всего проверить стиль первой попавшейся ячейки в старой таблице)
   const table = document.getElementById('wordsTable');
   const blurStates = [0, 1, 2].map(idx => {
      const firstRow = table.querySelector('tbody tr');
      if (!firstRow) return false;
      return firstRow.cells[idx].style.filter === 'blur(5px)';
   });

   // 3. Очищаем и перерисовываем
   const container = document.getElementById('vocabBody');
   container.innerHTML = '';

   myWords.forEach((word, index) => {
      const row = document.createElement('tr');
      row.id = `word-row-${index}`;

      // Генерируем ячейки, сразу применяя блюр, если он был включен
      row.innerHTML = `
			<td style="border: 1px solid #ccc; padding: 10px; ${blurStates[0] ? 'filter: blur(5px);' : ''}">${word.he}</td>
			<td style="border: 1px solid #ccc; padding: 10px; ${blurStates[1] ? 'filter: blur(5px);' : ''}">${word.trans}</td>
			<td style="border: 1px solid #ccc; padding: 10px; ${blurStates[2] ? 'filter: blur(5px);' : ''}">${word.ru}</td>
			<td style="border: 1px solid #ccc; padding: 10px; text-align: center;">
				<button onclick="resumeAudioContext(); speakOne(${index})" style="cursor: pointer; background: none; border: none; font-size: 20px;">🔊</button>
			</td>
		`;
      container.appendChild(row);
   });

   currentIndex = 0;
   if (isSpeaking) {
      synth.cancel();
   }
}

function getHebrewVoice() {
   const allVoices = synth.getVoices();
   // Ищем голос, в названии которого есть 'Hebrew' или 'Israel' 
   // и который звучит более "женственно" (в Windows это обычно 'Hila' или 'Asaf' - мужской)
   // Большинство женских голосов содержат в названии 'Female', 'Hila' или 'Her'
   return allVoices.find(v => (v.lang === 'he-IL' || v.lang.includes('he_')) &&
         (v.name.includes('Hila') || v.name.includes('Female') || v.name.includes('Google'))) ||
      allVoices.find(v => v.lang === 'he-IL'); // Если идеала нет, берем любой ивритский
}

window.speechSynthesis.onvoiceschanged = () => {
   voices = synth.getVoices();
};

function initVocab() {
   const body = document.getElementById('vocabBody');
   body.innerHTML = ''; // Очистка
   myWords.forEach((word, index) => {
      const row = `<tr id="word-row-${index}">
			<td class="hebrew-text">${word.he}</td>
			<td style="font-size: 16px;">${word.trans}</td>
			<td style="font-size: 16px;">${word.ru}</td>
			<td><button onclick="speakOne(${index})" style="cursor: pointer; background: none; border: none; font-size: 20px;">🔊</button></td>
		</tr>`;
      body.innerHTML += row;
   });
}

function toggleSpeech() {
   const btn = document.getElementById('audioControl');
   if (!isSpeaking) {
      synth.cancel();
      isSpeaking = true;
      btn.innerText = "■ Остановить";
	  btn.classList.add('active');
      // ВКЛЮЧАЕМ фоновую тишину через аудио-плеер
      silencePlayer.volume = 0.01; // Почти не слышно, но канал открыт
      silencePlayer.play().catch(e => console.log("Нужно взаимодействие со страницей"));

      speakLoop();
   } else {
      isSpeaking = false;
      btn.innerText = "▶ Озвучить всё";
	  btn.classList.remove('active');

      // ВЫКЛЮЧАЕМ фоновую тишину
      silencePlayer.pause();
      silencePlayer.currentTime = 0;

      synth.cancel();
      unhighlightAll();
   }
}

function speakLoop() {
   if (!isSpeaking) return;

   // 1. Озвучиваем ТЕКУЩЕЕ слово (currentIndex)
   highlightRow(currentIndex);
   const word = myWords[currentIndex];
   const isReverse = document.getElementById('reverseOrder').checked;

   const hebrewSpeechText = word.he_voice || word.he;
   currentMsgHe = new SpeechSynthesisUtterance(hebrewSpeechText);
   currentMsgHe.lang = 'he-IL';
   currentMsgHe.voice = getHebrewVoice();
   currentMsgHe.pitch = 1.6;
   currentMsgHe.rate = 0.85;
   currentMsgHe.volume = currentVolume;

   const speechText = word.ru_voice || word.ru;
   currentMsgRu = new SpeechSynthesisUtterance(speechText);
   currentMsgRu.lang = 'ru-RU';
   currentMsgRu.volume = currentVolume;

   // 2. Функция подготовки СЛЕДУЮЩЕГО шага
   const prepareNext = () => {
      if (!isSpeaking) return;

      if (isRandom) {
         // Выбираем случайный индекс для следующего раза
         let nextIndex;
         do {
            nextIndex = Math.floor(Math.random() * myWords.length);
         } while (nextIndex === currentIndex && myWords.length > 1);
         currentIndex = nextIndex;
      } else {
         // Идем по порядку
         currentIndex++;
         if (currentIndex >= myWords.length) currentIndex = 0;
      }

      setTimeout(speakLoop, 1000);
   };

   // 3. Запуск воспроизведения
   if (isReverse) {
      currentMsgRu.onend = () => {
         if (isSpeaking) synth.speak(currentMsgHe);
      };
      currentMsgRu.onerror = () => {
         if (isSpeaking) synth.speak(currentMsgHe);
      };

      currentMsgHe.onend = prepareNext;
      currentMsgHe.onerror = prepareNext;

      synth.speak(currentMsgRu);
   } else {
      currentMsgHe.onend = () => {
         if (isSpeaking) synth.speak(currentMsgRu);
      };
      currentMsgHe.onerror = () => {
         if (isSpeaking) synth.speak(currentMsgRu);
      };

      currentMsgRu.onend = prepareNext;
      currentMsgRu.onerror = prepareNext;

      synth.speak(currentMsgHe);
   }
}

function toggleRandom() {
   isRandom = !isRandom;
   const btn = document.getElementById('randomControl');
	if (isRandom) {
			btn.innerText = "🎲 Случайный порядок: ВКЛ";
			btn.classList.add('active'); // Кнопка станет синей
		} else {
			btn.innerText = "🎲 Случайный порядок: ВЫКЛ";
			btn.classList.remove('active'); // Кнопка вернется к белому виду
		}
}

function speakOne(index) {
   if (synth.speaking) synth.cancel();

   const silencePlayer = document.getElementById('silenceLoop');
   if (silencePlayer.paused) {
      silencePlayer.volume = 0.01;
      silencePlayer.play().catch(e => {});
   }

   highlightRow(index);
   const word = myWords[index];
   const isReverse = document.getElementById('reverseOrder').checked;

   const hebrewSpeechText = word.he_voice || word.he;
   currentMsgHe = new SpeechSynthesisUtterance(hebrewSpeechText);
   currentMsgHe.lang = 'he-IL';
   currentMsgHe.voice = getHebrewVoice();
   currentMsgHe.pitch = 1.6;
   currentMsgHe.rate = 0.85;
   currentMsgHe.volume = currentVolume;
	
   const speechText = word.ru_voice || word.ru;
   currentMsgRu = new SpeechSynthesisUtterance(speechText);
   currentMsgRu.lang = 'ru-RU';
   currentMsgRu.volume = currentVolume;

   // Функция завершения (очистка после обоих голосов)
   const finalizeOne = () => {
      setTimeout(unhighlightAll, 500);
      if (!isSpeaking) {
         setTimeout(() => {
            if (!synth.speaking) {
               silencePlayer.pause();
               silencePlayer.currentTime = 0;
            }
         }, 1000);
      }
   };

   if (isReverse) {
      // РЕЖИМ: Русский -> Иврит
      currentMsgRu.onend = () => {
         synth.speak(currentMsgHe);
      };
      currentMsgRu.onerror = () => {
         synth.speak(currentMsgHe);
      };

      currentMsgHe.onend = finalizeOne;
      currentMsgHe.onerror = finalizeOne;

      synth.speak(currentMsgRu);
   } else {
      // РЕЖИМ: Иврит -> Русский
      currentMsgHe.onend = () => {
         synth.speak(currentMsgRu);
      };
      currentMsgHe.onerror = () => {
         synth.speak(currentMsgRu);
      };

      currentMsgRu.onend = finalizeOne;
      currentMsgRu.onerror = finalizeOne;

      synth.speak(currentMsgHe);
   }
}

function highlightRow(index) {
   unhighlightAll();
   const row = document.getElementById(`word-row-${index}`);
   if (row) {
      row.classList.add('speaking-now');

      const controls = document.getElementById('stickyControls');
      const tableHeader = document.querySelector('thead');
      // Считаем общий отступ: кнопки + заголовок таблицы + 10px запаса
      const totalOffset = controls.offsetHeight + tableHeader.offsetHeight + 10;

      const elementPosition = row.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - totalOffset;

      window.scrollTo({
         top: offsetPosition,
         behavior: "smooth"
      });
   }
}

function unhighlightAll() {
   document.querySelectorAll('#vocabBody tr').forEach(row => {
      row.classList.remove('speaking-now');
   });
}

function toggleColumn(index) {
   const table = document.getElementById('wordsTable');
   const rows = table.rows;

   for (let i = 1; i < rows.length; i++) {
      const cell = rows[i].cells[index];
      if (cell) {
         // Проверяем текущее состояние и переключаем
         if (cell.style.filter === 'blur(5px)') {
            cell.style.filter = 'none';
         } else {
            cell.style.filter = 'blur(5px)';
         }
      }
   }
}

function updateStickyOffset() {
   const controls = document.getElementById('stickyControls');
   if (!controls) {
      console.log("Критическая ошибка: Блок stickyControls не найден!");
      return;
   }

   const rect = controls.getBoundingClientRect();
   const height = Math.ceil(rect.height);

   document.documentElement.style.setProperty('--offset', height + 'px');

}

loadWordsFromSheet();
window.addEventListener('DOMContentLoaded', updateStickyOffset);
window.addEventListener('load', updateStickyOffset);
window.addEventListener('resize', updateStickyOffset);
setTimeout(updateStickyOffset, 500);