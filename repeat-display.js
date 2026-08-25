(() => {
  const panel = document.querySelector("#settings-panel");
  const mode = document.querySelector("#mode-label");
  const english = document.querySelector("#english-text");
  const playButton = document.querySelector("#play-button");
  const setting = document.createElement("label");
  setting.id = "english-display-setting";
  setting.innerHTML = '英文を自動表示<select id="english-display-repeat"><option value="0">表示しない</option><option value="1">1回目から</option><option value="2" selected>2回目から</option><option value="3">3回目から</option><option value="4">4回目から</option><option value="5">5回目から</option></select>';
  panel.insertBefore(setting, panel.querySelector("p"));
  const select = document.querySelector("#english-display-repeat");
  select.value = localStorage.getItem("chunk-response-english-display") || "2";
  select.addEventListener("change", () => localStorage.setItem("chunk-response-english-display", select.value));
  let repeatNumber = 0;
  const isListening = () => mode.textContent.startsWith("LISTEN");
  const sync = () => { setting.hidden = !isListening(); };
  new MutationObserver(sync).observe(mode, { childList: true, characterData: true, subtree: true });
  sync();
  playButton.addEventListener("click", () => {
    if (!isListening()) return;
    repeatNumber = 0;
    english.hidden = Number(select.value) !== 1;
  });
  const NativeAudio = window.Audio;
  function TrackableAudio(...args) {
    const audio = new NativeAudio(...args);
    audio.addEventListener("play", () => {
      if (!isListening()) return;
      repeatNumber += 1;
      if (repeatNumber >= Number(select.value) && Number(select.value) > 0) english.hidden = false;
    });
    return audio;
  }
  TrackableAudio.prototype = NativeAudio.prototype;
  window.Audio = TrackableAudio;
})();
