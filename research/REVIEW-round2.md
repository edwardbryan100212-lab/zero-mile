# Independent fact-check: round 2 research

Reviewed 2026-11-17. I re-pulled every figure from the primary source myself and did not rely on the researchers' quotes. Sources re-pulled: the USDA FDC API (SR Legacy), the OWID `ghg-per-kg-poore` CSV, the Rickman 2007 PDF (UC ANR copy), the ISHS abstract page, the archived EEA page, the Eurostat Comext API, the UN Comtrade preview API, the HMRC uktradeinfo OTS API, the FAOSTAT bulk CSV, the Defra `hort-dataset-25` ODS, ERS VGS-378 and FTS-386, and both Hort Innovation 2024/25 handbooks.

Files: `round2-growing-nutrition.json`, `origins-round2.json`.

**Totals: 46 items checked. 43 CONFIRMED, 1 WRONG (fixed), 2 UNVERIFIABLE.**

Caveats in the tables do not change a verdict.

---

## 1. kcal per 100 g against USDA FDC SR Legacy (8/8 CONFIRMED)

I pulled each record from `api.nal.usda.gov/fdc/v1/food/{id}`. The dataType is "SR Legacy" every time, and each description matches the file.

| Crop | FDC id | File | FDC | Verdict |
|---|---|---|---|---|
| broccoli | 170379 | 34 | 34 | CONFIRMED |
| sweetcorn | 169998 | 86 | 86 | CONFIRMED |
| pumpkin | 168448 | 26 | 26 | CONFIRMED |
| grape | 174683 | 69 | 69 | CONFIRMED |
| pear | 169118 | 57 | 57 | CONFIRMED |
| cherry | 171719 | 63 | 63 | CONFIRMED |
| orange | 169097 | 47 | 47 | CONFIRMED |
| beetroot | 169145 | 43 | 43 | CONFIRMED |

## 2. Carbon footprint against OWID / Poore & Nemecek 2018 (4/4 CONFIRMED)

Source: OWID grapher CSV `ghg-per-kg-poore.csv`, rows dated 2010.

| Crop | Category in file | Value in file | CSV row | Verdict |
|---|---|---|---|---|
| broccoli | Brassicas | 0.51 | `Brassicas,2010,0.51` | CONFIRMED |
| grape | Berries & Grapes | 1.53 | `Berries & Grapes,2010,1.53` | CONFIRMED |
| orange | Citrus Fruit | 0.39 | `Citrus Fruit,2010,0.39` | CONFIRMED |
| pear | Other Fruit | 1.05 | `Other Fruit,2010,1.05` | CONFIRMED. Pears have no category of their own (Apples is separate), so Other Fruit is the right mapping. |

## 3. "More nutritious when home-grown" verdicts (2/2 CONFIRMED)

| Crop | Claim | What the source says | Verdict |
|---|---|---|---|
| broccoli: 13% vitamin C | Rickman, Barrett & Bruhn 2007 | Table 7 (wet weight) row "Broccolia 21 4 13 12 50": 13% loss after 21 days at 4 °C (Howard et al. 1999). Table 6 (dry weight) row "Broccoli 56 0 10": 56% loss after 7 days at 20 °C, 0% at 4 °C. Both quotes are on the page. | CONFIRMED. Caveat: 13% is after 3 weeks chilled. That is a long supply chain, but the explanation states the conditions honestly. |
| asparagus: 40% | Rodkiewicz 2008, Acta Hort 776 | The abstract says vitamin C in the upper 6 cm section "decreased most rapidly (by 40%), in the first week of storing", for spears kept at 1 °C in PE bags. The quote is on the page. | CONFIRMED. Caveat: this applies to the tip section only, which the explanation says ("spear tips"). |

## 4. Origin records (28 checked: 7 crops x IE, UK, US, AU)

I checked all 28 records, not just 15. Every Comext, Comtrade and HMRC quantity quoted in the file matched the API to the unit. Every FAOSTAT, Defra, ERS and Hort Innovation quote is in the source. All coordinates fall in the named place. Senegal (15.5, -16.0) is near Louga, inland of the Niayes strip, and is fine as an approximate point.

