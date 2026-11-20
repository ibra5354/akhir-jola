# QUANTIX Poster: Revision 2 Review Report

Deliverables in this folder:
1. `QUANTIX_Graduation_Exhibition_Poster.pptx`: redesigned, editable poster (1 slide, 60 × 142.24 cm, portrait roll-up)
2. `QUANTIX_Graduation_Exhibition_Poster.pdf`: PDF at the poster size (23.625 × 56 in); photos embedded at 239–300 ppi
3. `QUANTIX_Poster_Preview.png`: 3544 × 8400 px preview (150 dpi)
4–6. This report: modification log, scientific integrity report, final evaluation

Sources checked: the final report (*QUANTIX_Graduation_Project_II_Revised_2.docx*), the final presentation (*QUANTIX_presentation_Last_Update_.pptx*), the official template (*Rollup_SDP-6-Industrial2025.pptx*), and the revision 1 poster. The newly uploaded report and template are byte-identical in content to the earlier copies; only the template's view settings and metadata differ.

---

## Deliverable 4: Modification log

| # | Original element (rev. 1) | Problem identified | Modification | Justification | Verification |
|---|---|---|---|---|---|
| 1 | Colour palette (#242852 / #297FD5 / #E8731E) | Not the specified brand values | Navy #232D5A, blue #2D80D2, orange #F27A16, white; template header navy recoloured to match | Controlled palette with functional roles: blue for data and process, orange for decisions and highlights | Brief §6 |
| 2 | Theme shadows on shapes | LibreOffice rendered shadows that PowerPoint would not, so QA did not match the real file | Theme style references removed from every shape | No decorative effects; what is checked matches what prints | Rendered |
| 3 | Header text in Quicksand | Font likely missing on the exhibition PC; three font families in use | Template header text set to Arial; Times New Roman removed | Two families only: Arial for all text, Cambria Math for equations | Font list checked |
| 4 | Title block | The full formal title competed with QUANTIX; no short descriptor | QUANTIX 160 pt; descriptor *Smart Inventory Monitoring, Forecasting & Decision Support* (40 pt, orange); formal title kept verbatim at 21 pt | 5-second recognition | Title matches report cover |
| 5 | No core-message element near the top | The contribution was only visible after reading Results | Full-width ribbon: PHYSICAL STOCK → DIGITAL INVENTORY → DEMAND ANALYTICS → REPLENISHMENT DECISION, under the headline *QUANTIX connects physical inventory monitoring with data-driven replenishment decisions* | 30-second understanding | Content from report §7.18 |
| 6 | Abstract (~120 words, listed hardware) | Too descriptive; repeated Methodology | Rewritten to 93 words: problem, solution, integration, models, demonstrated outcome, validation caveat | Brief §9; no unsupported claims | Checked against report abstract |
| 7 | Survey chart | Long labels; title did not show the sample size | Titled "Exploratory Survey, n = 21 (9 economic activities)"; labels shortened; sorted by value; one orange highlight; caveat kept | Same five percentages unchanged | Report §5.1 |
| 8 | Methodology: 8 stacked text rows | Text-heavy; no macro structure | 4 macro stages (Sensing → Data Processing → Cloud Integration → Decision Support), each with 2 numbered cards (icon, title, one-line description); stage colours follow the data/decision roles | Brief §11 | Steps traced to report §7.3–7.16 |
| 9 | Equations as plain text | Not real maths objects; fraction and root shown inline | **Native, editable PowerPoint equations (OMML)**: stacked fraction for N, overbar for d̄, radical over a fraction for EOQ; a high-resolution picture fallback is stored for viewers without equation support. All variables defined below each card | Brief §12 | Formulas match report Eq. 7.1, 7.3, 7.7 |
| 10 | "Measure" icon | The weight icon read as a padlock | Replaced with a balance-scale icon (ribbon and Step 1) | Prevents misreading | Visual |
| 11 | Experimental section: six equal metric tiles | No hierarchy; the procedure was not stated | Setup sentence; four verification tests (from presentation slide 11); three primary metrics (≤ 2%, 100%, ≈ 12 s) and three secondary; TEAM-REPORTED badge; limitation sentence kept | Brief §13 | Report Table 9.3 and presentation slide 11 |
| 12 | Prototype photo | Floor and wall margins; markers covered products | Re-cropped to the rack (aspect kept, nothing removed), light contrast lift (+6%); numbered markers placed just above each product; short labels beside the photo | Visual centrepiece; brief §14 | Marker positions checked against photo |
| 13 | Dashboard screenshots | Analysis crop dropped its timestamp; a "simultaneous state" reading was possible | Products crop without browser chrome; analysis crop now keeps its header ("Data Accuracy: Low · 2026-10-10 03:00"); dated captions plus "captured at different operating states" | Brief §15 | Timestamps read from the screenshots |
| 14 | Brake-pad example sat in a chevron chain at the bottom | Abstract and far from its evidence | 4-step traceable example (withdrawal → #746 → 6 → 3 → "Critical") placed directly under the screenshot that shows "Critical" | Evidence next to its claim | Report Tables 7.10 and §8.7 |
| 15 | Architecture | MQTT broker placed in the operator column; data and command paths not distinguished; no legend | Three labelled layers (Physical & Embedded / Cloud & Analytics / Operator Interface); HiveMQ placed in the cloud layer; solid blue = data, dashed orange = commands, with legend; dashboard functions listed | Brief §16; no new components added | Report Fig. 7.1 and Table 7.1 |
| 16 | 7-column decision table | Cramped | Primary table: Product, 7-day projection, ROP, EOQ, Status. Stock, daily demand and SS moved to a secondary note. Berain Water highlight strip; required qualification in a framed 16.5 pt bold box | Brief §17 | Values unchanged (report Tables 7.11 and 7.12) |
| 17 | Environmental section with screenshot | Too prominent for a secondary result | Compact panel: two readings, peak indicators, "not statistically validated" note | Brief §18 | Report §7.17 and Table 9.4 |
| 18 | Four conclusions | One repeated test metrics | Three findings exactly as specified; separate Limitations (6) and Future Work (4) lists | Brief §20–21 | No unsupported claims |
| 19 | Spelling | Mixed conventions possible | British spelling throughout (Digitise, Visualise); official title keeps "Optimization" verbatim | Brief §24 | Scripted scan: only "Optimization" (title) found |
| 20 | Unit notation | Inconsistent spacing | 24 h, 7 days, 30 days, 21.7 °C, 76.3% RH, ≤ 2%, ≈ 3 s, ≈ 12 s, 7 h | Brief §24 | Scripted scan |

---

## Deliverable 5: Scientific integrity report

**A. Team-reported observations (shown with a TEAM-REPORTED badge and a limitation sentence)**
- More than 30 functional tests
- Average weight error ≤ 2%
- 100% count agreement in checked comparisons
- ≈ 3 s maximum LCD update
- ≈ 12 s mean web update
- 7 h run without observed failure

Source: report Table 9.3. No trial logs, sample sizes, reference masses or count denominators exist, so none of these are presented as statistically validated.

**B. System-generated analytical outputs**
- 7-day projections, ROP and EOQ for exports 751, 675, 729 and 735
- "Buy now (overdue)" recommendations
- Peak hour and day indicators
- DHT11 readings (21.7 °C, 76.3% RH)
- Dashboard status "Critical"

I recomputed the arithmetic: ROP − SS = 7 × daily demand for all four products, and EOQ = √(2 · 365d · 50 / 2) reproduces 467.97 / 487.08 / 1,193.11 / 191.05. This verifies the arithmetic only, not forecast accuracy.

**C. Assumptions and illustrative inputs**
- Lead time L = 7 days (implied by the exports, not a measured supplier lead time)
- S = $50 per order and H = $2 per unit-year (illustrative)
- Safety stock is the system's "simple heuristic" (SS = 10.5 × daily demand in every export); its service level has not been evaluated

**D. Not yet validated**
- Forecast accuracy
- Achieved service level
- Stockout reduction
- Cost savings
- Long-term reliability
- Stable-reading filter parameters and firmware behaviour on disconnection (report §7.12)
- The infrared interaction sensor (described by the team, but installation is undocumented, so it is not shown on the poster)

**E. Future work**
- Pilot of at least 30 days
- Forecast validation (MAE, WAPE)
- ERP integration
- Multi-shelf scalability testing

**Deliberately excluded**
- The 28.7% "modelled cost reduction" (an EOQ scenario against an assumed 500-unit order)
- All business-plan figures (ROI, payback)
- Literature statistics from the presentation (65%, 64.7%, 99%, etc.)
- RMSE (never computed)

**Unresolved discrepancies (need the team's confirmation)**
1. **Exhibition year:** the template shows **2027** (kept). The presentation says "Senior Design Project · Jazan University · **2026**" and the report cover says (2026).
2. **Names:** the report and presentation say "Alwaleed Kameli"; the poster keeps "Alwaleed Abdu Ali Kameli" as instructed. The dashboard footer says "Ali Idres"; the report says "Ali Idrees" (used). The supervisor is "Dr. Abdulhadi Ali Altherwi" in all sources.
3. **Formal title:** the presentation uses a shorter title (*…Real-Time Inventory Optimization and Forecasting Using Embedded Sensing and Statistical Analytics*). The poster uses the report's full title, as specified.
4. **Berain Water snapshots:** the analysis screenshot (10 Oct 2026) shows ROP 1,435 / SS 861 / EOQ 1,223.32 / 82 per day, while export 729 shows 1,365 / 819 / 1,193.11 / 78 per day. Both are internally consistent. The table uses export 729, and the captions state the different operating states.
5. **Pilot duration:** report §13.8 says "at least 30 days"; presentation slide 29 says "1 year proposed extended pilot". The poster uses "at least 30 days".
6. **"Advanced optimisation functionality":** neither the report nor the presentation documents any optimisation beyond SS, ROP and EOQ (presentation slide 13 shows the same models plus the trigger rule Iₜ ≤ ROP). The suggested future-work item "experimental validation of implemented advanced optimisation functionality" was therefore **not** added. Add it only if the team can point to the implemented feature.
7. **Survey wording:** report Conclusions say "21 organizations"; §5.1 says "21 respondents" with no verified count of organisations. The poster uses "respondents".

---

## Deliverable 6: Final quality evaluation

| Criterion | Score /10 | Remaining weakness |
|---|---|---|
| Scientific accuracy | 9.0 | Depends on team-reported figures with no trial data; the year and names still need confirmation |
| Engineering content | 8.5 | Firmware stability logic and the IR sensor are undocumented, so the processing step stays generic |
| Industrial Engineering relevance | 8.5 | SS/ROP/EOQ, forecasting and work-study are shown; the safety-stock heuristic has no service-level basis yet |
| Visual hierarchy | 8.5 | The ribbon and QUANTIX read first; the right column is dense below the architecture |
| Readability | 7.0 | On a 60 cm-wide roll-up, body text is 20–20.5 pt and notes 14.5–15.5 pt, below the brief's 21–27 pt and 16–18 pt targets. Screenshots are evidence images, not readable at distance |
| Graphic quality | 8.0 | The template logo is only ~119 × 130 px (≈ 80 ppi at print size) and will look soft; equations show as fallback pictures in non-Office viewers |
| Academic professionalism | 8.5 | Consistent terminology and caveats; some captions are long |
| Evidence transparency | 9.5 | Every claim category is labelled on the poster |
| Exhibition communication | 8.0 | The 5-second and 30-second levels work; the 90-second level requires close reading |
| Overall design coherence | 8.5 | One palette, one grid, consistent card system |
| **Overall** | **8.4 / 10** | |

**What would raise the score**
- Supply the official high-resolution or vector Jazan University logo.
- Confirm the year and names.
- Cut ~15% of the remaining small-print text, for example by moving the full-export note to a QR-linked appendix, so body text can reach 22 pt.
- Export the final PDF from Microsoft PowerPoint after opening the file once to confirm the native equations display.

**Print checks**
- The PDF here was rendered with LibreOffice, which uses the equation fallback pictures and substitutes Liberation Sans, a metric-compatible equivalent of Arial.
- For the press file, open the PPTX in PowerPoint and export to PDF.
- Confirm the printer's bleed, the top-clip area and the bottom-cassette area. About 2.4 cm of blue is left below the footer.
