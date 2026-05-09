# Admin dashboard link and avatar fix

## Scope

- Fix admin "看板" open behavior so production always opens the current public origin.
- Fix admin broadcaster avatars from Bilibili image URLs.

## Order

1. Change admin UI to call the impersonate endpoint with same-origin fetch, then open `/dashboard` in a new tab.
2. Keep the impersonate route direct GET compatible, but build redirects from configured/public forwarded origin when needed.
3. Normalize avatar URLs to HTTPS and render them with `referrerPolicy="no-referrer"`.

## Risks

- Browser popup blocking: open the blank tab before awaiting fetch.
- Reverse proxy host rewriting: avoid depending on redirect `Location` for the button path.
- Avatar hotlinking/mixed content: use HTTPS and no referrer.

## Verification

- Lint the touched files.
- Run production build if `.next` is not locked by a running local Next process.
