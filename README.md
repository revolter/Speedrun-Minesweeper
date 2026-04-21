# Speedrun-Minesweeper

A touch-friendly PWA minesweeper variant designed for mobile browsers (including iOS Safari).

## Gameplay changes

- Flagging a cell is **permanent**.
- When a cell is flagged, nearby safe cells are automatically revealed.

## Preferences

- **Fade flagged cells**: makes flagged cells fade out after auto-reveal.
- **Swap short/long press**: switches short press and long press actions between reveal and flag.

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
- Push to `main` triggers production deployment to GitHub Pages.
- Opening/updating a PR triggers a GitHub Pages preview deployment.
- If environment protection rules are enabled for `github-pages`, keep them compatible with your production deploy branch (typically `main`); the preview workflow is configured without that environment binding to avoid `refs/pull/*` protection failures.
