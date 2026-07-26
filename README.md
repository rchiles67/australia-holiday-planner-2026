# Australia holiday planner — late October / November 2026

A flexible, visual planner for a 3–4 week Australia trip, centred on South West Western Australia and Tasmania with scenery-led options around Melbourne and Sydney. The live site is designed to be shared as a permanent starting plan while each visitor’s experiments save in their own browser.

Open the published planner at <https://rchiles67.github.io/australia-holiday-planner-2026/>.

## How sharing works

- The GitHub Pages site always shows the latest plan published from `main`.
- Edits made in the browser save locally on that device; they do not silently change the public plan.
- **Export** downloads the full local plan as JSON for backup or for sending changes to Codex.
- To publish agreed changes for both travellers, update the source data, commit and push. GitHub Actions redeploys the site automatically.

This deliberately avoids accounts, a database and accidental overwrites. Do not put booking references, passport details or other private information in the public repository.

## Features

- Accurate Natural Earth 1:10m Australia boundary and true-coordinate route markers.
- Overview and fitted road-section map tabs for each contiguous group between flights.
- Route ordering with drag handles and draggable duration edges.
- Editable start and end dates.
- Visible edit and permanent-delete controls for every destination idea.
- Destination detail workspaces with galleries, route judgement, trade-offs, seasonal notes and source links.
- Upload, clipboard-paste and URL-based gallery additions saved locally.
- Reorderable, pinnable and removable sources/live checks, with location links repeated in the relevant destination.
- London–Australia and domestic flight search links.
- Four comparison directions, led by a 28-day WA + Tasmania + Sydney option.
- Independent Include, Maybe, Exclude and per-card day choices for each direction.
- Add a direction by copying the current plan, or remove a direction without deleting its idea cards.
- Eight Tasmania scenery modules following the anti-clockwise order in `tasmania_holiday_ideas.md`.
- Optional Great Ocean Road, Wilsons Promontory, Sydney coast, Blue Mountains and Royal National Park cards.
- Responsive phone layout; no PowerShell commands are needed to view the published site.

## Local development

```powershell
npm install
npm run dev
```

Then open <http://localhost:5173/> on this computer.

For a fixed phone-sized preview in a second tab, open <http://localhost:5173/mobile-preview.html>. The published equivalent is <https://rchiles67.github.io/australia-holiday-planner-2026/mobile-preview.html>.

Create a production build with `npm run build`.

## Data and image licensing

The map boundary is Natural Earth public-domain data. Travel photographs are sourced from Wikimedia Commons and retain their individual licences and attributions. Full credits are in [PHOTO_CREDITS.md](PHOTO_CREDITS.md) and are also visible beside each photograph in the planner.

The application code and the third-party media are separate works; no blanket licence is asserted over the photographs.
