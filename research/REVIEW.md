# Independent fact-check of research data

Reviewed 2026-11-17. I re-fetched every number from the primary source myself: the UN Comtrade API, the Eurostat Comext API, the Defra horticulture ODS, ERS PDFs and xlsx files, the DESNZ 2025 xlsx, the OWID CSV, the FDC portal API, Europe PMC full text and publisher PDFs. I did not rely on the researchers' quotes.

**Totals: 51 CONFIRMED, 1 WRONG, 1 UNVERIFIABLE.** None of the research JSON files needed a change (see item 7).

---

## 1. Origin records (28 checked: all 7 crops x IE, UK, US, HK)

I checked all 28 records, not a sample of 20. For each one I compared Comtrade 2024 partner volumes, re-pulled on 2026-11-17, against the stated top source. Every Comtrade `netWgt` quoted in the files matched the API exactly.

| Record | Verdict | What I checked |
|---|---|---|
| IE tomato: NL, 58.3% | CONFIRMED | Comtrade 070200: World 34,218,849 kg, NL 19,955,400 (58.3%). The Teagasc quote "self-sufficiency below 30% ... tomatoes, onions and apples" is on the page. Westland coordinates are correct. |
| IE lettuce: Spain | CONFIRMED (low confidence is right) | 070511 Spain 4,958,380 kg; 070519 UK 5,069,180 kg. Spain totals 6,849 t and the UK 6,679 t, so the lead is very narrow. Murcia coordinates are correct. |
| IE potato: domestic | CONFIRMED | Both Teagasc quotes are on the page. Comtrade 070190 UK 76,962,878 of 101,724,895 kg. The "300–350 kt" Irish output in the notes has no cited source. |
| IE carrot: domestic | CONFIRMED | The Teagasc quote "Ireland produces most of its own carrots" is on the page. The Teagasc PDF quote is real but covers field vegetables in general, not carrots. Comtrade 070610 UK 6,341,930 kg. |
| IE strawberry: domestic | CONFIRMED | Tridge (FAO code 0544) gives 6,560 t for 2024. Comtrade 081010 NL 4,113,920 of 6,978,024 kg. |
| IE blueberry: NL, 42.9% | CONFIRMED | Eurostat CN8 08104050: World 22,285.83 x100 kg, NL 9,566.87 x100 kg (42.9%), Peru 3,376 x100 kg. The HS6 Comtrade figure is NL 38.6%, which the notes explain. |
| IE apple: France, 24.1% | CONFIRMED | Comtrade 080810 FR 13,931,600 of 57,868,284 kg (24.1%). Caveat: Irish output is not quantified anywhere. Teagasc elsewhere says Irish growers supply about 5% of dessert apples, so France as top source for eating apples is plausible. |
| UK tomato: NL, 37.2% | CONFIRMED | Comtrade NL 147,381,891 of 395,938,476 kg. Defra Table 23: home production 76.0 / supply 470.9 (16.1%) in 2024 and 79.0 / 467.6 (16.9%) in 2025. |
| UK lettuce: Spain | CONFIRMED (marginal) | Spain 86,431,383 + 31,467,930 kg = 117.9 kt. Defra home production 2024 = 112.4 kt, 47.9% of supply. Spain leads by only about 5%, and in 2025 home production rose to 115.8 kt. |
| UK potato: domestic | CONFIRMED | FreshPlaza: about 107,000 t of fresh imports, 7% of consumption, and "relies overwhelmingly on domestic production". Comtrade Israel 28,692,750 kg is the largest partner. |
| UK carrot: domestic, 97.1% | CONFIRMED | Defra 2025: 990.5 / 1020.6 = 97.05%. |
| UK strawberry: domestic, 56.5% | CONFIRMED | Defra 2025 home production 92.9 kt, 56.5%. Both Co-op article quotes are on the page. |
| UK blueberry: Peru, 25.1% | CONFIRMED | Comtrade Peru 18,081,528 of 72,141,473 kg. Both FreshPlaza quotes (49% La Libertad, 93% sea) are on the page. Trujillo coordinates are correct. |
| UK apple: domestic, 47.4% | CONFIRMED | Defra 2025 home production 256.9 kt, 47.4%. Comtrade South Africa 80,857,177 kg. The Kentonline quote is on the page. |
| US tomato: Mexico, 62% | CONFIRMED | ERS VGS-378 contains "68.9 percent", "90 percent of U.S. tomato imports during 2023–25" and the Sinaloa sentence. Comtrade Mexico 90.1%. |
| US lettuce: domestic, 93% | CONFIRMED | VGS-378: "U.S. lettuce production accounted for 93 percent of domestic availability in 2025". |
| US potato: domestic, 89% | CONFIRMED | ERS Table 7a 2025 potatoes 11.25%. VGS-374 Idaho 32% quote is in the PDF. |
| US carrot: domestic, 75% | CONFIRMED | Table 7a 2025 carrots 24.62%. FreshPlaza "California accounted for 73 per cent" is on the page. Bakersfield coordinates are correct. |
| US strawberry: domestic, 79% | CONFIRMED | ERS H-1 2025 strawberries 20.96%. Comtrade Mexico 97.7% of imports. FreshPlaza "over 91 per cent" is on the page. |
| US blueberry: Peru, 34% | CONFIRMED | H-1 2025 blueberries 68.99%. Comtrade Peru 174,240,451 of 349,531,809 kg (49.8%), so 0.69 x 0.498 = 34%. Caveat: this mixes 2024 trade with 2025 availability. |
| US apple: domestic, 97% | CONFIRMED | H-1 2025 apples 2.91%. The FruitSmart 72% quote is on the page. Yakima coordinates are correct. |
| HK tomato: China, 95% | CONFIRMED | Comtrade 31,169,500 of 32,660,630 kg (95.4%). The China Daily HK quote is on the page and names Zhaoqing, Guangdong. |
| HK lettuce: China, 100% | CONFIRMED | 070511 China 99.8%. |
| HK potato: China, 88% | CONFIRMED | 87.8%. The coordinates are a China centroid, as the record says. |
| HK carrot: Taiwan, 42% | CONFIRMED | "Other Asia, nes" 3,573,235 of 8,433,944 kg (42.4%). |
| HK strawberry: Japan, 45% | CONFIRMED | Japan 1,823,500 of 4,094,846 kg (44.5%). The nippon.com Tochigi quote is on the page. Utsunomiya coordinates are correct. |
| HK blueberry: Peru, 79% | CONFIRMED | 25,611,200 of 32,538,204 kg (78.7%). |
| HK apple: China, 52% | CONFIRMED, with a quote warning | Comtrade 77,885,400 of 148,821,735 kg (52.3%). The Tridge quote "Shaanxi Province produced 1449.9 million tons" is on the page, but the source mis-scales the unit: it should be about 14.5 million t, since the Chinese original is in units of 10,000 t. The figure is not stored as a data value, but **don't show this quote to users**. Luochuan, Shaanxi coordinates are correct. |

