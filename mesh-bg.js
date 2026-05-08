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
  var LINE_ALPHA = 0.072, DOT_ALPHA = 0.135;
  var docH = 0;

  var headerBottom = 0;
  var contentLeft = 0, contentRight = 0;
  var FADE_WIDTH = 120;

  function getDocHeight() {
    return Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
  }

  function measureLayout() {
    var hero = document.querySelector('.hero, .hero-scroll, .hero-wrap');
    if (hero) {
      var r = hero.getBoundingClientRect();
      headerBottom = r.bottom + window.scrollY;
    } else {
      headerBottom = H;
    }
    var maxW = 1280;
    var wrap = document.querySelector('.wrap, .section-title, .pillars-section');
    if (wrap) {
      var wr = wrap.getBoundingClientRect();
      if (wr.width > 100 && wr.width < W * 0.95) {
        maxW = wr.width;
      }
    }
    contentLeft = (W - maxW) / 2;
    contentRight = (W + maxW) / 2;
    if (contentLeft < 40) { contentLeft = 40; contentRight = W - 40; }
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
    measureLayout();
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
          x: 0, y: 0
        });
      }
    }
  }

  function sidesFade(px, worldY) {
    if (worldY < headerBottom) return 1;

    var transitionH = 200;
    var headerFade = 1;
    if (worldY < headerBottom + transitionH) {
      headerFade = 1 - (worldY - headerBottom) / transitionH;
    } else {
      headerFade = 0;
    }

    var sideFade = 0;
    if (px < contentLeft) {
      var d = contentLeft - px;
      var t = Math.min(d / FADE_WIDTH, 1);
      // Stepped gradient: 0→0.2→0.3→0.6→0.8→1.0
      if (t < 0.1) sideFade = t / 0.1 * 0.2;
      else if (t < 0.25) sideFade = 0.2 + (t - 0.1) / 0.15 * 0.1;
      else if (t < 0.45) sideFade = 0.3 + (t - 0.25) / 0.2 * 0.3;
      else if (t < 0.7) sideFade = 0.6 + (t - 0.45) / 0.25 * 0.2;
      else sideFade = 0.8 + (t - 0.7) / 0.3 * 0.2;
    } else if (px > contentRight) {
      var d = px - contentRight;
      var t = Math.min(d / FADE_WIDTH, 1);
      if (t < 0.1) sideFade = t / 0.1 * 0.2;
      else if (t < 0.25) sideFade = 0.2 + (t - 0.1) / 0.15 * 0.1;
      else if (t < 0.45) sideFade = 0.3 + (t - 0.25) / 0.2 * 0.3;
      else if (t < 0.7) sideFade = 0.6 + (t - 0.45) / 0.25 * 0.2;
      else sideFade = 0.8 + (t - 0.7) / 0.3 * 0.2;
    }

    return Math.max(headerFade, sideFade);
  }

  function hslColor(x, y, t) {
    return (220 + Math.sin(x * 0.003 + t * 0.4) * 30 + Math.cos(y * 0.004 + t * 0.3) * 20) % 360;
  }

  var time = 0;
  var lastLayoutTime = 0;

  function draw() {
    time += 0.008;
    var scrollY = window.scrollY;
    ctx.clearRect(0, 0, W, H);

    smoothMouse.x += (mouse.x - smoothMouse.x) * 0.08;
    smoothMouse.y += (mouse.y - smoothMouse.y) * 0.08;
    var mx = smoothMouse.x, my = smoothMouse.y;

    var now = performance.now();
    if (now - lastLayoutTime > 500) {
      measureLayout();
      lastLayoutTime = now;
    }

    // Collect active sphere repellers
    var spheres = [];
    var sr = window._sphereRepels;
    if (sr) {
      for (var key in sr) {
        var sp = sr[key];
        if (sp && sp.r > 0) spheres.push(sp);
      }
    }
    var SPHERE_PAD = 18;
    var SPHERE_FALLOFF = 40;
    var SPHERE_PUSH = 20;

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

        // Sphere repulsion (circular, dynamic radius)
        for (var si = 0; si < spheres.length; si++) {
          var sp = spheres[si];
          var sdx = fx - sp.cx, sdy = fy - sp.cy;
          var sDist = Math.sqrt(sdx * sdx + sdy * sdy);
          var edge = sp.r + SPHERE_PAD;
          if (sDist < edge + SPHERE_FALLOFF && sDist > 0) {
            if (sDist < edge) {
              var ang = Math.atan2(sdy, sdx);
              fx = sp.cx + Math.cos(ang) * (edge + 2);
              fy = sp.cy + Math.sin(ang) * (edge + 2);
            } else {
              var sf = 1 - (sDist - edge) / SPHERE_FALLOFF;
              var ang = Math.atan2(sdy, sdx);
              fx += Math.cos(ang) * sf * sf * SPHERE_PUSH;
              fy += Math.sin(ang) * sf * sf * SPHERE_PUSH;
            }
          }
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
      }
    }

    for (var r = startRow; r < endRow; r++) {
      for (var c = 0; c < cols; c++) {
        var idx = r * cols + c;
        var p = points[idx];
        if (p.y < -spacing || p.y > H + spacing) continue;

        var worldY = p.y + scrollY;
        var fade = sidesFade(p.ox, worldY);
        if (fade < 0.005) continue;

        var hue = hslColor(p.ox, p.oy, time);
        var md = Math.sqrt((p.x - mx) * (p.x - mx) + (p.y - my) * (p.y - my));
        var nm = md < MOUSE_RADIUS;
        var mf = nm ? Math.max(0, 1 - Math.pow(1 - md / MOUSE_RADIUS, 0.5)) : 1;
        fade = Math.min(fade, mf);

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
