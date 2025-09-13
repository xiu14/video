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
                const st = document.querySelector('#video-test-status');
                if (st) { st.style.display='block'; st.textContent = '未找到扩展容器，已使用兜底位置渲染'; }
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
            const st = document.querySelector('#video-test-status');
            if (st) { st.style.display='block'; st.textContent = '扩展面板已加载'; }
            bootstrapPanel();
          })
          .catch(function (err) {
            // show error in panel if possible
            const st = document.querySelector('#video-test-status');
            if (st) { st.style.display='block'; st.textContent = '渲染错误：' + (err && err.message ? err.message : err); }
          });
      }

      function bootstrapPanel(){
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

            function renderStats(force) {
              const enable = document.querySelector('#video-test-enable');
              if (enable && enable instanceof HTMLInputElement) enable.checked = isEnabled();

              const map = loadCounts();
              // Overall total
              const total = Object.values(map).reduce((a,b)=>a+(b||0), 0);
              const totalEl = document.querySelector('#video-test-total');
              if (totalEl) totalEl.textContent = String(total);

              // Build sorted list of days with data (desc)
              const entries = Object.keys(map)
                .filter(k => map[k] > 0)
                .sort((a,b) => a < b ? 1 : -1);

              // Render recent 3 days with data
              const recentHost = document.querySelector('#video-test-recent');
              if (recentHost) {
                const recent = entries.slice(0, 3);
                recentHost.innerHTML = recent.length === 0
                  ? '<div class="muted" style="opacity:.7;">暂无数据</div>'
                  : recent.map(k => (
                      '<div class="card">\n' +
                      '  <div class="muted">'+k+'</div>\n' +
                      '  <div class="value">'+map[k]+'</div>\n' +
                      '</div>'
                    )).join('');
              }

              // Month select options from all available keys (only months that have any data)
              const monthSel = document.querySelector('#video-test-month-select');
              const allWrap = document.querySelector('#video-test-all-wrap');
              const monthHost = document.querySelector('#video-test-month-stats');
              const monthTotalEl = document.querySelector('#video-test-month-total');
              if (monthSel && monthHost) {
                const months = Array.from(
                  new Set(Object.keys(map).filter(k=>map[k]>0).map(k => k.slice(0,7)))
                ).sort((a,b)=> a < b ? 1 : -1);
                const current = (function(){
                  const saved = localStorage.getItem('videoTest.month');
                  if (saved && months.includes(saved)) return saved;
                  return months[0] || new Date().toISOString().slice(0,7);
                })();

                // Only rebuild month options if changed or force
                const prevOptionsSig = monthSel.getAttribute('data-sig');
                const nextOptionsSig = months.join('|');
                if (force || prevOptionsSig !== nextOptionsSig) {
                  monthSel.innerHTML = months.map(m => '<option value="'+m+'"'+(m===current?' selected':'')+'>'+m+'</option>').join('');
                  monthSel.setAttribute('data-sig', nextOptionsSig);
                  localStorage.setItem('videoTest.month', current);
                } else {
                  // keep current selection
                }

                function renderMonth(m){
                  // only include dates with data and in the selected month
                  const daily = Object.keys(map)
                    .filter(k => map[k] > 0 && k.startsWith(m))
                    .sort((a,b)=> a < b ? 1 : -1)
                    .map(k => ({ key:k, value: map[k] }));
                  monthHost.innerHTML = daily.length === 0
                    ? '<div class="muted" style="opacity:.7;">该月暂无数据</div>'
                    : daily.map(d => (
                        '<div class="card">\n' +
                        '  <div class="muted">'+d.key+'</div>\n' +
                        '  <div class="value">'+d.value+'</div>\n' +
                        '</div>'
                      )).join('');
                  if (monthTotalEl) {
                    const sum = daily.reduce((a,b)=>a+(b.value||0),0);
                    monthTotalEl.textContent = String(sum);
                  }
                }
                const currentVal = (monthSel instanceof HTMLSelectElement) ? (monthSel.value || current) : current;
                if (allWrap && allWrap.style.display !== 'none') {
                  renderMonth(currentVal);
                }
                monthSel.onchange = function(){
                  const val = (this instanceof HTMLSelectElement) ? this.value : current;
                  localStorage.setItem('videoTest.month', val);
                  renderMonth(val);
                };
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
              let chatObserver = null;
              let primed = false;
              let ignoreUntil = 0; // timestamp until which increments are ignored
              const baselineCountKey = 'videoTest.baselineCount';
              const baselineDayKey = 'videoTest.baselineDay';
              const lastSigKey = 'videoTest.lastSig';
              const lastSigDayKey = 'videoTest.lastSigDay';
              let lastMutationAt = 0;

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

              const ROOT_SELECTOR = '.message.assistant, .mes.from-ia, .mes[data-owner="assistant"], .bubble-assistant, .message[data-owner="assistant"]';
              function findTopAssistantRoot(el){
                let cur = el;
                while (cur && cur.parentElement && isAssistantElement(cur.parentElement)) {
                  cur = cur.parentElement;
                }
                return cur;
              }
              function selectAssistantContainers(){
                // Prefer explicit top-level assistant message wrappers
                const explicit = Array.from(document.querySelectorAll(ROOT_SELECTOR));
                if (explicit.length) return explicit;
                // Fallback: compute unique top-level assistant nodes from broad matches
                const broad = Array.from(document.querySelectorAll('.mes, .message, .assistant, [data-owner], .bubble-assistant'));
                const uniq = new Set();
                const result = [];
                for (const el of broad) {
                  if (!(el instanceof HTMLElement)) continue;
                  if (!isAssistantElement(el)) continue;
                  const root = findTopAssistantRoot(el);
                  if (!uniq.has(root)) { uniq.add(root); result.push(root); }
                }
                return result;
              }

              function loadBaseline(){
                const day = localStorage.getItem(baselineDayKey);
                const cnt = parseInt(localStorage.getItem(baselineCountKey) || '0', 10) || 0;
                return { day, cnt };
              }
              function saveBaseline(day, cnt){
                try { localStorage.setItem(baselineDayKey, day); localStorage.setItem(baselineCountKey, String(cnt)); } catch(_) {}
              }

              function getAssistantSignature(){
                const list = selectAssistantContainers();
                if (!list.length) return '';
                const last = list[list.length - 1];
                // Prefer message id-like attributes if present
                const byAttr = last.getAttribute('data-id') || last.getAttribute('data-msg-id');
                if (byAttr) return 'id:' + byAttr;
                const text = (last.textContent || '').replace(/\s+/g, ' ').trim();
                const head = text.slice(0, 200);
                return 't:' + head + '#len=' + text.length;
              }
              function getAssistantSignatureInfo(){
                const list = selectAssistantContainers();
                if (!list.length) return { sig: '', byId: false };
                const last = list[list.length - 1];
                const byAttr = last.getAttribute('data-id') || last.getAttribute('data-msg-id');
                if (byAttr) return { sig: 'id:' + byAttr, byId: true };
                const text = (last.textContent || '').replace(/\s+/g, ' ').trim();
                const head = text.slice(0, 200);
                return { sig: 't:' + head + '#len=' + text.length, byId: false };
              }
              function loadSig(){
                const day = localStorage.getItem(lastSigDayKey);
                const sig = localStorage.getItem(lastSigKey) || '';
                return { day, sig };
              }
              function saveSig(day, sig){
                try { localStorage.setItem(lastSigDayKey, day); localStorage.setItem(lastSigKey, sig || ''); } catch(_) {}
              }

              // Mark all existing assistant nodes but DO NOT count them
              function primeBaseline(){
                // Mark existing top-level assistant nodes so they are not counted
                const list = selectAssistantContainers();
                list.forEach(function(el){
                  if (!(el instanceof HTMLElement)) return;
                  if (el.getAttribute(markedAttr) === '1') return;
                  el.setAttribute(markedAttr, '1');
                });

                const now = Date.now();
                lastIncrementAt = now;
                // Allow a slightly longer grace period to avoid counting history reloads
                ignoreUntil = now + 3000;

                const todayKey = getTodayKey();
                const currentCount = selectAssistantContainers().length;

                // Respect existing baseline for today (do NOT overwrite on refresh)
                const { day: baseDay, cnt: baseCnt } = loadBaseline();
                if (baseDay !== todayKey || !(typeof baseCnt === 'number' && baseCnt >= 0)) {
                  saveBaseline(todayKey, currentCount);
                }

                // Respect existing last signature for today (do NOT overwrite on refresh)
                const sigInfo = getAssistantSignatureInfo();
                const currentSig = sigInfo.sig;
                const { day: sigDay, sig: storedSig } = loadSig();
                if (sigDay !== todayKey || !storedSig) {
                  saveSig(todayKey, currentSig);
                }

                primed = true;
              }

              function scanAndMark(){
                if (!isEnabled() || !primed) return;
                const now = Date.now();
                const todayKey = getTodayKey();
                const currentCount = selectAssistantContainers().length;
                const { day: baseDay, cnt: baseCnt } = loadBaseline();
                if (baseDay !== todayKey) {
                  saveBaseline(todayKey, currentCount);
                  const sigInit = getAssistantSignatureInfo();
                  saveSig(todayKey, sigInit.sig);
                }

                // Mark any unmarked top-level assistant nodes to avoid repeated processing
                const roots = selectAssistantContainers();
                roots.forEach(function(el){
                  if (!(el instanceof HTMLElement)) return;
                  if (el.getAttribute(markedAttr) === '1') return;
                  el.setAttribute(markedAttr, '1');
                });

                const sigInfo = getAssistantSignatureInfo();
                const curSig = sigInfo.sig;
                const { sig: savedSig } = loadSig();

                if (now < ignoreUntil) {
                  // Treat initial history (no matter how many nodes) as baseline, never increment
                  saveBaseline(todayKey, currentCount);
                  saveSig(todayKey, curSig);
                } else {
                  if (sigInfo.byId) {
                    // With stable message id, count strictly on signature change
                    if (curSig && curSig !== savedSig && (now - lastIncrementAt > 500)) {
                      incToday();
                      lastIncrementAt = now;
                      saveBaseline(todayKey, currentCount);
                      saveSig(todayKey, curSig);
                    } else if (currentCount > baseCnt) {
                      // Catch up baseline if older messages loaded without a new reply
                      saveBaseline(todayKey, currentCount);
                    }
                  } else {
                    // Fallback: no stable id, use count increase and debounce to avoid duplicate counts
                    if ((now - lastIncrementAt > 1200) && currentCount > baseCnt) {
                      incToday();
                      lastIncrementAt = now;
                      saveBaseline(todayKey, currentCount);
                      saveSig(todayKey, curSig);
                    } else if (currentCount > baseCnt) {
                      // History catch-up
                      saveBaseline(todayKey, currentCount);
                    }
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

              // MutationObserver for immediate updates when new nodes are appended
              function attachObserver(){
                if (chatObserver) return;
                const root = document.querySelector('#chat');
                if (!root) return;
                chatObserver = new MutationObserver(function(muts){
                  if (!isEnabled() || !primed) return;
                  let hit = false;
                  for (const m of muts) {
                    for (const n of m.addedNodes) {
                      if (!(n instanceof HTMLElement)) continue;
                      if (isAssistantElement(n)) { hit = true; break; }
                      if (n.querySelector && n.querySelector('.mes, .assistant, [data-owner="assistant"], .bubble-assistant, .message.assistant')) { hit = true; break; }
                    }
                    if (hit) break;
                  }
                  if (hit) {
                    // Record last mutation time and let the polling scanner do the counting to avoid double increments
                    lastMutationAt = Date.now();
                    renderStats();
                  }
                });
                try { chatObserver.observe(root, { childList: true, subtree: true }); } catch(_) {}
              }
              // Retry attaching observer until found
              const attachTimer = setInterval(function(){
                if (document.querySelector('#chat')) { attachObserver(); clearInterval(attachTimer); }
              }, 500);

              // Toggle with enable checkbox (always keep timer running; gating inside scan)
              const enableCb = document.querySelector('#video-test-enable');
              if (enableCb) {
                let lastState = isEnabled();
                enableCb.addEventListener('change', function(_e){
                  const nowOn = isEnabled();
                  if (nowOn && !lastState) { // turning on
                    primed = false;
                    // Prime after a tiny delay to allow any late DOM to settle
                    setTimeout(function(){ primeBaseline(); renderStats(true); }, 200);
                  }
                  lastState = nowOn;
                  renderStats(true);
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
                  renderStats(true);
                });
              }
              // Always start polling
              // Prime once on startup, then start
              setTimeout(function(){ primeBaseline(); start(); }, 200);
            })();

            // Initial render
            renderStats();
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
