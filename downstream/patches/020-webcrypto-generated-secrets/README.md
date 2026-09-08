# 020 — Web Crypto generated secrets

Purpose: replace insecure `Math.random` generation for paste names and management passwords with Web Crypto while preserving the existing alphabet and API.

Patch ID:

```text
020-webcrypto-generated-secrets
```

Development branch:

```text
patch/webcrypto-generated-secrets
```

Pinned upstream base:

```text
0835cac4ab8f974035d31845f5c2b93b0c85b5c6
```

Patch Source PR: [#93](https://github.com/Skyline-Gazer/pastebin-worker/pull/93) (review-only, unmerged).

Superseded direct implementation PR: [#92](https://github.com/Skyline-Gazer/pastebin-worker/pull/92) (closed without merge).

Source HEAD:

```text
bc98d15da6bf3d59a37373e9d9bb3bb68be3873c
```

Exported patch:

```text
0001-fix-security-use-Web-Crypto-for-generated-secrets.patch
```

Provenance: downstream-identified fix; not external fork adoption. The source commit preserves the existing `genRandStr` alphabet and API, uses Web Crypto rejection sampling, and adds focused generator coverage. No unrelated randomness, callers, dependencies, or authentication architecture were changed.

Validation: source PR CI PASS, Greptile PASS, Bugbot SKIPPED_QUOTA, Codex source review PASS; promotion validation requires the complete ordered patch series replay and assembled-source tests.
