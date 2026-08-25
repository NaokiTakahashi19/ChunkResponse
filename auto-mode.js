(() => {
  const panel = document.querySelector("#settings-panel");
  const mode = document.querySelector("#mode-label");
  const repeat = document.querySelector("#repeat-count");
  const playButton = document.querySelector("#play-button");
  const nextButton = document.querySelector("#next-button");
  const cannotButton = document.querySelector("#cannot-button");
  const settings = document.createElement("div");
  settings.className = "auto-settings";
  settings.innerHTML = '<label>進行モード<select id="progress-mode"><option value="auto">自動モード</option><option value="pause">ポーズモード</option></select></label><label>自動移動までのポーズ<select id="auto-pause"><option value="2">2秒</option><option value="3" selected>3秒</option><option value="5">5秒</option><option value="8">8秒</option></select></label>';
  panel.insertBefore(settings, panel.querySelector("p"));
  const progressMode = document.querySelector("#progress-mode");
  const autoPause = document.querySelector("#auto-pause");
  progressMode.value = localStorage.getItem("chunk-response-progress-mode") || "auto";
  autoPause.value = localStorage.getItem("chunk-response-auto-pause") || "3";
  progressMode.addEventListener("change", () => localStorage.setItem("chunk-response-progress-mode", progressMode.value));
  autoPause.addEventListener("change", () => localStorage.setItem("chunk-response-auto-pause", autoPause.value));
  let timer = null;
  let audioCount = 0;
  const isAuto = () => progressMode.value === "auto";
  const label = () => mode.textContent;
  const clear = () => { if (timer) clearTimeout(timer); timer = null; };
  const schedule = (action) => { clear(); if (!isAuto()) return; timer = setTimeout(action, Number(autoPause.value) * 1000); };
  const NativeAudio = window.Audio;
  function ContinuousAudio(...args) {
    const audio = new NativeAudio(...args);
    audio.addEventListener("ended", () => {
      if (label().startsWith("LISTEN")) {
        audioCount += 1;
        if (audioCount >= Number(repeat.value)) schedule(() => nextButton.click());
      } else if (label().startsWith("RECALL") || label().startsWith("APPLY")) {
        schedule(() => cannotButton.click());
      }
    });
    return audio;
  }
  ContinuousAudio.prototype = NativeAudio.prototype;
  window.Audio = ContinuousAudio;
  playButton.addEventListener("click", () => { clear(); audioCount = 0; });
  cannotButton.addEventListener("click", clear);
  document.querySelector("#can-button").addEventListener("click", clear);
  new MutationObserver(clear).observe(document.querySelector("#learning-card"), { childList: true, characterData: true, subtree: true });
})();
