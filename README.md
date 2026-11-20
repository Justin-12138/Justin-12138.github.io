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
| `life.html` | Skateboarding, English, travel, and the field log |
| `cv.html` | Bilingual CV, print-ready |
| `404.html` | Custom GitHub Pages not-found page |
| `data/now.json` | The only place to edit the Now page and home snapshot |
| `data/life.json` | The only place to edit the dated/undated life log |
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

## Replacing the image placeholders

The four posters in `assets/` are deliberate placeholders, not AI decoration:

- `poster-hero.svg` — hero / portrait (4:5)
- `poster-skate.svg` — skateboarding (4:5)
- `poster-learning.svg` — learning (4:3)
- `poster-life.svg` — life and travel (3:2)

Replace the corresponding `<img src="...">` in `index.html`, `about.html` or `life.html` with a real photograph. Keep the aspect ratio and update the alt text. Comments mark each slot.

## Content rules

- Every factual claim should be traceable to `cv.html`, a public note, the paper, or a public repository. No invented metrics, employers, awards or travel dates.
- Distinguish “Working with” (used on real tasks), “Exploring” (still learning) and “Foundation” (from study/earlier work). Do not turn any of them into “expert”.
- The interface is English-first; the CV is bilingual. Notes stay in their original language.
- The visual language is a warm print/zine editorial, not an AI-company landing page. Keep the paper, rules, serif/sans/mono mix, and asymmetric grids.

## Known intentional choices

- No build step and no CMS. Data pages are JSON so they stay easy to edit; notes are Markdown.
- The notes index and the Now/Life log require JavaScript and an HTTP origin. Each has a `<noscript>` fallback pointing at the source files.
- No analytics, tracking, cookie banner or external CMS.