| # | Record | Verdict | Check |
|---|---|---|---|
| 1 | IE broccoli: Spain, 54.6% | UNVERIFIABLE | Comtrade 070410: World 9,235 t, ES 5,040 t ✓. FAOSTAT IE cauliflower + broccoli 9,980 t (2024) ✓. However, HS 070410 and FAOSTAT both lump cauliflower with broccoli. Domestic and import volumes are about equal (9,980 vs 9,235 t), so whether Spain beats Irish-grown *broccoli* cannot be shown from the cited data. The record's "low" confidence is right. |
| 7 | IE sweetcorn: India, 30.7% | CONFIRMED (marginal) | Comext 07099960: IN 3,645.62 x100 kg, ES 3,566.24 x100 kg, total 1,189 t ✓. India leads Spain by only 8 t, so this is effectively a tie. |
| 8 | IE pumpkin: UK, 38.4% | CONFIRMED | Comext 07099390: GB 11,415.91 x100 kg of 2,970 t ✓. FAOSTAT IE output is 800 t, which is below GB's 1,142 t ✓. Caveat: GB consignments may include re-exports. |
| 24 | IE grape: South Africa, 21.9% | CONFIRMED | Comext 08061010: ZA 43,974.86 x100 kg of 20,062 t. ES is next at 13.9%. Ireland's grape output is 0. |
| 28 | IE pear: Netherlands, 60.5% | CONFIRMED | Comext 08083090: NL 67,673.97 x100 kg of 11,177 t; BE 20.5%. |
| 30 | IE cherry: Spain, 25.1% | CONFIRMED (marginal) | Comext 08092900: ES 148 t, NL 129 t, DE 126 t. The notes already say this. |
| 32 | IE orange: Egypt, 31.5% | CONFIRMED | Comext 080510: EG 102,238.14 x100 kg; ZA 23.2%. |
| 42 | UK broccoli: domestic | UNVERIFIABLE | Defra Table 15 broccoli 68.91 kt ✓. Table 23 cauliflower + broccoli home production as a share of supply 54.95% ✓. Imports of 137.6 kt are not split between cauliflower and broccoli, so Spanish broccoli could exceed 68.9 kt. Not decidable from the cited data; "low" confidence is right. |
| 48 | UK sweetcorn: Senegal, 35.5% | CONFIRMED (dated caveat) | HMRC 07099960: Senegal 23,339 t of 65,734 t ✓. Defra ODS sweetcorn imports 65.75 kt ✓. Defra has published no current UK output. The last official figure is 18,000 t for 2013 (Defra hort report, 7 Aug 2014: "production for 2012 was 16,200 tonnes and 18,000 tonnes for 2013"). That is below Senegal, so Senegal as top source is supported but rests on old domestic data. |
| 49 | UK pumpkin: Spain, 24.2% | **WRONG → fixed** | HMRC 07099390: Spain 9,932 t ✓, but that only makes Spain the top *import* partner. UK-grown pumpkins are larger: Bioenergy News (2019) says about 15 million pumpkins are grown a year and "An estimated 18,000 tonnes of 'perfectly edible' pumpkins are discarded in the UK every year". The discards alone are about twice Spain's volume. The record's own seasonal_note said carving pumpkins are largely UK-grown. Correct value: domestic, United Kingdom, share not published. |
| 65 | UK grape: South Africa, 24.0% | CONFIRMED | Comtrade 080610: ZA 68,547 t of 285,693 t; HMRC 08061010 ZA 67,011 t (23.7%) ✓. FAOSTAT UK grapes 11.4 kt, an imputed figure mostly for wine. |
| 69 | UK pear: Netherlands, 35.2% | CONFIRMED | Comtrade 080830: NL 33,762 t; BE 30.5%. Defra UK pear output 2025 is 22.24 kt, below NL ✓. HPM 18.98% ✓. |
| 71 | UK cherry: Spain, 52.4% | CONFIRMED | Comtrade 080929: ES 7,263 t of 13,859 t. Defra Table 6 UK cherries 2025 is 6.39 kt and FAOSTAT 2024 is 5.92 kt; both are below Spain ✓. |
| 73 | UK orange: Egypt, 31.4% | CONFIRMED (close) | Comtrade 080510: EG 72,570 t, ZA 67,970 t (29.4%), ES 65,163 t (28.2%). |
| 124 | US broccoli: domestic, 66% | CONFIRMED | ERS VGS-378 Figure 3 gives broccoli a 34% import share of availability, so 66% is domestic ✓. |
| 130 | US sweetcorn: domestic | CONFIRMED (wording caveat) | VGS-378: 5.78 bn lb grown, 74% for processing ✓. The notes' line "supplied largely by domestic production" is about *processing* sweet corn in the ERS text, not fresh. The domestic verdict still holds: about 1.5 bn lb, roughly 680 kt, goes to the fresh market. Belle Glade as the place is not from the cited data, which the notes disclose. |
| 131 | US pumpkin: domestic, 64.2% | CONFIRMED | FAOSTAT 934,922 t ✓. Comtrade 070993 imports 494,849 t (MX 83.9%) ✓ and exports 48,162 t ✓. The arithmetic gives 64.2% ✓. |
| 147 | US grape: domestic | CONFIRMED | FTS-386 quotes ✓ (1.05 M short tons in 2025; 84% fresh). Comtrade imports 750,572 t (CL 37.3%, PE 35.9%, MX 24.8%) ✓ and exports 297,924 t ✓. About 500 kt domestic fresh supply, more than Chile's 280 kt ✓. |
| 151 | US pear: domestic, 83.8% | CONFIRMED | FAOSTAT 463,120 t ✓; imports 89,303 t ✓; 463,120 / 552,423 = 83.8% ✓. |
| 153 | US cherry: domestic, 89.5% | CONFIRMED | FAOSTAT 333,120 t ✓; imports 39,118 t ✓; 89.5% ✓. |
| 155 | US orange: domestic | CONFIRMED | FAOSTAT 2,502,020 t ✓; imports 267,864 t (CL 41.8%) ✓; FTS-386 navel quote ✓. |
| 165 | AU broccoli: domestic, 100% | CONFIRMED | Handbook fresh supply 71,650 t ✓; imports "-" ✓; VIC 36,621 is the largest state ✓. |
| 171 | AU sweetcorn: domestic, 100% | CONFIRMED | Fresh supply 39,574 t ✓; QLD 60,391 is the largest state ✓. |
| 172 | AU pumpkin: domestic, 100% | CONFIRMED | Fresh supply 110,561 t ✓; QLD 55,662 is the largest state ✓. |
| 188 | AU grape: domestic, 91.7% | CONFIRMED | Imports 7,986 t and supply 96,113 t ✓ (91.7%); US 7,642 t ✓; VIC 160,217 ✓. |
| 192 | AU pear: domestic, 100% | CONFIRMED | Supply 43,003 t ✓; VIC 58,501 ✓. |
| 194 | AU cherry: domestic, 93% | CONFIRMED | Imports 1,014 t and supply 14,467 t ✓; US 1,009 t ✓; TAS 6,201, then VIC 5,010 and NSW 4,913 ✓. Caveat: the state labels come from a chart, so the text-to-number pairing is my reading. |
| 196 | AU orange: domestic, 95.1% | CONFIRMED | Imports 9,519 t and supply 195,531 t ✓; US 8,886 t ✓; NSW 352,479 is the largest state ✓. |

