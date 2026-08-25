(() => {
  let courseSelected = false;
  const status = document.querySelector("#asset-status");
  const courseButtons = [...document.querySelectorAll(".course-button")];
  const sourceFetch = window.fetch.bind(window);
  const isCourseData = (input) => String(input).includes("chunks_120_examples.csv") || String(input).includes("edtech_it_chunk_examples.md");
  courseButtons.forEach((button) => button.classList.remove("is-selected"));
  document.querySelector("#chunk-label").textContent = "教材を選択";
  document.querySelector("#japanese-text").textContent = "上の教材を選ぶと、例文と音声の準備を始めます。";
  document.querySelector("#english-text").hidden = true;
  status.textContent = "教材を選択して開始";
  window.fetch = (input, init) => {
    if (isCourseData(input) && !courseSelected) return new Promise(() => {});
    return sourceFetch(input, init);
  };
  courseButtons.forEach((button) => button.addEventListener("click", () => { courseSelected = true; }, { capture: true, once: true }));
  new MutationObserver(() => {
    if (!courseSelected && status.textContent.includes("切り替えています")) status.textContent = "教材を選択して開始";
  }).observe(status, { childList: true, characterData: true, subtree: true });
})();
