# QUANTIX Exhibition Poster: Design and Evidence Audit (Revision 3)

## Files in this folder

| Deliverable | File | Status |
|---|---|---|
| A. Editable poster | `QUANTIX_Graduation_Exhibition_Poster_Final.pptx` | 1 slide, 21,602,700 × 51,206,400 EMU = **23.625 × 56 in (60 × 142.24 cm)**, portrait; passed structural validation |
| B. Print PDF | `QUANTIX_Graduation_Exhibition_Poster_Print.pdf` | 1 page, 1701 × 4032 pt (same size as the slide) |
| C. Preview | `QUANTIX_Graduation_Exhibition_Poster_Preview.png` | 3544 × 8400 px (150 dpi) |
| D. This audit | `DESIGN_AND_EVIDENCE_AUDIT.md` | |

## Sources inspected

- **A. Template:** *Rollup SDP-6-Industrial2025.pptx*.
- **B. Report:** *QUANTIX_Graduation_Project_II_Revised_2.docx* (full text, 58 embedded images, all tables).
- **C. Presentation:** *QUANTIX_presentation_Last_Update_.pptx* (31 slides, palette, fonts, images).

The files attached this round are byte-identical to the copies supplied earlier in this session.

**Template findings:**
- The slide is 23.625 × 56 in, but its artwork was drawn for an 84 × 200 cm canvas. Most of its shapes ran off the slide on the right and bottom.
- All placeholder text ("Write the Project Title here", "Dr Name Name Name", and so on) and the off-slide shapes were removed.
- The official header group was kept, with its logos unchanged, and scaled uniformly to the slide width. That group extends about 0.1 in past each side edge as bleed.
- Its text font (Quicksand) and a stray Thai font reference (Angsana New) were set to Arial to avoid font substitution on the exhibition PC.

---

## 1. Section arrangement (top to bottom)

| # | Section (eyebrow: template category) | Height | Share |
|---|---|---|---|
| — | Official header, then identity band: Senior Design Project 2027, **QUANTIX** (124 pt), subtitle *From Physical Inventory Measurement to Intelligent Replenishment Decisions* (34 pt), formal title, team and supervisor | 7.4 in incl. evidence key | 13% |
| — | Evidence key: IMPLEMENTED · OBSERVED · CALCULATED · ASSUMED · PROPOSED | | |
| 1 | *Abstract · Problem*: **The Inventory Visibility Challenge** (3 survey cards) | 5.45 in | 10% (with §2) |
| 2 | *Abstract · Objective*: **Objective & Engineering Contribution** (SENSE → ANALYZE → DECIDE) | (side by side with §1) | |
| 3 | *Methodology*: **System Architecture & Operational Workflow** (4 layers, 8-step workflow) | 6.7 in | 35% (with §4) |
| 4 | *Results · Implementation*: **QUANTIX — Implemented Prototype** (hero photo, products dashboard, traceable movement) | 13.0 in | |
| 5 | *Experimental Investigation*: **Prototype Verification & Key Results** (5 metric cards) | 7.0 in | 12.5% |
| 6 | *Results · IE contribution*: **From Inventory Data to Replenishment Decisions** | 7.3 in | 13% |
| 7 | *Conclusions · Evidence*: **Engineering Outcomes & Validation Boundaries** | 5.2 in | 9% (with §8) |
| 8 | *Conclusions*: **Conclusions & Future Development** | (side by side with §7) | |
| — | Footer (exhibition, department, college, university) and 1.2 in lower margin for the stand cassette | | |

Each section heading carries one of the template's academic categories as a small eyebrow label (Abstract, Methodology, Experimental Investigation, Results, Conclusions). The brief's headings are therefore used without losing the mandatory template structure.

**Deviation from the space guideline:** verification results take about 12.5% instead of 22%. The hero area and architecture already took 35%; enlarging the results further would have meant shrinking text below readable size. Numerical results also appear in the §6 table and the §4 traceable example.

## 2. Major design decisions

1. **Colours.**
   - Institutional colours come from the template: navy `#242852` and page blue `#297FD5` (the header is unaltered).
   - The QUANTIX accent comes from the presentation: teal `#16C4C9` on dark backgrounds, `#0D848C` on white, plus navy `#1C3B6B` and steel-blue tints.
   - The orange accent of the earlier revisions was dropped because it is not part of the presentation's identity. A single amber `#D9650B` is now used only as a semantic colour for alerts and validation boundaries.
