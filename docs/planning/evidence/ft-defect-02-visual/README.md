# FT-DEFECT-02 visual preview evidence

Owner visual Round 2 of real production data at `https://pb.test.223.im` is
**PASS** (Worker `198226d8-898d-405c-ae88-3b1d33d0b796`). These files remain
**PREVIEW ONLY** fixture renders from local Vite `?preview=1` and are not the
acceptance evidence.

Round 1 FAIL of Worker `de88a419-7435-4f05-96a1-f5cfba22073c` is retained on
[#135](https://github.com/Skyline-Gazer/pastebin-worker/issues/135).

`NON_BLOCKING_POLISH`: very long titles on narrow mobile may later use visible
ellipsis or a two-line clamp instead of hard clipping. Not an acceptance defect.

Source: `fix/feishu-web-visual-density` against `downstream/main` @ `778a4fd`.
Preview URL used: `http://127.0.0.1:4179/?preview=1`.
Fixtures: two single-line text entries, multi-line Markdown, first-line GFM task,
file entry (`cat.png` / `?a`), timed archive.

Horizontal overflow (`documentElement.scrollWidth === clientWidth`):

| Width  | Overflow |
| ------ | -------- |
| 375px  | no       |
| 390px  | no       |
| 430px  | no       |
| 1440px | no       |

| File                          | What it shows                                                               |
| ----------------------------- | --------------------------------------------------------------------------- |
| `desktop-1440-light.png`      | Compact list, `Pastebin` + Feishu badge, icon theme, Chinese chrome         |
| `desktop-1440-dark.png`       | Same composition in `.dark`                                                 |
| `desktop-1440-batch.png`      | One batch toolbar, leading selectors, no `Batch select` / `Exit Batch Mode` |
| `desktop-1440-dark-batch.png` | Batch Mode in dark theme                                                    |
| `desktop-1440-archive.png`    | Compact archive row + `恢复` + timed countdown                              |
| `mobile-390-light.png`        | Stacked identity then actions, no title/button overlap                      |
| `mobile-390-batch.png`        | Wrapped batch toolbar + leading checkboxes                                  |
| `mobile-390-dark.png`         | Mobile dark list                                                            |
| `mobile-375-dark.png`         | 375px width check                                                           |
| `mobile-430-dark.png`         | 430px width check                                                           |

Owner production PASS is recorded on [#135](https://github.com/Skyline-Gazer/pastebin-worker/issues/135). These screenshots stay preview-only.
