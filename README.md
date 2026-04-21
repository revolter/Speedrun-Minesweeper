# Speedrun-Minesweeper

A touch-friendly PWA minesweeper variant designed for mobile browsers (including iOS Safari).

## Gameplay changes

- Flagging a cell is **permanent**.
- Flagging a non-mine cell ends the game immediately.
- When a cell is flagged, nearby safe cells are automatically revealed.
- Auto-reveal keeps propagating to all currently deducible safe cells.
- Each new game auto-expands a safe empty area at startup.

## Preferences

- **Hide flagged cells** (enabled by default): renders flagged cells like empty number-less cells after auto-reveal, and adjusts nearby displayed numbers accordingly.
- **Swap short/long press** (enabled by default): switches short press and long press actions between reveal and flag.

## Debug trace export

- **Copy debug trace** exports a reproducible JSON trace to your clipboard.
- The trace includes the initial board state, initial reveal cell, initially revealed cells, and all user `flag`/`reveal` actions in chronological order.
- Concrete fixture examples are available under `tests/fixtures/`.

## Local run

Serve the `public` directory with any static server:

```bash
cd public
python3 -m http.server 4173
```

Then open `http://localhost:4173`.

## Testing

```bash
npm test
```

## Deployment

- Enable **Settings → Pages → Build and deployment → Source: GitHub Actions** before running deployments.
- Create a dedicated repository environment named **`preview`** with no branch restriction (Settings → Environments) for PR preview deployments.
- Push to `main` triggers production deployment to GitHub Pages root (`https://<owner>.github.io/<repo>/`).
- Opening/updating a PR triggers a preview deployment to a separate staging path (`/preview/pr-<number>/`) on the same Pages host.
- The preview workflow posts/updates a PR comment with the exact preview URL for one-click access.
- Keep `github-pages` environment protection rules compatible with your production deploy branch (typically `main`); PR previews deploy through the separate `preview` environment.
