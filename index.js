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

       // Add a toolbar icon that opens a simple popup panel
       const target = document.querySelector('.form_create_bottom_buttons_block') || document.querySelector('#rm_buttons_container');
       if (target) {
         const html = '<div class="menu_button fa-solid fa-wand-magic-sparkles interactable" title="' + displayName + '"></div>';
         const wrapper = document.createElement('div');
         wrapper.innerHTML = html.trim();
         const node = wrapper.firstChild;
         if (node) {
           target.prepend(node);
           node.addEventListener('click', function() {
             // Simple modal-like panel
             const overlay = document.createElement('div');
             overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:9998;';
             const panel = document.createElement('div');
             panel.style.cssText = 'position:fixed;top:20%;left:50%;transform:translateX(-50%);min-width:320px;max-width:90vw;background:#1e1f22;color:#fff;border:1px solid #444;border-radius:8px;z-index:9999;box-shadow:0 10px 30px rgba(0,0,0,.5)';
             panel.innerHTML = '<div style="padding:12px 14px;border-bottom:1px solid #333;display:flex;align-items:center;gap:8px;"><span class="fa-solid fa-wand-magic-sparkles"></span><b>' + displayName + '</b><div style="margin-left:auto;cursor:pointer;" id="video-test-close">✕</div></div>\n<div style="padding:14px;">Hello from ' + displayName + '!</div>';
             document.body.appendChild(overlay);
             document.body.appendChild(panel);
             function close(){
               panel.remove(); overlay.remove();
             }
             overlay.addEventListener('click', close);
             panel.querySelector('#video-test-close')?.addEventListener('click', close);
           });
         }
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
