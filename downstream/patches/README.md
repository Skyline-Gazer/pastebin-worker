# Downstream Patches

This directory carries the curated downstream patch stack: generic upstream modifications that the Add-on cannot provide through existing upstream APIs, plus independently adopted external changes (open/closed-unmerged upstream PRs, third-party fixes, Dependabot updates) that official upstream has not merged.

The release model is:

```text
exact upstream SHA
+
ordered exported patch series
=
patched Pastebin source
```

Patch development happens on dedicated `patch/<id>` branches. Production/release builds do **not** merge those moving branches. After review, patch commits are exported with `git format-patch` and committed here.

Adopting an external change does not rely on upstream merge status: it is accepted only after independent review, tests/compatibility validation, and provenance recording (see `docs/PATCH_AND_UPSTREAM.md` §3).

## Layout

```text
downstream/patches/
|- README.md
|- series
|- 010-non-expiring-paste/
|  |- README.md
|  `- *.patch
|- 120-adopt-upstream-pr-123/
|  |- README.md
|  `- *.patch
`- 210-vite-security-update/
   |- README.md
   `- *.patch
```

The numeric prefix is an organizational category convention:

```text
000-099   core downstream capabilities
100-199   adopted upstream/backport fixes
200-299   dependency/toolchain updates
300-399   compatibility/platform fixes
900-999   deployment/local downstream-specific patches
```

`series` is authoritative for replay order. Do not automatically apply every `.patch` found in the directory tree; lexical directory order is not the source of truth.

## Adopted patch README metadata

Every externally sourced patch MUST record provenance in its README:

```text
Patch ID
Title
Origin repository
Original PR URL / number
Original author
Original commit SHA(s)
Upstream PR status when adopted
Adoption date
Reason for carrying downstream
Local changes made after adoption, if any
Validation performed
Known risks / limitations
Dependencies on other downstream patches
Removal condition
Upstreamed/superseded status
```

Unknown data MUST be marked `unknown` / `not available`; do not fabricate it. Preserve original Git authorship when adopting commits.

When official upstream later includes an equivalent change, retire the carried patch from `series`, record why it was removed, and re-run the complete relevant test/build suite. Do not keep duplicate patches.

## Current planned generic capability

```text
e=never -> non-expiring Paste
e=max   -> deployment MAX_EXPIRATION
```

Do not add Feishu UI, webhook, archive, checkbox, Batch Mode, or binding logic to upstream patches.
