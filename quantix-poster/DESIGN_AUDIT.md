# QUANTIX Engineering Exhibition Poster: Design Audit (Revision 4)

| Deliverable | File | Check |
|---|---|---|
| A. Editable PowerPoint | `QUANTIX_Engineering_Exhibition_Poster_Redesigned.pptx` | 1 slide, **23.625 × 56 in (60 × 142.24 cm)**, portrait; passed structural validation |
| B. Print PDF | `QUANTIX_Engineering_Exhibition_Poster_Print.pdf` | 1 page, 1701 × 4032 pt (same size as the slide); every photo and screenshot embedded at 209–300 ppi |
| C. Preview | `QUANTIX_Engineering_Exhibition_Poster_Preview.png` | 3544 × 8400 px (150 dpi) |

**Sources:** the official template (*Rollup SDP-6-Industrial2025.pptx*, identical to earlier uploads), the final report (*QUANTIX_Graduation_Project_II_Revised_2.docx*) and the final presentation. Every figure and screenshot on the poster is an original embedded asset from the report; nothing was generated or redrawn.

---

## 1. How the engineering story is organized

The poster is now one top-to-bottom story in six numbered, full-width sections. These follow the requested academic order: Abstract → Proposed Solution → Methodology → Experimental Investigation → Results → Conclusions. Each heading bar carries the question that section answers, so a visitor can follow the logic without reading the body text:

| # | Section | Question on the heading bar | Main visual |
|---|---|---|---|
| 1 | Abstract | What inventory problem motivated QUANTIX? | Problem / Consequence / Need / Objective rows, plus a native survey bar chart |
| 2 | Proposed Solution | What system was developed, and how does it capture inventory data? | 9-step system journey; hero prototype photo with 8 labels; data-acquisition chain; real interface screenshots |
| 3 | Methodology | Which algorithms and models turn data into decisions? | Processing flowchart · equations · decision flowchart |
| 4 | Experimental Investigation | How well did the prototype perform under the reported test conditions? | Testing photo and 5 metric cards |
| 5 | Results | What inventory reports and decisions did QUANTIX actually produce? | Real product report, the monitored → analytical → decision flow, four-product outputs table, total inventory cost (TIC) chart |
| 6 | Conclusions | What does QUANTIX contribute, and what remains to be validated? | Contribution statement and an evidence-status grid |

**Corrections to the previous poster:**
- The sensor and latency metrics are now only in Experimental Investigation.
- Results shows only system outputs (reports, decisions, the cost scenario).
- The dashboard is no longer presented as the end product: the journey continues to Analytics → Decision engine → Reports.

## 2. How the system workflow is presented

- **2A End-to-end journey:** Physical products → Smart shelf → Sensors → ESP32 → Database → Dashboard → Analytics → Decision engine → Reports.
  - The steps are grouped as Physical prototype / Digital monitoring / Decision support.
  - The technology under each step comes from the report: Supabase PostgreSQL, the Flutter web app, SS · ROP · EOQ, and the PDF product report.
  - A dashed return path shows device commands via HiveMQ MQTT, the only command path documented (report Fig. 7.1, Table 7.1).
  - A note states that DHT11 environmental readings are stored and charted only.
- **2C Data acquisition** follows the report's worked example (§7.8.1): stable load reading → 872 g net mass → 872 g ÷ 218 g = 4 bottles → signed movement ΔN → timestamped record. It ends at the real transaction register.
- **3A Data processing logic** follows report Fig. 7.16: valid/stable check, change check, record signed movement, then daily demand. It notes that firmware thresholds are not documented.
- **3C Decision algorithm** follows report Figs. 7.16 and 8.2 and the presentation's trigger rule (Iₜ ≤ ROP ⇒ reorder alert; recommend Q*; operator reviews):
  1. Read current stock I
  2. Compute average daily demand d̄
  3. Compute SS, ROP and EOQ
  4. Check I ≤ ROP?
  5. If yes, "Buy now" alert with suggested quantity = EOQ; if no, continue monitoring
  6. Dashboard view and PDF report, then operator review

  Nothing beyond these documented steps was added.

## 3. Authentic prototype and dashboard images used

