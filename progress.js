(() => {
  const progress = document.querySelector("#progress");
  const label = () => {
    const match = progress.textContent.match(/(\d+)\s*\/\s*(\d+)/);
    const next = match && `学習位置 ${match[1]} / ${match[2]}`;
    if (next && progress.textContent !== next) progress.textContent = next;
  };
  new MutationObserver(label).observe(progress, { childList: true, characterData: true, subtree: true });
  label();
})();
