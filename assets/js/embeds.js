/* ==========================================================================
   EMBEDS – lets Markdown chapters show data from /content without copying it.
   Write one of these lines in a .md file (on its own, with empty lines around):

     <div data-embed="talents" data-category="archetype"></div>   talent tables
     <div data-embed="ancestries"></div>                           ancestry cards
     <div data-embed="skills"></div>                               skill list
     <div data-embed="archetypes"></div>                           archetype list
     <div data-embed="ambitions"></div>                            example ambitions
     <div data-embed="elements"></div>                             elements (add data-compact="true" for symbols only)
   ========================================================================== */
(function () {
  "use strict";
  const A = window.Ambition;
  const esc = (s) => A.esc(s);

  const R = {
    async talents(el) {
      const D = await A.data.characters();
      const cat = el.dataset.category;
      const only = el.dataset.group;
      const list = D.talents.filter((t) => (!cat || t.category === cat) && (!only || t.group === only));
      const groups = [];
      list.forEach((t) => { let g = groups.find((x) => x.key === t.category + t.group); if (!g) groups.push(g = { key: t.category + t.group, t, items: [] }); g.items.push(t); });
      const reqText = (t) => t.reqs.filter((r) => !r.implicit).map((r) =>
        r.type === "talent" ? `<a href="characters.html?focus=${r.id}#talents">${esc(r.label)}</a>` : esc(r.label)).join(", ");
      el.innerHTML = groups.map((g) => {
        const name = A.groupName(D, g.t.category, g.t.group);
        const desc = g.t.category === "archetype" ? (D.archetypeById[g.t.group.toLowerCase()] || {}).description : "";
        return `
          <h3 id="${A.slug("t-" + g.key)}">${esc(name)} <small class="count">${g.items.length}</small></h3>
          ${desc ? `<p class="muted">${A.inline(desc)}</p>` : ""}
          <table class="talent-table">
            <thead><tr><th>Name</th><th>Uses</th><th>Cost</th><th>Prerequisites</th><th>Effect</th></tr></thead>
            <tbody>${g.items.map((t) => `
              <tr${t.wip ? ' class="wip"' : ""}><td><strong>${esc(t.name)}</strong></td><td data-label="Uses">${esc(t.uses)}</td><td data-label="Cost">${esc(t.cost)}</td><td data-label="Requires">${reqText(t)}</td>
              <td data-label="Effect">${t.effect ? A.inline(t.effect) : '<em class="wip-text">not written yet</em>'}</td></tr>`).join("")}
            </tbody>
          </table>`;
      }).join("") + `<p><a class="btn small" href="characters.html#talents">Open the talent builder →</a></p>`;
    },

    async ancestries(el) {
      const D = await A.data.characters();
      // data-lore="true" → only name, picture and lore text (no rules) – used on the Lore pages
      if (el.dataset.lore === "true") {
        el.innerHTML = D.ancestries.map((a) => `
          <section class="people" id="people-${A.slug(a.id)}">
            ${a.image ? `<img class="people-img" src="${a.image}" alt="">` : ""}
            <h3>${esc(a.name)}</h3>
            ${a.lore ? A.md(a.lore) : `<p class="wip-text">Lore not written yet – add it as "lore" in content/characters/ancestries.json.</p>`}
          </section>`).join("");
        return;
      }
      el.innerHTML = `<div class="cards">${D.ancestries.map((a) => ancestryCard(D, a)).join("")}</div>`;
    },

    async skills(el) {
      const D = await A.data.characters();
      const groups = ["physical", "mental", "social"];
      const extra = [...new Set(D.skills.map((s) => s.group))].filter((g) => !groups.includes(g));
      el.innerHTML = [...groups, ...extra].map((g) => {
        const list = D.skills.filter((s) => (s.group || "") === g);
        if (!list.length) return "";
        return `<h3>${esc(g ? g[0].toUpperCase() + g.slice(1) : "Other")}</h3>
          <div class="cards">${list.map((s) => `
            <div class="card panel facet"><h3>${esc(s.name)}</h3><p>${A.inline(s.description)}</p>
            ${s.examples ? `<p class="examples"><span>Examples:</span> ${A.inline(s.examples)}</p>` : ""}</div>`).join("")}</div>`;
      }).join("");
    },

    async archetypes(el) {
      const D = await A.data.characters();
      el.innerHTML = `<div class="arch-grid">${D.archetypes.map((a) => {
        const n = D.talents.filter((t) => t.category === "archetype" && t.group.toLowerCase() === a.id.toLowerCase()).length;
        return `<a class="arch panel facet" href="characters.html?group=${encodeURIComponent(a.id)}#talents"><b>${esc(a.name)}</b><span>${A.inline(a.description)}</span><small>${n ? n + " talents" : "no talents yet"}</small></a>`;
      }).join("")}</div>`;
    },

    async ambitions(el) {
      const D = await A.data.characters();
      el.innerHTML = `<div class="amb-list">${D.ambitions.map((a) => `<span class="amb">${esc(typeof a === "string" ? a : a.name)}</span>`).join("")}</div>`;
    },

    async elements(el) {
      const E = await A.data.elements();
      const compact = el.dataset.compact === "true";
      el.innerHTML = `<div class="element-cards${compact ? " compact" : ""}">${E.map((e) => `
        <div class="element-card panel facet" id="element-${e.id}">
          <div class="sym"><img src="${e.image}" alt=""></div>
          <div>
            <h3>${esc(e.name)}</h3>
            ${compact ? `<p class="subs">${(e.subElements || []).map((s) => esc(s.name)).join(" · ")}</p>` :
              `${(e.subElements || []).map((s) => `<p><strong>${esc(s.name)}:</strong> ${A.inline(s.description)}</p>`).join("")}${e.note ? `<p>${A.inline(e.note)}</p>` : ""}`}
          </div>
        </div>`).join("")}</div>`;
    }
  };

  A.embedRenderers = R;

  function ancestryCard(D, a) {
    const [w1, w2, w3] = A.healthOf(a);
    const box = (n, lvl) => `<span class="wbox-row"><small>lvl ${lvl}</small>${"<i></i>".repeat(n) || "–"}</span>`;
    return `
      <div class="card panel facet ancestry-card" id="ancestry-${A.slug(a.id)}">
        ${a.image ? `<div class="card-img"><img src="${a.image}" alt=""></div>` : ""}
        <h3>${esc(a.name)}</h3>
        <div class="meta">Health ${esc(a.health)}</div>
        <div class="wounds">${box(w1, 1)}${box(w2, 2)}${box(w3, 3)}</div>
        <dl>
          <dt>Traits</dt><dd>${(a.traits || []).length ? a.traits.map(esc).join(", ") : "–"}</dd>
          <dt>Talents</dt><dd>${(a.talents || []).map((n) => { const t = A.findTalent(D, n, { category: "ancestry", group: a.id }); return t ? `<span title="${esc(t.effect)}">${esc(t.name)}</span>` : esc(n); }).join(", ") || "–"}</dd>
          ${a.notes ? `<dt>Notes</dt><dd>${A.inline(a.notes)}</dd>` : ""}
        </dl>
        ${a.lore ? `<div class="md lore">${A.md(a.lore)}</div>` : `<p class="wip-text">Lore not written yet.</p>`}
      </div>`;
  }
  A.ancestryCard = ancestryCard;

  A.renderEmbeds = async function (root) {
    const els = [...root.querySelectorAll("[data-embed]")];
    await Promise.all(els.map(async (el) => {
      const fn = (A.embedRenderers || R)[el.dataset.embed];
      if (!fn) { el.innerHTML = `<p class="wip-text">Unknown embed "${esc(el.dataset.embed)}"</p>`; return; }
      try { await fn(el); } catch (e) { el.innerHTML = A.errorBox(e); }
    }));
  };
})();
