(() => {
  const status = document.querySelector("#asset-status");
  const progress = document.querySelector("#progress");
  const overlay = document.createElement("div");
  overlay.className = "course-loading";
  overlay.hidden = true;
  overlay.innerHTML = '<div class="course-loading__panel" role="status"><span class="course-loading__spinner" aria-hidden="true"></span><strong>教材を切り替えています</strong><span>例文を準備し、次の3音声だけ先読みします</span></div>';
  document.body.append(overlay);
  let activeCourse = "daily";
  let hideTimer = null;
  const preloadNearbyAudio = () => {
    const wanted = new Set();
    const match = progress.textContent.match(/(\d+)\s*\/\s*(\d+)/);
    if (!match) return;
    const position = Number(match[1]);
    const examplesPerChunk = activeCourse === "daily" ? 3 : 2;
    const folder = activeCourse === "daily" ? "chunk-audio" : "edtech-it-audio";
    for (let offset = 0; offset < 3; offset += 1) {
      const item = position + offset;
      const chunk = String(Math.ceil(item / examplesPerChunk)).padStart(3, "0");
      const example = String(((item - 1) % examplesPerChunk) + 1).padStart(2, "0");
      const source = `./${folder}/${chunk}-${example}.mp3`;
      wanted.add(source);
      if (document.querySelector(`link[data-audio-preload="${source}"]`)) continue;
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "audio";
      link.href = source;
      link.dataset.audioPreload = source;
      document.head.append(link);
    }
    document.querySelectorAll("link[data-audio-preload]").forEach((link) => {
      if (!wanted.has(link.dataset.audioPreload)) link.remove();
    });
  };
  const sync = () => {
    const text = status.textContent;
    if (text.includes("切り替えています")) {
      clearTimeout(hideTimer);
      overlay.hidden = false;
      return;
    }
    if (text.includes("EduTech")) activeCourse = "edtech";
    if (text.includes("日常")) activeCourse = "daily";
    preloadNearbyAudio();
    hideTimer = setTimeout(() => { overlay.hidden = true; }, 180);
  };
  new MutationObserver(sync).observe(status, { childList: true, characterData: true, subtree: true });
  new MutationObserver(preloadNearbyAudio).observe(progress, { childList: true, characterData: true, subtree: true });
  sync();
})();
