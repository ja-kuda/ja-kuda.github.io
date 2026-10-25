/* ==========================================================================
   MAP – interactive map of Akudia
   - loads the SVG named in content/map/map.json and puts it into the page
   - pan (drag / touch), zoom (wheel / pinch / buttons / double-click)
   - layer toggles, search, clickable names with info panel
   - info texts come from content/map/locations.json (keyed by the label text)
   ========================================================================== */
(function () {
  "use strict";
  const A = window.Ambition;
  const $ = (s, el = document) => el.querySelector(s);

  let cfg, entries, svg, stage, viewport;
  let lore = null, loreAll = null, era = null, lastSel = null;   // eras + realms (optional); lore = only the map's eras
  const typeOf = (n) => { const e = entries[n] || {}; return ((e.eras || {})[era] || {}).type || e.type; };
  let infoEra = null;                  // era shown in the info panel (can differ from the map era)
  const groupOn = {};                  // layer switch state, by label
  let W = 1, H = 1;                    // svg size in px
  const view = { x: 0, y: 0, s: 1 };   // stage transform
  let minS = 0.1, maxS = 24, fitS = 1;
  const labels = [];                   // {name, type, layer, x, y, el}
  let activeEl = null;

  const norm = (s) => String(s || "").normalize("NFKC").replace(/\s+/g, " ").trim();   // NFKC: "ﬀ" → "ff"
  // true when no parent layer is hidden
  const shown = (el) => { for (let n = el; n && n !== svg; n = n.parentNode) if (n.style && n.style.display === "none") return false; return true; };
  const findLabel = (name) => labels.find((l) => l.name === name && shown(l.el)) || labels.find((l) => l.name === name);

  /* ---------- transform ---------- */
  let raf = 0;
  function apply() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      stage.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.s})`;
      measureScale();
    });
  }
  function clampView() {
    const vw = viewport.clientWidth, vh = viewport.clientHeight;
    const mw = W * view.s, mh = H * view.s;
    const pad = 0.5; // allow dragging half a screen past the edge
    view.x = Math.min(vw * pad, Math.max(vw * (1 - pad) - mw, view.x));
    view.y = Math.min(vh * pad, Math.max(vh * (1 - pad) - mh, view.y));
  }
  function zoomAt(newS, px, py) {
    newS = Math.max(minS, Math.min(maxS, newS));
    const k = newS / view.s;
    view.x = px - (px - view.x) * k;
    view.y = py - (py - view.y) * k;
    view.s = newS;
    clampView(); apply();
  }
  function fit() {
    const vw = viewport.clientWidth, vh = viewport.clientHeight;
    fitS = Math.min(vw / W, vh / H) * 0.96;
    minS = fitS * 0.7;
    maxS = fitS * (cfg.maxZoom || 24);
    view.s = fitS;
    view.x = (vw - W * fitS) / 2;
    view.y = (vh - H * fitS) / 2;
    apply();
  }
  let anim = 0;
  function animateTo(tx, ty, ts, ms = 450) {
    cancelAnimationFrame(anim);
    const from = { ...view }, t0 = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const step = (now) => {
      const t = Math.min(1, (now - t0) / ms), e = ease(t);
      view.x = from.x + (tx - from.x) * e;
      view.y = from.y + (ty - from.y) * e;
      view.s = from.s + (ts - from.s) * e;
      stage.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.s})`;
      measureScale();
      if (t < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  }
  function centerOn(x, y, s) {
    s = Math.max(minS, Math.min(maxS, s));
    const vw = viewport.clientWidth, vh = viewport.clientHeight;
    const infoOpen = $("#map-info").classList.contains("open");
    const offsetX = infoOpen && vw > 760 ? Math.min(400, vw) / 2 : 0;
    const offsetY = infoOpen && vw <= 760 ? vh * 0.3 : 0;
    animateTo(vw / 2 - offsetX - x * s, vh / 2 - offsetY - y * s, s);
  }

  /* ---------- pointer interaction ---------- */
  function bindInteraction() {
    const pts = new Map();
    let last = null, moved = 0, pinch = null, downHit = null;

    viewport.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      downHit = measure.on ? null : hitAt(e.clientX, e.clientY);
      setHover(null);
      viewport.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      cancelAnimationFrame(anim);
      moved = 0;
      if (pts.size === 1) last = { x: e.clientX, y: e.clientY };
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: view.s };
        last = null;
      }
    });
    viewport.addEventListener("pointermove", (e) => {
      if (!pts.has(e.pointerId)) {
        if (measure.on) { measure.hover = toMap(e); measureDraw(); return; }
        if (e.pointerType === "mouse") hoverAt(e);
        return;
      }
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const r = viewport.getBoundingClientRect();
      if (pts.size === 2 && pinch) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const cx = (a.x + b.x) / 2 - r.left, cy = (a.y + b.y) / 2 - r.top;
        if (last && last.cx !== undefined) { view.x += cx - last.cx; view.y += cy - last.cy; }
        zoomAt(pinch.s * (d / pinch.d), cx, cy);
        last = { cx, cy };
        moved += 10;
        return;
      }
      if (pts.size === 1 && last && last.x !== undefined) {
        const dx = e.clientX - last.x, dy = e.clientY - last.y;
        moved += Math.abs(dx) + Math.abs(dy);
        if (moved > 4) viewport.classList.add("dragging");
        view.x += dx; view.y += dy;
        last = { x: e.clientX, y: e.clientY };
        clampView(); apply();
      }
    });
    const end = (e) => {
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
      if (pts.size === 1) { const p = [...pts.values()][0]; last = { x: p.x, y: p.y }; }
      if (pts.size === 0) { last = null; viewport.classList.remove("dragging"); }
    };
    viewport.addEventListener("pointerup", end);
    viewport.addEventListener("pointercancel", end);

    // a click only counts if the pointer didn't move (so dragging doesn't open labels)
    viewport.addEventListener("click", (e) => {
      if (moved > 6) { e.stopPropagation(); e.preventDefault(); return; }
      if (measure.on) { downHit = null; measureAdd(toMap(e)); return; }
      const hit = downHit || hitAt(e.clientX, e.clientY);
      downHit = null;
      if (hit) select(hit.dataset.mapName, hit, false);
    }, true);

    viewport.addEventListener("wheel", (e) => {
      e.preventDefault();
      const r = viewport.getBoundingClientRect();
      const factor = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0018));
      zoomAt(view.s * factor, e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });

    viewport.addEventListener("dblclick", (e) => {
      if (measure.on) return;
      const h = hitAt(e.clientX, e.clientY);
      if (h && !h.classList.contains("map-area")) return;
      const r = viewport.getBoundingClientRect();
      const px = e.clientX - r.left, py = e.clientY - r.top;
      const ns = Math.min(maxS, view.s * 2);
      const k = ns / view.s;
      animateTo(px - (px - view.x) * k, py - (py - view.y) * k, ns, 300);
    });

    // keyboard: arrows pan, +/- zoom
    viewport.tabIndex = 0;
    viewport.addEventListener("keydown", (e) => {
      const vw = viewport.clientWidth / 2, vh = viewport.clientHeight / 2;
      const step = 80;
      const keys = {
        ArrowLeft: () => { view.x += step; }, ArrowRight: () => { view.x -= step; },
        ArrowUp: () => { view.y += step; }, ArrowDown: () => { view.y -= step; },
        "+": () => zoomAt(view.s * 1.4, vw, vh), "=": () => zoomAt(view.s * 1.4, vw, vh),
        "-": () => zoomAt(view.s / 1.4, vw, vh), "0": fit
      };
      if (keys[e.key]) { e.preventDefault(); keys[e.key](); clampView(); apply(); }
    });

    viewport.addEventListener("pointerleave", () => setHover(null));
    window.addEventListener("resize", () => { clampView(); apply(); });
  }

  /* What is under the pointer? Labels, dots and symbols win over province areas,
     so names stay clickable even when a coloured area lies on top of them. */
  function hitAt(x, y) {
    let area = null;
    for (const el of document.elementsFromPoint(x, y)) {
      if (!viewport.contains(el)) continue;
      const item = el.closest("[data-map-name]");
      if (!item) continue;
      if (item.classList.contains("map-area")) { area = area || item; continue; }
      return item;
    }
    return area;
  }
  let hoverEl = null, hoverRaf = 0;
  function hoverAt(e) {
    if (hoverRaf) return;
    hoverRaf = requestAnimationFrame(() => {
      hoverRaf = 0;
      const item = hitAt(e.clientX, e.clientY);
      setHover(item, e);
    });
  }
  function setHover(item, e) {
    const tip = $("#map-tip");
    if (hoverEl !== item) {
      if (hoverEl) svg.querySelectorAll(".hover").forEach((x) => x.classList.remove("hover"));
      hoverEl = item;
      if (item) svg.querySelectorAll(`[data-map-name="${CSS.escape(item.dataset.mapName)}"]`).forEach((x) => {
        // only highlight the same kind of thing (a province shouldn't light up when hovering its symbol)
        if (x.dataset.mapKind === item.dataset.mapKind) x.classList.add("hover");
      });
      viewport.classList.toggle("over-item", !!item);
      if (tip) {
        tip.textContent = item ? item.dataset.mapName : "";
        tip.classList.toggle("show", !!item);
      }
    }
    if (item && e && tip) {
      const r = viewport.getBoundingClientRect();
      tip.style.transform = `translate(${e.clientX - r.left + 14}px, ${e.clientY - r.top + 14}px)`;
    }
  }

  /* ---------- labels ---------- */
  function collectLabels() {
    // measure every configured layer, even ones saved as hidden in the SVG file (hidden again by applyLayers)
    cfg.layers.forEach((l) => { const g = svg.getElementById(l.id); if (g) { g.style.display = ""; g.removeAttribute("display"); if (g.getAttribute("visibility") === "hidden") g.removeAttribute("visibility"); } });
    const typeOf = Object.fromEntries(cfg.layers.map((l) => [l.id, l.type]));
    const svgRect = svg.getBoundingClientRect();
    const toSvg = (r) => ({ x: (r.left + r.width / 2 - svgRect.left) * W / svgRect.width, y: (r.top + r.height / 2 - svgRect.top) * H / svgRect.height });

    // Layers whose objects are shapes (symbols, provinces): every direct child is one item.
    // "items": "shapes" = drawn on top (symbols), "items": "areas" = big areas that never hide names.
    const shapeLayers = cfg.layers.filter((l) => l.items === "shapes" || l.items === "areas");
    const autoId = /^(g|path|polygon|polyline|ellipse|circle|rect|use|image|text|line)\d*$/i;
    // name of an object = its name in Affinity (serif:id) or Inkscape (label), else its id.
    // Affinity makes ids unique ("Varland2") and writes spaces as "_" – both are undone here.
    const nameOfEl = (el) => {
      const given = el.getAttribute("serif:id") || el.getAttributeNS("http://www.serif.com/", "id") ||
        el.getAttribute("inkscape:label") || el.getAttributeNS("http://www.inkscape.org/namespaces/inkscape", "label");
      if (given && !autoId.test(given)) return norm(given.replace(/_/g, " "));
      const id = el.getAttribute("id");
      if (id && !autoId.test(id) && !id.startsWith("_")) return norm(id.replace(/_/g, " "));
      return "";
    };
    const pending = [];
    shapeLayers.forEach((layer) => {
      const g = svg.getElementById(layer.id);
      if (!g) return;
      [...g.children].filter((c) => c.tagName !== "title" && c.tagName !== "desc").forEach((el, i) => {
        const r = el.getBoundingClientRect();
        if (!r.width && !r.height) return;
        pending.push({ el, layer, index: i + 1, name: nameOfEl(el), center: toSvg(r) });
      });
    });
    // Unnamed items can borrow the name of an item from another layer that lies inside them
    // ("nameFrom" in map.json – e.g. a province takes the name of the coat of arms inside it).
    pending.forEach((p) => {
      if (p.name || !p.layer.nameFrom) return;
      const donors = pending.filter((q) => q.layer.id === p.layer.nameFrom && q.name);
      const m = p.el.getCTM && p.el.getCTM();
      if (!m || typeof p.el.isPointInFill !== "function") return;
      const inv = m.inverse();
      const inside = donors.find((q) => p.el.isPointInFill(new DOMPoint(q.center.x, q.center.y).matrixTransform(inv)));
      if (inside) { p.name = inside.name; p.center = inside.center; }
    });
    pending.forEach((p) => {
      const name = p.name || `${p.layer.type || "Item"} ${p.index}`;
      p.el.classList.add(p.layer.items === "areas" ? "map-area" : "map-shape");
      p.el.setAttribute("data-map-name", name);
      p.el.setAttribute("data-map-kind", p.layer.id);
      labels.push({ name, type: p.layer.type || "", layer: p.layer.id, x: p.center.x, y: p.center.y, el: p.el, unnamed: !p.name });
    });

    cfg.layers.filter((l) => l.type && !l.items).forEach((layer) => {
      const g = svg.getElementById(layer.id);
      if (!g) return;
      g.querySelectorAll("text").forEach((t) => {
        const name = norm(t.textContent);
        if (!name || /^\d/.test(name)) return;
        const holder = t.parentNode;        // each label sits in its own <g>
        holder.classList.add("map-label");
        holder.setAttribute("data-map-name", name);
        holder.setAttribute("data-map-kind", "label");
        if (entries[name]) holder.classList.add("has-entry");
        const p = toSvg(t.getBoundingClientRect());
        labels.push({ name, type: layer.type, layer: layer.id, x: p.x, y: p.y, el: holder });
      });

      // places: make the little dots clickable too (nearest label wins)
      if (layer.id === "_08_Locations") {
        const placeLabels = labels.filter((l) => l.layer === layer.id);
        g.querySelectorAll("circle").forEach((c) => {
          const p = toSvg(c.getBoundingClientRect());
          let best = null, bd = Infinity;
          placeLabels.forEach((l) => { const d = Math.hypot(l.x - p.x, l.y - p.y); if (d < bd) { bd = d; best = l; } });
          if (best && bd < 25) {
            const holder = c.parentNode;
            holder.classList.add("map-dot");
            holder.setAttribute("data-map-name", best.name);
            holder.setAttribute("data-map-kind", "label");
            if (!best.dot) { best.dot = p; }
          }
        });
        // centre places on their dot rather than the text
        placeLabels.forEach((l) => { if (l.dot) { l.x = l.dot.x; l.y = l.dot.y; } });
      }
    });

    // Entries that have no label on the map but define coordinates ("x"/"y") get a pin
    Object.entries(entries).forEach(([name, e]) => {
      if (labels.some((l) => l.name === name) || e.x == null || e.y == null) return;
      const ns = "http://www.w3.org/2000/svg";
      const g = document.createElementNS(ns, "g");
      g.setAttribute("class", "map-dot map-pin");
      g.setAttribute("data-map-name", name);
      g.setAttribute("data-map-kind", "label");
      g.innerHTML = `<circle cx="${e.x}" cy="${e.y}" r="2.2" style="fill:#dca3cb;stroke:#461326;stroke-width:.6"/>`;
      svg.appendChild(g);
      labels.push({ name, type: e.type || "Place", layer: "custom", x: +e.x, y: +e.y, el: g });
    });
  }

  /* ---------- measuring distances ----------
     Click the ruler button, then click points on the map. The scale (map units per km) and the
     travel speeds come from content/map/map.json → "scale" and "travel". */
  const measure = { on: false, pts: [], hover: null, g: null };
  const NS = "http://www.w3.org/2000/svg";
  function toMap(e) {
    const r = viewport.getBoundingClientRect();
    return { x: (e.clientX - r.left - view.x) / view.s, y: (e.clientY - r.top - view.y) / view.s };
  }
  const kmPerUnit = () => (cfg.scale && cfg.scale.mapUnits && cfg.scale.km ? cfg.scale.km / cfg.scale.mapUnits : null);
  const fmtKm = (u) => { const k = kmPerUnit(); if (!k) return Math.round(u) + " units"; const km = u * k; return (km < 100 ? km.toFixed(1) : Math.round(km).toLocaleString("en")) + " km"; };
  const fmtDays = (d) => { if (d < 1) { const h = Math.max(1, Math.round(d * 24)); return h + " hour" + (h === 1 ? "" : "s"); } const r = Math.round(d * 2) / 2; return (r % 1 ? Math.floor(r) + "½" : r) + " day" + (r === 1 ? "" : "s"); };
  function measureLength(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); return L; }
  function measureScale() {
    if (!measure.g) return;
    const k = 1 / view.s;
    measure.g.querySelectorAll("circle").forEach((c) => c.setAttribute("r", 5 * k));
    measure.g.querySelectorAll("text").forEach((t) => { t.setAttribute("font-size", 13 * k); t.setAttribute("stroke-width", 3 * k); });
    measure.g.querySelectorAll("text").forEach((t) => t.setAttribute("dy", -10 * k));
  }
  function measureDraw() {
    if (!measure.g) { measure.g = document.createElementNS(NS, "g"); measure.g.setAttribute("class", "measure-layer"); svg.appendChild(measure.g); }
    const all = measure.hover && measure.pts.length ? [...measure.pts, measure.hover] : measure.pts;
    const line = all.map((p) => `${p.x},${p.y}`).join(" ");
    let html = all.length > 1 ? `<polyline points="${line}" class="m-line" fill="none" style="fill:none"/>` : "";   // a route, never a filled area
    measure.pts.forEach((p) => { html += `<circle cx="${p.x}" cy="${p.y}" class="m-pt"/>`; });
    if (all.length > 1) { const p = all[all.length - 1]; html += `<text x="${p.x}" y="${p.y}" class="m-label" text-anchor="middle">${fmtKm(measureLength(all))}</text>`; }
    measure.g.innerHTML = html;
    measureScale();
    measurePanel();
  }
  function measurePanel() {
    const L = measureLength(measure.pts), k = kmPerUnit();
    const travel = (cfg.travel || []).filter((t) => t.kmPerDay > 0);
    $("#measure-total").textContent = measure.pts.length > 1 ? fmtKm(L) : "Click on the map to set points";
    $("#measure-travel").innerHTML = measure.pts.length > 1 && k ? travel.map((t) =>
      `<li><span>${A.esc(t.label)}</span><b>≈ ${fmtDays(L * k / t.kmPerDay)}</b></li>`).join("") : "";
    $("#measure-undo").disabled = !measure.pts.length;
    $("#measure-clear").disabled = !measure.pts.length;
  }
  function measureAdd(p) { measure.pts.push(p); measureDraw(); }
  function measureToggle(on) {
    measure.on = on === undefined ? !measure.on : on;
    viewport.classList.toggle("measuring", measure.on);
    $("#measure-toggle").classList.toggle("on", measure.on);
    $("#measure-toggle").setAttribute("aria-pressed", measure.on);
    $("#map-measure").classList.toggle("hidden", !measure.on);
    if (measure.on) { setHover(null); measurePanel(); }
    else { measure.pts = []; measure.hover = null; if (measure.g) measure.g.innerHTML = ""; }
  }
  function bindMeasure() {
    $("#measure-toggle").addEventListener("click", () => measureToggle());
    $("#measure-done").addEventListener("click", () => measureToggle(false));
    $("#measure-undo").addEventListener("click", () => { measure.pts.pop(); measureDraw(); });
    $("#measure-clear").addEventListener("click", () => { measure.pts = []; measureDraw(); });
    viewport.addEventListener("pointerleave", () => { if (measure.on) { measure.hover = null; measureDraw(); } });
    document.addEventListener("keydown", (e) => {
      if (!measure.on) return;
      if (e.key === "Escape") { e.stopImmediatePropagation(); measureToggle(false); }
      if ((e.key === "Backspace" || (e.key === "z" && (e.ctrlKey || e.metaKey))) && document.activeElement !== $("#map-q")) { e.preventDefault(); measure.pts.pop(); measureDraw(); }
    }, true);
  }

  /* ---------- info panel ----------
     The panel shows the general entry from locations.json plus everything recorded for ONE era.
     That era starts as the map's era; the era chips in the panel switch it for this place only. */
  // the realm behind a map name – if several realms use the same name, the one that exists in the shown era
  function realmFor(name) {
    const list = (lore.realmsByMapName || {})[name] || (lore.realmByMapName[name] ? [lore.realmByMapName[name]] : []);
    const has = (r, id) => r.eras && r.eras[id];
    return list.find((r) => has(r, infoEra)) || list.find((r) => has(r, era)) || list[0] || null;
  }
  function eraHasInfo(name, realm, id) {
    const e = entries[name] || {};
    return !!((e.eras && e.eras[id]) || (realm && realm.eras && realm.eras[id]));
  }
  function select(name, el, fly, keepInfoEra) {
    const info = $("#map-info");
    const label = (el && labels.find((l) => l.el === el)) || findLabel(name);
    if (!el && label) el = label.el;
    const e = entries[name] || {};
    if (activeEl) activeEl.forEach((x) => x.classList.remove("active"));
    const kind = el ? el.dataset.mapKind : null;
    if (!keepInfoEra || !infoEra) infoEra = era;
    activeEl = [...svg.querySelectorAll(`[data-map-name="${CSS.escape(name)}"]`)].filter((x) => (!kind || x.dataset.mapKind === kind) && shown(x));
    activeEl.forEach((x) => x.classList.add("active"));
    lastSel = { name, el };

    // realms (provinces / kingdoms) get era-specific information from content/lore/realms.json
    const isShape = label && (label.el.classList.contains("map-area") || label.el.classList.contains("map-shape"));
    const realm = lore && isShape ? realmFor(name) : null;
    const ev = (lore && infoEra && e.eras && e.eras[infoEra]) || null;    // era part of locations.json
    const eraObj = lore && infoEra ? lore.eraById[infoEra] : null;

    // era facts (and an era "region") replace general ones with the same name
    const eraFacts = Object.entries((ev && ev.facts) || {});
    if (ev && (ev.province || ev.region)) eraFacts.unshift(["Province", ev.province || ev.region]);
    const eraKeys = new Set(eraFacts.map(([k]) => k));
    const facts = Object.entries(e.facts || {});
    if (e.province || e.region) facts.unshift(["Province", e.province || e.region]);
    for (let i = facts.length - 1; i >= 0; i--) if (eraKeys.has(facts[i][0])) facts.splice(i, 1);

    const chips = lore && lore.eras.length ? `
      <div class="info-eras" role="tablist" aria-label="Era">
        ${lore.eras.map((x) => `<button role="tab" data-info-era="${x.id}" aria-selected="${x.id === infoEra}"
          class="${x.id === infoEra ? "on" : ""} ${eraHasInfo(name, realm, x.id) ? "has" : ""} ${x.id === era ? "map-era-chip" : ""}"
          title="${A.esc(x.name)}${x.id === era ? " (map era)" : ""}">${A.esc(x.short || x.name)}</button>`).join("")}
      </div>
      ${infoEra !== era ? `<p class="info-era-note">Showing <b>${A.esc(eraObj.name)}</b> – the map shows ${A.esc(lore.eraById[era].name)}. <a href="#" data-info-era="${era}">Back to the map's era</a></p>` : ""}` : "";

    const generalText = e.text ? `<div class="md">${A.md(e.text)}</div>` : "";
    const hint = label && label.unnamed
      ? `<p class="empty">This object has no name in the map file yet.<br>Give it an ID (Inkscape: Object properties → ID, Affinity: layer name) and add a description in <code>content/map/locations.json</code> under that name.</p>`
      : !e.text && !ev && !e.eras && !realm ? `<p class="empty">No description yet.<br>Add one in <code>content/map/locations.json</code> under the name <code>"${A.esc(name)}"</code>.</p>` : "";
    const eraPart = ev ? `
      <section class="era-part">
        <span class="era-tag">${A.esc(eraObj.name)}</span>
        ${eraFacts.length ? `<dl class="facts">${eraFacts.map(([k, v]) => `<dt>${A.esc(k)}</dt><dd>${A.inline(String(v))}</dd>`).join("")}</dl>` : ""}
        ${ev.text ? `<div class="md">${A.md(ev.text)}</div>` : ""}
      </section>` : (lore && !realm && (e.text || e.eras) ? `<p class="empty era-empty"><span class="era-tag">${A.esc(eraObj.name)}</span><br>Nothing recorded for this era yet – add it in <code>locations.json</code> under <code>"eras": { "${infoEra}": { … } }</code>.</p>` : "");

    const img = (ev && ev.image) || e.image;
    $("#info-body").innerHTML = `
      ${img ? `<div class="info-img"><img src="${img}" alt=""></div>` : ""}
      <div class="info-type">${A.esc((ev && ev.type) || e.type || (label && label.type) || "Location")}</div>
      <h2>${A.esc((ev && ev.title) || e.title || name)}</h2>
      ${chips}
      ${facts.length ? `<dl class="facts">${facts.map(([k, v]) => `<dt>${A.esc(k)}</dt><dd>${A.inline(String(v))}</dd>`).join("")}</dl>` : ""}
      ${generalText}
      ${realm ? `<div class="realm-block" id="realm-block"></div>` : ""}
      ${eraPart}
      ${hint}
      ${(ev && ev.lore) || e.lore ? `<p><a class="btn small" href="${(ev && ev.lore) || e.lore}">Read more in the Lore →</a></p>` : ""}`;
    $("#info-body").querySelectorAll("[data-info-era]").forEach((b) => b.addEventListener("click", (evt) => {
      evt.preventDefault();
      infoEra = b.dataset.infoEra;
      const sc = info.querySelector(".info-scroll").scrollTop;
      select(name, el, false, true);
      info.querySelector(".info-scroll").scrollTop = sc;
    }));
    if (realm) renderRealmBlock(realm, name, el);
    info.classList.add("open");
    if (!keepInfoEra) info.querySelector(".info-scroll").scrollTop = 0;
    history.replaceState(null, "", "#" + encodeURIComponent(name));

    if (label && (fly || !keepInfoEra)) pulse(label.x, label.y);
    if (label && fly) centerOn(label.x, label.y, Math.max(view.s, fitS * 10));
  }
  async function renderRealmBlock(realm, name, el) {
    const box = $("#realm-block");
    if (!box) return;
    const id = infoEra;
    const eraObj = lore.eraById[id];
    const d = (realm.eras || {})[id];
    const text = await A.data.realmText(loreAll, realm);
    if (!$("#realm-block") || id !== infoEra) return;
    if (!d) {
      const where = lore.eras.filter((x) => realm.eras && realm.eras[x.id]);
      box.innerHTML = `<span class="era-tag">${A.esc(eraObj.name)}</span>
        <p class="not-in-era">${A.esc(realm.name)} did not exist as a realm in this era.${where.length ? ` It appears in: ${where.map((x) => `<a href="#" data-era-go="${x.id}">${A.esc(x.name)}</a>`).join(", ")}.` : ""}</p>`;
    } else {
      const rows = A.realmFacts(lore, realm, id);
      box.innerHTML = `
        <span class="era-tag">${A.esc(eraObj.name)}</span>
        ${realm.coat ? `<div class="realm-head"><img class="coat" src="${realm.coat}" alt=""><div class="info-type">${A.esc(realm.kind || "Realm")}</div></div>` : ""}
        ${rows.length ? `<dl class="facts">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>` : ""}
        ${d.summary ? `<p class="rd-summary">${A.inline(d.summary)}</p>` : ""}
        ${(text.general || "").trim() ? `<div class="md">${A.md(text.general)}</div>` : ""}
        ${(text.byEra[id] || "").trim() ? `<div class="md">${A.md(text.byEra[id])}</div>` : ""}
        <p><a class="btn small" href="lore.html?realm=${realm.id}&era=${id}#realms">${A.esc(realm.name)} in the Lore →</a></p>`;
    }
    // "appears in" links switch only the panel, not the map
    box.querySelectorAll("[data-era-go]").forEach((a) => a.addEventListener("click", (ev) => { ev.preventDefault(); infoEra = a.dataset.eraGo; select(name, el, false, true); }));
    box.querySelectorAll("[data-realm]").forEach((a) => a.addEventListener("click", (ev) => {
      ev.preventDefault();
      const r = lore.realmById[a.dataset.realm];
      if (r) select(r.map || r.name, null, true, true);
    }));
  }

  /* ---------- eras ---------- */
  function setEra(id) {
    if (!lore || !lore.eraById[id]) return;
    era = id;
    A.era.set(id);
    $("#map-era-select").value = id;
    applyLayers();
    // the info panel follows the map's era
    if (lastSel && $("#map-info").classList.contains("open")) {
      const l = findLabel(lastSel.name);
      select(lastSel.name, l && shown(l.el) ? l.el : (shown(lastSel.el) ? lastSel.el : null), false);
    }
  }
  function initEras() {
    if (!lore || !lore.eras.length) return;
    const sel = $("#map-era-select");
    sel.innerHTML = lore.eras.map((x) => `<option value="${x.id}">${A.esc(x.name)}</option>`).join("");
    $("#map-era").classList.remove("hidden");
    sel.addEventListener("change", () => setEra(sel.value));
    setEra(A.era.get(lore));
  }

  function closeInfo() {
    $("#map-info").classList.remove("open");
    if (activeEl) activeEl.forEach((x) => x.classList.remove("active"));
    activeEl = null;
    history.replaceState(null, "", location.pathname + location.search);
    const p = svg.querySelector(".map-pulse");
    if (p) p.remove();
  }
  function pulse(x, y) {
    let p = svg.querySelector(".map-pulse");
    if (!p) {
      p = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      p.setAttribute("class", "map-pulse");
      svg.appendChild(p);
    }
    p.setAttribute("cx", x); p.setAttribute("cy", y); p.setAttribute("r", 6);
  }

  /* ---------- search ---------- */
  function bindSearch() {
    const input = $("#map-q"), list = $("#map-results");
    let kb = -1, items = [];
    const uniq = [];
    const seen = new Set();
    labels.forEach((l) => { if (!seen.has(l.name)) { seen.add(l.name); uniq.push(l); } });
    Object.keys(entries).forEach((n) => { if (!seen.has(n)) { seen.add(n); } });
    uniq.sort((a, b) => a.name.localeCompare(b.name));

    const draw = () => {
      const q = input.value.trim().toLowerCase();
      if (!q) { list.classList.add("hidden"); items = []; return; }
      items = uniq.filter((l) => l.name.toLowerCase().includes(q))
        .sort((a, b) => (a.name.toLowerCase().startsWith(q) ? 0 : 1) - (b.name.toLowerCase().startsWith(q) ? 0 : 1))
        .slice(0, 12);
      kb = items.length ? 0 : -1;
      list.innerHTML = items.length
        ? items.map((l, i) => `<li><button data-i="${i}" class="${i === kb ? "kb" : ""}">${A.esc(l.name)}<small>${A.esc(typeOf(l.name) || l.type)}</small></button></li>`).join("")
        : `<li style="padding:8px 10px;color:var(--faint)">No matches</li>`;
      list.classList.remove("hidden");
    };
    const go = (i) => {
      const l = items[i];
      if (!l) return;
      list.classList.add("hidden");
      input.value = l.name;
      input.blur();
      select(l.name, null, true);
    };
    input.addEventListener("input", draw);
    input.addEventListener("focus", draw);
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        kb = (kb + (e.key === "ArrowDown" ? 1 : -1) + items.length) % Math.max(1, items.length);
        list.querySelectorAll("button").forEach((b, i) => b.classList.toggle("kb", i === kb));
      }
      if (e.key === "Enter") go(Math.max(0, kb));
      if (e.key === "Escape") { list.classList.add("hidden"); input.blur(); }
    });
    list.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) go(+b.dataset.i); });
    document.addEventListener("pointerdown", (e) => { if (!e.target.closest(".map-search")) list.classList.add("hidden"); });
  }

  /* ---------- layers ---------- */
  /* Layers that share a "label" in map.json form ONE switch. A layer with "eras": [...] is only
     shown in those eras; layers of the same switch without "eras" are the fallback for all other eras.
     So per-era borders = several SVG layers with the same label, e.g. "Borders". */
  function layerGroups() {
    const groups = [];
    cfg.layers.forEach((l) => {
      if (!svg.getElementById(l.id)) return;
      let g = groups.find((x) => x.label === l.label);
      if (!g) groups.push(g = { label: l.label, layers: [] });
      g.layers.push(l);
    });
    return groups;
  }
  function applyLayers() {
    layerGroups().forEach((g) => {
      const forEra = g.layers.filter((l) => l.eras && era && [].concat(l.eras).includes(era));
      const pick = forEra.length ? forEra : g.layers.filter((l) => !l.eras);
      g.layers.forEach((l) => { svg.getElementById(l.id).style.display = groupOn[g.label] && pick.includes(l) ? "" : "none"; });
    });
    // optional extra switches per era (eras.json → "mapLayers": {"layer id": true/false})
    const extra = (lore && era && lore.eraById[era] && lore.eraById[era].mapLayers) || {};
    Object.entries(extra).forEach(([id, on]) => { const g = svg.getElementById(id); if (g) g.style.display = on ? "" : "none"; });
  }
  function buildLayers() {
    const box = $("#map-layers-list");
    const groups = layerGroups();
    groups.forEach((g) => { groupOn[g.label] = g.layers.some((l) => l.visible !== false); });
    box.innerHTML = groups.map((g, i) => `<label><input type="checkbox" data-group="${i}" ${groupOn[g.label] ? "checked" : ""}> ${A.esc(g.label)}${g.layers.some((l) => l.eras) ? ' <small class="by-era">by era</small>' : ""}</label>`).join("");
    box.addEventListener("change", (e) => {
      const g = groups[+e.target.dataset.group];
      groupOn[g.label] = e.target.checked;
      applyLayers();
    });
    applyLayers();
    const panel = $("#map-layers");
    $("#map-layers-toggle").addEventListener("click", () => panel.classList.toggle("open"));
    $("#map-layers-close").addEventListener("click", () => panel.classList.remove("open"));
  }

  /* ---------- init ---------- */
  async function init() {
    viewport = $("#map-viewport");
    stage = $("#map-stage");
    const loading = $("#map-loading");
    try {
      [cfg, entries, lore] = await Promise.all([A.loadJSON("content/map/map.json"), A.loadJSON("content/map/locations.json").catch(() => ({})),
        A.data && A.data.lore ? A.data.lore().catch(() => null) : null]);
      const txt = await A.loadText(cfg.svg);
      const doc = new DOMParser().parseFromString(txt, "image/svg+xml");
      const root = doc.documentElement;
      if (root.nodeName !== "svg") throw new Error(`${cfg.svg} is not a valid SVG file`);
      const vb = (root.getAttribute("viewBox") || "0 0 1000 1000").split(/[\s,]+/).map(Number);
      W = vb[2]; H = vb[3];
      root.setAttribute("width", W);
      root.setAttribute("height", H);
      svg = document.importNode(root, true);
      stage.appendChild(svg);
    } catch (e) {
      loading.innerHTML = `<div style="max-width:520px;padding:20px">${A.errorBox(e)}</div>`;
      return;
    }

    // the map only offers the eras listed in map.json → "eras" (label = the year the map shows)
    loreAll = lore;
    if (lore && cfg.eras) {
      const keep = lore.eras.filter((x) => x.id in cfg.eras)
        .map((x) => ({ ...x, name: cfg.eras[x.id] ? `${x.short || x.name} – ${cfg.eras[x.id]}` : x.name }));
      if (keep.length) lore = { ...lore, eras: keep, eraById: Object.fromEntries(keep.map((x) => [x.id, x])),
        defaultEra: keep.some((x) => x.id === lore.defaultEra) ? lore.defaultEra : keep[0].id };
    }

    // normalise names in locations.json the same way as labels
    const noUnderscore = (o) => Object.fromEntries(Object.entries(o || {}).filter(([k]) => !k.startsWith("_")));
    entries = Object.fromEntries(Object.entries(entries).filter(([k]) => !k.startsWith("_"))
      .map(([k, v]) => [norm(k), A.stripTodo(noUnderscore(v))])         // TODO fields are hidden
      .map(([k, v]) => {                                                // an era with nothing but a type counts as empty
        if (v && v.eras) Object.keys(v.eras).forEach((id) => { if (!Object.keys(v.eras[id]).some((f) => f !== "type")) delete v.eras[id]; });
        return [k, v];
      })
      .filter(([, v]) => v && Object.keys(v).some((f) => !["type", "eras"].includes(f) || (f === "eras" && Object.keys(v.eras).length))));

    fit();
    stage.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.s})`;
    collectLabels();
    buildLayers();
    initEras();
    bindInteraction();
    bindMeasure();
    bindSearch();
    loading.remove();

    $("#zoom-in").addEventListener("click", () => zoomAt(view.s * 1.6, viewport.clientWidth / 2, viewport.clientHeight / 2));
    $("#zoom-out").addEventListener("click", () => zoomAt(view.s / 1.6, viewport.clientWidth / 2, viewport.clientHeight / 2));
    $("#zoom-fit").addEventListener("click", () => {
      const vw = viewport.clientWidth, vh = viewport.clientHeight;
      animateTo((vw - W * fitS) / 2, (vh - H * fitS) / 2, fitS);
    });
    $("#info-close").addEventListener("click", closeInfo);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && document.activeElement !== $("#map-q")) closeInfo(); });

    const hash = decodeURIComponent(location.hash.slice(1));
    if (hash) select(norm(hash), null, true);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
