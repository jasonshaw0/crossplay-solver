# Crossplay Solver

Crossplay Solver is a private-by-default board solver for NYT Crossplay positions. The homepage opens directly to an editable 15 × 15 board and seven-slot rack. It can reconstruct a position from a phone screenshot, enumerate every legal play, rank moves by exact immediate score, and preview each placement with its cross words and score arithmetic.

The app has two independent engines:

1. Local computer vision reads the screenshot inside a browser worker. It dynamically locates the board, detects occupied cells, recognizes the large tile glyphs and rack slots, and preserves the small zero that identifies a physical blank. Screenshot bytes are never uploaded.
2. A deterministic anchor/trie solver runs in a separate worker. Cross-check bitmasks prune impossible letters, while an independent validator reconstructs every complete main and perpendicular word before scoring the play.

No account, server, external vision API, or API key is required. Current positions, settings, and optional correction samples stay in browser storage. A small service worker caches the solver, dictionary, and recognition templates after the first successful visit so the installed site can be used offline.

## Use it locally

Node.js 24 is used in development.

```sh
npm install
npm run dev
```

Open `http://127.0.0.1:3000`. The supplied `.env.example` is intentionally empty of credentials.

## Checks

```sh
npm test
npm run typecheck
npm run lint
npm run build
npm run benchmark
```

The tests cover tile values, premium geometry, word reconstruction, blanks, rack consumption, scoring, screenshot-state reconciliation, and optimized-generator equivalence with a slow brute-force oracle on randomized positions. Regression tests lock `RELAX = 22`, `RELAXED = 32`, and `YOW + WOVEN = 43`.

`npm run benchmark` profiles a real supplied midgame state against the full bundled lexicon. `npx tsx scripts/benchmark-recognition.ts` measures local image recognition when the ignored source screenshots are available.

## Dictionary

The repository bundles 169,266 words of length 2–15 from the public-domain [ENABLE 2K list](https://github.com/BartMassey/wordlists). Its license text and source archive are kept under `public/dictionary`.

The game documents NWL 2023 as its source word list, while excluding some proper nouns and trademarks. ENABLE is not a verbatim replacement for that copyrighted lexicon. Settings can load another one-word-per-line `.txt` file and apply additions or removals without changing solver code.

## Screenshot recognition

Recognition uses fixed game geometry rather than generic OCR:

- repeated board colors and spacing locate and normalize the grid at arbitrary phone resolutions;
- color segmentation detects blue board and rack tiles;
- the central glyph is isolated from its small point value;
- compact templates classify A–Z, while point-glyph recognition retains blanks at zero value;
- every result includes confidence, and ambiguous cells remain editable;
- later imports report conflicts instead of overwriting prior or manual state.

The development-only recognition debugger shows the normalized board, grid overlay, glyph crops, timings, predictions, and confidence. Corrected crops can be retained locally and exported as labeled training data. Nothing retrains or uploads automatically.

See [docs/verification.md](docs/verification.md) for screenshot evidence, known lexicon limits, and the scoring fixtures.

## GitHub Pages

The app is a static Next.js export. `.github/workflows/deploy-pages.yml` runs unit tests, type checking, linting, and the production build before publishing `out/`. The configured base path also covers dictionary files, recognition templates, example positions, and both workers.

The project is an independent fan-made tool and is not affiliated with or endorsed by The New York Times. Crossplay and its associated marks belong to their owner. No reference-site source code or brand assets are included.
