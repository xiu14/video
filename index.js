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

            // Stats logic
            const storageKey = 'videoTest.dailyCounts';
            const enableKey = 'videoTest.enabled';

            function getTodayKey() {
              const d = new Date();
              return d.toISOString().slice(0, 10); // YYYY-MM-DD
            }

            function loadCounts() {
              try {
                const raw = localStorage.getItem(storageKey);
                return raw ? JSON.parse(raw) : {};
              } catch (_) { return {}; }
            }

            function saveCounts(map) {
              try { localStorage.setItem(storageKey, JSON.stringify(map)); } catch (_) {}
            }

            function isEnabled() {
              return localStorage.getItem(enableKey) === '1';
            }

            function setEnabled(v) {
              localStorage.setItem(enableKey, v ? '1' : '0');
            }

            function incToday() {
              const map = loadCounts();
              const k = getTodayKey();
              map[k] = (map[k] || 0) + 1;
              saveCounts(map);
              renderStats();
            }

            function resetToday() {
              const map = loadCounts();
              const k = getTodayKey();
              map[k] = 0;
              saveCounts(map);
              renderStats();
            }

            function clearAll() {
              saveCounts({});
              renderStats();
            }

            function renderStats() {
              const el = document.querySelector('#video-test-stats');
              if (!el) return;
              const map = loadCounts();
              const days = [];
              const today = new Date();
              for (let i = 6; i >= 0; i--) {
                const d = new Date(today);
                d.setDate(today.getDate() - i);
                const k = d.toISOString().slice(0,10);
                days.push({ key: k, value: map[k] || 0 });
              }
              el.innerHTML = days.map(d => '<div style="border:1px solid #333;border-radius:6px;padding:8px;">\n  <div style="font-size:12px;color:#aaa;">'+d.key+'</div>\n  <div style="font-size:18px;">'+d.value+'</div>\n</div>').join('');
              const enable = document.querySelector('#video-test-enable');
              if (enable && enable instanceof HTMLInputElement) enable.checked = isEnabled();
            }

            // Bind UI events
            const enable = document.querySelector('#video-test-enable');
            if (enable) enable.addEventListener('change', function(e){ setEnabled(e.target.checked); });
            const resetBtn = document.querySelector('#video-test-reset-today');
            if (resetBtn) resetBtn.addEventListener('click', resetToday);
            const clearBtn = document.querySelector('#video-test-clear-all');
            if (clearBtn) clearBtn.addEventListener('click', clearAll);

            // Observe AI replies via DOM mutations
            try {
              const chatRoot = document.querySelector('#chat');
              if (chatRoot) {
                const observer = new MutationObserver(function(mutations){
                  if (!isEnabled()) return;
                  for (const m of mutations) {
                    for (const node of m.addedNodes) {
                      if (!(node instanceof HTMLElement)) continue;
                      // naive rule: assistant messages often have class 'mes from-ia' or similar
                      const isAssistant = node.classList && ([...node.classList].some(c => c.includes('mes')) && (node.textContent || '').trim().length > 0);
                      // fallback: find bubbles inside
                      const hasAssistantBubble = node.querySelector && node.querySelector('.mes, .assistant, .bubble-assistant');
                      if (isAssistant || hasAssistantBubble) {
                        incToday();
                      }
                    }
                  }
                });
                observer.observe(chatRoot, { childList: true, subtree: true });
              }
            } catch (_) {}

            // Initial render
            renderStats();
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