Origin totals: 25 CONFIRMED, 1 WRONG, 2 UNVERIFIABLE.

## 5. Tree CO2 figures (4/4 CONFIRMED as cited, with a caveat)

| Tree | File | Check | Verdict |
|---|---|---|---|
| rowan | 22 kg/yr | The archived EEA page (20251213231041) contains "over one year a mature tree will take up about 22 kilograms of carbon dioxide" ✓ | CONFIRMED |
| scots-pine | 22 kg/yr | same | CONFIRMED |
| beech | 22 kg/yr | same | CONFIRMED |
| pear | 22 kg/yr | same | CONFIRMED |

Caveat: 22 kg is the EEA's generic figure for "a mature tree", not a species figure, and `_notes.trees` says so. It probably overstates a small rowan or a pear on dwarfing rootstock and understates a mature beech. The app should label it as a typical mature tree, not a figure for that species. I found no species-specific figure to replace it with, so I changed nothing.

---

## Fixes applied

1. `origins-round2.json` record UK / pumpkin (index 49):
   - Changed from `import` / Spain / Almeria (36.84, -2.46) / 24.2% to `domestic` / United Kingdom / "England (region not stated)" (52.5, -1.5) / `share_pct: null`, transport `road`.
   - Rewrote the notes and seasonal_note, and added the Bioenergy News source.
   - Added a `reviewed_fix` note.

No changes were made to `round2-growing-nutrition.json`. Both files parse as valid JSON. A backup of the original origins file is in the session scratchpad.

## Suggested (not applied: no clear corrected value)

- IE broccoli and UK broccoli: the trade codes and FAOSTAT lump broccoli with cauliflower, so keep the low confidence or show both sources.
- US sweetcorn notes: change "ERS says sweet corn is supplied largely by domestic production" to say that this statement is about processing sweet corn.
- Several import leads are within a few points of the runner-up: IE sweetcorn (IN 30.7 vs ES 30.0), IE cherry, and UK orange. The UI could say "about equal with ...".
