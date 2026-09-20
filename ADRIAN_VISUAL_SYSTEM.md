# Adrián Visual System · AVS 2.0

Canonical reusable colour language for Adrián’s apps, agents and games. Rank is encoded by **hue + perceptual lightness + intensity**, not hue alone. Accent, surface, band and text variants all rise monotonically from rank 1 to 15.

| Rank | Name | Accent | Surface | Band | Text | OKLCH L | Rel. luminance |
|---:|---|---|---|---|---|---:|---:|
| 1 | Umber | `#422522` | `#1A1714` | `#291F1B` | `#91817F` | 0.300 | 0.0260 |
| 2 | Mahogany | `#512927` | `#1F1915` | `#30211D` | `#9A8382` | 0.335 | 0.0348 |
| 3 | Oxblood | `#632D2A` | `#241A16` | `#3A231F` | `#A58583` | 0.370 | 0.0470 |
| 4 | Wine | `#762F32` | `#2B1B19` | `#442423` | `#B08688` | 0.405 | 0.0611 |
| 5 | Rust | `#843729` | `#2F1D16` | `#4B281E` | `#B88B83` | 0.440 | 0.0780 |
| 6 | Copper | `#904311` | `#33210E` | `#512E12` | `#BF9275` | 0.475 | 0.0998 |
| 7 | Amber | `#90570C` | `#33270D` | `#51390F` | `#BF9E72` | 0.510 | 0.1277 |
| 8 | Olive | `#8B6B05` | `#312E0A` | `#4F430C` | `#BCA96E` | 0.545 | 0.1602 |
| 9 | Moss | `#798136` | `#2B351A` | `#454F25` | `#B1B68A` | 0.580 | 0.2003 |
| 10 | Emerald | `#57965A` | `#213C26` | `#335A38` | `#9EC29F` | 0.615 | 0.2458 |
| 11 | Teal | `#32A48F` | `#154037` | `#206153` | `#88CABE` | 0.650 | 0.2921 |
| 12 | Azure | `#4AA7C8` | `#1C4149` | `#2D6271` | `#96CCDF` | 0.685 | 0.3326 |
| 13 | Indigo | `#7AA5EC` | `#2C4054` | `#466184` | `#B2CBF4` | 0.720 | 0.3710 |
| 14 | Violet | `#BB9EF0` | `#413E56` | `#675E86` | `#D8C7F6` | 0.755 | 0.4131 |
| 15 | Gold | `#E7BF57` | `#4F4925` | `#7E6F36` | `#F1DA9E` | 0.820 | 0.5494 |

## Canonical rules
1. Absolute scalar values map to their own 1–15 rank.
2. Higher rank must always be perceptually lighter than the lower rank.
3. Use `accent` for points, lines, borders and highlights; `surface` for large backgrounds; `band` for chart zones; `text` for readable coloured typography.
4. Actual chart series = solid/filled; TARGET = dashed/hollow. Colour always means value, never series identity.
5. Improvement delta = rank 10 Emerald; deterioration = rank 4 Wine; zero/unknown = neutral.
6. Gold (rank 15) is maximum/reward only. Violet (rank 14) means elite, not maximum.
7. Ambient/global surfaces use the current global AI rank **surface** variant, not the raw accent.
8. Raw quantities with no calibrated quality scale remain neutral.
9. Correct = rank 10 Emerald; incorrect = rank 4 Wine.