2. **Fonts.** Arial for all text and Cambria Math for equations: two families, both shipped with Office. The presentation's Aptos was not used because it is missing from older Office installs and has no metric-compatible substitute.
3. **Evidence discipline made visible.** A five-category evidence key under the title, with matching tags on the sections they apply to.
4. **Methodology merged into the architecture.** The 8 workflow steps appear as numbered badges on the architecture nodes and as a one-line sequence. This replaces separate step cards.
5. **Architecture as four layers:** Physical Sensing → Embedded Processing → Digital Inventory Records → Analytics & Decisions.
   - Solid blue arrows are data flow; dashed teal arrows are device commands via HiveMQ MQTT. HiveMQ is shown only on the command path, as documented in report Fig. 7.1 and Table 7.1.
   - Hardware quantities (×4) are from report Table 7.5.
   - The calculation engine is shown in Layer 4 as a functional role; physically it runs as Supabase triggers and functions.
6. **Hero section.**
   - The prototype photo is about 7.2 × 11.4 in, with numbered markers.
   - The real Products dashboard is shown at nearly 14 in wide.
   - A "traceable movement" chain (brake pads transaction #746) links the physical action to the dashboard status.
7. **Equations.** ROP = d̄L + SS and EOQ = √(2DS/H) are **native, editable PowerPoint equation objects** with a stacked fraction, overbar and radical. A high-resolution picture fallback is stored for viewers without equation support. The unit-count formula was dropped because the brief allows at most two equations.
8. **Spelling.** American English throughout (Digitize, Visualize, Analyze), matching the official project title ("Optimization") and the presentation.
9. **Editability.** Every element is native: 104 text boxes, 101 shapes, 19 connectors and 1 table, plus the native equations. Only photos, screenshots and icons are pictures.

## 3. Source images used (all authentic, none generated)

| Poster use | Source |
|---|---|
| Hero prototype photo (cropped to the rack, aspect preserved, +6% contrast) | Report Fig. 7.2 (`image6`, 2340 × 4160 px) |
| Products dashboard | Report Fig. 7.11 (`image20`), browser chrome removed |
| Decision-support view, Berain Water | Report Fig. 7.14 (`image24`), cropped to the analysis panel including its "Data Accuracy: Low · 2026-10-10 03:00" header |
| Electronics integration photo | Report Fig. 7.4 (`image11`) |
| Template logos and exhibition graphic | Template, unaltered |

## 4. Numerical results displayed and their basis

| Value | Category | Source |
|---|---|---|
| 71.4% (15/21), 52.4% (11/21), 47.6% (10/21); n = 21; 9 activities | Exploratory survey | Report §5.1; presentation slide 10 |
| ≤ 2% average weight error; ≈ 3 s max LCD update; ≈ 12 s mean web update; 7 h run; > 30 tests; count agreement in the reported checks | OBSERVED (team-reported) | Report Table 9.3 and §9.2 |
| 7-day projections 84 / 91 / 546 / 14; ROP 210 / 227.5 / 1,365 / 35; EOQ 467.97 / 487.08 / 1,193.11 / 191.05; "Buy now (overdue)" | CALCULATED (system exports 751, 675, 729, 735) | Report Tables 7.11, 7.12, 9.2 |
| Berain Water flagged with 4 bottles on the shelf | CALCULATED | Report §7.16 and §9.1.3 |
| Lead time L = 7 days; S = $50 per order; H = $2 per unit-year | ASSUMED | Report §7.16 and Eq. 9.2 |
| D = 28,470 units/yr; fixed Q = 500 → $3,347/yr; EOQ ≈ 1,193 → $2,386/yr; modeled −28.7% | CALCULATED from ASSUMED inputs; labelled "not realized savings" | Report §9.4, Table 9.5 |
| Brake pads #746: −3, stock 6 → 3, "Critical" | IMPLEMENTED (recorded) | Report Table 7.10, §8.7 |
| Hardware: 4 × load cell (20 kg, 10 kg design load), HX711, ESP32, DHT11, LCD; 7-inch display | IMPLEMENTED | Report Table 7.5, §7.8.1 |

**Arithmetic I re-checked:**
- ROP − SS = 7 × daily demand for all four products.
- EOQ = √(2 · 365d · 50 / 2) reproduces all four EOQ values.
- 28,470 = 78 × 365.
- (3,347 − 2,386.21) / 3,347 = 28.7%.

## 5. Evidence limitations (stated on the poster)

- **Test results** are team-reported. There are no trial-level logs, no count-check denominators, no reference-mass records and no timing sample sizes, so nothing is presented as statistically validated. The 7 h run is not presented as long-term reliability, and response times are presented as observed, not guaranteed.
- **Forecasts** come from one active day per export (data accuracy flagged LOW). Forecast accuracy (MAE, RMSE, WAPE) has not been evaluated.
- **Planning inputs:** the safety stock is the system's "simple heuristic", lead time and costs are assumptions, and the cost comparison is a modeled scenario.
- **Scale:** bench-scale prototype only. There is no industrial deployment, no commercial readiness and no certified standards compliance; the report finds only partial, retrospective alignment with OIML R 60-1 and ISO/IEC 20922.

## 6. Unresolved inconsistencies (need the team's confirmation)

1. **Year:** the template says **2027** (kept, as instructed). The presentation title slide says "Senior Design Project · Jazan University · **2026**"; the report cover says (2026).
2. **Student name:** the report and presentation say "Alwaleed Kameli"; the poster uses "Alwaleed Abdu Ali Kameli" as specified. The dashboard footer spells "Ali Idres"; the report spells "Ali Idrees" (used). The supervisor, "Dr. Abdulhadi Ali Altherwi", is consistent across sources.
3. **Title:** the presentation uses a shorter title (*…Real-Time Inventory Optimization and Forecasting Using Embedded Sensing and Statistical Analytics*). The poster uses the report's full title.
4. **Two Berain Water snapshots:** the decision screenshot (record of 10 Oct 2026) shows ROP 1,435 / SS 861 / EOQ 1,223.32 / 82 per day, while export 729 shows 1,365 / 819 / 1,193.11 / 78 per day. The table uses export 729, and the screenshot caption says it is a different snapshot.
5. **Pilot duration:** report §13.8 says "at least 30 days"; presentation slide 29 says "1 year". The poster uses "at least 30 days".
6. **Survey unit:** report Conclusions say "21 organizations"; §5.1 says "21 respondents" with no verified count of organisations. The poster uses "respondents".
7. **Infrared interaction sensor:** described by the team, but the report says its installation and logic are undocumented. It is not shown.

## 7. Optional content not included

- **Weighted-sum comparison (A1 / A2 / A3):** omitted for space. The analytical result is A3 4.00 > A2 3.30 > A1 2.50 under baseline weights, but A2 ranks first under cost-oriented weights. It can be added if the examiners expect it.
- **References:** none are cited on the poster because no external statistics are displayed. All numbers come from the project itself.
- **QR code:** not created. The only project URL (quantix-sa.eg-app.online) appears inside the screenshots, but no verified destination was supplied.

## 8. Remaining print-quality concerns

1. **Logo:** the template's embedded Jazan University logo is only about 119 × 130 px as displayed (≈ 80 ppi at print size) and will look soft up close. Replace it with the official vector or high-resolution file. It was not redrawn or altered.
2. **Products dashboard screenshot:** the source is 1600 px wide, printed about 35 cm wide (≈ 115 ppi). It is legible at viewing distance but not crisp up close; a higher-resolution capture of the same screen would help. The other images print at 179–300 ppi.
3. **Text size:** on this 60 cm-wide roll-up, body text is 20–20.5 pt, cards and lists 15.5–19 pt, and captions and notes 14–15.5 pt. That is below the brief's 22–28 pt (body) and 16–20 pt (captions) ranges. Cutting further content would allow larger text.
4. **PDF renderer:** the supplied PDF was rendered with LibreOffice, which shows the equations' picture fallback and renders Arial as the metric-compatible Liberation Sans. For the press file, open the PPTX in Microsoft PowerPoint, confirm the equations appear as editable equations, then use File → Export → PDF.
5. **Printer safe zones:** confirm the bleed, the top-clip and the bottom-cassette areas with the printer. About 1.2 in of plain background is left below the footer.
