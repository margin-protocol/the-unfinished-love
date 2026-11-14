/* 人物登記｜產生 ChelizAI 開局文字
   輸出格式對照《愛的未完成式》ChelizAI 正式開場登記表（純文字版）。
   修改欄位時，請同步修改 registration.html 的表單與這裡的 FORMAT。

   隱私：資料只存在目前頁面的記憶體中，不寫入 localStorage、不傳送到任何伺服器。
   重新整理或關閉頁面後即消失。 */
(function () {
  'use strict';

  var FORMAT = [
    { title: '【你】', fields: [
      ['姓名', 'p_name'], ['性別', 'p_gender'], ['成年年齡', 'p_age'],
      ['外貌', 'p_look'], ['個性', 'p_personality'], ['職業', 'p_job'],
    ] },
    { title: '【配偶】', fields: [
      ['姓名', 's_name'], ['性別', 's_gender'], ['成年年齡', 's_age'],
      ['外貌', 's_look'], ['個性', 's_personality'], ['說話風格', 's_voice'], ['職業', 's_job'],
    ] },
    { title: '【這段婚姻】', fields: [
      ['婚姻年數', 'm_years'], ['故事所在地（會影響法律程序）', 'm_place'], ['共同住所', 'm_home'],
      ['經濟與家務分工', 'm_division'], ['子女或寵物（如適用）', 'm_family'], ['其他公開事實', 'm_facts'],
    ] },
  ];

  var form = document.getElementById('reg-form');
  var out = document.getElementById('reg-text');
  var copyBtn = document.getElementById('reg-copy');
  var clearBtn = document.getElementById('reg-clear');
  var after = document.getElementById('reg-after');
  if (!form || !out) return;

  function val(name) {
    var el = form.elements[name];
    // 換行收成一行，避免破壞「欄位：內容」格式
    return el ? el.value.replace(/\s*\n+\s*/g, ' ').trim() : '';
  }

  function compose() {
    return FORMAT.map(function (sec) {
      return [sec.title].concat(sec.fields.map(function (f) { return f[0] + '：' + val(f[1]); })).join('\n');
    }).join('\n\n');
  }

  // 成年檢查：只有在填入「明確小於 18 的數字」時提醒
  function checkAges() {
    var ok = true;
    ['p_age', 's_age'].forEach(function (name) {
      var el = form.elements[name];
      var warn = document.getElementById(name + '-warn');
      var m = el.value.match(/\d+/);
      var bad = m && parseInt(m[0], 10) < 18;
      el.setAttribute('aria-invalid', bad ? 'true' : 'false');
      if (warn) warn.textContent = bad ? '本作品的角色需為成年人（18 歲以上）。' : '';
      if (bad) ok = false;
    });
    return ok;
  }

  function update() {
    out.textContent = compose();
    var ok = checkAges();
    copyBtn.disabled = !ok;
    copyBtn.setAttribute('aria-disabled', ok ? 'false' : 'true');
  }

  form.addEventListener('input', update);
  form.addEventListener('submit', function (e) { e.preventDefault(); });

  copyBtn.addEventListener('click', function () {
    if (!checkAges()) return;
    window.ULSite.copyText(compose()).then(function () {
      window.ULSite.toast('已複製登記資料');
      after.hidden = false;
    }, function () {
      window.ULSite.toast('無法自動複製，請手動選取右側文字');
    });
  });

  // 清空需要按兩次，避免誤觸（不使用瀏覽器對話框）
  var armed = false, armTimer;
  var clearLabel = clearBtn.textContent;
  clearBtn.addEventListener('click', function () {
    if (!armed) {
      armed = true;
      clearBtn.textContent = '再按一次確認清空';
      clearBtn.classList.add('is-armed');
      armTimer = setTimeout(disarm, 4000);
      return;
    }
    disarm();
    form.reset();
    after.hidden = true;
    update();
    window.ULSite.toast('已清空所有欄位');
    var first = form.querySelector('input, textarea');
    if (first) first.focus();
  });
  function disarm() {
    armed = false;
    clearTimeout(armTimer);
    clearBtn.textContent = clearLabel;
    clearBtn.classList.remove('is-armed');
  }

  update();
})();
