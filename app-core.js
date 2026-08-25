(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const elements = {
    status: $("#asset-status"),
    courseButtons: [...document.querySelectorAll(".course-button")],
    modeButtons: [...document.querySelectorAll(".mode-tab")],
    settingsButton: $("#settings-button"),
    settingsPanel: $("#settings-panel"),
    repeat: $("#repeat-count"),
    pauseMultiplier: $("#pause-multiplier"),
    modeLabel: $("#mode-label"),
    progress: $("#progress"),
    chunk: $("#chunk-label"),
    japanese: $("#japanese-text"),
    english: $("#english-text"),
    cue: $("#cue-text"),
    revealActions: $("#reveal-actions"),
    showJapanese: $("#show-japanese"),
    showEnglish: $("#show-english"),
    play: $("#play-button"),
    ratings: $("#rating-actions"),
    can: $("#can-button"),
    cannot: $("#cannot-button"),
    swipe: $("#swipe-hint"),
    card: $("#learning-card")
  };

  const state = {
    course: null,
    mode: "listen",
    items: [],
    index: 0,
    activeAudio: null,
    activeAudioFinish: null,
    preloadAudio: [],
    preloadToken: 0,
    loadController: null,
    runToken: 0,
    timerIds: new Map(),
    playing: false,
    phase: "idle",
    revealEnglish: false,
    revealJapanese: false,
    ratings: JSON.parse(localStorage.getItem("chunk-response-ratings-v2") || "{}")
  };

  const settingsMarkup = document.createElement("div");
  settingsMarkup.className = "auto-settings";
  settingsMarkup.innerHTML = `
    <label>進行モード<select id="progress-mode"><option value="auto">自動モード</option><option value="pause">ポーズモード</option></select></label>
    <label>自動移動までのポーズ<select id="auto-pause"><option value="2">2秒</option><option value="3">3秒</option><option value="5">5秒</option><option value="8">8秒</option></select></label>
    <label id="english-display-setting">英文を自動表示<select id="english-display-repeat"><option value="0">表示しない</option><option value="1">1回目から</option><option value="2">2回目から</option><option value="3">3回目から</option><option value="4">4回目から</option><option value="5">5回目から</option></select></label>
    <label>配色<select id="theme-select"><option value="cobalt">青</option><option value="forest">緑</option><option value="rose">赤</option></select></label>`;
  elements.settingsPanel.insertBefore(settingsMarkup, elements.settingsPanel.querySelector("p"));
  elements.progressMode = $("#progress-mode");
  elements.autoPause = $("#auto-pause");
  elements.englishDisplay = $("#english-display-repeat");
  elements.englishDisplaySetting = $("#english-display-setting");
  elements.theme = $("#theme-select");

  const audioControls = document.createElement("div");
  audioControls.className = "audio-controls";
  audioControls.hidden = true;
  audioControls.innerHTML = '<button type="button" data-seek="-5" aria-label="5秒巻き戻す">↶ 5秒</button><input id="audio-progress" type="range" min="0" max="1" step="0.01" value="0" aria-label="再生位置" disabled /><output id="audio-time">0:00 / 0:00</output><button type="button" data-seek="5" aria-label="5秒早送りする">5秒 ↷</button>';
  document.querySelector(".card-actions").before(audioControls);
  elements.audioControls = audioControls;
  elements.audioProgress = $("#audio-progress");
  elements.audioTime = $("#audio-time");

  const loadingOverlay = document.createElement("div");
  loadingOverlay.className = "course-loading";
  loadingOverlay.hidden = true;
  loadingOverlay.innerHTML = '<div class="course-loading__panel" role="status"><span class="course-loading__spinner" aria-hidden="true"></span><strong>教材を読み込んでいます</strong><span>例文データを取得しています。音声は再生時に読み込みます</span></div>';
  document.body.append(loadingOverlay);

  function setting(key, fallback) {
    return localStorage.getItem(`chunk-response-${key}`) || fallback;
  }

  elements.progressMode.value = setting("progress-mode", "auto");
  elements.autoPause.value = setting("auto-pause", "3");
  elements.englishDisplay.value = setting("english-display", "2");
  elements.theme.value = setting("theme", "cobalt");
  elements.repeat.value = setting("repeat-count", "3");
  elements.pauseMultiplier.value = setting("pause-multiplier", "1");

  function applyTheme() {
    document.documentElement.dataset.theme = elements.theme.value === "cobalt" ? "" : elements.theme.value;
  }

  function saveSettings() {
    localStorage.setItem("chunk-response-progress-mode", elements.progressMode.value);
    localStorage.setItem("chunk-response-auto-pause", elements.autoPause.value);
    localStorage.setItem("chunk-response-english-display", elements.englishDisplay.value);
    localStorage.setItem("chunk-response-theme", elements.theme.value);
    localStorage.setItem("chunk-response-repeat-count", elements.repeat.value);
    localStorage.setItem("chunk-response-pause-multiplier", elements.pauseMultiplier.value);
    applyTheme();
  }

  [elements.progressMode, elements.autoPause, elements.englishDisplay, elements.theme, elements.repeat, elements.pauseMultiplier].forEach((control) => control.addEventListener("change", saveSettings));
  applyTheme();

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;
    for (let index = 0; index < text.length; index += 1) {
      const character = text[index];
      const next = text[index + 1];
      if (character === '"' && quoted && next === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = !quoted;
      } else if (character === "," && !quoted) {
        row.push(cell);
        cell = "";
      } else if ((character === "\n" || character === "\r") && !quoted) {
        if (character === "\r" && next === "\n") index += 1;
        row.push(cell);
        if (row.length > 1) rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += character;
      }
    }
    if (cell || row.length) {
      row.push(cell);
      rows.push(row);
    }
    const [header, ...data] = rows;
    const keys = header.map((key) => key.replace(/^\uFEFF/, ""));
    return data.map((values) => Object.fromEntries(keys.map((key, index) => [key, values[index] || ""])));
  }

  const pad = (number) => String(number).padStart(3, "0");
  const stripMarkdown = (text) => text.replace(/\*\*/g, "").trim();

  async function fetchText(url, signal) {
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return response.text();
  }

  async function loadDaily(signal) {
    const rows = parseCsv(await fetchText("./chunks_120_examples.csv", signal));
    return rows.map((row) => ({
      id: row.id,
      chunk: row["チャンク"],
      chunkJa: row["チャンク日本語訳"],
      english: row["英文"],
      japanese: row["例文日本語訳"],
      audio: `./${row["音声ファイル"]}`
    }));
  }

  async function loadEdtech(signal) {
    const text = await fetchText("./edtech_it_chunk_examples.md", signal);
    let chunkNumber = 0;
    let chunk = "";
    let chunkJa = "";
    let example = 0;
    const items = [];
    text.split("\n").forEach((line) => {
      const heading = line.match(/^###\s+(\d+)\.\s+(.+)$/);
      const sentence = line.match(/^[-*]\s*\(([EI])\)\s+(.+)$/);
      if (heading) {
        chunkNumber = Number(heading[1]);
        chunk = stripMarkdown(heading[2]);
        chunkJa = "";
        example = 0;
      }
      if (sentence) {
        example += 1;
        items.push({
          id: `${pad(chunkNumber)}-${String(example).padStart(2, "0")}`,
          chunk,
          chunkJa,
          english: stripMarkdown(sentence[2]),
          japanese: "",
          audio: `./edtech-it-audio/${pad(chunkNumber)}-${String(example).padStart(2, "0")}.mp3`
        });
      }
    });
    return items;
  }

  function currentItem() {
    return state.items[state.index];
  }

  function clearTimers() {
    state.timerIds.forEach((resolve, timerId) => {
      clearTimeout(timerId);
      resolve(false);
    });
    state.timerIds.clear();
  }

  function stopSession() {
    state.runToken += 1;
    clearTimers();
    const finishActiveAudio = state.activeAudioFinish;
    state.activeAudioFinish = null;
    finishActiveAudio?.();
    if (state.activeAudio) {
      state.activeAudio.pause();
      state.activeAudio.removeAttribute("src");
      state.activeAudio.load();
      state.activeAudio = null;
    }
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    state.playing = false;
    updateAudioControls();
  }

  function wait(milliseconds, token) {
    return new Promise((resolve) => {
      const timerId = setTimeout(() => {
        state.timerIds.delete(timerId);
        resolve(token === state.runToken);
      }, milliseconds);
      state.timerIds.set(timerId, resolve);
    });
  }

  function formatTime(seconds) {
    const safe = Number.isFinite(seconds) ? seconds : 0;
    return `${Math.floor(safe / 60)}:${String(Math.floor(safe % 60)).padStart(2, "0")}`;
  }

  function updateAudioControls() {
    const audio = state.activeAudio;
    const duration = Number.isFinite(audio?.duration) ? audio.duration : 0;
    const current = audio?.currentTime || 0;
    elements.audioProgress.max = duration || 1;
    elements.audioProgress.value = Math.min(current, duration || 1);
    elements.audioProgress.disabled = !duration;
    elements.audioTime.value = `${formatTime(current)} / ${formatTime(duration)}`;
    elements.audioTime.textContent = elements.audioTime.value;
  }

  function playAudio(source, token) {
    return new Promise((resolve, reject) => {
      if (token !== state.runToken) {
        resolve(0);
        return;
      }
      const audio = new Audio(source);
      let settled = false;
      state.activeAudio = audio;
      audio.preload = "auto";

      const finish = (duration = 0, error = null) => {
        if (settled) return;
        settled = true;
        audio.removeEventListener("loadedmetadata", updateAudioControls);
        audio.removeEventListener("timeupdate", updateAudioControls);
        audio.removeEventListener("ended", onEnded);
        audio.removeEventListener("error", onError);
        if (state.activeAudioFinish === cancel) state.activeAudioFinish = null;
        if (state.activeAudio === audio) state.activeAudio = null;
        updateAudioControls();
        error ? reject(error) : resolve(duration);
      };
      const cancel = () => {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
        finish(0);
      };
      const onEnded = () => {
        const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
        finish(duration);
      };
      const onError = () => finish(0, new Error("音声を読み込めませんでした"));

      state.activeAudioFinish = cancel;
      audio.addEventListener("loadedmetadata", updateAudioControls);
      audio.addEventListener("timeupdate", updateAudioControls);
      audio.addEventListener("ended", onEnded, { once: true });
      audio.addEventListener("error", onError, { once: true });
      audio.play().catch(onError);
    });
  }

  function speakJapanese(text) {
    if (!("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ja-JP";
    utterance.rate = 0.9;
    speechSynthesis.speak(utterance);
  }

  function prewarmNearbyAudio() {
    state.preloadToken += 1;
    const preloadToken = state.preloadToken;
    state.preloadAudio.forEach((audio) => {
      audio.removeAttribute("src");
      audio.load();
    });
    state.preloadAudio = [];
    if (!state.items.length) return;
    const warm = () => {
      if (preloadToken !== state.preloadToken) return;
      for (let offset = 0; offset < 3; offset += 1) {
        const item = state.items[(state.index + offset) % state.items.length];
        const audio = new Audio();
        audio.preload = "metadata";
        audio.src = item.audio;
        state.preloadAudio.push(audio);
      }
    };
    if ("requestIdleCallback" in window) requestIdleCallback(warm, { timeout: 1200 });
    else setTimeout(warm, 300);
  }

  function render() {
    const item = currentItem();
    const loaded = Boolean(item);
    const listening = state.mode === "listen";
    const recalling = state.mode === "recall";
    const applying = state.mode === "apply";

    elements.modeLabel.textContent = applying ? "APPLY · PREPARING" : recalling ? "RECALL · SPEAK" : "LISTEN & REPEAT";
    elements.progress.textContent = loaded ? `学習位置 ${state.index + 1} / ${state.items.length}` : "—";
    elements.chunk.textContent = loaded ? item.chunk : "教材を選択";
    elements.japanese.textContent = loaded ? (item.japanese || item.chunkJa) : "上の教材を選ぶと、例文データを読み込みます。";
    elements.english.textContent = loaded ? item.english : "";
    elements.japanese.hidden = !loaded || (listening && !state.revealJapanese);
    elements.english.hidden = !loaded || (!state.revealEnglish && (listening || recalling));
    elements.revealActions.hidden = !loaded || !listening;
    elements.showJapanese.textContent = state.revealJapanese ? "日本語訳を隠す" : "日本語訳を確認";
    elements.showEnglish.textContent = state.revealEnglish ? "英文を隠す" : "英文を確認";
    const canRate = (recalling && ["answer", "rating"].includes(state.phase)) || (listening && state.phase === "rating");
    elements.ratings.hidden = !loaded || !canRate;
    elements.swipe.hidden = elements.ratings.hidden;
    elements.play.disabled = !loaded || applying;
    elements.audioControls.hidden = !loaded || applying;
    elements.play.innerHTML = `<span aria-hidden="true">${state.playing ? "■" : "▶"}</span> ${state.playing ? "停止する" : recalling ? "問題を始める" : "再生する"}`;
    elements.cue.textContent = !loaded ? "教材を選択してください。" : applying ? "応用問題の生成機能は準備中です。" : recalling ? "日本語を聞いて話し、正解音声の後に自己評価します。" : "再生して、聞こえた通りに続けて話してください。";
    elements.repeat.closest("label").hidden = !listening;
    elements.englishDisplaySetting.hidden = !listening;
  }

  async function selectCourse(course) {
    stopSession();
    state.loadController?.abort();
    const controller = new AbortController();
    state.loadController = controller;
    state.course = course;
    state.items = [];
    state.index = 0;
    state.revealEnglish = false;
    state.revealJapanese = false;
    state.phase = "idle";
    elements.status.textContent = "教材を読み込んでいます…";
    loadingOverlay.hidden = false;
    elements.courseButtons.forEach((button) => {
      button.disabled = true;
      const selected = button.dataset.course === course;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    render();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const items = course === "daily" ? await loadDaily(controller.signal) : await loadEdtech(controller.signal);
      if (!items.length) throw new Error("教材に例文がありません");
      state.items = items;
      const savedIndex = Number(localStorage.getItem(`chunk-response-index-${course}`) || 0);
      state.index = Math.min(Math.max(savedIndex, 0), items.length - 1);
      elements.status.textContent = `${course === "daily" ? "日常／ビジネス" : "EduTech／IT"}：${items.length}例文`;
      render();
      prewarmNearbyAudio();
    } catch (error) {
      if (error.name !== "AbortError") console.error(error);
      elements.status.textContent = error.name === "AbortError" ? "読み込みがタイムアウトしました。再度選択してください" : "教材を読み込めません。再度選択してください";
      elements.courseButtons.forEach((button) => {
        button.classList.remove("is-selected");
        button.setAttribute("aria-pressed", "false");
      });
      render();
    } finally {
      clearTimeout(timeoutId);
      if (state.loadController === controller) state.loadController = null;
      loadingOverlay.hidden = true;
      elements.courseButtons.forEach((button) => { button.disabled = false; });
    }
  }

  function moveNext() {
    if (!state.items.length) return;
    stopSession();
    state.index = (state.index + 1) % state.items.length;
    state.revealEnglish = false;
    state.revealJapanese = false;
    state.phase = "idle";
    localStorage.setItem(`chunk-response-index-${state.course}`, String(state.index));
    render();
    prewarmNearbyAudio();
  }

  async function runListen() {
    if (!currentItem() || state.playing) return;
    stopSession();
    const token = state.runToken;
    state.playing = true;
    state.phase = "audio";
    render();
    const repeatCount = Number(elements.repeat.value);
    const showFrom = Number(elements.englishDisplay.value);
    try {
      for (let count = 1; count <= repeatCount; count += 1) {
        if (token !== state.runToken) return;
        if (showFrom > 0 && count >= showFrom) {
          state.revealEnglish = true;
          render();
        }
        const duration = await playAudio(currentItem().audio, token);
        if (count < repeatCount) {
          const gap = Math.max(500, duration * 1000 * Number(elements.pauseMultiplier.value));
          if (!(await wait(gap, token))) return;
        }
      }
      state.playing = false;
      state.phase = "rating";
      render();
      if (elements.progressMode.value === "auto") {
        if (!(await wait(Number(elements.autoPause.value) * 1000, token))) return;
        rateAnswer("cannot");
      }
    } catch (error) {
      if (token === state.runToken) {
        state.playing = false;
        elements.status.textContent = error.message;
        render();
      }
    }
  }

  async function getAudioDuration(source) {
    return new Promise((resolve) => {
      const audio = new Audio(source);
      let settled = false;
      const finish = (duration = 3) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        audio.removeAttribute("src");
        audio.load();
        resolve(duration);
      };
      const timeoutId = setTimeout(() => finish(), 2500);
      audio.addEventListener("loadedmetadata", () => {
        finish(Number.isFinite(audio.duration) ? audio.duration : 3);
      }, { once: true });
      audio.addEventListener("error", () => finish(), { once: true });
      audio.preload = "metadata";
      audio.src = source;
      audio.load();
    });
  }

  async function runRecall() {
    if (!currentItem() || state.playing) return;
    stopSession();
    const token = state.runToken;
    const item = currentItem();
    state.playing = true;
    state.phase = "prompt";
    state.revealEnglish = false;
    render();
    const japanese = item.japanese || `${item.chunkJa}を使って英文を話してください。`;
    speakJapanese(japanese);
    try {
      const duration = await getAudioDuration(item.audio);
      if (!(await wait(Math.max(1600, duration * 1000 * Number(elements.pauseMultiplier.value)), token))) return;
      state.phase = "answer";
      state.revealEnglish = true;
      render();
      await playAudio(item.audio, token);
      if (token !== state.runToken) return;
      state.playing = false;
      state.phase = "rating";
      render();
      if (elements.progressMode.value === "auto") {
        if (!(await wait(Number(elements.autoPause.value) * 1000, token))) return;
        rateAnswer("cannot");
      }
    } catch (error) {
      if (token === state.runToken) {
        state.playing = false;
        elements.status.textContent = error.message;
        render();
      }
    }
  }

  function rateAnswer(result) {
    const rateable = state.phase === "rating" || (state.mode === "recall" && state.phase === "answer");
    if (!currentItem() || !["listen", "recall"].includes(state.mode) || !rateable) return;
    const continueAutomatically = state.phase === "rating" || state.phase === "answer";
    const key = `${state.course}:${currentItem().id}`;
    state.ratings[key] = result;
    localStorage.setItem("chunk-response-ratings-v2", JSON.stringify(state.ratings));
    moveNext();
    if (continueAutomatically) {
      const token = state.runToken;
      wait(180, token).then((valid) => { if (valid) runCurrentMode(); });
    }
  }

  function runCurrentMode() {
    if (state.mode === "listen") runListen();
    if (state.mode === "recall") runRecall();
  }

  elements.courseButtons.forEach((button) => button.addEventListener("click", () => selectCourse(button.dataset.course)));
  elements.modeButtons.forEach((button) => button.addEventListener("click", () => {
    stopSession();
    state.mode = button.dataset.mode;
    state.phase = "idle";
    state.revealEnglish = false;
    state.revealJapanese = false;
    elements.modeButtons.forEach((tab) => {
      const active = tab === button;
      tab.classList.toggle("is-selected", active);
      tab.setAttribute("aria-selected", String(active));
    });
    render();
  }));
  elements.settingsButton.addEventListener("click", () => {
    const open = elements.settingsPanel.hidden;
    elements.settingsPanel.hidden = !open;
    elements.settingsButton.setAttribute("aria-expanded", String(open));
  });
  elements.play.addEventListener("click", () => {
    if (state.playing) {
      stopSession();
      render();
    } else {
      runCurrentMode();
    }
  });
  elements.showJapanese.addEventListener("click", () => {
    state.revealJapanese = !state.revealJapanese;
    render();
  });
  elements.showEnglish.addEventListener("click", () => {
    state.revealEnglish = !state.revealEnglish;
    render();
  });
  elements.can.addEventListener("click", () => rateAnswer("can"));
  elements.cannot.addEventListener("click", () => rateAnswer("cannot"));
  elements.audioProgress.addEventListener("input", () => {
    if (state.activeAudio) state.activeAudio.currentTime = Number(elements.audioProgress.value);
  });
  audioControls.addEventListener("click", (event) => {
    const seek = Number(event.target.closest("button")?.dataset.seek);
    if (!state.activeAudio || !Number.isFinite(seek)) return;
    state.activeAudio.currentTime = Math.max(0, Math.min(state.activeAudio.duration || 0, state.activeAudio.currentTime + seek));
    updateAudioControls();
  });
  let swipeStart = null;
  elements.card.addEventListener("pointerdown", (event) => { swipeStart = event.clientX; });
  elements.card.addEventListener("pointerup", (event) => {
    if (!["listen", "recall"].includes(state.mode) || state.phase !== "rating" || swipeStart === null) return;
    const delta = event.clientX - swipeStart;
    if (Math.abs(delta) > 84) rateAnswer(delta > 0 ? "can" : "cannot");
    swipeStart = null;
  });

  render();
  if (location.protocol === "file:") elements.status.textContent = "公開URLで教材を選択してください";
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js"));
  }
})();
