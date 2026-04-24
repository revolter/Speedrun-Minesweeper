# Copilot instructions

- Increment `APP_VERSION` in `/public/app.js` on every commit that changes app behavior, UI, or deployment/runtime behavior.
- When a user provides a debug trace JSON in PR comments, add it as a separate fixture file under `/tests/fixtures` and cover it with regression tests.
- Never update `appVersion` in an existing fixture file unless you are also changing that fixture's board/snapshot/action content. The `appVersion` must always reflect the app version at the time the trace was originally captured, not the current app version.
- In PR comment replies, never reuse outdated screenshot links; only include a screenshot when there is an actual UI change, and make sure it is freshly captured for that change.
- Create separate atomic commits for each logical change.
- Use conventional commits (e.g. `feat:`, `fix:`, `chore:`, `style:`, `refactor:`, `test:`).
- The PR title must always reflect the overall changes between the target branch and HEAD, be on the shorter side, and describe the entire PR as a whole — not individual commits.
