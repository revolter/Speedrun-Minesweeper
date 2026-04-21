# Speedrun-Minesweeper

A touch-friendly PWA minesweeper variant designed for mobile browsers (including iOS Safari).

## Gameplay changes

- Flagging a cell is **permanent**.
- When a cell is flagged, nearby safe cells are automatically revealed.
- Each new game auto-expands a safe empty area at startup.

## Preferences

- **Hide flagged cells**: renders flagged cells like empty number-less cells after auto-reveal.
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
- Create a dedicated repository environment named **`preview`** with no branch restriction (Settings → Environments) for PR preview deployments.
- Push to `main` triggers production deployment to GitHub Pages.
- Opening/updating a PR triggers a GitHub Pages preview deployment.
- The preview workflow posts/updates a PR comment with the exact deployed preview URL for one-click access.
- Keep `github-pages` environment protection rules compatible with your production deploy branch (typically `main`); PR previews deploy through the separate `preview` environment.
