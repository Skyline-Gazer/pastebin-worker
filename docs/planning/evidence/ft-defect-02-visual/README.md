# FT-DEFECT-02 visual preview evidence

Status: **PREVIEW ONLY**. These screenshots are fixture renders from local Vite
`?preview=1`. They are not owner visual PASS and must not be treated as production
acceptance.

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

Final PASS still requires owner review of real production data on
`https://pb.test.223.im` after a separately authorized `pastebin-feishu-prod`
deploy.
