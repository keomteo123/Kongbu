/* Kongbu 공유 — 폰/PC의 공유창(Web Share API)으로 파일을 바로 보내요. 지원하지 않는 브라우저에서는 버튼이 숨겨져요. */
(function () {
  var ok = false;
  try { ok = !!(navigator.share && navigator.canShare && navigator.canShare({ files: [new File(['a'], 'a.txt', { type: 'text/plain' })] })); } catch (e) {}

  function label(btn, text) { var n = btn.lastChild; if (n) n.textContent = text; }

  function shareFile(file, btn) {
    return navigator.share({ files: [file], title: file.name }).catch(function (e) {
      if (e && e.name === 'AbortError') return;                       // 사용자가 공유창을 닫음
      if (e && e.name === 'NotAllowedError' && btn) {                 // 일부 브라우저는 버튼을 직접 누른 직후에만 허용 → 한 번 더
        btn._file = file; label(btn, '한 번 더 눌러 주세요'); return;
      }
      if (btn) { label(btn, '공유할 수 없는 파일이에요'); setTimeout(function () { label(btn, '공유'); }, 2500); }
    });
  }
  function toFile(blob, name) { return new File([blob], name, { type: blob.type || 'application/octet-stream' }); }

  window.KShare = {
    ok: ok,
    // 다운로드 링크(a) 옆에 공유 버튼 붙이기
    addTo: function (a, blob, name) {
      if (!ok || !a || !blob) return;
      var file = toFile(blob, name || a.getAttribute('download') || 'file');
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'btn'; b.innerHTML = window.I('share') + '<span>공유</span>';
      b.onclick = function () { if (b._file) { var f = b._file; b._file = null; label(b, '공유'); return shareFile(f, b); } return shareFile(file, b); };
      a.insertAdjacentElement('afterend', b);
    },
    // 미리 만들어 둔 버튼에 연결. getFn()은 {blob, name} 또는 Promise를 돌려줘요.
    bind: function (btn, getFn) {
      if (!btn) return;
      if (!ok) { btn.hidden = true; return; }
      btn.addEventListener('click', async function () {
        if (btn._file) { var f0 = btn._file; btn._file = null; label(btn, '공유'); return shareFile(f0, btn); }
        btn.disabled = true;
        try {
          var r = await getFn();
          if (r && r.blob) await shareFile(toFile(r.blob, r.name || 'file'), btn);
        } finally { btn.disabled = false; }
      });
    }
  };
})();
