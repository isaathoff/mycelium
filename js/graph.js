// A small dependency-free force-directed graph for the "Brain" view.
// Nodes = cards, edges = links/people from frontmatter (deduped, undirected).
// Good enough for the scale a family knowledge base actually reaches
// (tens to low hundreds of cards) without pulling in d3.

const Graph = (() => {
  let canvas, ctx;
  let nodes = [];
  let edges = [];
  let byId = new Map();
  let transform = { x: 0, y: 0, scale: 1 };
  let dragNode = null;
  let panning = false;
  let panStart = null;
  let hoverNode = null;
  let filterFn = () => true;
  let onNodeClick = () => {};
  let rafId = null;

  function init(canvasEl, opts) {
    canvas = canvasEl;
    ctx = canvas.getContext("2d");
    onNodeClick = opts.onNodeClick || onNodeClick;
    resize();
    window.addEventListener("resize", resize);

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("click", onClick);
  }

  function resize() {
    if (!canvas) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
    if (nodes.length === 0) return;
  }

  function setData(cards) {
    // Seed with a fixed virtual layout size rather than the container's
    // real bounding rect: setData can be called before the graph view has
    // ever been shown (e.g. right after cards finish loading), at which
    // point display:none would make the rect 0x0 and collapse every node
    // to the same point. Real-time centering in tick() still uses the
    // live rect once the view is actually visible.
    const cx = 450, cy = 320;

    nodes = cards.map((card, i) => {
      const angle = (i / Math.max(cards.length, 1)) * Math.PI * 2;
      const radius = 190;
      return {
        id: card.id,
        title: card.title,
        category: card.category,
        color: Cards.categoryColor(card.category),
        x: cx + Math.cos(angle) * radius + (Math.random() - 0.5) * 20,
        y: cy + Math.sin(angle) * radius + (Math.random() - 0.5) * 20,
        vx: 0,
        vy: 0,
        r: 8,
      };
    });
    byId = new Map(nodes.map((n) => [n.id, n]));

    const seen = new Set();
    edges = [];
    for (const card of cards) {
      for (const targetId of [...card.links, ...card.people]) {
        if (!byId.has(targetId) || targetId === card.id) continue;
        const key = [card.id, targetId].sort().join("::");
        if (seen.has(key)) continue;
        seen.add(key);
        edges.push({ a: card.id, b: targetId });
      }
    }
  }

  function setFilter(fn) {
    filterFn = fn;
  }

  function tick() {
    const rect = canvas.parentElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return; // hidden (display:none) — skip physics rather than pulling toward (0,0)
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const REPULSION = 2600;
    const SPRING = 0.02;
    const REST_LEN = 90;
    const CENTER_PULL = 0.002;
    const DAMPING = 0.85;

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n === dragNode) continue;
      let fx = 0, fy = 0;

      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const o = nodes[j];
        let dx = n.x - o.x, dy = n.y - o.y;
        let distSq = dx * dx + dy * dy || 0.01;
        const force = REPULSION / distSq;
        const dist = Math.sqrt(distSq);
        fx += (dx / dist) * force;
        fy += (dy / dist) * force;
      }

      fx += (cx - n.x) * CENTER_PULL;
      fy += (cy - n.y) * CENTER_PULL;

      n.vx = (n.vx + fx) * DAMPING;
      n.vy = (n.vy + fy) * DAMPING;
    }

    for (const e of edges) {
      const a = byId.get(e.a), b = byId.get(e.b);
      if (!a || !b) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const stretch = dist - REST_LEN;
      const fx = (dx / dist) * stretch * SPRING;
      const fy = (dy / dist) * stretch * SPRING;
      if (a !== dragNode) { a.vx += fx; a.vy += fy; }
      if (b !== dragNode) { b.vx -= fx; b.vy -= fy; }
    }

    for (const n of nodes) {
      if (n === dragNode) continue;
      n.x += n.vx;
      n.y += n.vy;
    }
  }

  function themeColor(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  }

  function draw() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const textColor = themeColor("--text");
    const textDimColor = themeColor("--text-dim");
    ctx.save();
    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.scale, transform.scale);

    ctx.lineWidth = 1;
    for (const e of edges) {
      const a = byId.get(e.a), b = byId.get(e.b);
      if (!a || !b) continue;
      const dim = !(filterFn(a.id) && filterFn(b.id));
      ctx.strokeStyle = dim ? "rgba(150,150,150,0.12)" : "rgba(150,160,175,0.45)";
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    for (const n of nodes) {
      const dim = !filterFn(n.id);
      const isHover = n === hoverNode;
      ctx.globalAlpha = dim ? 0.25 : 1;
      ctx.beginPath();
      ctx.arc(n.x, n.y, isHover ? n.r + 3 : n.r, 0, Math.PI * 2);
      ctx.fillStyle = n.color || "#9aa5b1";
      ctx.fill();
      if (isHover) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = textColor;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      if (transform.scale > 0.6) {
        ctx.fillStyle = dim ? textDimColor : textColor;
        ctx.font = "12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(n.title, n.x, n.y + n.r + 14);
      }
    }

    ctx.restore();
  }

  function loop() {
    tick();
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function start() {
    if (rafId) cancelAnimationFrame(rafId);
    loop();
  }

  function stop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  function toWorld(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    return {
      x: (x - transform.x) / transform.scale,
      y: (y - transform.y) / transform.scale,
    };
  }

  function nodeAt(worldPt) {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const dx = n.x - worldPt.x, dy = n.y - worldPt.y;
      if (dx * dx + dy * dy <= (n.r + 4) * (n.r + 4)) return n;
    }
    return null;
  }

  function onPointerDown(e) {
    const pt = toWorld(e.clientX, e.clientY);
    const n = nodeAt(pt);
    if (n) {
      dragNode = n;
    } else {
      panning = true;
      panStart = { x: e.clientX - transform.x, y: e.clientY - transform.y };
    }
  }

  function onPointerMove(e) {
    const tooltip = document.getElementById("graph-tooltip");
    if (dragNode) {
      const pt = toWorld(e.clientX, e.clientY);
      dragNode.x = pt.x;
      dragNode.y = pt.y;
      dragNode.vx = 0;
      dragNode.vy = 0;
    } else if (panning) {
      transform.x = e.clientX - panStart.x;
      transform.y = e.clientY - panStart.y;
    } else {
      const pt = toWorld(e.clientX, e.clientY);
      hoverNode = nodeAt(pt);
      canvas.style.cursor = hoverNode ? "pointer" : "grab";
      if (hoverNode && tooltip) {
        tooltip.hidden = false;
        tooltip.textContent = hoverNode.title;
        tooltip.style.left = e.clientX + 12 + "px";
        tooltip.style.top = e.clientY + 12 + "px";
      } else if (tooltip) {
        tooltip.hidden = true;
      }
    }
  }

  function onPointerUp() {
    dragNode = null;
    panning = false;
    panStart = null;
  }

  function onWheel(e) {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    transform.scale = Math.min(3, Math.max(0.3, transform.scale * zoomFactor));
  }

  function onClick(e) {
    if (panStart && Math.hypot(e.clientX - (panStart.x + transform.x), e.clientY - (panStart.y + transform.y)) > 4) {
      return; // was a pan, not a click
    }
    const pt = toWorld(e.clientX, e.clientY);
    const n = nodeAt(pt);
    if (n) onNodeClick(n.id);
  }

  return { init, setData, setFilter, start, stop, resize };
})();
