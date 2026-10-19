/* ==========================================================================
   DATA – loads the character rules data and understands prerequisites.
   Used by the System pages (embedded tables), the talent builder and the
   character builder, so every list exists only once in /content.
   ========================================================================== */
(function () {
  "use strict";
  const A = window.Ambition;
  const BASE = "content/characters/";
  let charCache = null, elemCache = null, loreCache = null;
  const realmTextCache = {};

  const lc = (s) => String(s || "").trim().toLowerCase();
  const cap = (s) => String(s || "").replace(/\b\w/g, (c) => c.toUpperCase());

  A.data = {
    /* All character data in one object */
    characters() {
      if (charCache) return charCache;
      charCache = Promise.all(["builder", "skills", "ancestries", "ambitions", "talents", "archetypes"]
        .map((f) => A.loadJSON(BASE + f + ".json")))
        .then(([builder, skills, ancestries, ambitions, talents, archetypes]) => {
          const D = {
            builder,
            skills: skills.skills || skills,
            ancestries: ancestries.ancestries || ancestries,
            ambitions: ambitions.examples || ambitions,
            categories: talents.categories || [],
            archetypes: archetypes.archetypes || archetypes,
            talents: []
          };
          const seen = {};
          (talents.talents || talents).forEach((t) => {
            if (!t || !t.name) return;
            let id = A.slug(`${t.category}-${t.group}-${t.name}`);
            if (seen[id]) id += "-" + ++seen[id]; else seen[id] = 1;
            D.talents.push({ ...t, id, wip: !String(t.effect || "").trim() || t.name === "XXX" || t.name === "Unnamed talent" });
          });
          D.byId = Object.fromEntries(D.talents.map((t) => [t.id, t]));
          D.skillById = Object.fromEntries(D.skills.map((s) => [s.id, s]));
          D.ancestryById = Object.fromEntries(D.ancestries.map((a) => [a.id, a]));
          D.archetypeById = Object.fromEntries(D.archetypes.map((a) => [lc(a.id), a]));
          D.talents.forEach((t) => (t.reqs = parseReqs(t, D)));
          // reverse links: which talents does this one unlock?
          D.talents.forEach((t) => (t.unlocks = []));
          D.talents.forEach((t) => t.reqs.forEach((r) => { if (r.type === "talent") D.byId[r.id].unlocks.push(t.id); }));
          return D;
        });
      charCache.catch(() => (charCache = null));
      return charCache;
    },

    /* Eras + realms (kingdoms / provinces through time) */
    lore() {
      if (loreCache) return loreCache;
      loreCache = Promise.all([A.loadJSON("content/lore/eras.json"), A.loadJSON("content/lore/realms.json")])
        .then(([e, r]) => {
          const eras = e.eras || e;
          const realms = r.realms || r;
          const L = { eras, realms, defaultEra: e.default || (eras[eras.length - 1] || {}).id };
          L.eraById = Object.fromEntries(eras.map((x) => [x.id, x]));
          L.realmById = Object.fromEntries(realms.map((x) => [x.id, x]));
          L.realmByMapName = {};
          L.realmsByMapName = {};
          realms.forEach((x) => {
            const k = String(x.map || x.name).normalize("NFKC").replace(/\s+/g, " ").trim();
            if (!L.realmByMapName[k]) L.realmByMapName[k] = x;
            (L.realmsByMapName[k] = L.realmsByMapName[k] || []).push(x);   // several realms may share a map name in different eras
          });
          return L;
        });
      loreCache.catch(() => (loreCache = null));
      return loreCache;
    },

    /* Splits a realm's Markdown file into the general part and one part per era
       (one "## Era name" heading per era) */
    async realmText(L, realm) {
      if (!realm.file) return { general: "", byEra: {} };
      if (!realmTextCache[realm.id]) realmTextCache[realm.id] = A.loadText("content/lore/" + realm.file).catch(() => "");
      const src = await realmTextCache[realm.id];
      const out = { general: "", byEra: {} };
      let cur = null;
      // a heading counts as an era if it matches its id, name, short name or one of its "aliases" –
      // text in brackets is ignored, so "## Before Rogamon" matches "Before Rogamon (vKR)"
      const bare = (x) => A.slug(String(x || "").replace(/\([^)]*\)/g, ""));
      const match = (h) => {
        const k = bare(h);
        return L.eras.find((e) => [e.id, e.name, e.short, ...(e.aliases || [])].filter(Boolean).map(bare).includes(k));
      };
      src.replace(/\r\n?/g, "\n").split("\n").forEach((line) => {
        const m = line.match(/^##\s+(.+?)\s*$/);
        const era = m && match(m[1]);
        if (era) { cur = era.id; out.byEra[cur] = out.byEra[cur] || ""; return; }
        if (cur) out.byEra[cur] += line + "\n"; else out.general += line + "\n";
      });
      return out;
    },

    elements() {
      if (!elemCache) elemCache = A.loadJSON("content/system/elements.json").then((d) => d.elements || d);
      return elemCache;
    }
  };

  /* Display name of a talent group (archetype, ancestry, god, spell group) */
  A.groupName = function (D, category, group) {
    if (category === "archetype") return (D.archetypeById[lc(group)] || {}).name || cap(group);
    if (category === "ancestry") return (D.ancestryById[lc(group)] || {}).name || cap(group);
    if (category === "static") return group === "general" ? "General spells" : cap(group) + "s";
    return cap(group);
  };

  /* Find a talent by name, preferring the same category / group */
  A.findTalent = function (D, name, near) {
    const n = lc(name).replace(/\s+talent$/, "");
    const hits = D.talents.filter((t) => lc(t.name) === n);
    if (!hits.length) return null;
    if (near) {
      return hits.find((t) => t.category === near.category && t.group === near.group) ||
             hits.find((t) => t.category === near.category) || hits[0];
    }
    return hits[0];
  };

  /* Turn the prerequisite text into checkable requirements */
  function parseReqs(t, D) {
    const reqs = [];
    if (t.category === "ancestry" && t.group) reqs.push({ type: "ancestry", id: lc(t.group), label: (D.ancestryById[lc(t.group)] || {}).name || cap(t.group), implicit: true });
    String(t.prerequisites || "").split(/[,;]| and /i).map((p) => p.trim()).filter(Boolean).forEach((part) => {
      if (/\bor\b/i.test(part)) { reqs.push({ type: "text", label: part }); return; }
      const sk = part.match(/^([a-zA-ZÀ-ž ]+?)\s*\+?\s*(\d+)\s*\+?$/);
      if (sk) {
        const s = D.skills.find((x) => lc(x.id) === lc(sk[1]) || lc(x.name) === lc(sk[1]));
        if (s) { reqs.push({ type: "skill", skill: s.id, min: +sk[2], label: `${s.name} ${sk[2]}+` }); return; }
      }
      const an = part.match(/^(.+?)\s+ancestry$/i);
      if (an && D.ancestryById[lc(an[1])]) { reqs.push({ type: "ancestry", id: lc(an[1]), label: part }); return; }
      const tal = A.findTalent(D, part, t);
      if (tal && tal.id !== t.id) { reqs.push({ type: "talent", id: tal.id, label: tal.name }); return; }
      reqs.push({ type: "text", label: part });
    });
    return reqs;
  }

  /* Check requirements against a character context:
     ctx = { talents: Set of ids, skills: {id: value} | null, ancestry: id | null }
     returns [{...req, ok: true | false | null}]  (null = can't be checked automatically) */
  A.checkReqs = function (t, ctx) {
    return t.reqs.map((r) => {
      let ok = null;
      if (r.type === "talent") ok = ctx.talents.has(r.id);
      if (r.type === "skill") ok = ctx.skills ? (ctx.skills[r.skill] || 0) >= r.min : null;
      if (r.type === "ancestry") ok = ctx.ancestry ? ctx.ancestry === r.id : null;
      return { ...r, ok };
    });
  };

  /* All talent prerequisites (recursively) that are still missing */
  A.missingChain = function (D, t, have) {
    const out = [];
    const walk = (x) => x.reqs.forEach((r) => {
      if (r.type !== "talent" || have.has(r.id) || out.includes(r.id)) return;
      walk(D.byId[r.id]);
      out.push(r.id);
    });
    walk(t);
    return out;
  };

  /* Talents that depend (recursively) on the given talent */
  A.dependents = function (D, id, have) {
    const out = [];
    const walk = (x) => D.byId[x].unlocks.forEach((u) => {
      if (have.has(u) && !out.includes(u)) { out.push(u); walk(u); }
    });
    walk(id);
    return out;
  };

  /* The selected era is shared between the Lore pages and the map */
  A.era = {
    get(L) {
      const q = new URLSearchParams(location.search).get("era");
      if (q && L.eraById[q]) return q;
      const saved = A.storage.get("ambition.era", null);
      return saved && L.eraById[saved] ? saved : L.defaultEra;
    },
    set(id) { A.storage.set("ambition.era", id); }
  };

  A.healthOf = (anc) => String((anc && anc.health) || "0-0-0").split(/\s*-\s*/).map((n) => parseInt(n, 10) || 0);
})();
