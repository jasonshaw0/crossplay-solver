# Game-rule and screenshot verification

The four local screenshots supplied during development were visually transcribed into the JSON files in `tests/fixtures/screenshots`. Their raw image files are ignored so that game screenshots are not redistributed in the public repository.

The screenshots establish the complete 15 × 15 premium layout used in `src/lib/crossplay/config.ts`, including an ordinary center square. The following observed scores are locked by automated regressions:

- `RELAX`, placed across row 8 from column 6, scores 22. The R and X occupy double-letter cells.
- Extending it to `RELAXED` scores 32. The new D occupies a double-word cell; the old letter premiums do not reactivate.
- A blank E in `OVEN` remains worth zero. The previewed vertical `YOW` scores 30 and creates `WOVEN` for 13, totaling 43.

The screenshots also verify 100% board occupancy, board letter, rack letter, and physical-blank recognition across all four original images and resized JPEG variants on the development machine. The local recognition benchmark completed each image in roughly 90–110 ms. These image-backed tests run when the ignored fixture images are present; their expected JSON remains in the repository.

The bundled ENABLE 2K dictionary is a broad public-domain fallback. Crossplay documents NWL 2023 as its source lexicon, with additional curation. Scores and placement legality are exact for the loaded lexicon, but an ENABLE word may occasionally differ from the game's acceptance. Users can load a one-word-per-line `.txt` dictionary or maintain addition/removal overrides in Settings.

The tile-count table is used only for nonblocking sanity warnings and remains provisional because no tile-bag inventory screenshot was supplied. It never prunes solver moves.
