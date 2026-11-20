# Justin Liu — Field Notes

A hand-built personal site about systems, notes, and the rest of life. Technical notes, project records, a running `/now` snapshot, and a small life log.

## Stack

Plain HTML, CSS and vanilla JavaScript. No build step, no framework, no analytics.

| Path | What it is |
| --- | --- |
| `index.html` | Home: introduction, snapshot, selected work, life, journey, recent notes |
| `about.html` | The longer story and honest tool tiers |
| `projects.html` | Project records, with internal/public status |
| `blog.html` | Notes index (search + category filters) |
| `post.html` | Renders one Markdown note from `posts/` |
| `now.html` | Current snapshot, rendered from `data/now.json` |
| `life.html` | Skateboarding, English, travel photographs, and the field log |
| `cv.html` | Bilingual CV, print-ready |
| `404.html` | Custom GitHub Pages not-found page |
| `data/now.json` | The only place to edit the Now page and home snapshot |
| `data/life.json` | The only place to edit the dated/undated life log |
| `data/photos.json` | The only place to add or reorder photographs in the Life gallery |
| `posts/posts.json` | Index of technical notes |
| `js/main.js` | Theme, navigation, notes index, Markdown rendering, data pages, CV |
| `css/style.css` | All design tokens and layout |

## Local preview

Do not open the HTML files directly with `file://` — the notes index and the data pages use `fetch()` and need an HTTP origin.

```bash
python3 -m http.server 8000
```

Then visit <http://localhost:8000>.

## Deployment

The site is published by GitHub Pages from the `main` branch. There is no build command: push the files and Pages serves them directly. The empty `.nojekyll` file keeps Jekyll out of the way, and `404.html` is picked up automatically.

## Publishing a note

1. Add the Markdown file to `posts/` (for example `posts/my-note.md`).
2. Add an entry to `posts/posts.json`:

```json
{
  "id": "my-note",
  "title": "中文标题",
  "title_en": "English title",
  "date": "2026-11-21",
  "category": "AI-infra",
  "group": "tech",
  "summary": "One-sentence summary.",
  "summary_en": "One-sentence summary in English.",
  "file": "my-note.md"
}
```

3. The notes index, homepage “Recent notes” strip, article page, table of contents, and previous/next links update automatically.

`id`, `date`, `category`, `title`, `title_en`, `summary`, `summary_en` and `file` drive the UI. `category` powers the filters; `group` is kept for older entries. The first `# Heading` is removed by the renderer because the page title comes from `posts.json`. Images can be referenced as `../assets/...` or `assets/...`; the renderer normalises both.

## Updating Now

Edit `data/now.json` only. Do not edit `now.html` or the homepage rows.

- `updated`: ISO date (`YYYY-MM-DD`). The date stamps on `/now` and the homepage are derived from this — there is no second label to keep in sync. The Life page uses `data/life.json`'s own `updated`.
- `intro`: the deck under the page title.
- `home`: the four rows in the homepage “Currently” section.
- `sections`: the numbered blocks on `/now` (`title`, `body`, `note`).
- `recent`: dated entries. `href` is optional and may point to a note or a page.

Update it when something changes, not on a schedule. If the current state is unknown, leave it out rather than inventing a project, metric or event.

## Updating Life

Edit `data/life.json` only. The standing threads (skateboarding, English, travel, rabbit holes) live in `life.html` because they change less often; the log below them comes from the JSON.

```json
{
  "date": null,
  "tag": "Skate",
  "status": "In progress",
  "title": "Kickflip, still pending",
  "body": "One short, honest paragraph."
}
```

Use `date: "2026-11-21"` for a dated entry, or `date: null` plus `status` for an ongoing note. Bump the top-level `updated` date when you add an entry — both date stamps on the page come from it. Keep entries short. Personal photographs of other people stay private unless they have agreed otherwise.

## Editing the rest

- Homepage hero: `index.html` (`.hero`).
- Journey timeline: `index.html` (`#journey`).
- Project records: `projects.html`. Each record has context, problem, approach, difficulty and outcome. Leave an outcome out if there isn't one.
- CV: `cv.html` — English and Chinese panels. Use “Print / Save PDF” for a print-ready copy.
- Visual tokens and layout: `css/style.css`.
- Shared interactions: `js/main.js`.

## Photographs

The site now uses real photographs from two folders:

- `assets/travel/` — `TH1.jpg`, `TH2.jpg`, `TH3.jpg`, `CHONGQING1.jpg`, `CHONGQING2.jpg`, `CHONGQING3.jpg`
- `assets/girlfrient/` — `girlfriend1.jpg`, `girlfriend2.jpg`, `girlfriend3.png` (folder spelling kept as-is; rename it to `girlfriend` only if you also update the three paths in `life.html`)

Where they appear:

- Hero and About portrait: `travel/TH1.jpg` and `travel/TH2.jpg`
- Home “Life & memories”: `travel/TH3.jpg`
- Life travel thread: `travel/CHONGQING3.jpg`
- Life photo wall: the remaining travel frames and all three `girlfrient` photographs, driven by `data/photos.json`

### Adding a photograph

1. Put the image file in `assets/travel/` (or another folder).
2. Add an object to the matching group in `data/photos.json`:

```json
{
  "src": "assets/travel/my-photo.jpg",
  "alt": "Describe what is visible in the photograph.",
  "caption": "One short, honest line.",
  "width": 1600,
  "height": 1200
}
```

The gallery re-flows automatically into a compact three-column journal at desktop, two columns at tablet width, and one column on phones. No HTML, CSS or JavaScript changes are needed. `width`/`height` are optional but keep the layout from jumping while the image loads. Figure numbers are generated from the top-level `"start"` value. To add a new section (for example a separate trip), add another `{ "title", "note", "photos" }` object to `groups`.

The two abstract posters still in use are deliberate stand-ins: `poster-skate.svg` for skateboarding and `poster-learning.svg` for English. Replace those `<img>` sources when you have a real skate/study photograph, and keep the existing aspect ratio.

### Before publishing the originals

These are camera originals. They are large and may contain EXIF/GPS metadata. Resize and strip metadata before treating the repo as public. For example, with ImageMagick:

```bash
mkdir -p assets/travel/web
magick assets/travel/TH1.jpg -auto-orient -resize '1600x1600>' -strip -quality 82 assets/travel/web/TH1.jpg
```

Then point the corresponding `<img src>` / `data/photos.json` entry at the `web/` copy. Repeat for the `girlfrient` images. The site currently references the originals because the image tools were not available in the editing session.

## Content rules

- Every factual claim should be traceable to `cv.html`, a public note, the paper, or a public repository. No invented metrics, employers, awards or travel dates.
- Distinguish “Working with” (used on real tasks), “Exploring” (still learning) and “Foundation” (from study/earlier work). Do not turn any of them into “expert”.
- The interface is English-first; the CV is bilingual. Notes stay in their original language.
- Photographs that include other people only go up with their agreement. Strip EXIF/GPS metadata before publishing, especially for travel photographs.
- The visual language is a warm print/zine editorial, not an AI-company landing page. Keep the paper, rules, serif/sans/mono mix, and asymmetric grids.

## Known intentional choices

- No build step and no CMS. Data pages are JSON so they stay easy to edit; notes are Markdown.
- The notes index and the Now/Life log require JavaScript and an HTTP origin. Each has a `<noscript>` fallback pointing at the source files.
- No analytics, tracking, cookie banner or external CMS.
