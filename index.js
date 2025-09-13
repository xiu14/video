(function () {
  const extensionRepoName = 'video';
  const displayName = 'VideoTest';

  function initWhenReady() {
    try {
      if (!window || !window.SillyTavern || typeof window.SillyTavern.getContext !== 'function') {
        return false;
      }
      const ctx = window.SillyTavern.getContext();
      if (!ctx || typeof ctx.renderExtensionTemplateAsync !== 'function') {
        return false;
      }

      // Inject settings drawer into Extensions panel
      ctx
        .renderExtensionTemplateAsync(`third-party/${extensionRepoName}`, 'templates/settings')
        .then(function (html) {
          const container = document.querySelector('#extensions_settings');
          if (container && typeof container.insertAdjacentHTML === 'function') {
            container.insertAdjacentHTML('beforeend', html);
            console.log(`[${displayName}] settings panel injected.`);
          }
        })
        .catch(function (err) {
          console.warn(`[${displayName}] settings template render failed:`, err);
        });

      console.log(`[${displayName}] initialized.`);
      return true;
    } catch (e) {
      console.warn(`[${displayName}] init error:`, e);
      return false;
    }
  }

  if (!initWhenReady()) {
    const timer = setInterval(function () {
      if (initWhenReady()) clearInterval(timer);
    }, 300);
  }
})();