| Poster element | Source |
|---|---|
| Hero MVP photo with 8 labels | Report Fig. 7.2 (`image6`). Marker positions were checked against the photo: products, 7-inch display, controller wiring, local I²C LCD, acrylic weighing platform |
| Transaction register (#743–#752) | Report Fig. 7.12 (`image21`), cropped to the table |
| Products view (stock and status) | Report Fig. 7.11 (`image20`) |
| Device history: temperature and RH | Report Fig. 7.15 (`image25`) |
| Bench testing photo | Report Fig. 7.4 (`image11`) |
| Product report, Berain Water (export 729), page 1 and stock-history graph | Report Fig. 9.3 (`image33`, `image34`) |

The decision-support screenshot from revision 3 was dropped. Its values (ROP 1,435) come from a different snapshot than export 729 (ROP 1,365), and showing both confused the evidence. The real report export replaces it.

## 4. Experimental metrics included (report Table 9.3, labelled "team-reported")

| Metric | Value | Label |
|---|---|---|
| Measurement accuracy | ≤ 2% | average weight error |
| Local update | ≈ 3 s | maximum LCD update observed |
| Web update | ≈ 12 s | mean dashboard update |
| Continuous operation | 7 h | no malfunction observed |
| Functional testing | > 30 | tests across four products |

The method line on the poster: readings vs measured weights · displayed vs physical counts · timed LCD and web updates · continuous run. A visible limitation box states that trial logs, sample sizes and reference masses were not recorded, that results are not statistically validated, and that 7 h does not establish long-term reliability.

## 5. Decision-support reports and outputs displayed

- **5A:** the real "QUANTIX Analytics — Product Intelligence & Forecasting Report" for Berain Water. Numbered markers show where the poster's three stages come from: ① totals, ② inventory math and demand forecast, ③ buy recommendation.
- **5B:** the same report traced as a decision chain:
  - **Monitored inventory:** stock 4, 78 sold in 25 withdrawals, 82 restocked, 1 active day.
  - **Analytical output:** 78 units/day, 7-day projection 546, ROP 1,365 (SS 819), EOQ 1,193.11.
  - **Replenishment decision:** "Buy now (overdue)", 4 ≤ 1,365, −6.9 days until order, 0.1 days to run-out.
  - All values are copied from the export.
- **5C:** outputs for all four products (exports 751, 675, 729, 735) as a native table: stock, 7-day projection, ROP, EOQ and recommendation.
- **5D:** total inventory cost (TIC) as a native editable equation and a native stacked bar chart.
  - Fixed Q = 500: $2,847 ordering + $500 holding = $3,347 per year.
  - EOQ Q = 1,193: $1,193 + $1,193 = $2,386 per year.
  - Result: modeled 28.7% lower.
  - Labelled as a scenario with assumed S = $50, H = $2 and baseline Q = 500, and "not realized savings" (report §9.4, Table 9.5).

**Arithmetic I re-checked:**
- ROP − SS = 7 × d̄ for all four products.
- EOQ = √(2 · 365 d̄ · 50 / 2) reproduces all four EOQ values.
- 365 × 78 = 28,470.
- (3,347 − 2,386.21) / 3,347 = 28.7%.

## 6. How the Industrial Engineering models are represented

There are **five native, editable PowerPoint equations**, each with a high-resolution picture fallback:
1. Demand rate: d̄ = units withdrawn / active days (implemented).
2. Projection: D̂ₕ = d̄·h, with h = 1, 7, 30 days (implemented constant-rate projection; report Eq. 7.5).
3. Reorder point: ROP = d̄L + SS, with L = 7 days assumed and SS from the system's "simple heuristic".
4. Order quantity: EOQ = √(2DS/H), with D = 365 d̄ and illustrative S and H.
5. TIC(Q) = (D/Q)S + (Q/2)H.

The poster states that a moving average is only the planned next step: the report documents no deployed moving-average window. It also states that forecast accuracy has not been validated.

## 7. Unresolved evidence limitations

1. **Team-reported tests:** there are no trial logs, count-check denominators, reference masses or timing sample sizes.
2. **Demand data:** each export covers one active day of demand (data accuracy flagged LOW). Forecast accuracy (MAE, WAPE) has not been evaluated.
3. **Planning inputs:** the safety stock is a system heuristic with no evaluated service level. Lead time (7 days) and costs (S, H) are assumptions. The TIC result is a model, not measured savings.
4. **Processing details:** firmware stability thresholds and retry rules are undocumented (report §7.12). The infrared interaction sensor is not shown because its installation is undocumented.
5. **DHT11 position:** the report places the DHT11 sensors "beside the products" without an exact location, so the photo labels only the controller wiring (ESP32 + HX711), not a DHT11.
6. **Details still to confirm with the team:**
   - The year: 2027 per the template, 2026 in the report and presentation.
   - "Alwaleed Abdu Ali Kameli" (used, as you specified) vs "Alwaleed Kameli" in the report and presentation.
   - The template's low-resolution university logo (≈ 80 ppi at print size), to be replaced with the official vector file.
7. **PDF rendering:** the PDF was rendered with LibreOffice, which shows the equations' picture fallbacks and substitutes Liberation Sans, a metric-compatible equivalent of Arial. For the press file, open the PPTX in Microsoft PowerPoint, confirm the equations, and export to PDF from there.
8. **Text size:** the smallest text is 12.5–13.5 pt (pills, flowchart Yes/No labels, some captions); body text is 14–18.5 pt. This is a compromise between the content you asked for and the 60 cm width.
