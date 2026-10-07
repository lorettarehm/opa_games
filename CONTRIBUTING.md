# Contributing

Thanks for helping improve OPA Games.

## Core conventions

- Keep games static and browser-only (no backend).
- Put each game in its own folder under `docs/games/<game-name>/`.
- Use relative paths so games work on nested GitHub Pages routes.
- Keep game settings in config files (JSON) where practical.
- Keep game content packs (like word lists) separate from code.

## Adding or updating a game

1. Create/update files in `docs/games/<game-name>/`.
2. Ensure each game has a clear entry page (`index.html`).
3. If configurable, include a documented config file.
4. Add or update a card in `docs/index.html`.
5. Verify desktop and mobile behavior.

## Blocky Speller specifics

- Main logic: `docs/games/blocky-speller/game.js`
- Style/theme: `docs/games/blocky-speller/styles.css`
- Runtime config: `docs/games/blocky-speller/config.json`
- Wordpacks: `docs/games/blocky-speller/wordpacks/*.json`

## Validation checklist before opening a PR

- [ ] Serve `docs/` locally and smoke-test game flow
- [ ] Confirm relative links load from `/docs` paths
- [ ] Confirm keyboard/touch controls still work
- [ ] Confirm config/wordpack changes load successfully
- [ ] Keep commits focused and scoped to the requested change
