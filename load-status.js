(() => {
  const status = document.querySelector("#asset-status");
  if (location.protocol === "file:") {
    status.textContent = "教材はGitHub Pagesで読み込みます";
  }
  window.addEventListener("unhandledrejection", (event) => {
    event.preventDefault();
    status.textContent = "教材を読み込めません。公開URLから開いてください";
  });
})();
