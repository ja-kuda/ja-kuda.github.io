# Ambition – Website

Hub for the Ambition pen & paper RPG: **System**, **Characters**, **Map** and **Lore**.

The site is plain HTML/CSS/JavaScript – no build step, no frameworks. It runs on GitHub Pages (or any web host) as it is.

---

## Viewing the site on your computer

Browsers don't allow pages opened straight from disk (`file://…`) to load the content files.
Double-click **`start-local-server.bat`** (needs Python – https://python.org) and open <http://localhost:8000>.
Alternatives: the "Live Server" extension in VS Code, or `npx serve`.

## Publishing on GitHub Pages

Copy everything in this folder into your `ja-kuda.github.io` repository (replacing the old files) and push. The empty `.nojekyll` file must stay.

---

## Where everything lives

```
index.html, system.html, characters.html, map.html, lore.html   ← page shells (rarely need editing)
assets/        ← design: css, javascript, icons, crystal dividers, element symbols
content/       ← EVERYTHING YOU WRITE – edit only here
  site.json            home page texts, tiles, news, footer, "work in progress" note
  home.md              "What is Ambition?" box on the home page
  impressum.md
  system/              rules: chapters.json + one .md file per chapter
  lore/                world: chapters.json + one .md file per chapter
  characters/          builder.json, skills.json, ancestries.json, ambitions.json, talents.json
  map/                 map.json, locations.json, Akudia_full_8.svg (the map)
  images/              put your own pictures here
```

---

## TODO placeholders

Texts that are not written yet are marked with **TODO** – in `content/map/locations.json`, `content/lore/realms.json` and the realm texts in `content/lore/lands/realms/`. Search a file for `TODO` to find what is left.

- A field or a line that **starts with TODO** is hidden on the website, so unfinished stubs never show up. Replace the TODO with your text and it appears.
- Text after the TODO (e.g. `"TODO: City / Town / Village"`) is only a hint for you.

## Writing texts (Markdown)

All chapter texts are Markdown files. Quick reference:

| You write | You get |
|---|---|
| `# Title`, `## Section`, `### Sub` | headings |
| `**bold**`, `*italic*` | **bold**, *italic* |
| `[System](system.html#checks)` | a link (`#checks` jumps to that chapter) |
| `![Alt text](content/images/pic.png "Caption")` | an image with caption |
| `- item` / `1. item` | lists |
| `---` | a crystal divider (cycles through the 13 crystal images) |
| `\| a \| b \|` + `\|---\|---\|` | a table |

**Boxes** (callouts):

```
> [!example]
> Damo the thief jumps across the gap…

> [!rule] Making a check
> Roll dice equal to your skill…

> [!note]    > [!gm]    > [!tip]
```
The text after `[!example]` becomes the box title (optional).

You can also write plain HTML where Markdown isn't enough.

## Adding / reordering chapters (System & Lore)

Open `content/system/chapters.json` (or `content/lore/…`). Each entry points to a Markdown file:

```json
{ "title": "Checks", "file": "02-1-checks.md" }
```

- Order in the file = order on the website.
- Sub-chapters go into `"sections": [ … ]` of a chapter.
- Optional: `"id"` (the link name after `#`, otherwise made from the title) and `"image"` (a cover picture shown on top of the chapter).
- The file names don't matter to the website – the numbers are just to keep the folder tidy.

## Swapping images

Put a new image into `content/images/` and reference it as `content/images/your-file.png`.
To replace an existing image, simply save a new file under the **same name** – nothing else needs to change.
The section icons (System / Characters / Map / Lore) are in `assets/img/icons/`.

## Home page

Everything on the home page is in `content/site.json`: title, tagline, intro, the four tiles, the news list and the footer.
Delete the `"workInProgressNote"` line to remove the yellow note on every page.

**Latest updates** fills itself: after every push, the newest commit messages from GitHub appear there (with date and a link to the change), mixed with the hand-written entries under `"news"`. Settings in `site.json` → `"updates"`:

- `"github"`: the repository (`ja-kuda/ja-kuda.github.io`). Delete the line to show only the hand-written news.
- `"count"`: how many entries the box shows in total (5) – commits and hand-written news together, newest first; the oldest drop out.
- `"hidePrefix"`: commits whose message starts with this are skipped – e.g. a commit message `- fixed typo` won't appear.

Tip: the first line of the commit message is what visitors see, so write it for them (e.g. "New lore: the gods and their symbols").

---

## Characters (rules data)

The character builder, the talent builder **and** the System pages all read the same files in `content/characters/` – change a talent once and it changes everywhere.

| File | Contains |
|---|---|
| `builder.json` | the creation rules: starting resolve, skill start value (1), skill points (15), max skill (5), how many skills may drop to 0, number of traits (3), talent picks (5), max static spells (3), thread base (9) – plus the title and intro text of every builder step |
| `skills.json` | the skills with `group` (physical / mental / social), description and examples |
| `ancestries.json` | each ancestry: `health` ("3-2-1"), `traits`, `talents` (names, granted automatically), `notes`, `lore`, optional `image` |
| `ambitions.json` | the example ambitions |
| `archetypes.json` | archetype names and descriptions (`id` = the `group` used in talents.json) |
| `talents.json` | the categories (ancestry, archetype, aspect, static) and **all talents** |

A talent looks like this:

```json
{ "name": "Shadow jumper", "category": "archetype", "group": "assassin",
  "uses": "4", "cost": "", "prerequisites": "Shadow stalker", "effect": "Teleport from shadow to shadow" }
```

- `category`: `ancestry`, `archetype`, `aspect` or `static`
- `group`: the ancestry id, archetype id, god name or spell group (e.g. `star sign`)
- `prerequisites` (separate several with commas) are understood automatically when written as
  - a talent name – `Shadow stalker` (or `Inspire Talent`)
  - a skill – `Lore +3` or `lore 3+`
  - an ancestry – `Orvosa ancestry`
  - anything else (e.g. `Choose a weapon`) is shown as a note and not checked.
- Talents with an empty `effect` are marked as unfinished.
- Ancestry talents never count against the 5 talent picks.

### Talent builder

`characters.html#talents` – browse all talents by category and group, add them to the current character, and see what each talent requires and unlocks. Adding a talent automatically adds its missing talent prerequisites; removing one removes the talents that depend on it. Link straight to a talent with `characters.html?focus=<id>#talents` or to a group with `characters.html?group=assassin#talents`.

### Showing data inside chapters

A Markdown chapter can show data from the json files instead of copying it. Put one of these lines on its own (with empty lines around it):

```html
<div data-embed="talents" data-category="archetype"></div>
<div data-embed="talents" data-category="ancestry" data-group="hinan"></div>
<div data-embed="ancestries"></div>
<div data-embed="skills"></div>
<div data-embed="archetypes"></div>
<div data-embed="ambitions"></div>
<div data-embed="elements"></div>            (add data-compact="true" for symbols only)
```

### Elements

`content/system/elements.json` lists the elements with their sub-elements; the symbols are in `content/images/elements/` (transparent PNGs, drawn for a light background, so the site shows them on a pale disc). The full wheel is `content/images/element-wheel.png`.

---

## Lore

`content/lore/chapters.json` lists the Lore chapters; the files are sorted into folders (`world/`, `peoples/`, `lands/`, `faith/`, `magic/`, `history/`, `factions/`, `compendium/`). The order goes from concrete (places, peoples) to deep lore (the fabric of reality, the Null) so new readers aren't overwhelmed.

Useful boxes for lore pages:

```
> [!glance] At a glance          ← fact box, put a two-column table inside
> | | |
> |---|---|
> | **Capital** | … |

> [!secret] Hidden truth         ← closed until the reader clicks it (GM secrets, spoilers)
> …
```

### Eras, kingdoms and provinces

- `content/lore/eras.json` – the eras in order (`id`, `name`, `short` label for the timeline, `period`, `summary`, `chapter` = History section). `default` is the era shown first. Optional `mapLayers` switches map layers when an era is selected, e.g. `{"_10_Roads": false}`. `"realms": false` hides the realm list (the sigils at the top) for that era in the Lore – used for Before Rogamon and Rogamon's Reign; their history pages still show.
- `content/lore/realms.json` – every kingdom/province. A realm only appears in an era if it has an entry under `eras`:

```json
{ "id": "rotmark", "name": "Rotmark", "kind": "Province", "map": "Rotmark",
  "coat": "content/images/coats/rotmark.svg", "file": "lands/realms/rotmark.md",
  "eras": {
    "after-rogamon": { "status": "Independent kingdom", "ruler": "…", "capital": "…", "summary": "…" },
    "present":       { "status": "Duchy", "partOf": "red-white-alliance" }
  } }
```

  **Hide a realm in one era** without deleting its text: put an underscore in front of the era name, e.g. `"_present": { … }`. The realm then doesn't appear in that era (realm list, era icons, map info); remove the underscore to bring it back. Many entries are parked like this at the moment.
  `partOf` (the id of another realm in the same era) groups realms – e.g. provinces that unified into one kingdom. Extra rows: `"facts": {"Army": "…"}`. A new kingdom that doesn't exist on the map simply gets no `map` value.
- `content/lore/lands/realms/<id>.md` – the long texts. Text before the first heading is shown in every era; then one `## Era name` heading per era (text in brackets can be left out, e.g. `## After Rogamon` for "After Rogamon (nKR)").
- The coats of arms in `content/images/coats/` were cut out of the map's Symbols layer. Replace a file to change a coat, or add a new one for a new realm.
- On the map, the era chosen in the dropdown (shared with the Lore pages) decides which information the info window shows for provinces and symbols.

Embeds for lore pages: `<div data-embed="realms">`, `<div data-embed="eras">`, `<div data-embed="era" data-era="present">`, `<div data-embed="gods">`.
`<div data-embed="ancestries" data-lore="true">` shows the peoples with only their name, picture and lore (from the `lore` field in `content/characters/ancestries.json`) – no rules.

### God symbols

Each god in `content/lore/faith/02-gods.md` has a line like

```html
<img class="symbol" src="content/images/gods/debilor.webp" alt="Symbol of Debilor">
```

The symbols from Lionafire are saved as `content/images/gods/<name>.webp`. To change one, save a new picture (PNG/WebP with a transparent background) and change the file name in the line. If the file is missing, a small ◆ placeholder is shown. Copy the line to give a new god a symbol.

---

## Map

- **Replace the map:** save the new SVG into `content/map/` and put its file name into `"svg"` in `map.json` (currently `Akudia_full_8.svg`). Keep the layer names from your graphics program (`02_Mountains`, `08_Locations`, …) – they become the layer switches.
- **Layers:** `map.json` → `layers`. `id` is the layer id in the SVG (Affinity exports `08_Locations` as `_08_Locations`), `label` is the shown name, `visible` the default, and `type` makes the names in that layer clickable.
- **Clickable shapes (symbols, provinces):** add `"items": "shapes"` (things drawn on top, like coats of arms) or `"items": "areas"` (large areas like provinces – names and symbols on top of them stay clickable) to a layer in `map.json`. Every object directly inside that layer becomes clickable, with hover highlight and tooltip. Its name is the object's ID (Inkscape: Object properties → ID; Affinity: the layer/object name). Objects without a name can borrow one with `"nameFrom"`: `"nameFrom": "_09_Symbols"` gives each province the name of the symbol lying inside it. A province and its symbol then share one entry in `locations.json`.
- **Start hidden:** `"visible": false` on a layer.
- **Eras on the map:** the **Era** box at the top sets the time period for the whole map (shared with the Lore pages). It decides which border layers are shown and which era the info window opens with. Inside the info window the era buttons switch only that place's view – the map keeps its era. A small dot marks the map's era; buttons with content are brighter.
- **Eras on the map:** the map only offers the eras listed in `map.json` → `"eras"` – currently `{ "after-rogamon": "59 nKR", "present": "235 nKR" }` (era id → the year the map shows, displayed in the era menu). Before Rogamon and Rogamon's Reign exist only in the Lore. To add an era to the map, add it there and give it its layers.
- **Provinces and symbols per era:** each map era has its own layers in the SVG (`_59_nKR` = After Rogamon, `_235_nKR` = Present). In `map.json` the layers of one kind share a **label** (one switch) and each gets its era:

```json
{ "id": "_09_Symbols_59_nKR",    "label": "Symbols",   "items": "shapes", "eras": ["after-rogamon"] },
{ "id": "_13_Symbols_235_nKR",   "label": "Symbols",   "items": "shapes", "eras": ["present"] },
{ "id": "_06_Provinces_59_nKR",  "label": "Provinces", "items": "areas",  "eras": ["after-rogamon"], "nameFrom": "_09_Symbols_59_nKR" },
{ "id": "_11_Provinces_235_nKR", "label": "Provinces", "items": "areas",  "eras": ["present"],       "nameFrom": "_13_Symbols_235_nKR" }
```

  The switch shows only the layer of the chosen era. A layer of a switch **without** `"eras"` would be used for every era that has no layer of its own. `"items": "shapes"` / `"areas"` make the objects clickable; `"nameFrom": "<symbol layer>"` lets unnamed areas borrow the name of the symbol inside them.
- **Names of objects:** the name you give an object in Affinity is its name on the map (Affinity's numbered ids like `Varland2` are ignored) and `_` counts as a space (`Rot-Weiße_Allianz` → "Rot-Weiße Allianz"). A kingdom in `content/lore/realms.json` is linked to its symbol/area with `"map": "Rot-Weiße Allianz"`. Several realms may use the same map name in different eras (e.g. "Rogamon" = *Rogamon's realm* in Rogamon's Reign and *Rogamon's remaining lands* in After Rogamon) – the info window picks the one of the shown era.
- **Measuring distances:** the ruler button below the zoom buttons. Click points on the map; the box shows the distance and the travel time. Undo point / Clear / Done (or Esc). The scale is set in `map.json` → `"scale"` (`"mapUnits": 312.69, "km": 1000` – taken from the old 1000 km scale bar) and the travel speeds in `"travel"` (`{ "label": "On foot", "kmPerDay": 30 }` – add, remove or change as you like).
- **Descriptions:** `locations.json`. The key must be **exactly the name as written on the map**:

```json
"Toralt": {
  "eras": {
    "after-rogamon": {
      "type": "Village",
      "province": "Tralien",
      "facts": { "Ruler": "Lord X", "Population": "300" },
      "text": "What the place is like in 59 nKR (Markdown) …",
      "image": "content/images/toralt.jpg",
      "lore": "lore.html#world"
    },
    "present": {
      "type": "City",
      "province": "Stahlmark",
      "facts": { "Ruler": "Governor Y", "Population": "12,000" },
      "text": "What it is like in 235 nKR …"
    }
  }
}
```
Places without an entry show a "No description yet" hint with the exact name to use.

**Everything is written per era** – one block for `after-rogamon` (the map of 59 nKR) and one for `present` (235 nKR), each with its own `type`, `province`, `facts` (Ruler, Population – add any other fact you like, e.g. `"Garrison": "200"`) and `text`; `image` and `lore` (a "Read more" link) are optional. All fields are optional and fields that still say TODO are hidden. (Fields directly on the entry, outside `"eras"`, still work as a default for both eras.)

Notes from before and during Rogamon's reign that were written earlier are kept under `"_older eras"` in the entry – the map doesn't show them; move them into the Lore or delete them.

Provinces and realms get their per-era information from `content/lore/realms.json` automatically.
An entry for something that isn't labelled on the map can get a pin by adding `"x"` and `"y"` (map coordinates, 0–1949 / 0–1516).
- Link straight to a place: `map.html#Toralt`.

> JSON tip: every entry except the last needs a comma after it, and texts need "double quotes". If a page suddenly shows "Content could not be loaded", the error message names the broken file.
