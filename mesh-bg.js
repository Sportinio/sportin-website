(function() {
  var canvas = document.getElementById('meshCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');

  var W, H, spacing = 32;
  var totalRows, cols;
  var points = [];
  var mouse = { x: -9999, y: -9999 };
  var smoothMouse = { x: -9999, y: -9999 };
  var MOUSE_RADIUS = 180, MOUSE_PUSH = 90;
  var LINE_ALPHA = 0.08, DOT_ALPHA = 0.15;
  var docH = 0;

  var MASK_SCALE = 2;
  var BLUR_RADIUS = 2;
  var CONTENT_PUSH = 12;
  var maskW = 0, maskH = 0;
  var maskAlpha = null, maskGX = null, maskGY = null;
  var offA = document.createElement('canvas');
  var offACtx = offA.getContext('2d', { willReadFrequently: true });
  var lastMaskTime = 0;
  var MASK_THROTTLE = 200;

  var ALWAYS_INCLUDE = { H1:1, H2:1, H3:1, H4:1, H5:1, H6:1, P:1, IMG:1, SVG:1, VIDEO:1, NAV:1, HEADER:1, FOOTER:1, BLOCKQUOTE:1, PRE:1, TABLE:1, FIGURE:1, PICTURE:1, UL:1, OL:1 };
  var ALWAYS_EXCLUDE = { SCRIPT:1, STYLE:1, LINK:1, META:1, BR:1, HR:1, NOSCRIPT:1, TEMPLATE:1, HEAD:1 };

  function getDocHeight() {
    return Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    docH = getDocHeight();
    buildGrid();
    rebuildMask();
  }

  function buildGrid() {
    points = [];
    cols = Math.ceil(W / spacing) + 2;
    totalRows = Math.ceil(docH / spacing) + 2;
    var offX = (W - (cols - 1) * spacing) / 2;
    for (var r = 0; r < totalRows; r++) {
      for (var c = 0; c < cols; c++) {
        points.push({
          ox: offX + c * spacing,
          oy: r * spacing,
          x: 0, y: 0, ca: 0
        });
      }
    }
  }

  var LEAF_TAGS = { A:1, BUTTON:1, INPUT:1, SELECT:1, TEXTAREA:1, LABEL:1, SPAN:1 };
  var CONTAINER_TAGS = { DIV:1, SECTION:1, ARTICLE:1, ASIDE:1, MAIN:1, FORM:1 };

  function collectRects() {
    var rects = [];
    var els = document.body.getElementsByTagName('*');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el === canvas) continue;
      var tag = el.tagName;
      if (ALWAYS_EXCLUDE[tag]) continue;

      var r = el.getBoundingClientRect();
      if (r.width < 25 || r.height < 12) continue;
      if (r.bottom < -30 || r.top > H + 30) continue;

      if (ALWAYS_INCLUDE[tag]) {
        if (tag === 'NAV' || tag === 'HEADER' || tag === 'FOOTER') {
          rects.push(r);
          continue;
        }
        if (r.width > W * 0.7 && r.height > 100) continue;
        rects.push(r);
        continue;
      }

      if (CONTAINER_TAGS[tag]) {
        if (r.width > W * 0.6) continue;
        if (r.height > 400) continue;
        if (el.children.length > 2) continue;
        rects.push(r);
        continue;
      }

      if (LEAF_TAGS[tag]) {
        if (r.width > W * 0.7) continue;
        rects.push(r);
        continue;
      }
    }
    return rects;
  }

  function blurAlpha(data, w, h, rad) {
    var tmp = new Float32Array(w * h);
    var diam = rad * 2 + 1;
    var inv = 1 / diam;
    for (var y = 0; y < h; y++) {
      var sum = 0;
      for (var x = -rad; x <= rad; x++)
        sum += data[y * w + Math.max(0, Math.min(x, w - 1))];
      for (var x = 0; x < w; x++) {
        tmp[y * w + x] = sum * inv;
        sum += data[y * w + Math.min(x + rad + 1, w - 1)] - data[y * w + Math.max(x - rad, 0)];
      }
    }
    for (var x = 0; x < w; x++) {
      var sum = 0;
      for (var y = -rad; y <= rad; y++)
        sum += tmp[Math.max(0, Math.min(y, h - 1)) * w + x];
      for (var y = 0; y < h; y++) {
        data[y * w + x] = sum * inv;
        sum += tmp[Math.min(y + rad + 1, h - 1) * w + x] - tmp[Math.max(y - rad, 0) * w + x];
      }
    }
  }

  function rebuildMask() {
    maskW = Math.ceil(W / MASK_SCALE);
    maskH = Math.ceil(H / MASK_SCALE);
    if (maskW < 2 || maskH < 2) return;
    offA.width = maskW;
    offA.height = maskH;
    offACtx.clearRect(0, 0, maskW, maskH);
    offACtx.fillStyle = '#fff';

    var rects = collectRects();
    var pad = 3;
    for (var i = 0; i < rects.length; i++) {
      var r = rects[i];
      offACtx.fillRect(
        (r.left - pad) / MASK_SCALE,
        (r.top - pad) / MASK_SCALE,
        (r.width + pad * 2) / MASK_SCALE,
        (r.height + pad * 2) / MASK_SCALE
      );
    }

    var imgData = offACtx.getImageData(0, 0, maskW, maskH);
    var px = imgData.data;
    maskAlpha = new Float32Array(maskW * maskH);
    for (var i = 0; i < maskAlpha.length; i++) maskAlpha[i] = px[i * 4 + 3] / 255;

    blurAlpha(maskAlpha, maskW, maskH, BLUR_RADIUS);

    maskGX = new Float32Array(maskW * maskH);
    maskGY = new Float32Array(maskW * maskH);
    for (var y = 1; y < maskH - 1; y++) {
      for (var x = 1; x < maskW - 1; x++) {
        var idx = y * maskW + x;
        var gx = maskAlpha[idx - 1] - maskAlpha[idx + 1];
        var gy = maskAlpha[idx - maskW] - maskAlpha[idx + maskW];
        var len = Math.sqrt(gx * gx + gy * gy);
        if (len > 0.001) { gx /= len; gy /= len; }
        maskGX[idx] = gx;
        maskGY[idx] = gy;
      }
    }
    lastMaskTime = performance.now();
  }

  function sampleMask(sx, sy) {
    if (!maskAlpha) return 0;
    var mx = Math.floor(sx / MASK_SCALE);
    var my = Math.floor(sy / MASK_SCALE);
    if (mx < 1 || mx >= maskW - 1 || my < 1 || my >= maskH - 1) return 0;
    return maskAlpha[my * maskW + mx];
  }

  function sampleGrad(sx, sy) {
    if (!maskGX) return { x: 0, y: 0 };
    var mx = Math.floor(sx / MASK_SCALE);
    var my = Math.floor(sy / MASK_SCALE);
    if (mx < 1 || mx >= maskW - 1 || my < 1 || my >= maskH - 1) return { x: 0, y: 0 };
    var idx = my * maskW + mx;
    return { x: maskGX[idx], y: maskGY[idx] };
  }

  function hslColor(x, y, t) {
    return (220 + Math.sin(x * 0.003 + t * 0.4) * 30 + Math.cos(y * 0.004 + t * 0.3) * 20) % 360;
  }

  var time = 0;

  function draw() {
    time += 0.008;
    var scrollY = window.scrollY;
    ctx.clearRect(0, 0, W, H);

    smoothMouse.x += (mouse.x - smoothMouse.x) * 0.08;
    smoothMouse.y += (mouse.y - smoothMouse.y) * 0.08;
    var mx = smoothMouse.x, my = smoothMouse.y;

    var now = performance.now();
    if (now - lastMaskTime > MASK_THROTTLE) rebuildMask();

    var startRow = Math.max(0, Math.floor((scrollY - spacing * 2) / spacing));
    var endRow = Math.min(totalRows, Math.ceil((scrollY + H + spacing * 2) / spacing));

    for (var r = startRow; r < endRow; r++) {
      for (var c = 0; c < cols; c++) {
        var idx = r * cols + c;
        var p = points[idx];
        var bx = p.ox + Math.sin(time + p.oy * 0.008) * 3;
        var by = p.oy + Math.cos(time * 0.7 + p.ox * 0.006) * 3;
        var sy = by - scrollY;

        var fx = bx, fy = sy;
        var ca = sampleMask(bx, sy);
        if (ca > 0.01) {
          var g = sampleGrad(bx, sy);
          fx += g.x * ca * CONTENT_PUSH;
          fy += g.y * ca * CONTENT_PUSH;
        }

        var dx = fx - mx, dy = fy - my;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_RADIUS && dist > 0) {
          var f = 1 - dist / MOUSE_RADIUS;
          var a = Math.atan2(dy, dx);
          fx += Math.cos(a) * f * f * MOUSE_PUSH;
          fy += Math.sin(a) * f * f * MOUSE_PUSH;
        }

        p.x = fx;
        p.y = fy;
        p.ca = ca;
      }
    }

    for (var r = startRow; r < endRow; r++) {
      for (var c = 0; c < cols; c++) {
        var idx = r * cols + c;
        var p = points[idx];
        if (p.y < -spacing || p.y > H + spacing) continue;

        var hue = hslColor(p.ox, p.oy, time);
        var md = Math.sqrt((p.x - mx) * (p.x - mx) + (p.y - my) * (p.y - my));
        var nm = md < MOUSE_RADIUS;
        var mf = nm ? Math.max(0, 1 - Math.pow(1 - md / MOUSE_RADIUS, 0.5)) : 1;
        var cf = p.ca < 0.3 ? 1 : Math.max(0, 1 - (p.ca - 0.3) * 1.8);
        var fade = Math.min(mf, cf);

        if (c < cols - 1 && fade > 0.01) {
          var pr = points[idx + 1];
          var la = LINE_ALPHA * fade;
          if (la > 0.003) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(pr.x, pr.y);
            ctx.strokeStyle = 'hsla(' + hue + ',70%,60%,' + la + ')';
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
        if (r < endRow - 1 && fade > 0.01) {
          var pb = points[idx + cols];
          var la2 = LINE_ALPHA * fade;
          if (la2 > 0.003) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(pb.x, pb.y);
            ctx.strokeStyle = 'hsla(' + hue + ',70%,60%,' + la2 + ')';
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }

        var da = DOT_ALPHA * fade;
        if (da > 0.005) {
          var ds = nm ? 1.2 + (1 - mf) * 1.5 : 1.2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, ds, 0, Math.PI * 2);
          ctx.fillStyle = 'hsla(' + hue + ',70%,65%,' + da + ')';
          ctx.fill();
        }
      }
    }

    requestAnimationFrame(draw);
  }

  document.addEventListener('mousemove', function(e) {
    mouse.x = e.clientX; mouse.y = e.clientY;
  });
  document.addEventListener('mouseleave', function() {
    mouse.x = -9999; mouse.y = -9999;
  });

  var rt;
  window.addEventListener('resize', function() { clearTimeout(rt); rt = setTimeout(resize, 150); });
  resize();
  setTimeout(resize, 1000);
  draw();
})();
