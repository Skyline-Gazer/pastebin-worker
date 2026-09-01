# Downstream Patches

Only generic, unavoidable upstream changes belong here.

The release model is:

```text
exact upstream SHA
+
ordered exported patch series
=
patched Pastebin source
```

Patch development happens on dedicated `patch/<id>` branches. Production/release builds do **not** merge those moving branches. After review, patch commits are exported with `git format-patch` and committed here.

## Layout

```text
downstream/patches/
|- README.md
|- series
|- 010-non-expiring-paste/
|  |- README.md
|  `- *.patch
`- 020-.../
   |- README.md
   `- *.patch
```

`series` is authoritative for replay order. Do not automatically apply every `.patch` found in the directory tree.

Current planned generic capability:

```text
e=never -> non-expiring Paste
e=max   -> deployment MAX_EXPIRATION
```

Do not add Feishu UI, webhook, archive, checkbox, Batch Mode, or binding logic to upstream patches.
