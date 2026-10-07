# OPA Games

OPA Games is a static collection of lightweight browser games. It is structured to publish directly with **GitHub Pages using `docs/` as the site source**.

## Current games

- **Blocky Speller** (`/games/blocky-speller/`) – a blocky-style spelling game with spoken prompts, lives, and level progression.

## Run locally

Because the game now loads JSON (`config.json` and wordpacks), run it through a local static server (not `file://`).

### Python

```bash
cd /home/runner/work/opa_games/opa_games
python3 -m http.server 8000
```

Open: `http://localhost:8000/docs/`

### Node (serve)

```bash
cd /home/runner/work/opa_games/opa_games
npx serve docs
```

## Repository structure

```text
README.md
CONTRIBUTING.md
docs/
  index.html
  assets/
    site.css
  games/
    blocky-speller/
      index.html
      styles.css
      game.js
      config.json
      wordpacks/
        en-GB-core.json
```

## Blocky Speller customization

Edit `/home/runner/work/opa_games/opa_games/docs/games/blocky-speller/config.json`:

- `theme.colors`: override CSS-driven colors.
- `theme.fontScale`: scale UI text.
- `gameplay.startingLives`: number of hearts.
- `gameplay.memorizeDurationMs`: time to show each word before input.
- `gameplay.feedbackDurationMs`: how long success/failure feedback stays visible.
- `gameplay.wordsPerLevel`: XP and level threshold.
- `speech.lang`, `speech.preferRegion`, `speech.rate`, `speech.pitch`, `speech.volume`: speech synthesis tuning.
- `wordpack`: path to the selected wordpack JSON file.

### Add a new wordpack

1. Create a JSON file under:
   `/home/runner/work/opa_games/opa_games/docs/games/blocky-speller/wordpacks/`
2. Use this shape:

```json
{
  "id": "en-GB-core",
  "name": "UK English Core",
  "locale": "en-GB",
  "words": ["because", "door", "great"]
}
```

3. Point `config.json` `wordpack` to your new file path.

## Add another game

1. Create a folder under `docs/games/<your-game>/`.
2. Add a standalone `index.html` (plus optional CSS/JS/assets).
3. Add the game card/link to `docs/index.html`.
4. Keep all paths relative so the game works under nested GitHub Pages URLs.

## GitHub Pages deployment (`docs/`)

This repository is ready for GitHub Pages from `main` + `/docs`.

Manual setup click-path:
1. **Repo Settings** → **Pages**
2. **Build and deployment** → **Source: Deploy from a branch**
3. **Branch: `main`** and **Folder: `/docs`**
4. Save

Your site will publish from `docs/index.html`, with games under `/games/...`.
