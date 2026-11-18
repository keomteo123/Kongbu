/* Kongbu 차트 — 라이브러리 없이 canvas로 그리는 간단한 선/막대 그래프 (마우스·터치로 값 확인) */
(function () {
  var COLORS = ['#5b8cff', '#f59e0b', '#22c55e', '#ec4899'];

  function fmt(v) {
    var a = Math.abs(v);
    if (a >= 1e9) return +(v / 1e9).toFixed(2) + 'B';
    if (a >= 1e6) return +(v / 1e6).toFixed(2) + 'M';
    if (a >= 1e4) return +(v / 1e3).toFixed(1) + 'K';
    if (a >= 100) return String(Math.round(v));
    return String(+v.toFixed(2));
  }
  function niceStep(r) {
    if (!(r > 0)) return 1;
    var e = Math.pow(10, Math.floor(Math.log10(r))), f = r / e;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * e;
  }

  function geom(c) {
    var o = c._o, w = c.clientWidth || 600, h = o.height || 260;
    return { w: w, h: h, pl: 58, pr: 14, pt: 14, pb: 40 };
  }

  function draw(c, hi) {
    var o = c._o, g = geom(c), w = g.w, h = g.h, pl = g.pl, pr = g.pr, pt = g.pt, pb = g.pb;
    var iw = w - pl - pr, ih = h - pt - pb, dpr = window.devicePixelRatio || 1;
    c.style.height = h + 'px';
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
    var x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0);

    var isBar = o.type === 'bar';
    var series = isBar ? [{ name: o.name || '', color: o.color || COLORS[0], ys: o.values }] : o.series;
    var n = isBar ? o.values.length : o.xs.length;
    if (!n) return;

    var ymax = -Infinity, ymn = Infinity;
    series.forEach(function (s) { s.ys.forEach(function (v) { if (isFinite(v)) { if (v > ymax) ymax = v; if (v < ymn) ymn = v; } }); });
    if (!isFinite(ymax)) { ymax = 1; ymn = 0; }
    var ymin = isBar ? 0 : Math.min(0, ymn);
    if (ymax <= ymin) ymax = ymin + 1;
    var step = niceStep((ymax - ymin) / 5);
    ymin = Math.floor(ymin / step) * step; ymax = Math.ceil(ymax / step) * step;

    var xmin = 0, xmax = 1;
    if (!isBar) { xmin = o.xs[0]; xmax = o.xs[n - 1]; if (xmax === xmin) xmax = xmin + 1; }
    var X = isBar ? function (i) { return pl + (i + 0.5) / n * iw; }
                  : function (i) { return pl + (o.xs[i] - xmin) / (xmax - xmin) * iw; };
    var Y = function (v) { return pt + ih - (v - ymin) / (ymax - ymin) * ih; };

    x.font = '12px system-ui,-apple-system,sans-serif';
    x.lineWidth = 1; x.strokeStyle = '#252b38'; x.fillStyle = '#8b93a3';
    x.textAlign = 'right'; x.textBaseline = 'middle';
    for (var v = ymin; v <= ymax + step / 2; v += step) {
      var yy = Math.round(Y(v)) + 0.5;
      x.beginPath(); x.moveTo(pl, yy); x.lineTo(w - pr, yy); x.stroke();
      x.fillText(fmt(v), pl - 8, yy);
    }
    x.textAlign = 'center'; x.textBaseline = 'top';
    if (isBar) {
      var every = Math.ceil(n / 8);
      for (var i = 0; i < n; i += every) x.fillText(String(o.labels[i]), X(i), h - pb + 8);
    } else {
      var xs2 = niceStep((xmax - xmin) / 6);
      for (var t = Math.ceil(xmin / xs2) * xs2; t <= xmax + 1e-9; t += xs2) x.fillText(fmt(t), pl + (t - xmin) / (xmax - xmin) * iw, h - pb + 8);
    }
    if (o.xLabel) { x.textAlign = 'right'; x.fillText(o.xLabel, w - pr, h - 16); }

    if (isBar) {
      var bw = Math.max(1, iw / n * 0.82);
      for (var k = 0; k < n; k++) {
        var val = o.values[k]; if (!isFinite(val)) continue;
        x.fillStyle = k === hi ? '#9bb8ff' : series[0].color;
        x.fillRect(X(k) - bw / 2, Y(val), bw, Math.max(0, Y(ymin) - Y(val)));
      }
    } else {
      series.forEach(function (s) {
        x.strokeStyle = s.color; x.lineWidth = 2.2; x.lineJoin = 'round'; x.beginPath();
        var pen = false;
        for (var j = 0; j < n; j++) {
          if (!isFinite(s.ys[j])) { pen = false; continue; }
          if (!pen) { x.moveTo(X(j), Y(s.ys[j])); pen = true; } else x.lineTo(X(j), Y(s.ys[j]));
        }
        x.stroke();
      });
    }

    // 범례 (선 그래프에서 시리즈가 2개 이상일 때)
    if (!isBar && series.length > 1) {
      var lx = pl + 8;
      x.textAlign = 'left'; x.textBaseline = 'middle';
      series.forEach(function (s) {
        x.fillStyle = s.color; x.fillRect(lx, pt + 8, 14, 3);
        x.fillStyle = '#c7ccd6'; x.fillText(s.name, lx + 20, pt + 10);
        lx += 28 + x.measureText(s.name).width;
      });
    }

    // 마우스 올렸을 때 값 표시
    if (hi >= 0 && hi < n) {
      var lines;
      if (o.tipFn) lines = o.tipFn(hi);
      else if (isBar) lines = [String(o.labels[hi]), fmt(o.values[hi])];
      else { lines = [(o.xName || 'x') + ' ' + fmt(o.xs[hi])]; series.forEach(function (s) { lines.push(s.name + ': ' + fmt(s.ys[hi])); }); }
      var px = X(hi);
      if (!isBar) {
        x.strokeStyle = '#4a5265'; x.lineWidth = 1; x.beginPath(); x.moveTo(px, pt); x.lineTo(px, pt + ih); x.stroke();
        series.forEach(function (s) { if (isFinite(s.ys[hi])) { x.fillStyle = s.color; x.beginPath(); x.arc(px, Y(s.ys[hi]), 4, 0, 7); x.fill(); } });
      }
      x.font = '12px system-ui,-apple-system,sans-serif';
      var tw = 0; lines.forEach(function (l) { tw = Math.max(tw, x.measureText(l).width); });
      var bw2 = tw + 18, bh = lines.length * 18 + 10, bx = px + 12;
      if (bx + bw2 > w - 4) bx = px - 12 - bw2;
      if (bx < 4) bx = 4;
      x.fillStyle = 'rgba(20,23,32,.96)'; x.strokeStyle = '#2f3646'; x.lineWidth = 1;
      x.beginPath(); x.rect(bx, pt + 4, bw2, bh); x.fill(); x.stroke();
      x.fillStyle = '#eceff4'; x.textAlign = 'left'; x.textBaseline = 'middle';
      lines.forEach(function (l, q) { x.fillText(l, bx + 9, pt + 4 + 14 + q * 18); });
    }
  }

  function pick(c, clientX) {
    var o = c._o, g = geom(c), r = c.getBoundingClientRect();
    var px = clientX - r.left, iw = g.w - g.pl - g.pr, rel = (px - g.pl) / iw;
    var n = o.type === 'bar' ? o.values.length : o.xs.length;
    if (rel < -0.03 || rel > 1.03 || !n) return -1;
    var i = o.type === 'bar' ? Math.floor(rel * n) : Math.round(rel * (n - 1));
    return Math.max(0, Math.min(n - 1, i));
  }

  function init(c, o) {
    c._o = o; c.style.width = '100%'; c.style.display = 'block'; c.style.touchAction = 'pan-y';
    draw(c, -1);
    if (c._bound) return;
    c._bound = true;
    c.addEventListener('mousemove', function (e) { draw(c, pick(c, e.clientX)); });
    c.addEventListener('mouseleave', function () { draw(c, -1); });
    c.addEventListener('touchstart', function (e) { draw(c, pick(c, e.touches[0].clientX)); }, { passive: true });
    c.addEventListener('touchmove', function (e) { draw(c, pick(c, e.touches[0].clientX)); }, { passive: true });
    window.addEventListener('resize', function () { if (c._o) draw(c, -1); });
  }

  window.KChart = {
    line: function (c, o) { o.type = 'line'; init(c, o); },
    bars: function (c, o) { o.type = 'bar'; init(c, o); },
    fmt: fmt
  };
})();
