/* ==========================================================================
   AMBITION – core helpers shared by every page
   - builds header + footer
   - loads JSON / Markdown files from /content
   - tiny Markdown renderer (no external libraries needed)
   ========================================================================== */
(function () {
  "use strict";

  const NAV = [
    { href: "system.html",     label: "System",     icon: "assets/img/icons/system.png" },
    { href: "characters.html", label: "Characters", icon: "assets/img/icons/characters.png" },
    { href: "map.html",        label: "Map",        icon: "assets/img/icons/map.png" },
    { href: "lore.html",       label: "Lore",       icon: "assets/img/icons/lore.png" }
  ];

  const A = (window.Ambition = {});
  let siteCache = null;

  /* ---------- loading ---------- */
  A.loadText = async function (path) {
    const res = await fetch(path, { cache: "no-cache" });
    if (!res.ok) throw new Error(`Could not load ${path} (${res.status})`);
    return res.text();
  };
  A.loadJSON = async function (path) {
    const txt = await A.loadText(path);
    try { return JSON.parse(txt); }
    catch (e) { throw new Error(`${path} is not valid JSON: ${e.message}`); }
  };
  A.site = async function () {
    if (!siteCache) siteCache = A.loadJSON("content/site.json");
    return siteCache;
  };

  /* Friendly error box – shown when a content file is missing or broken */
  A.errorBox = function (err) {
    const fileHint = location.protocol === "file:"
      ? `<p>You opened the page directly from disk. Browsers block loading content files that way – start the site with <code>start-local-server.bat</code> (or any local web server) and open <code>http://localhost:8000</code>.</p>`
      : "";
    return `<div class="callout rule"><div class="callout-title">Content could not be loaded</div><p>${A.esc(err.message || String(err))}</p>${fileHint}</div>`;
  };

  /* ---------- small utils ---------- */
  A.esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  A.slug = (s) => String(s).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  A.storage = {
    get(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage unavailable */ } },
    remove(key) { try { localStorage.removeItem(key); } catch (e) { /* ignore */ } }
  };
  A.icon = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="icon"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    plus:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14"/></svg>',
    minus:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12h14"/></svg>',
    close:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    fit:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/></svg>',
    menu:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h16"/></svg>'
  };

  /* ---------- header / footer ---------- */
  A.renderChrome = async function () {
    const here = location.pathname.split("/").pop() || "index.html";
    const header = document.getElementById("site-header");
    if (header) {
      header.className = "site-header";
      header.innerHTML = `
        <div class="inner">
          <a class="brand" href="index.html"><img src="assets/img/emblem.png" alt="">Ambition</a>
          <nav class="main-nav" aria-label="Main">
            ${NAV.map((n) => `<a href="${n.href}"${n.href === here ? ' aria-current="page"' : ""}><img src="${n.icon}" alt="">${n.label}</a>`).join("")}
          </nav>
        </div>`;
    }
    const site = await A.site().catch(() => ({}));
    const footer = document.getElementById("site-footer");
    if (footer) {
      footer.className = "site-footer";
      const links = (site.footerLinks || []).map((l) => `<a href="${A.esc(l.href)}">${A.esc(l.label)}</a>`).join(" · ");
      footer.innerHTML = `<div class="inner"><span>${A.inline(site.footer || "Ambition")}</span><span>${links}</span></div>`;
    }
    const wip = document.getElementById("wip-note");
    if (wip && site.workInProgressNote) {
      wip.className = "wip-note";
      wip.innerHTML = `<span>◆</span><span>${A.inline(site.workInProgressNote)}</span>`;
    } else if (wip) wip.remove();
  };

  /* ==========================================================================
     MARKDOWN
     Supports: # headings, **bold**, *italic*, `code`, [links](url),
     ![images](path "caption"), lists, > quotes, tables, --- dividers,
     callouts (> [!example] / [!note] / [!rule] / [!gm]) and raw HTML lines.
     ========================================================================== */
  const DIVIDERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
  let dividerIndex = 0;

  A.inline = function (s) {
    if (s == null) return "";
    const codes = [];
    s = String(s).replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
    s = s
      .replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_, alt, src, title) => `<img src="${src}" alt="${A.esc(alt)}"${title ? ` title="${A.esc(title)}"` : ""} loading="lazy">`)
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, href) => `<a href="${href}"${/^https?:/.test(href) ? ' target="_blank" rel="noopener"' : ""}>${t}</a>`)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, "$1<em>$2</em>")
      .replace(/(^|\W)_([^_\s][^_]*?)_(?=\W|$)/g, "$1<em>$2</em>")
      .replace(/ {2,}$/gm, "<br>");
    return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${A.esc(codes[i])}</code>`);
  };

  A.md = function (src) {
    const lines = String(src || "").replace(/\r\n?/g, "\n").split("\n");
    const out = [];
    let i = 0;
    const headingIds = {};

    const isBlockStart = (l) => /^(#{1,6}\s|>|\s*[-*+]\s|\s*\d+[.)]\s|\|.*\||---+\s*$|\*\*\*+\s*$|<\/?[a-zA-Z])/.test(l) || /^!\[[^\]]*\]\([^)]*\)\s*$/.test(l);

    while (i < lines.length) {
      let line = lines[i];

      if (!line.trim()) { i++; continue; }

      // Heading
      let m = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
      if (m) {
        const level = m[1].length, text = m[2];
        let id = A.slug(text.replace(/<[^>]+>/g, "")) || "section";
        if (headingIds[id]) id += "-" + ++headingIds[id]; else headingIds[id] = 1;
        out.push(`<h${level} id="${id}">${A.inline(text)}</h${level}>`);
        i++; continue;
      }

      // Divider (uses the crystal images)
      if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
        const n = DIVIDERS[dividerIndex++ % DIVIDERS.length];
        out.push(`<div class="divider" role="separator"><img src="assets/img/dividers/line_${n}.png" alt=""></div>`);
        i++; continue;
      }

      // Raw HTML block – passed through until an empty line
      if (/^<\/?[a-zA-Z]/.test(line)) {
        const buf = [];
        while (i < lines.length && lines[i].trim()) buf.push(lines[i++]);
        out.push(buf.join("\n"));
        continue;
      }

      // Stand-alone image → figure with caption
      m = line.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)\s*$/);
      if (m) {
        const cap = m[3] ? `<figcaption>${A.inline(m[3])}</figcaption>` : "";
        out.push(`<figure><img src="${m[2]}" alt="${A.esc(m[1])}" loading="lazy">${cap}</figure>`);
        i++; continue;
      }

      // Blockquote / callout
      if (/^>/.test(line)) {
        const buf = [];
        while (i < lines.length && /^>/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ""));
        const cm = buf[0] && buf[0].match(/^\[!(\w+)\]\s*(.*)$/);
        if (cm) {
          const kind = cm[1].toLowerCase();
          const defaults = { example: "Example", note: "Note", rule: "Rule", gm: "For the GM", tip: "Tip", glance: "At a glance", secret: "Hidden truth" };
          const title = cm[2] || defaults[kind] || kind;
          const inner = A.md(buf.slice(1).join("\n"));
          if (kind === "secret") out.push(`<details class="callout secret"><summary class="callout-title">${A.inline(title)} <span>– click to reveal</span></summary>${inner}</details>`);
          else out.push(`<div class="callout ${kind}"><div class="callout-title">${A.inline(title)}</div>${inner}</div>`);
        } else {
          out.push(`<blockquote>${A.md(buf.join("\n"))}</blockquote>`);
        }
        continue;
      }

      // Table
      if (/^\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\|?\s*:?-{2,}/.test(lines[i + 1])) {
        const row = (l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        const head = row(line);
        const aligns = row(lines[i + 1]).map((c) => (/^:-+:$/.test(c) ? "center" : /-+:$/.test(c) ? "right" : ""));
        i += 2;
        const body = [];
        while (i < lines.length && /^\|.*\|\s*$/.test(lines[i])) body.push(row(lines[i++]));
        const al = (j) => (aligns[j] ? ` style="text-align:${aligns[j]}"` : "");
        out.push(`<table><thead><tr>${head.map((h, j) => `<th${al(j)}>${A.inline(h)}</th>`).join("")}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c, j) => `<td${al(j)}>${A.inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`);
        continue;
      }

      // Lists (one level + indented sub-lists)
      m = line.match(/^(\s*)([-*+]|\d+[.)])\s+/);
      if (m) {
        const ordered = /\d/.test(m[2]);
        const items = [];
        while (i < lines.length) {
          const l = lines[i];
          const lm = l.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
          if (lm && lm[1].length < 2) { items.push([lm[3]]); i++; }
          else if (l.trim() && /^\s{2,}/.test(l) && items.length) { items[items.length - 1].push(l.replace(/^\s{2,4}/, "")); i++; }
          else if (!l.trim() && i + 1 < lines.length && /^\s{2,}\S/.test(lines[i + 1]) && items.length) { i++; }
          else break;
        }
        const tag = ordered ? "ol" : "ul";
        out.push(`<${tag}>${items.map((it) => {
          const first = A.inline(it[0]);
          const rest = it.slice(1);
          return `<li>${first}${rest.length ? A.md(rest.join("\n")) : ""}</li>`;
        }).join("")}</${tag}>`);
        continue;
      }

      // Paragraph
      const buf = [];
      while (i < lines.length && lines[i].trim() && !(buf.length && isBlockStart(lines[i]))) buf.push(lines[i++]);
      out.push(`<p>${A.inline(buf.join("\n"))}</p>`);
    }
    return out.join("\n");
  };

  /* Split "front matter" style header off a markdown file:
     ---
     title: Something
     image: content/images/x.jpg
     ---                                                         */
  A.frontMatter = function (src) {
    const m = String(src).match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
    if (!m) return { meta: {}, body: src };
    const meta = {};
    m[1].split("\n").forEach((l) => { const kv = l.match(/^(\w+):\s*(.*)$/); if (kv) meta[kv[1]] = kv[2].trim(); });
    return { meta, body: src.slice(m[0].length) };
  };

  /* TODO placeholders: any text that starts with "TODO" is treated as not written yet and hidden on the site.
     A.stripTodo(value) returns a copy without TODO texts, empty fact lists and empty era parts. */
  A.isTodo = (v) => typeof v === "string" && /^\s*\**\s*TODO\b/i.test(v);
  A.stripTodo = function strip(v, depth = 0) {
    if (A.isTodo(v)) return undefined;
    if (Array.isArray(v)) return v.map((x) => strip(x, depth + 1)).filter((x) => x !== undefined);
    if (v && typeof v === "object") {
      const out = {};
      Object.entries(v).forEach(([k, x]) => {
        const c = strip(x, depth + 1);
        if (c === undefined) return;
        if (c && typeof c === "object" && !Array.isArray(c) && !Object.keys(c).length && (k === "facts" || depth >= 1)) return;   // drop empty facts / empty era parts
        out[k] = c;
      });
      return out;
    }
    return v;
  };
  A.dropTodoLines = (text) => String(text || "").split(/\r?\n/).filter((l) => !A.isTodo(l)).join("\n");

  /* Images with class "symbol" (e.g. god symbols) show a placeholder until the file exists */
  document.addEventListener("error", (e) => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement) || !img.classList.contains("symbol")) return;
    const ph = document.createElement("span");
    ph.className = img.className + " symbol-missing";
    ph.textContent = "◆";
    ph.title = "Symbol missing – save it as " + img.getAttribute("src");
    img.replaceWith(ph);
  }, true);

  document.addEventListener("DOMContentLoaded", () => { A.renderChrome(); });
})();
