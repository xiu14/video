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

            // Polling-based detection with de-duplication for broader compatibility (e.g., mobile)
            (function setupPolling(){
              const markedAttr = 'data-video-counted';
              let timerId = null;
              let lastIncrementAt = 0;
              let prevAssistantCount = 0;

              function isAssistantElement(el){
                if (!(el instanceof HTMLElement)) return false;
                // Strong matches
                if (el.matches && el.matches('.mes.from-ia, .assistant, [data-owner="assistant"], .bubble-assistant, .message.assistant')) return true;
                // Heuristic: message bubble with class .mes but not explicitly from user
                if (el.classList && el.classList.contains('mes')) {
                  if (!el.classList.contains('from-user')) return true;
                  if (el.getAttribute('data-owner') === 'assistant') return true;
                }
                return false;
              }

              function selectAssistantContainers() {
                const nodes = Array.from(document.querySelectorAll('.mes, .message, .assistant, [data-owner="assistant"], .bubble-assistant'));
                return nodes.filter(function(el){
                  if (!(el instanceof HTMLElement)) return false;
                  if (el.classList.contains('from-user')) return false;
                  if (el.getAttribute('data-owner') === 'user') return false;
                  return true;
                });
              }

              function scanAndMark(){
                if (!isEnabled()) return;
                // 1) Count distinct assistant message containers and increment by delta
                const containers = selectAssistantContainers();
                const countNow = containers.length;
                if (countNow > prevAssistantCount) {
                  const delta = countNow - prevAssistantCount;
                  const now = Date.now();
                  if (now - lastIncrementAt > 400) {
                    for (let i = 0; i < delta; i++) incToday();
                    lastIncrementAt = now;
                  }
                }
                if (countNow !== prevAssistantCount) prevAssistantCount = countNow;

                // 2) Mark newly seen assistant nodes (secondary heuristic)
                const list = document.querySelectorAll('.mes, .assistant, [data-owner], .bubble-assistant, .message');
                let added = 0;
                list.forEach(function(el){
                  if (!(el instanceof HTMLElement)) return;
                  if (el.getAttribute(markedAttr) === '1') return;
                  if (!isAssistantElement(el)) return;
                  el.setAttribute(markedAttr, '1');
                  added++;
                });
                if (added > 0) {
                  const now = Date.now();
                  if (now - lastIncrementAt > 1500) {
                    incToday();
                    lastIncrementAt = now;
                  }
                }
                // Always refresh UI so user sees changes immediately
                renderStats();
              }

              function start(){
                if (timerId) return;
                timerId = setInterval(scanAndMark, 300);
              }
              function stop(){
                if (timerId) clearInterval(timerId);
                timerId = null;
              }

              const enableCb = document.querySelector('#video-test-enable');
              if (enableCb) {
                enableCb.addEventListener('change', function(_e){
                  renderStats();
                });
              }
              start();
            })();

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
