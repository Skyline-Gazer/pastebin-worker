# FT browser-auth origin fix

Durable PLAN/SPEC for [Issue #130](https://github.com/Skyline-Gazer/pastebin-worker/issues/130).

Owner-approved by the Function Test pause instruction. Function Test remains paused: `FT-01 PASS`, `FT-02 FAIL — DEFECT FOUND`, `FT-03 BLOCKED_BY_FT02`, `FT-04+ NOT STARTED`.

## Objective

Make `https://pb.test.223.im` the canonical production browser-auth origin so OAuth callback cookies are sent to the user-facing Add-on origin.

## Required values

```text
FEISHU_OAUTH_REDIRECT_URI=https://pb.test.223.im/api/auth/callback
FEISHU_ALLOWED_ORIGINS=https://pb.test.223.im
```

Cookie remains `HttpOnly; Secure; SameSite=Lax; Path=/` with no `Domain`.

## Drift sources

- Deploy overlay used workers.dev for OAuth redirect and allowed origins.
- Tracked `wrangler.toml` did not pin those vars.
- Docs still described production as workers.dev-only.
- Feishu console currently allows the workers.dev callback.

## Non-goals

No `pastebin-prod` change, no D1/queue mutation, no P2P, no Function Test continuation, no parent-domain cookie.
