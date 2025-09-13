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

      // Wait for extensions_settings container before injecting
      function ensureContainerAndInject() {
        const container = document.querySelector('#extensions_settings');
        if (!container) {
          // fallback: if长时间未出现，插入到 body 尾部，并显示状态
          const fallbackAnchor = document.body;
          if (!document.querySelector('#video-test-root')) {
            ctx
              .renderExtensionTemplateAsync(`third-party/${extensionRepoName}`, 'templates/settings')
              .then(function (html) {
                if (document.querySelector('#video-test-root')) return;
                fallbackAnchor.insertAdjacentHTML('beforeend', html);
                bootstrapPanel();
              })
              .catch(function(){ /* ignore */ });
          }
          setTimeout(ensureContainerAndInject, 400);
          return;
        }
        ctx
          .renderExtensionTemplateAsync(`third-party/${extensionRepoName}`, 'templates/settings')
          .then(function (html) {
            // prevent duplicate injection
            if (document.querySelector('#video-test-root')) return;
            container.insertAdjacentHTML('beforeend', html);
            console.log(`[${displayName}] settings panel injected.`);
            bootstrapPanel();
          })
          .catch(function (err) {
            // ignore for minimal version
          });
      }

      function bootstrapPanel(){
            // Minimal: drawer toggle only
            try {
              const root = document.querySelector('#video-test-root');
              if (!root) return;
              const header = root.querySelector('.inline-drawer-toggle');
              const content = root.querySelector('.inline-drawer-content');
              const icon = root.querySelector('.inline-drawer-icon');
              if (!header || !content) return;
              // optional: start opened by default
              content.style.display = content.style.display || 'block';
              header.addEventListener('click', function(){
                const open = content.style.display !== 'none';
                content.style.display = open ? 'none' : 'block';
                if (icon && icon.classList) {
                  icon.classList.toggle('down', !open);
                }
              }, { once: false });
            } catch(_) {}
      }
      ensureContainerAndInject();

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
