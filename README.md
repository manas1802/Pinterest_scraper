# Pinterest-Scraper

A TypeScript-based Pinterest bulk scraper using Puppeteer. Feed it a CSV of Pinterest URLs and it saves scraped pin data to CSV files and checkpoints so runs can be resumed.

---

## Quick Start (macOS)

Prerequisites

- Node.js (18+ recommended)
- Git
- Chrome or Chromium (Puppeteer will download a compatible Chromium by default)

1. Clone and install

```bash
git clone https://github.com/Bes-js/Pinterest-Scraper.git
cd Pinterest-Scraper
npm install
```

2. Configure environment

```bash
cp .env.example .env
# Edit .env and set EMAIL, PASSWORD and optional settings
open .env    # or use your editor
```

Important vars live in `.env` (see `.env.example`).

3. Prepare input CSV

- Default path: `input/urls.csv` (set via INPUT_CSV in .env)
- CSV format: header row then one URL per line (legacy formats supported).

4. Run

- Development / direct (requires ts-node):

```bash
npm run start
```

5. Output & checkpoints

- Output directory: configured via OUTPUT_DIR in `.env` (default `output`)
- CSV exporter writes per-run CSV files. Checkpoints are stored in `checkpoints` so interrupted runs can resume.

6. Interrupts & errors

- Press Ctrl+C to stop; progress is saved.
- Logs and progress CSVs are written into the output directory.

---

## Useful commands

- Install: `npm install`
- Start (ts-node): `npm run start`

---

## Where to look in the repo

- Entry point: `src/index.ts`
- CSV reader/validation: `src/services/csvReader.ts`
- Progress & checkpointing: `src/services/progressTracker.ts`
- CSV export: `src/utils/csvExporter.ts`
- Example env: `.env.example`
- Scripts & dependencies: `package.json`

---

If something fails, check:

- `.env` values (EMAIL/PASSWORD, INPUT_CSV, OUTPUT_DIR)
- Chrome/Chromium availability
- `output` and `checkpoints` directories for logs and partial data
