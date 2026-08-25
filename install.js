(() => {
  const button = document.querySelector("#install-button");
  let deferredPrompt = null;
  const installed = () => window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    if (!installed()) button.hidden = false;
  });
  button.addEventListener("click", async () => {
    if (!deferredPrompt) {
      alert("Safariでは共有ボタンから「ホーム画面に追加」を選んでください。");
      return;
    }
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    button.hidden = true;
  });
  window.addEventListener("appinstalled", () => { button.hidden = true; });
  if (installed()) button.hidden = true;
})();
