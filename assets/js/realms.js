/* ==========================================================================
   REALMS & ERAS – kingdoms and provinces through the ages.
   Data: content/lore/eras.json, content/lore/realms.json,
         content/lore/lands/realms/*.md (one "## Era name" heading per era)

   Embeds for Markdown chapters:
     <div data-embed="realms"></div>               era timeline + realm cards
     <div data-embed="eras"></div>                 list of all eras (History)
     <div data-embed="era" data-era="present"></div>  header box for one era
     <div data-embed="gods"></div>                 gods + aspects (from talents.json)
   ========================================================================== */
(function () {
  "use strict";
  const A = window.Ambition;
  const esc = (s) => A.esc(s);
  const R = (A.embedRenderers = A.embedRenderers || {});

  /* ---------- helpers ---------- */
  const inEra = (realm, eraId) => !!(realm.eras && realm.eras[eraId]);
  const eraData = (realm, eraId) => (realm.eras && realm.eras[eraId]) || {};
  const membersOf = (L, realm, eraId) => L.realms.filter((r) => inEra(r, eraId) && eraData(r, eraId).partOf === realm.id);
  const coat = (realm, cls = "coat") => realm.coat ? `<img class="${cls}" src="${realm.coat}" alt="">` : `<span class="${cls} coat-empty">◆</span>`;

  function factsList(L, realm, eraId) {
    const d = eraData(realm, eraId);
    const rows = [];
    if (d.status) rows.push(["Status", esc(d.status)]);
    if (d.ruler) rows.push(["Ruler", A.inline(d.ruler)]);
    if (d.capital) rows.push(["Capital", A.inline(d.capital)]);
    if (d.partOf && L.realmById[d.partOf]) rows.push(["Part of", `<a href="#" data-realm="${d.partOf}">${esc(L.realmById[d.partOf].name)}</a>`]);
    const mem = membersOf(L, realm, eraId);
    if (mem.length) rows.push(["Includes", mem.map((m) => `<a href="#" data-realm="${m.id}">${esc(m.name)}</a>`).join(", ")]);
    Object.entries(d.facts || {}).forEach(([k, v]) => rows.push([esc(k), A.inline(String(v))]));
    return rows;
  }
  A.realmFacts = factsList;

  /* ---------- era timeline ---------- */
  function timeline(L, current) {
    return `<div class="era-line" role="tablist" aria-label="Eras">${L.eras.map((e) => `
      <button role="tab" class="era-step" data-era="${e.id}" aria-selected="${e.id === current}">
        <span class="dot"></span><span class="nm">${esc(e.short || e.name)}</span>
      </button>`).join("")}</div>`;
  }

  /* ---------- realm detail (modal) ---------- */
  async function openRealm(L, id, eraId) {
    const realm = L.realmById[id];
    if (!realm) return;
    let dlg = document.getElementById("realm-dialog");
    if (!dlg) {
      dlg = document.createElement("dialog");
      dlg.id = "realm-dialog";
      dlg.className = "realm-dialog";
      document.body.appendChild(dlg);
      dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
    }
    const eras = L.eras.filter((e) => inEra(realm, e.id));
    let cur = inEra(realm, eraId) ? eraId : (eras.find((e) => e.id === L.defaultEra) || eras[0] || {}).id;
    const text = await A.data.realmText(L, realm);

    const draw = () => {
      const d = eraData(realm, cur);
      const rows = factsList(L, realm, cur);
      dlg.innerHTML = `
        <div class="rd-inner">
          <button class="btn ghost rd-close" aria-label="Close">${A.icon.close}</button>
          <div class="rd-head">${coat(realm, "coat big")}
            <div><div class="eyebrow">${esc(realm.kind || "Realm")}</div><h2>${esc(realm.name)}</h2></div>
          </div>
          ${text.general.trim() ? `<div class="md">${A.md(text.general)}</div>` : ""}
          ${eras.length ? `<div class="rd-eras">${eras.map((e) => `<button class="chip" data-rd-era="${e.id}" aria-pressed="${e.id === cur}">${esc(e.name)}</button>`).join("")}</div>` : `<p class="wip-text">This realm has no era entries yet.</p>`}
          ${cur ? `
            ${rows.length ? `<dl class="facts">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>` : ""}
            ${d.summary ? `<p class="rd-summary">${A.inline(d.summary)}</p>` : ""}
            ${(text.byEra[cur] || "").trim() ? `<div class="md">${A.md(text.byEra[cur])}</div>` : `<p class="wip-text">No text for this era yet – add a "## ${esc(L.eraById[cur].name)}" section to <code>content/lore/${esc(realm.file || "")}</code>.</p>`}` : ""}
          <div class="rd-actions">
            ${realm.map ? `<a class="btn small primary" href="map.html?era=${cur || ""}#${encodeURIComponent(realm.map)}">Show on map</a>` : ""}
          </div>
        </div>`;
      dlg.querySelector(".rd-close").addEventListener("click", () => dlg.close());
      dlg.querySelectorAll("[data-rd-era]").forEach((b) => b.addEventListener("click", () => { cur = b.dataset.rdEra; draw(); }));
      dlg.querySelectorAll("[data-realm]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); openRealm(L, a.dataset.realm, cur); }));
    };
    draw();
    if (!dlg.open) dlg.showModal();
    dlg.scrollTop = 0;
  }
  A.openRealm = openRealm;

  /* ---------- embed: realms explorer ---------- */
  R.realms = async (el) => {
    const L = await A.data.lore();
    let era = A.era.get(L);
    const draw = () => {
      const e = L.eraById[era];
      const here = L.realms.filter((r) => inEra(r, era));
      const top = here.filter((r) => { const p = eraData(r, era).partOf; return !p || !inEra(L.realmById[p] || {}, era); });
      el.innerHTML = `
        ${timeline(L, era)}
        <div class="era-info panel">
          <div><div class="eyebrow">${esc(e.period || "Era")}</div><h3>${esc(e.name)}</h3><p>${A.inline(e.summary || "")}</p></div>
          <div class="era-links">
            ${e.chapter ? `<a class="btn small ghost" href="#${e.chapter}">Read the history</a>` : ""}
            <a class="btn small ghost" href="map.html?era=${era}">Open the map in this era</a>
          </div>
        </div>
        <p class="count">${here.length} realm${here.length === 1 ? "" : "s"} in this era</p>
        ${top.length ? `<div class="realm-grid">${top.map((r) => {
          const d = eraData(r, era), mem = membersOf(L, r, era);
          return `<button class="realm-card panel facet" data-realm="${r.id}">
            ${coat(r)}
            <span class="rc-body">
              <b>${esc(r.name)}</b>
              <small>${esc(d.status || r.kind || "")}</small>
              ${d.summary ? `<span class="rc-sum">${A.inline(d.summary)}</span>` : ""}
              ${mem.length ? `<span class="rc-mem">Includes ${mem.map((m) => esc(m.name)).join(", ")}</span>` : ""}
            </span>
          </button>`;
        }).join("")}</div>` : `<p class="wip-text">No realms recorded for this era yet – add them in <code>content/lore/realms.json</code>.</p>`}`;
      el.querySelectorAll("[data-era]").forEach((b) => b.addEventListener("click", () => { era = b.dataset.era; A.era.set(era); draw(); }));
      el.querySelectorAll("[data-realm]").forEach((b) => b.addEventListener("click", () => openRealm(L, b.dataset.realm, era)));
    };
    draw();
    const q = new URLSearchParams(location.search).get("realm");
    if (q && L.realmById[q]) openRealm(L, q, era);
  };

  /* ---------- embed: list of eras ---------- */
  R.eras = async (el) => {
    const L = await A.data.lore();
    el.innerHTML = `<ol class="era-list">${L.eras.map((e) => {
      const n = L.realms.filter((r) => inEra(r, e.id)).length;
      return `<li class="panel facet">
        <span class="dot"></span>
        <div><div class="eyebrow">${esc(e.period || "")}</div>
          <h3>${e.chapter ? `<a href="#${e.chapter}">${esc(e.name)}</a>` : esc(e.name)}</h3>
          <p>${A.inline(e.summary || "")}</p>
          <a href="#realms" data-goto-era="${e.id}" class="small-link">${n} realm${n === 1 ? "" : "s"} in this era →</a></div>
      </li>`;
    }).join("")}</ol>`;
    el.querySelectorAll("[data-goto-era]").forEach((a) => a.addEventListener("click", () => A.era.set(a.dataset.gotoEra)));
  };

  /* ---------- embed: one era header ---------- */
  R.era = async (el) => {
    const L = await A.data.lore();
    const e = L.eraById[el.dataset.era];
    if (!e) { el.innerHTML = `<p class="wip-text">Unknown era "${esc(el.dataset.era)}" – check eras.json.</p>`; return; }
    const here = L.realms.filter((r) => inEra(r, e.id));
    el.innerHTML = `<div class="era-info panel">
      <div><div class="eyebrow">${esc(e.period || "Era")}</div><p>${A.inline(e.summary || "")}</p>
      ${here.length ? `<div class="era-coats">${here.map((r) => `<button data-realm="${r.id}" title="${esc(r.name)}">${coat(r)}</button>`).join("")}</div>` : ""}</div>
      <div class="era-links"><a class="btn small ghost" href="#realms" data-goto-era="${e.id}">Realms in this era</a>
      <a class="btn small ghost" href="map.html?era=${e.id}">Map in this era</a></div></div>`;
    el.querySelectorAll("[data-goto-era]").forEach((a) => a.addEventListener("click", () => A.era.set(a.dataset.gotoEra)));
    el.querySelectorAll("[data-realm]").forEach((b) => b.addEventListener("click", () => openRealm(L, b.dataset.realm, e.id)));
  };

  /* ---------- embed: gods (from the aspect talents) ---------- */
  R.gods = async (el) => {
    const D = await A.data.characters();
    const list = D.talents.filter((t) => t.category === "aspect");
    el.innerHTML = `<table><thead><tr><th>God</th><th>Aspect</th><th>Gift (aspect talent)</th></tr></thead><tbody>${list.map((t) =>
      `<tr><td><strong>${esc(t.group)}</strong></td><td>${esc(t.name.replace(/^Aspect of\s+/i, ""))}</td><td>${t.effect ? A.inline(t.effect) : '<em class="wip-text">not written yet</em>'}</td></tr>`).join("")}</tbody></table>`;
  };
})();
