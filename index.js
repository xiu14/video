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

       // Inject settings drawer like the reference extension
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

       // Optional: add a small toolbar hint icon to confirm activation
       const target = document.querySelector('.form_create_bottom_buttons_block') || document.querySelector('#rm_buttons_container');
       if (target) {
         const html = '<div class="menu_button fa-solid fa-circle-info interactable" title="' + displayName + '"></div>';
         const wrapper = document.createElement('div');
         wrapper.innerHTML = html.trim();
         const node = wrapper.firstChild;
         if (node) target.prepend(node);
       }

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