All lat/lon pairs are plausible for the named place. Points marked "representative" (Kent, Yakima, Watsonville, Snake River Plain, Zhaoqing, centroids) lie inside the named region.

## 2. home_vs_shop records with verdict "more" (6)

| Crop | Verdict | Evidence |
|---|---|---|
| spinach 75% | CONFIRMED | Rickman, Barrett & Bruhn 2007, Table 6 (from Favell): Spinach 100 (20 °C, 7 d), 75 (4 °C, 7 d), 30 (frozen). The text says "lost 100% of its ascorbic acid in less than 4 days". The Dewhirst 2017 quote about about 80% after 3 days is in the full text. |
| green beans 77% | CONFIRMED | Table 6: Green beans 55 / 77 / 20. The 4 °C loss really is reported as higher than the 20 °C loss. |
| peas 15% | CONFIRMED | Table 6: Green peas 60 / 15 / 10. The "51.5% WW ... first 24–48 h" sentence is in the text. |
| carrot 10% | CONFIRMED | Table 6: Carrots 27 / 10 / –. |
| lettuce 86% | CONFIRMED, with a caveat | Dewhirst et al. 2017 (PMC5441274): "lost 35–86% ... 10 d storage at 4 °C" and "mean ... 59%, the extreme being an 86% loss in baby iceberg lettuce". 86% is the worst case for one lettuce type. A more representative figure for "lettuce" would be the 59% mean of all salad leaves, so consider showing "up to 86%". |
| potato 50% | CONFIRMED | Mareschi et al. 1983 abstract: "Storage for 3 months in the dark at +12 degrees C decreases the ascorbic acid level by about 50%". |

Note: Rickman Table 6 losses are given as % dry weight. This does not change the percentages.

## 3. Carbon (Poore & Nemecek 2018 via OWID)

