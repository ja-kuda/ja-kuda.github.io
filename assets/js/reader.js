/* ==========================================================================
   READER – used by system.html and lore.html
   Reads  content/<section>/chapters.json  and the Markdown files it lists.
   ========================================================================== */
(function () {
  "use strict";
  const A = window.Ambition;

  A.reader = async function (opts) {
    const base = opts.base;                       // e.g. "content/system/"
    const tocEl = document.getElementById("toc");
    const articleEl = document.getElementById("article");
    const headEl = document.getElementById("page-head");
    let data;
    try { data = await A.loadJSON(base + "chapters.json"); }
    catch (e) { articleEl.innerHTML = A.errorBox(e); return; }

    /* page header */
    headEl.innerHTML = `
      ${data.icon ? `<img class="page-icon" src="${data.icon}" alt="">` : ""}
      <div><div class="eyebrow">${A.esc(data.eyebrow || "")}</div><h1>${A.esc(data.title || "")}</h1><p>${A.inline(data.intro || "")}</p></div>`;
    document.title = `Ambition – ${data.title}`;

    /* flatten chapters for paging */
    const flat = [];
    (data.chapters || []).forEach((ch) => {
      ch.id = ch.id || A.slug(ch.title);
      flat.push({ ...ch, parent: null });
      (ch.sections || []).forEach((s) => {
        s.id = s.id || A.slug(s.title);
        flat.push({ ...s, parent: ch });
      });
    });
    const byId = Object.fromEntries(flat.map((c) => [c.id, c]));
    const cache = {};
    const fetchMd = (c) => (cache[c.id] ||= A.loadText(base + c.file).catch((e) => `> [!rule] Missing file\n> ${e.message}`));

    /* table of contents */
    tocEl.innerHTML = `
      <div class="search">
        <input type="search" id="toc-search" placeholder="Search ${A.esc(data.title || "")}…" aria-label="Search">
      </div>
      <div class="results hidden" id="toc-results"></div>
      <ol id="toc-list">${(data.chapters || []).map((ch) => `
        <li><a class="top" href="#${ch.id}" data-id="${ch.id}">${A.esc(ch.title)}</a>
          ${(ch.sections || []).length ? `<ol>${ch.sections.map((s) => `<li><a href="#${s.id}" data-id="${s.id}">${A.esc(s.title)}</a></li>`).join("")}</ol>` : ""}
        </li>`).join("")}
      </ol>`;

    const toggle = document.getElementById("toc-toggle");
    if (toggle) toggle.addEventListener("click", () => {
      const open = tocEl.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open);
    });

    /* search across all chapters */
    const searchInput = document.getElementById("toc-search");
    const resultsEl = document.getElementById("toc-results");
    const listEl = document.getElementById("toc-list");
    let searchToken = 0;
    searchInput.addEventListener("input", async () => {
      const q = searchInput.value.trim().toLowerCase();
      const token = ++searchToken;
      if (!q) { resultsEl.classList.add("hidden"); listEl.classList.remove("hidden"); return; }
      const texts = await Promise.all(flat.map(fetchMd));
      if (token !== searchToken) return;
      const hits = [];
      flat.forEach((c, i) => {
        const plain = A.frontMatter(texts[i]).body.replace(/[#>*_`|\[\]()!-]/g, " ").replace(/\s+/g, " ");
        const idx = plain.toLowerCase().indexOf(q);
        const inTitle = c.title.toLowerCase().includes(q);
        if (idx >= 0 || inTitle) {
          const snip = idx >= 0 ? "…" + plain.slice(Math.max(0, idx - 30), idx + q.length + 50).trim() + "…" : "";
          hits.push(`<li><a href="#${c.id}" data-id="${c.id}">${A.esc(c.title)}<small>${A.esc(snip)}</small></a></li>`);
        }
      });
      resultsEl.innerHTML = hits.length ? `<ol>${hits.join("")}</ol>` : `<p>No matches.</p>`;
      resultsEl.classList.remove("hidden");
      listEl.classList.add("hidden");
    });

    /* show a chapter */
    async function show(id) {
      const ch = byId[id] || flat[0];
      if (!ch) { articleEl.innerHTML = "<p class='muted'>No chapters yet.</p>"; return; }
      tocEl.querySelectorAll("a[data-id]").forEach((a) => a.setAttribute("aria-current", a.dataset.id === ch.id ? "true" : "false"));
      const raw = await fetchMd(ch);
      const { meta, body } = A.frontMatter(raw);
      const idx = flat.indexOf(ch);
      const prev = flat[idx - 1], next = flat[idx + 1];
      const image = ch.image || meta.image;
      const crumbs = ch.parent ? `${A.esc(data.title)} · ${A.esc(ch.parent.title)}` : A.esc(data.title);
      articleEl.innerHTML = `
        ${image ? `<div class="cover"><img src="${image}" alt=""></div>` : ""}
        <div class="crumbs">${crumbs}</div>
        <div class="md">${A.md(body)}</div>
        <nav class="pager">
          ${prev ? `<a class="prev" href="#${prev.id}"><small>← Previous</small>${A.esc(prev.title)}</a>` : ""}
          ${next ? `<a class="next" href="#${next.id}"><small>Next →</small>${A.esc(next.title)}</a>` : ""}
        </nav>`;
      if (A.renderEmbeds) await A.renderEmbeds(articleEl);
      document.title = `${ch.title} – Ambition ${data.title}`;
      tocEl.classList.remove("open");
      if (toggle) toggle.querySelector("span").textContent = ch.title;
    }

    function route() {
      const id = decodeURIComponent(location.hash.slice(1));
      show(id).then(() => {
        const top = document.getElementById("reader-top");
        if (top && window.scrollY > top.offsetTop) window.scrollTo({ top: top.offsetTop - 80, behavior: "smooth" });
      });
    }
    window.addEventListener("hashchange", route);
    route();
  };
})();
