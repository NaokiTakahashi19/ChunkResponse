(() => {
  const card = document.querySelector("#learning-card");
  const mode = document.querySelector("#mode-label");
  const controls = document.createElement("div");
  controls.className = "audio-controls";
  controls.hidden = true;
  controls.innerHTML = '<button type="button" data-seek="-5" aria-label="5秒巻き戻す">↶ 5秒</button><input id="audio-progress" type="range" min="0" max="1" step="0.01" value="0" aria-label="再生位置" disabled /><output id="audio-time">0:00 / 0:00</output><button type="button" data-seek="5" aria-label="5秒早送りする">5秒 ↷</button>';
  document.querySelector(".card-actions").before(controls);
  const range = controls.querySelector("#audio-progress");
  const time = controls.querySelector("#audio-time");
  let activeAudio = null;
  const format = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
  const update = () => {
    const duration = Number.isFinite(activeAudio?.duration) ? activeAudio.duration : 0;
    const current = activeAudio?.currentTime || 0;
    range.max = duration || 1;
    range.value = Math.min(current, duration || 1);
    range.disabled = !duration;
    time.value = `${format(current)} / ${format(duration)}`;
    time.textContent = time.value;
  };
  controls.addEventListener("click", (event) => {
    const seconds = Number(event.target.closest("button")?.dataset.seek);
    if (!activeAudio || !Number.isFinite(seconds)) return;
    activeAudio.currentTime = Math.max(0, Math.min(activeAudio.duration || 0, activeAudio.currentTime + seconds));
    update();
  });
  range.addEventListener("input", () => { if (activeAudio) activeAudio.currentTime = Number(range.value); });
  const syncMode = () => { controls.hidden = mode.textContent.startsWith("APPLY"); };
  new MutationObserver(syncMode).observe(mode, { childList: true, characterData: true, subtree: true });
  syncMode();
  const NativeAudio = window.Audio;
  function ControlledAudio(...args) {
    const audio = new NativeAudio(...args);
    audio.addEventListener("loadedmetadata", () => { activeAudio = audio; update(); });
    audio.addEventListener("timeupdate", () => { if (activeAudio === audio) update(); });
    audio.addEventListener("play", () => { activeAudio = audio; update(); });
    audio.addEventListener("ended", () => { if (activeAudio === audio) update(); });
    return audio;
  }
  ControlledAudio.prototype = NativeAudio.prototype;
  window.Audio = ControlledAudio;
})();