I downloaded the `ghg-per-kg-poore` CSV. The values are Tomatoes 2.09, Potatoes 0.46, Apples 0.43, Berries & Grapes 1.53 and Other Vegetables 0.53. **All 5 CONFIRMED.** Root Veg 0.43, Peas 0.98, Onions & Leeks 0.50, Brassicas 0.51 and Citrus 0.39 also match.

## 4. DESNZ 2025 freight factors (full-set xlsx, "Freighting goods" sheet)

| Factor | Verdict | xlsx value |
|---|---|---|
| hgv 0.10163 (reefer 0.11894) | CONFIRMED | Row 63 "All HGVs", average laden 0.10163. Row 91 refrigerated 0.11894. |
| ship 0.01306 (container avg 0.01612) | CONFIRMED | Row 167 Refrigerated cargo, all dwt 0.01306. Row 159 container ship average 0.01612. |
| air_long 0.89939 (no RF 0.5313) | CONFIRMED | Row 100 Long-haul, to/from UK. |
| ferry 0.37612 (RoRo avg 0.05158) | CONFIRMED | Row 166 Large RoPax ferry 0.37612; row 165 RoRo-Ferry average 0.05158. Modelling note: RoPax is per tonne on a passenger ferry and is about 7x RoRo. For lorries crossing the Irish Sea either factor is defensible, but the choice changes results a lot. |

## 5. kcal (USDA FDC SR Legacy, nutrient 208)

I fetched these from the FDC portal-data API. Tomato (170457) 18, potato (170026) 77, apple (171688) 52 and strawberry (167762) 32. **All 4 CONFIRMED.**

## 6. Tree CO2 per year

| Claim | Verdict | Evidence |
|---|---|---|
| birch 22 kg | CONFIRMED (generic) | The archived EEA page contains "over one year a mature tree will take up about 22 kilograms of carbon dioxide". The figure is a generic mature-tree number, not specific to birch, and the record says so. The UI should present it the same way. |
| oak 22 kg | CONFIRMED (generic) | Same EEA quote, same caveat. |
| apple 10–22 kg | CONFIRMED | Frontiers 2024 (fsufs.2024.1457462): 10.42 (organic) and 10.00 (conventional) kg CO2 per tree per year in mixed orchards that include Malus domestica. The upper bound is the EEA generic figure. |
| lemon 22.6–26.2 kg | CONFIRMED | The AILIMPO PDF contains "26,223 grams of CO2/tree" (gross, 300 trees/ha) and "Net carbon fixation per tree is 22,637 grams". 22.6 is net of supply-chain emissions, not a lower bound on uptake. It is also an industry source. |

## 7. Road circuity 1.2: Ballou, Rahardja & Sakai 2002

This citation is not in the research JSON. It is in `tools/build-data.py` (line 43, `circuity_source`) and ships in `data/data.json`.

- **DOI: WRONG.** `10.1016/S0965-8564(01)00017-9` resolves on Crossref to Muñoz & Daganzo, "The bottleneck mechanism of a freeway diverge" (TR-A 36:483–505). The correct DOI for Ballou, Rahardja & Sakai, "Selected country circuity factors for road travel distance estimation", TR-A 36(9):843–848, Nov 2002, is **10.1016/S0965-8564(01)00044-1** (checked on Crossref and OpenAlex). The title, authors, journal, volume and issue in build-data.py are otherwise right. The `quote` field is empty.
- **Value 1.2 for Europe/US: UNVERIFIABLE.** The paper is paywalled: ScienceDirect and ResearchGate both returned 403, and Crossref and OpenAlex have no abstract. The search snippets I found gave conflicting secondary figures (US about 1.20–1.25; "Europe 1.46" vs "Western Europe 1.25"), and I could not open a page that states them. Giacomin & Levinson (2015) cite Ballou only for "varies by country" and attribute the "about 1.2" figure to a different reference. Until someone reads the paper's table, 1.2 is a reasonable round number, but it is not verified as Ballou's figure for Europe/US.

## Fixes made

None in the research JSON files. The one WRONG item, the circuity DOI, is in `tools/build-data.py`, which was outside my edit scope. **Recommended manual fix:** change the URL to `https://doi.org/10.1016/S0965-8564(01)00044-1` and rebuild `data/data.json`.

Other suggested follow-ups, not errors in the stored values:

1. Drop or replace the mis-scaled Tridge Shaanxi quote on HK apple.
2. Show lettuce as "up to 86%" or use the 59% mean.
3. Label birch and oak at 22 kg as a generic mature-tree figure.
