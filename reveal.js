(() => {
  const mode = document.querySelector("#mode-label");
  const japanese = document.querySelector("#japanese-text");
  const english = document.querySelector("#english-text");
  const actions = document.querySelector("#reveal-actions");
  const showJapanese = document.querySelector("#show-japanese");
  const showEnglish = document.querySelector("#show-english");
  let shownJapanese = false;
  let shownEnglish = false;
  const listening = () => mode.textContent.startsWith("LISTEN");
  const sync = () => {
    const isListening = listening();
    actions.hidden = !isListening;
    japanese.hidden = isListening && !shownJapanese;
    english.hidden = isListening && !shownEnglish;
    showJapanese.textContent = shownJapanese ? "日本語訳を隠す" : "日本語訳を確認";
    showEnglish.textContent = shownEnglish ? "英文を隠す" : "英文を確認";
  };
  showJapanese.addEventListener("click", () => { shownJapanese = !shownJapanese; sync(); });
  showEnglish.addEventListener("click", () => { shownEnglish = !shownEnglish; sync(); });
  new MutationObserver(() => { shownJapanese = false; shownEnglish = false; sync(); }).observe(document.querySelector("#learning-card"), { childList: true, characterData: true, subtree: true });
  sync();
})();
