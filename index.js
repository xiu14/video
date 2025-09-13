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
              const enable = document.querySelector('#video-test-enable');
              if (enable && enable instanceof HTMLInputElement) enable.checked = isEnabled();

              const map = loadCounts();
              // Build sorted list of days with data (desc)
              const entries = Object.keys(map)
                .filter(k => map[k] > 0)
                .sort((a,b) => a < b ? 1 : -1);

              // Render recent 3 days with data
              const recentHost = document.querySelector('#video-test-recent');
              if (recentHost) {
                const recent = entries.slice(0, 3);
                if (recent.length === 0) {
                  recentHost.innerHTML = '<div style="opacity:.7;font-size:13px;">暂无数据</div>';
                } else {
                  recentHost.innerHTML = recent.map(k => (
                    '<div style="border:1px solid #333;border-radius:6px;padding:8px;">\n' +
                    '  <div style="font-size:12px;color:#aaa;">'+k+'</div>\n' +
                    '  <div style="font-size:18px;">'+map[k]+'</div>\n' +
                    '</div>'
                  )).join('');
                }
              }

              // Month select options from all available keys
              const monthSel = document.querySelector('#video-test-month-select');
              const allWrap = document.querySelector('#video-test-all-wrap');
              const monthHost = document.querySelector('#video-test-month-stats');
              if (monthSel && monthHost) {
                const months = Array.from(new Set(Object.keys(map).map(k => k.slice(0,7)))).sort((a,b)=> a < b ? 1 : -1);
                const current = localStorage.getItem('videoTest.month') || (months[0] || new Date().toISOString().slice(0,7));
                monthSel.innerHTML = months.map(m => '<option value="'+m+'"'+(m===current?' selected':'')+'>'+m+'</option>').join('');
                localStorage.setItem('videoTest.month', current);

                function renderMonth(m){
                  // list all days in month
                  const [y, mo] = m.split('-').map(x=>parseInt(x,10));
                  const first = new Date(y, mo-1, 1);
                  const next = new Date(y, mo, 1);
                  const days = [];
                  for (let d = new Date(first); d < next; d.setDate(d.getDate()+1)) {
                    const k = d.toISOString().slice(0,10);
                    const val = map[k] || 0;
                    days.push({ key:k, value: val });
                  }
                  monthHost.innerHTML = days.map(d => (
                    '<div style="border:1px solid #333;border-radius:6px;padding:8px;">\n' +
                    '  <div style="font-size:12px;color:#aaa;">'+d.key+'</div>\n' +
                    '  <div style="font-size:18px;">'+d.value+'</div>\n' +
                    '</div>'
                  )).join('');
                }
                if (allWrap && allWrap.style.display !== 'none') {
                  renderMonth(current);
                }
                monthSel.onchange = function(){ localStorage.setItem('videoTest.month', this.value); renderMonth(this.value); };
              }
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

              function scanAndMark(){
                if (!isEnabled()) return;
                // Broad query; safe on mobile where class names differ
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
                  // Collapse burst into a single increment with debounce to avoid multi-scan duplication
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

              // Toggle with enable checkbox (always keep timer running; gating inside scan)
              const enableCb = document.querySelector('#video-test-enable');
              if (enableCb) {
                enableCb.addEventListener('change', function(_e){
                  renderStats();
                });
              }
              const toggleAllBtn = document.querySelector('#video-test-toggle-all');
              if (toggleAllBtn) {
                toggleAllBtn.addEventListener('click', function(){
                  const wrap = document.querySelector('#video-test-all-wrap');
                  if (!wrap) return;
                  const visible = wrap.style.display !== 'none';
                  wrap.style.display = visible ? 'none' : 'block';
                  this.textContent = visible ? '查看全部' : '收起';
                  renderStats();
                });
              }
              // Always start polling
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
