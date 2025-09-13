 (function() {
   const EXT_NAME = 'VideoTest';

   function tryRegister() {
     try {
       if (!window || !window.SillyTavern || typeof window.SillyTavern.registerExtension !== 'function') {
         return false;
       }

       window.SillyTavern.registerExtension({
         name: EXT_NAME,
         init: function () {
           console.log('[VideoTest] extension initialized.');
         },
         settings: function () {
           return '<div style="padding:8px">\n              <h3 style="margin:0 0 8px 0;">VideoTest</h3>\n              <p>扩展已成功加载（Third-Party）。这是一个最小的设置面板。</p>\n            </div>';
         }
       });

       console.log('[VideoTest] registered with SillyTavern.');
       return true;
     } catch (e) {
       console.warn('[VideoTest] register error:', e);
       return false;
     }
   }

   if (!tryRegister()) {
     const timerId = setInterval(function() {
       if (tryRegister()) clearInterval(timerId);
     }, 300);
   }
 })();
