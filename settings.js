(() => {
  const panel = document.querySelector("#settings-panel");
  const repeat = document.querySelector("#repeat-count");
  const repeatSetting = repeat.closest("label");
  const mode = document.querySelector("#mode-label");
  const themeSetting = document.createElement("label");
  themeSetting.innerHTML = '配色<select id="theme-select"><option value="cobalt">青</option><option value="forest">緑</option><option value="rose">赤</option></select>';
  panel.insertBefore(themeSetting, panel.querySelector("p"));
  const selector = document.querySelector("#theme-select");
  const saved = localStorage.getItem("chunk-response-theme") || "cobalt";
  selector.value = saved;
  const applyTheme = () => {
    const theme = selector.value;
    document.documentElement.dataset.theme = theme === "cobalt" ? "" : theme;
    localStorage.setItem("chunk-response-theme", theme);
  };
  selector.addEventListener("change", applyTheme);
  applyTheme();
  const syncModeSettings = () => { repeatSetting.hidden = !mode.textContent.startsWith("LISTEN"); };
  new MutationObserver(syncModeSettings).observe(mode, { childList: true, characterData: true, subtree: true });
  syncModeSettings();
})();
