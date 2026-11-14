/* 《愛的未完成式》官網｜共用互動
   - 手機導覽開關
   - 檔案分頁（ARIA tabs，支援方向鍵）
   - 複製按鈕與提示
   - 輕量淡入
   不呼叫任何外部 API，不記錄使用者行為。 */
(function () {
  'use strict';

  /* ---------- 提示 ---------- */
  var toastEl = document.querySelector('.toast');
  var toastTimer;
  function toast(msg) {
    if (!toastEl) return;
    toastEl.hidden = false;
    toastEl.textContent = msg;
    // 下一個 frame 再加上 class，讓淡入生效
    requestAnimationFrame(function () { toastEl.classList.add('is-on'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('is-on');
      setTimeout(function () { toastEl.hidden = true; }, 300);
    }, 2400);
  }

  /* ---------- 複製 ---------- */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy') ? resolve() : reject(new Error('copy failed')); }
      catch (e) { reject(e); }
      finally { document.body.removeChild(ta); }
    });
  }

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-copy]');
    if (!btn) return;
    var text = btn.getAttribute('data-copy');
    var msg = btn.getAttribute('data-copied') || '已複製指令';
    copyText(text).then(function () {
      toast(msg);
      var label = btn.querySelector('.copy-label');
      if (label) {
        var old = label.textContent;
        label.textContent = '已複製';
        setTimeout(function () { label.textContent = old; }, 1600);
      }
    }, function () {
      toast('無法自動複製，請手動選取文字');
    });
  });

  /* ---------- 手機導覽 ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('site-nav');
  function setNav(open) {
    if (!toggle || !nav) return;
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    nav.classList.toggle('is-open', open);
    toggle.querySelector('.nav-toggle-label').textContent = open ? '關閉' : '目錄';
  }
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      setNav(toggle.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setNav(false);
        toggle.focus();
      }
    });
    document.addEventListener('click', function (e) {
      if (toggle.getAttribute('aria-expanded') === 'true' && !e.target.closest('.site-header')) setNav(false);
    });
    window.matchMedia('(min-width: 761px)').addEventListener('change', function (mq) {
      if (mq.matches) setNav(false);
    });
  }

  /* ---------- 分頁 ---------- */
  document.querySelectorAll('[data-tabs]').forEach(function (root) {
    var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
    var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });

    function select(i, focus) {
      tabs.forEach(function (t, j) {
        var on = i === j;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        panels[j].hidden = !on;
      });
      if (focus) tabs[i].focus();
      tabs[i].scrollIntoView({ block: 'nearest', inline: 'nearest' });
      if (history.replaceState) history.replaceState(null, '', '#' + panels[i].id);
    }

    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { select(i, false); });
      t.addEventListener('keydown', function (e) {
        var n = tabs.length, k = e.key, to = null;
        if (k === 'ArrowRight') to = (i + 1) % n;
        else if (k === 'ArrowLeft') to = (i - 1 + n) % n;
        else if (k === 'Home') to = 0;
        else if (k === 'End') to = n - 1;
        if (to !== null) { e.preventDefault(); select(to, true); }
      });
    });

    // 從網址錨點直接打開指定分頁（例如 archive.html#file-life）
    var start = 0;
    if (location.hash) {
      var idx = panels.findIndex(function (p) { return '#' + p.id === location.hash; });
      if (idx >= 0) start = idx;
    }
    tabs.forEach(function (t, j) {
      t.setAttribute('aria-selected', j === start ? 'true' : 'false');
      t.tabIndex = j === start ? 0 : -1;
      panels[j].hidden = j !== start;
    });
  });

  /* ---------- 淡入 ---------- */
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var items = document.querySelectorAll('.reveal');
  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.01 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('is-in'); });
  }

  window.ULSite = { toast: toast, copyText: copyText };
})();
