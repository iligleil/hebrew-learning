import { APP_CONFIG } from './config.js';

export function openTab(tabId, tabButton, { isSpeaking, stopSpeech }) {
  document.querySelectorAll('.tab-content').forEach((tab) => {
    const isActive = tab.id === tabId;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-hidden', String(!isActive));
  });

  document.querySelectorAll('.tab-button').forEach((btn) => {
    const isActive = btn === tabButton;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', String(isActive));
    btn.setAttribute('tabindex', isActive ? '0' : '-1');
  });

  const panel = document.getElementById(tabId);
  if (panel) panel.focus({ preventScroll: true });

  if (tabId !== 'vocabulary' && isSpeaking() && stopSpeech) {
    stopSpeech();
  }

  setTimeout(updateStickyOffset, APP_CONFIG.ui.stickyOffsetDelayMs);
}

export function updateStickyOffset() {
  const controls = document.getElementById('stickyControls');
  if (!controls) return;

  const rect = controls.getBoundingClientRect();
  const height = Math.ceil(rect.height);
  document.documentElement.style.setProperty('--offset', `${height}px`);
}
