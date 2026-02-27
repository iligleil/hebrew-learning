export function openTab(tabId, tabButton, { isSpeaking, stopSpeech }) {
  document.querySelectorAll('.tab-content').forEach((tab) => tab.classList.remove('active'));
  document.querySelectorAll('.tab-button').forEach((btn) => btn.classList.remove('active'));

  const tab = document.getElementById(tabId);
  if (tab) tab.classList.add('active');
  if (tabButton) tabButton.classList.add('active');

  if (tabId !== 'vocabulary' && isSpeaking() && stopSpeech) {
    stopSpeech();
  }

  setTimeout(updateStickyOffset, 10);
}

export function updateStickyOffset() {
  const controls = document.getElementById('stickyControls');
  if (!controls) return;

  const rect = controls.getBoundingClientRect();
  const height = Math.ceil(rect.height);
  document.documentElement.style.setProperty('--offset', `${height}px`);
}
