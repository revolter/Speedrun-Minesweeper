# Copilot instructions

- Increment `APP_VERSION` in `/public/app.js` on every commit that changes app behavior, UI, or deployment/runtime behavior.
- When a user provides a debug trace JSON in PR comments, add it as a separate fixture file under `/tests/fixtures` and cover it with regression tests.
- In PR comment replies, never reuse outdated screenshot links; only include a screenshot when there is an actual UI change, and make sure it is freshly captured for that change.
