/* ==========================================================================
   CHARACTERS – character builder + talent builder
   All rules data comes from content/characters/*.json (see data.js)
   ========================================================================== */
(function () {
  "use strict";
  const A = window.Ambition;
  const STORE_KEY = "ambition.character.v2";
  const STEP_IDS = ["concept", "ambition", "ancestry", "skills", "traits", "talents", "sheet"];
  const $ = (sel, el = document) => el.querySelector(sel);
  const esc = (s) => A.esc(s);

  let D = null;     // rules data
  let C = null;     // current character
  let stepIndex = 0;

  /* ---------- character model ---------- */
  function blankCharacter() {
    const skills = {};
    D.skills.forEach((s) => (skills[s.id] = D.builder.skillStart ?? 1));
    return { name: "", player: "", concept: "", portrait: "", ambition: "", ambitionNote: "", ancestry: "",
      skills, traits: Array(D.builder.traitCount || 3).fill(""), talents: [], notes: "" };
  }
  const save = () => A.storage.set(STORE_KEY, C);
  const ancestry = () => D.ancestryById[C.ancestry];
  const spent = () => Object.values(C.skills).reduce((a, b) => a + b, 0) - (D.builder.skillStart ?? 1) * D.skills.length;
  const pointsLeft = () => D.builder.skillPoints - spent();

  /* talents granted by the chosen ancestry */
  function grantedIds() {
    const a = ancestry();
    if (!a) return [];
    return (a.talents || []).map((n) => A.findTalent(D, n, { category: "ancestry", group: a.id })).filter(Boolean).map((t) => t.id);
  }
  const allTalentIds = () => new Set([...grantedIds(), ...C.talents]);
  const ctx = (strict) => ({ talents: allTalentIds(), skills: C.skills, ancestry: C.ancestry || (strict ? "-none-" : null) });
  const counts = (ids = C.talents) => {
    const list = ids.map((id) => D.byId[id]).filter(Boolean);
    return { picks: list.filter((t) => t.category !== "ancestry").length, statics: list.filter((t) => t.category === "static").length };
  };

  /* ---------- toast ---------- */
  let toastTimer;
  function toast(msg) {
    let el = $("#toast");
    if (!el) { el = document.createElement("div"); el.id = "toast"; el.className = "toast"; el.setAttribute("role", "status"); document.body.appendChild(el); }
    el.innerHTML = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
  }

  /* ==========================================================================
     TALENT BUILDER (used as its own tab and inside the character builder)
     ========================================================================== */
  const ui = { cat: "all", group: "", q: "", availableOnly: false, hideWip: false };

  function hardFails(t) {
    return A.checkReqs(t, ctx(true)).filter((r) => r.ok === false && (r.type === "skill" || r.type === "ancestry"));
  }

  function addTalent(t, strict) {
    const have = allTalentIds();
    if (have.has(t.id)) return;
    const chain = A.missingChain(D, t, have);
    const toAdd = [...chain, t.id];
    if (strict) {
      for (const id of toAdd) {
        const f = hardFails(D.byId[id]);
        if (f.length) { toast(`<b>${esc(D.byId[id].name)}</b> needs ${f.map((r) => esc(r.label)).join(", ")}`); return; }
      }
      const after = counts([...C.talents, ...toAdd]);
      if (after.picks > D.builder.talentPicks) {
        toast(chain.length ? `<b>${esc(t.name)}</b> and its prerequisites need ${toAdd.length} picks – only ${D.builder.talentPicks - counts().picks} left`
                           : `You can only choose ${D.builder.talentPicks} talents – remove one first`);
        return;
      }
    }
    C.talents.push(...toAdd);
    save();
    if (chain.length) toast(`Added <b>${esc(t.name)}</b> with its prerequisites: ${chain.map((id) => esc(D.byId[id].name)).join(", ")}`);
  }

  function removeTalent(id) {
    const deps = A.dependents(D, id, new Set(C.talents)).filter((d) => C.talents.includes(d));
    C.talents = C.talents.filter((x) => x !== id && !deps.includes(x));
    save();
    if (deps.length) toast(`Also removed (they need <b>${esc(D.byId[id].name)}</b>): ${deps.map((d) => esc(D.byId[d].name)).join(", ")}`);
  }

  function talentStatus(t, strict) {
    const granted = grantedIds().includes(t.id);
    const selected = C.talents.includes(t.id);
    const checks = A.checkReqs(t, ctx(strict));
    const fails = checks.filter((r) => r.ok === false);
    const hard = fails.filter((r) => r.type === "skill" || r.type === "ancestry");
    return { granted, selected, checks, fails, hard, locked: !granted && !selected && strict && hard.length > 0 };
  }

  function talentCard(t, strict) {
    const s = talentStatus(t, strict);
    const reqs = s.checks.filter((r) => !(r.implicit && (s.granted || r.ok !== false)));
    const meta = [t.uses && `<span><b>Uses</b> ${esc(t.uses)}</span>`, t.cost && `<span><b>Cost</b> ${esc(t.cost)}</span>`].filter(Boolean).join("");
    const unlocks = t.unlocks.map((id) => D.byId[id].name);
    let foot;
    if (s.granted) foot = `<span class="why">Granted by your ancestry</span>`;
    else if (s.selected) foot = `<span class="why">Chosen</span><button class="btn small" data-act="remove" data-id="${t.id}">Remove</button>`;
    else {
      const chain = A.missingChain(D, t, allTalentIds());
      const why = s.locked ? `Needs ${s.hard.map((r) => esc(r.label)).join(", ")}` : chain.length ? `+ ${chain.length} prerequisite${chain.length > 1 ? "s" : ""}` : "";
      foot = `<span class="why">${why}</span><button class="btn small ${s.locked ? "ghost" : "primary"}" data-act="add" data-id="${t.id}" ${s.locked ? "disabled" : ""}>Add</button>`;
    }
    return `
      <div class="tcard panel facet${s.selected ? " selected" : ""}${s.granted ? " granted" : ""}${s.locked ? " locked" : ""}${t.wip ? " wip" : ""}" id="tc-${t.id}">
        <div class="tc-head"><h3>${esc(t.name)}</h3><span class="tc-group">${esc(A.groupName(D, t.category, t.group))}</span></div>
        ${meta ? `<div class="tc-meta">${meta}</div>` : ""}
        ${reqs.length ? `<ul class="reqs">${reqs.map((r) => `<li class="${r.ok === true ? "ok" : r.ok === false ? "bad" : "note"}" title="${r.type === "text" ? "Not checked automatically" : ""}">${r.ok === true ? "✓ " : r.ok === false ? "✗ " : ""}${esc(r.label)}</li>`).join("")}</ul>` : ""}
        <p class="tc-effect">${t.effect ? A.inline(t.effect) : "Effect not written yet."}</p>
        ${unlocks.length ? `<p class="unlocks">Unlocks <b>${unlocks.map(esc).join(", ")}</b></p>` : ""}
        <div class="tc-foot">${foot}</div>
      </div>`;
  }

  /* groups in data order: [{key, category, group, name, items}] */
  function groupList(filterFn) {
    const out = [];
    D.talents.forEach((t) => {
      if (filterFn && !filterFn(t)) return;
      const key = t.category + "|" + t.group;
      let g = out.find((x) => x.key === key);
      if (!g) out.push(g = { key, category: t.category, group: t.group, name: A.groupName(D, t.category, t.group), items: [] });
      g.items.push(t);
    });
    // archetypes without any talents still appear in the navigation
    D.archetypes.forEach((a) => {
      if (!out.some((g) => g.category === "archetype" && g.group.toLowerCase() === a.id.toLowerCase()) && (!filterFn || filterFn({ category: "archetype", group: a.id, _empty: true })))
        out.push({ key: "archetype|" + a.id, category: "archetype", group: a.id, name: a.name, items: [] });
    });
    const order = D.categories.map((c) => c.id);
    return out.sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category) ||
      (a.category === "archetype" ? a.name.localeCompare(b.name) : 0));
  }

  function renderTalentBuilder(root, strict) {
    const visibleForMode = (t) => !(strict && t.category === "ancestry" && C.ancestry && t.group && t.group.toLowerCase() !== C.ancestry && !t._empty);
    const allGroups = groupList(visibleForMode);
    const catName = (id) => (D.categories.find((c) => c.id === id) || {}).short || id;

    root.innerHTML = `
      <div class="tb${strict ? " compact" : ""}">
        ${strict ? "" : `<aside class="tb-nav panel facet" aria-label="Talent groups"></aside>`}
        <section class="tb-main">
          ${strict ? `<div class="tb-chips" id="tb-chips"></div>` : ""}
          <div class="tb-cats" role="tablist">
            ${[["all", "All"], ...D.categories.map((c) => [c.id, c.short || c.name])].map(([id, l]) => `<button class="chip" data-cat="${id}" aria-pressed="${ui.cat === id}">${esc(l)}</button>`).join("")}
          </div>
          <div class="tb-toolbar">
            <input type="search" id="tb-q" placeholder="Search talents…" value="${esc(ui.q)}" aria-label="Search talents">
            <select id="tb-group" class="tb-group-select${strict ? "" : ""}" aria-label="Group" ${strict ? 'style="display:block;max-width:260px"' : ""}></select>
            <label class="toggle"><input type="checkbox" id="tb-avail" ${ui.availableOnly ? "checked" : ""}> Only available</label>
            <label class="toggle"><input type="checkbox" id="tb-wip" ${ui.hideWip ? "checked" : ""}> Hide unfinished</label>
            <span class="count" id="tb-count"></span>
          </div>
          <div id="tb-list"></div>
        </section>
        ${strict ? "" : `<aside class="tb-pick panel facet" id="tb-pick" aria-label="Your talents"></aside>
        <button class="btn primary tb-pick-toggle" id="tb-pick-toggle">Your talents <span id="tb-pick-n"></span></button>`}
      </div>`;

    const groupsForCat = () => allGroups.filter((g) => ui.cat === "all" || g.category === ui.cat);

    function drawNav() {
      const gs = groupsForCat();
      const nav = $(".tb-nav", root);
      const sel = $("#tb-group", root);
      const cats = ui.cat === "all" ? D.categories.map((c) => c.id) : [ui.cat];
      if (nav) {
        nav.innerHTML = `<button class="grp" data-group="" aria-pressed="${!ui.group}"><span>All groups</span><small>${gs.reduce((n, g) => n + g.items.length, 0)}</small></button>` +
          cats.map((c) => `<h4>${esc(catName(c))}</h4>` + gs.filter((g) => g.category === c).map((g) =>
            `<button class="grp${g.items.length ? "" : " empty"}" data-group="${esc(g.key)}" aria-pressed="${ui.group === g.key}"><span>${esc(g.name)}</span><small>${g.items.length}</small></button>`).join("")).join("");
        nav.querySelectorAll("[data-group]").forEach((b) => b.addEventListener("click", () => { ui.group = b.dataset.group; drawNav(); drawList(); window.scrollTo({ top: root.getBoundingClientRect().top + window.scrollY - 80 }); }));
      }
      sel.innerHTML = `<option value="">All groups</option>` + cats.map((c) => `<optgroup label="${esc(catName(c))}">${gs.filter((g) => g.category === c).map((g) =>
        `<option value="${esc(g.key)}" ${ui.group === g.key ? "selected" : ""}>${esc(g.name)} (${g.items.length})</option>`).join("")}</optgroup>`).join("");
    }

    function drawList() {
      const q = ui.q.trim().toLowerCase();
      let shown = 0;
      const sections = groupsForCat().filter((g) => !ui.group || g.key === ui.group).map((g) => {
        const items = g.items.filter((t) => {
          if (q && !(t.name + " " + t.effect + " " + t.prerequisites + " " + g.name).toLowerCase().includes(q)) return false;
          if (ui.hideWip && t.wip) return false;
          if (ui.availableOnly) { const s = talentStatus(t, strict); if (!s.selected && !s.granted && (s.fails.length || s.locked)) return false; }
          return true;
        });
        shown += items.length;
        if (!items.length && (q || ui.availableOnly || ui.hideWip || g.items.length)) return "";
        const desc = g.category === "archetype" ? (D.archetypeById[g.group.toLowerCase()] || {}).description : "";
        return `<section class="tb-section"><h3>${esc(g.name)}</h3>${desc ? `<p>${A.inline(desc)}</p>` : `<p>${esc(catName(g.category))}</p>`}
          ${items.length ? `<div class="tb-cards">${items.map((t) => talentCard(t, strict)).join("")}</div>` : `<p class="wip-text">No talents written for this group yet.</p>`}</section>`;
      }).join("");
      $("#tb-list", root).innerHTML = sections || `<p class="muted">No talents match.</p>`;
      $("#tb-count", root).textContent = `${shown} talent${shown === 1 ? "" : "s"}`;
    }

    function drawPick() {
      const c = counts();
      const max = D.builder.talentPicks, maxS = D.builder.maxStaticSpells;
      const granted = grantedIds().map((id) => D.byId[id]);
      const chosen = C.talents.map((id) => D.byId[id]).filter(Boolean);
      const warnOf = (t) => { const f = A.checkReqs(t, ctx()).filter((r) => r.ok === false); return f.length ? "Missing: " + f.map((r) => r.label).join(", ") : ""; };
      if (strict) {
        $("#tb-chips", root).innerHTML = `<span class="count">Chosen ${c.picks} / ${max}${c.statics ? ` · static spells ${c.statics} / ${maxS}` : ""}</span>` +
          granted.map((t) => `<span class="chip granted" title="Granted by ancestry">${esc(t.name)}</span>`).join("") +
          chosen.map((t) => `<span class="chip">${esc(t.name)}<button data-act="remove" data-id="${t.id}" aria-label="Remove ${esc(t.name)}">✕</button></span>`).join("");
        return;
      }
      const li = (t, removable) => { const w = removable ? warnOf(t) : ""; return `<li class="${w ? "warn" : ""}"><span>${esc(t.name)}<small>${esc(w || A.groupName(D, t.category, t.group))}</small></span>${removable ? `<button data-act="remove" data-id="${t.id}" aria-label="Remove ${esc(t.name)}">✕</button>` : ""}</li>`; };
      $("#tb-pick", root).innerHTML = `
        <h4>Your talents${C.name ? ` – ${esc(C.name)}` : ""}</h4>
        <div class="counter">
          <div><b class="${c.picks > max ? "over" : ""}">${c.picks}<small style="font-size:.9rem;color:var(--faint)"> / ${max}</small></b><span>talents (starting)</span></div>
          <div><b class="${c.statics > maxS ? "over" : ""}">${c.statics}<small style="font-size:.9rem;color:var(--faint)"> / ${maxS}</small></b><span>static spells</span></div>
        </div>
        ${granted.length ? `<h4>From ancestry</h4><ul>${granted.map((t) => li(t, false)).join("")}</ul>` : ""}
        <h4>Chosen</h4>
        ${chosen.length ? `<ul>${chosen.map((t) => li(t, true)).join("")}</ul>` : `<p class="empty">Nothing chosen yet. Use “Add” on a talent.</p>`}
        ${!C.ancestry ? `<p class="empty">Tip: choose an ancestry and skills in the character builder to check all prerequisites.</p>` : ""}
        <div class="actions">
          <button class="btn small" id="tb-sheet">Character sheet</button>
          <button class="btn small ghost" id="tb-copy">Copy list</button>
          <button class="btn small ghost" id="tb-clear" ${chosen.length ? "" : "disabled"}>Clear</button>
        </div>`;
      $("#tb-pick-n", root).textContent = `(${c.picks})`;
      $("#tb-sheet", root).addEventListener("click", () => { stepIndex = STEP_IDS.indexOf("sheet"); showTab("builder"); });
      $("#tb-copy", root).addEventListener("click", async () => {
        const txt = [...granted, ...chosen].map((t) => `${t.name} (${A.groupName(D, t.category, t.group)})${t.uses ? ` – uses ${t.uses}` : ""}${t.cost ? ` – cost ${t.cost}` : ""}\n  ${t.effect}`).join("\n");
        try { await navigator.clipboard.writeText(txt); toast("Talent list copied"); } catch (e) { toast("Copying is not allowed in this browser"); }
      });
      $("#tb-clear", root).addEventListener("click", () => { if (confirm("Remove all chosen talents?")) { C.talents = []; save(); redraw(); } });
    }

    function redraw() { drawList(); drawPick(); if (strict) refreshStepMarks(); }

    // events
    root.querySelectorAll("[data-cat]").forEach((b) => b.addEventListener("click", () => {
      ui.cat = b.dataset.cat; ui.group = "";
      root.querySelectorAll("[data-cat]").forEach((x) => x.setAttribute("aria-pressed", x.dataset.cat === ui.cat));
      drawNav(); drawList();
    }));
    $("#tb-group", root).addEventListener("change", (e) => { ui.group = e.target.value; drawNav(); drawList(); });
    $("#tb-q", root).addEventListener("input", (e) => { ui.q = e.target.value; drawList(); });
    $("#tb-avail", root).addEventListener("change", (e) => { ui.availableOnly = e.target.checked; drawList(); });
    $("#tb-wip", root).addEventListener("change", (e) => { ui.hideWip = e.target.checked; drawList(); });
    root.addEventListener("click", (e) => {
      const b = e.target.closest("[data-act]");
      if (!b) return;
      const t = D.byId[b.dataset.id];
      if (b.dataset.act === "add") addTalent(t, strict); else removeTalent(t.id);
      redraw();
    });
    const pt = $("#tb-pick-toggle", root);
    if (pt) pt.addEventListener("click", () => {
      const open = $("#tb-pick", root).classList.toggle("open");
      pt.firstChild.textContent = open ? "Close " : "Your talents ";
    });

    drawNav(); drawList(); drawPick();
    return { focus(id) {
      const el = $("#tc-" + id, root);
      if (!el) return;
      el.scrollIntoView({ block: "center" });
      el.classList.add("flash");
    } };
  }

  /* ==========================================================================
     CHARACTER BUILDER
     ========================================================================== */
  function stepDone(id) {
    switch (id) {
      case "concept": return !!C.name.trim();
      case "ambition": return !!C.ambition.trim();
      case "ancestry": return !!C.ancestry;
      case "skills": return pointsLeft() === 0;
      case "traits": return C.traits.filter((t) => t.trim()).length >= (D.builder.traitCount || 3);
      case "talents": return counts().picks === D.builder.talentPicks;
      default: return false;
    }
  }
  function refreshStepMarks() {
    document.querySelectorAll(".steps [data-step]").forEach((b) => b.classList.toggle("done", stepDone(STEP_IDS[+b.dataset.step])));
  }

  function renderBuilder() {
    const el = $("#builder");
    el.innerHTML = `
      <ol class="steps panel facet">${STEP_IDS.map((id, i) => `
        <li><button data-step="${i}" class="${stepDone(id) ? "done" : ""}" ${i === stepIndex ? 'aria-current="step"' : ""}>
          <span class="n">${i + 1}</span><span class="label">${esc(D.builder.steps[id].title)}</span></button></li>`).join("")}
      </ol>
      <section class="step-body panel facet" id="step-body"></section>`;
    el.querySelectorAll("[data-step]").forEach((b) => b.addEventListener("click", () => goStep(+b.dataset.step)));
    renderStep();
  }
  function goStep(i) {
    stepIndex = Math.max(0, Math.min(STEP_IDS.length - 1, i));
    renderBuilder();
    const top = $("#builder").getBoundingClientRect().top + window.scrollY - 80;
    if (window.scrollY > top) window.scrollTo({ top, behavior: "smooth" });
  }
  function renderStep() {
    const id = STEP_IDS[stepIndex], s = D.builder.steps[id];
    const body = $("#step-body");
    const prev = STEP_IDS[stepIndex - 1], next = STEP_IDS[stepIndex + 1];
    body.innerHTML = `<h2>${esc(s.title)}</h2><p class="step-intro">${A.inline(s.intro)}</p><div id="step-content"></div>
      <div class="step-nav">
        ${prev ? `<button class="btn ghost" data-go="-1">← ${esc(D.builder.steps[prev].title)}</button>` : "<span></span>"}
        ${next ? `<button class="btn primary" data-go="1">${esc(D.builder.steps[next].title)} →</button>` : ""}
      </div>`;
    body.querySelectorAll("[data-go]").forEach((b) => b.addEventListener("click", () => goStep(stepIndex + +b.dataset.go)));
    ({ concept: stepConcept, ambition: stepAmbition, ancestry: stepAncestry, skills: stepSkills, traits: stepTraits, talents: stepTalents, sheet: stepSheet })[id]($("#step-content"));
  }
  const bindInput = (el, sel, fn) => $(sel, el).addEventListener("input", (e) => { fn(e.target.value); save(); refreshStepMarks(); });

  function stepConcept(el) {
    el.innerHTML = `
      <div class="two-col">
        <div>
          <label class="field"><span>Character name</span><input type="text" id="f-name" value="${esc(C.name)}" placeholder="e.g. Luna Ashvale"></label>
          <label class="field"><span>Player</span><input type="text" id="f-player" value="${esc(C.player)}"></label>
          <label class="field"><span>Concept</span><textarea id="f-concept" placeholder="A disgraced court mage looking for redemption…">${esc(C.concept)}</textarea></label>
        </div>
        <div>
          <label class="field"><span>Portrait (optional)</span></label>
          <label class="portrait-drop" for="f-portrait">${C.portrait ? `<img src="${C.portrait}" alt="Portrait">` : "Click to choose an image"}</label>
          <input type="file" id="f-portrait" accept="image/*" class="sr-only">
          ${C.portrait ? `<button class="btn small ghost" id="rm-portrait" style="margin-top:8px">Remove portrait</button>` : ""}
        </div>
      </div>`;
    bindInput(el, "#f-name", (v) => (C.name = v));
    bindInput(el, "#f-player", (v) => (C.player = v));
    bindInput(el, "#f-concept", (v) => (C.concept = v));
    $("#f-portrait", el).addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, 480 / Math.max(img.width, img.height));
        const cv = document.createElement("canvas");
        cv.width = img.width * scale; cv.height = img.height * scale;
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        C.portrait = cv.toDataURL("image/jpeg", 0.85);
        save(); renderStep(); URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(file);
    });
    const rm = $("#rm-portrait", el);
    if (rm) rm.addEventListener("click", () => { C.portrait = ""; save(); renderStep(); });
  }

  function stepAmbition(el) {
    const names = D.ambitions.map((a) => (typeof a === "string" ? a : a.name));
    el.innerHTML = `
      <div class="amb-pick">${names.map((n) => `<button data-amb="${esc(n)}" aria-pressed="${C.ambition.toLowerCase() === n.toLowerCase()}">${esc(n)}</button>`).join("")}</div>
      <div class="two-col">
        <label class="field"><span>Your ambition (ideally one word)</span><input type="text" id="f-amb" value="${esc(C.ambition)}" placeholder="e.g. Knowledge"></label>
        <label class="field"><span>What it means for your character</span><textarea id="f-ambnote" placeholder="I want to understand the Null before it swallows us all…">${esc(C.ambitionNote)}</textarea></label>
      </div>
      <p class="muted" style="font-size:.9rem">Starting resolve: <b>${D.builder.startingResolve}</b>. Resolve is gained by acting on your ambition.</p>`;
    el.querySelectorAll("[data-amb]").forEach((b) => b.addEventListener("click", () => { C.ambition = b.dataset.amb; save(); renderBuilder(); }));
    bindInput(el, "#f-amb", (v) => { C.ambition = v; el.querySelectorAll("[data-amb]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.amb.toLowerCase() === v.trim().toLowerCase())); });
    bindInput(el, "#f-ambnote", (v) => (C.ambitionNote = v));
  }

  function stepAncestry(el) {
    el.innerHTML = `<div class="cards">${D.ancestries.map((a) => A.ancestryCard(D, a).replace('class="card panel facet ancestry-card"',
      `class="card panel facet ancestry-card selectable${C.ancestry === a.id ? " selected" : ""}" tabindex="0" role="button" aria-pressed="${C.ancestry === a.id}" data-anc="${esc(a.id)}"`)).join("")}</div>`;
    el.querySelectorAll("[data-anc]").forEach((c) => {
      const pick = () => {
        C.ancestry = c.dataset.anc;
        // drop ancestry talents that belong to another ancestry
        C.talents = C.talents.filter((id) => { const t = D.byId[id]; return t && (t.category !== "ancestry" || t.group.toLowerCase() === C.ancestry); });
        save(); renderBuilder();
      };
      c.addEventListener("click", pick);
      c.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
    });
  }

  function stepSkills(el) {
    const b = D.builder, zeroCount = () => Object.values(C.skills).filter((v) => v === 0).length;
    const left = pointsLeft();
    const pip = (v) => Array.from({ length: b.skillMax }, (_, i) => `<span class="pip${i < v ? " on" : ""}"></span>`).join("");
    const groups = [...new Set(D.skills.map((s) => s.group || ""))];
    el.innerHTML = `
      <div class="points${left < 0 ? " over" : ""}">Points left <b>${left}</b> / ${b.skillPoints}</div>
      ${groups.map((g) => `<div class="skill-group-title">${esc(g || "Skills")}</div>` + D.skills.filter((s) => (s.group || "") === g).map((s) => {
        const v = C.skills[s.id];
        const canDec = v > (b.skillMin ?? 0) && !(v - 1 < (b.skillStart ?? 1) && v - 1 === 0 && zeroCount() >= (b.maxSkillsAtZero ?? 1));
        const canInc = v < b.skillMax && left > 0;
        return `<div class="skill-row">
          <div><h4>${esc(s.name)}</h4><p>${A.inline(s.description)}</p></div>
          <div class="pips">
            <button class="btn small ghost" data-dec="${s.id}" aria-label="Lower ${esc(s.name)}" ${canDec ? "" : "disabled"}>${A.icon.minus}</button>
            ${pip(v)}
            <button class="btn small ghost" data-inc="${s.id}" aria-label="Raise ${esc(s.name)}" ${canInc ? "" : "disabled"}>${A.icon.plus}</button>
          </div></div>`;
      }).join("")).join("")}`;
    el.querySelectorAll("[data-inc]").forEach((x) => x.addEventListener("click", () => { C.skills[x.dataset.inc]++; save(); stepSkills(el); refreshStepMarks(); }));
    el.querySelectorAll("[data-dec]").forEach((x) => x.addEventListener("click", () => { C.skills[x.dataset.dec]--; save(); stepSkills(el); refreshStepMarks(); }));
  }

  function stepTraits(el) {
    const a = ancestry();
    el.innerHTML = `
      ${a && (a.traits || []).length ? `<p class="muted">From your ancestry: <b>${a.traits.map(esc).join(", ")}</b></p>` : ""}
      ${C.traits.map((t, i) => `<label class="field"><span>Trait ${i + 1}</span><input type="text" data-trait="${i}" value="${esc(t)}" placeholder="${["e.g. Quick-witted", "e.g. Afraid of deep water", "e.g. Stubborn"][i] || ""}"></label>`).join("")}`;
    el.querySelectorAll("[data-trait]").forEach((x) => x.addEventListener("input", (e) => { C.traits[+x.dataset.trait] = e.target.value; save(); refreshStepMarks(); }));
  }

  function stepTalents(el) {
    if (!C.ancestry) el.insertAdjacentHTML("beforebegin", `<div class="wip-note"><span>◆</span><span>Choose an ancestry first – it decides your ancestry talents.</span></div>`);
    renderTalentBuilder(el, true);
  }

  function stepSheet(el) {
    const a = ancestry();
    const [w1, w2, w3] = A.healthOf(a);
    const granted = grantedIds().map((id) => D.byId[id]);
    const chosen = C.talents.map((id) => D.byId[id]).filter(Boolean);
    const missing = STEP_IDS.slice(0, -1).filter((id) => !stepDone(id)).map((id) => D.builder.steps[id].title);
    const threads = (D.builder.threadsBase ?? 9) + Math.floor((C.skills.lore || 0) / 2);
    const pip = (v) => Array.from({ length: D.builder.skillMax }, (_, i) => `<span class="pip${i < v ? " on" : ""}"></span>`).join("");
    const boxes = (n) => `<span class="boxes">${"<i></i>".repeat(n) || "–"}</span>`;
    const traits = [...((a && a.traits) || []), ...C.traits.filter((t) => t.trim())];
    el.innerHTML = `
      ${missing.length ? `<div class="wip-note"><span>◆</span><span>Not finished yet: ${missing.map(esc).join(", ")}</span></div>` : ""}
      <div class="sheet-actions">
        <button class="btn primary" id="b-print">Print / save as PDF</button>
        <button class="btn" id="b-export">Download file</button>
        <label class="btn" for="b-import">Load file</label><input type="file" id="b-import" accept=".json,application/json" class="sr-only">
        <button class="btn ghost" id="b-new">Start a new character</button>
      </div>
      <div class="sheet facet">
        <div class="sheet-head">
          ${C.portrait ? `<img class="portrait" src="${C.portrait}" alt="">` : ""}
          <div>
            <h2>${esc(C.name || "Unnamed character")}</h2>
            <p class="sub">${[a && a.name, C.ambition && "Ambition: " + C.ambition].filter(Boolean).map(esc).join(" · ")}</p>
            ${C.player ? `<p class="sub">Player: ${esc(C.player)}</p>` : ""}
          </div>
          <img class="emblem" src="assets/img/emblem.png" alt="">
        </div>
        ${C.concept ? `<p>${esc(C.concept)}</p>` : ""}
        ${C.ambitionNote ? `<p><i>${esc(C.ambitionNote)}</i></p>` : ""}
        <div class="stat-row">
          <div class="stat"><b>${D.builder.startingResolve} / ${D.builder.startingResolve}</b><span>Resolve (current / max)</span></div>
          <div class="stat"><b>${threads}</b><span>Arcane threads (9 + Lore/2)</span></div>
          <div class="stat"><b>${esc((a && a.health) || "–")}</b><span>Health</span></div>
        </div>
        <div class="grid">
          <div>
            <h3>Skills</h3>
            ${D.skills.map((s) => `<div class="srow"><span>${esc(s.name)}</span><span class="pips">${pip(C.skills[s.id])}</span></div>`).join("")}
            <h3>Wounds</h3>
            <div class="wound-grid">
              <div class="wl"><span>lvl 1</span>${boxes(w1)}</div>
              <div class="wl"><span>lvl 2</span>${boxes(w2)}</div>
              <div class="wl"><span>lvl 3</span>${boxes(w3)}</div>
              <div class="wl"><span>lvl 4</span>${boxes(1)}</div>
            </div>
            <h3>Traits</h3>
            <p>${traits.length ? traits.map(esc).join(" · ") : "—"}</p>
          </div>
          <div>
            <h3>Talents</h3>
            ${[...granted, ...chosen].map((t) => `<div class="talent"><b>${esc(t.name)}</b> <small>${esc(A.groupName(D, t.category, t.group))}${t.uses ? " · uses " + esc(t.uses) : ""}${t.cost ? " · cost " + esc(t.cost) : ""}</small><br><span>${t.effect ? A.inline(t.effect) : "—"}</span></div>`).join("") || "<p>—</p>"}
            <h3>Notes</h3>
            <textarea id="f-notes" style="background:#fff;color:#2a1d2c;border-color:#d8c4d4">${esc(C.notes)}</textarea>
          </div>
        </div>
      </div>`;
    bindInput(el, "#f-notes", (v) => (C.notes = v));
    $("#b-print", el).addEventListener("click", () => window.print());
    $("#b-export", el).addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(C, null, 2)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = (A.slug(C.name) || "character") + ".ambition.json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    });
    $("#b-import", el).addEventListener("change", async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try { C = normalize(JSON.parse(await f.text())); save(); renderBuilder(); toast("Character loaded"); }
      catch (err) { toast("This file could not be read as a character."); }
    });
    $("#b-new", el).addEventListener("click", () => {
      if (!confirm("Start over? The current character will be cleared (download it first if you want to keep it).")) return;
      C = blankCharacter(); save(); stepIndex = 0; renderBuilder();
    });
  }

  /* keep saved characters valid when the rules data changes */
  function normalize(saved) {
    const c = Object.assign(blankCharacter(), saved || {});
    const fresh = blankCharacter();
    c.skills = Object.fromEntries(Object.keys(fresh.skills).map((k) => [k, Number.isFinite(c.skills && c.skills[k]) ? c.skills[k] : fresh.skills[k]]));
    c.traits = Array.from({ length: Math.max(fresh.traits.length, (c.traits || []).length) }, (_, i) => (c.traits || [])[i] || "");
    c.talents = (c.talents || []).filter((id) => D.byId[id]);
    if (c.ancestry && !D.ancestryById[c.ancestry]) c.ancestry = "";
    return c;
  }

  /* ==========================================================================
     TABS + INIT
     ========================================================================== */
  function showTab(name) {
    if (!["builder", "talents"].includes(name)) name = "builder";
    document.querySelectorAll("[data-tab]").forEach((t) => t.setAttribute("aria-selected", t.dataset.tab === name));
    $("#builder").classList.toggle("hidden", name !== "builder");
    $("#talents").classList.toggle("hidden", name !== "talents");
    if (location.hash !== "#" + name) history.replaceState(null, "", location.pathname + location.search + "#" + name);
    if (name === "builder") renderBuilder();
    else return renderTalentBuilder($("#talents"), false);
  }

  async function init() {
    const root = $("#char-root");
    try { D = await A.data.characters(); }
    catch (e) { root.innerHTML = A.errorBox(e); return; }
    C = normalize(A.storage.get(STORE_KEY, null));

    const params = new URLSearchParams(location.search);
    const g = params.get("group");
    if (g) {
      const grp = D.talents.find((t) => t.group.toLowerCase() === g.toLowerCase());
      ui.cat = grp ? grp.category : "archetype";
      ui.group = (grp ? grp.category : "archetype") + "|" + (grp ? grp.group : g);
    }

    document.querySelectorAll("[data-tab]").forEach((t) => t.addEventListener("click", () => showTab(t.dataset.tab)));
    window.addEventListener("hashchange", () => showTab(location.hash === "#talents" || location.hash === "#options" ? "talents" : "builder"));
    const tb = showTab(location.hash === "#talents" || location.hash === "#options" ? "talents" : "builder");
    const focus = params.get("focus");
    if (focus && tb && D.byId[focus]) setTimeout(() => tb.focus(focus), 50);
  }
  document.addEventListener("DOMContentLoaded", init);
})();
