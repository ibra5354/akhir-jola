# QUANTIX Exhibition Poster: Design and Content Summary

**Files**
- `QUANTIX_Graduation_Exhibition_Poster.pptx`: editable poster (1 slide, 60 × 142.24 cm, portrait roll-up)
- `QUANTIX_Graduation_Exhibition_Poster.pdf`: PDF at the original size (23.625 × 56 in)
- `QUANTIX_Poster_Preview.png`: low-resolution preview

## 1. Layout
The poster is built inside the official template file. The university header (Jazan University logo, college and department text, Graduation Projects' Exhibition graphic) is the template's own group. It was scaled down because the template's artwork was drawn for an 84 × 200 cm canvas and spilled off its 60 × 142 cm slide. The poster keeps the template's identity: blue background `#297FD5`, navy bars `#242852`, white section panels with navy heading bars, and the left-column / tall-Results-column composition.

From top to bottom:
1. Header (template), then the **Senior Design Project 2027** band.
2. A title band with a large **QUANTIX** wordmark and the full project title.
3. A team and supervisor band.
4. A left column with Abstract, Methodology and Experimental Investigation.
5. A right column with Results:
   - ① prototype photo
   - ② dashboard screenshots
   - ③ architecture diagram
   - ④ product outputs table
   - ⑤ environmental and temporal outputs
   - ⑥ measurement-to-decision chain
6. A full-width Conclusions section with a Limitations & Future Work panel.
7. A navy footer band. About 2.4 cm of blue is left below the footer for the roll-up cassette.

One orange accent `#E8731E` is used. It matches the shelf's orange beams.

## 2. Technical content
- **Abstract (~120 words):** the problem, the QUANTIX smart shelf, the sensing and cloud stack, SS / ROP / EOQ decision support. A native bar chart shows the report's survey evidence (n = 21 respondents, 9 economic activities).
- **Methodology:** an 8-step vertical workflow in three stages:
  - SENSE: load cell → HX711 → ESP32 / DHT11 / LCD
  - RECORD: unit conversion and signed transaction → Supabase PostgreSQL → Realtime → Flutter dashboard, with HiveMQ MQTT for commands
  - DECIDE: demand projection → SS / ROP / EOQ recommendation

  Three core equations: N = (W − T)/m, ROP = d̄·L + SS, EOQ = √(2DS/H).
- **Experimental Investigation:** test setup, two build photos, and six metric tiles clearly badged **TEAM-REPORTED**, with a verification note.
- **Results:** prototype photo with numbered product and component markers, two real dashboard screenshots, a native architecture diagram that redraws report Fig. 7.1, a native table of the four product exports, DHT11 history with a peak-period table, and a value-chain graphic with the brake-pad transaction #746 example.
- **Conclusions:** 4 conclusions plus limitations and future work (MAE validation, trial logs, assumed lead time and costs, pilot / ERP / scalability).

## 3. Figures and photographs (all from the report; none generated)
| Poster element | Report source |
|---|---|
| Smart-shelf prototype | Fig. 7.2 (image6, cropped) |
| Bench integration of ESP32 / HX711 / DHT11 channels | Fig. 7.4 (image11) |
| Weighing platforms and 7-inch display | Fig. 7.2 close-up (image5, cropped) |
| Products dashboard | Fig. 7.11 |
| Berain Water decision-support view | Fig. 7.14 (cropped to the analysis panel) |
| Coffee temperature / RH history | Fig. 7.15 |
| Architecture diagram | redrawn natively from Fig. 7.1 |
| Survey chart | Section 5.1 values |

## 4. Numbers shown and where they come from
- **Survey (Section 5.1):** 71.4 %, 52.4 % (×3), 47.6 %; n = 21.
- **Team-reported tests (Table 9.3):** >30 functional tests; ≤2 % average weight error; 100 % count agreement in the reported checks (denominator not supplied); ≈3 s maximum LCD update; ≈12 s mean web update; 7 h continuous run.
- **Product exports (Tables 7.11 and 7.12):**

  | Product | Stock | Daily rate | 7-day | SS | ROP | EOQ |
  |---|---|---|---|---|---|---|
  | Coffee | 0 | 12 | 84 | 126 | 210 | 467.97 |
  | Sodium chloride solution | 0 | 13 | 91 | 136.5 | 227.5 | 487.08 |
  | Berain Water | 4 | 78 | 546 | 819 | 1,365 | 1,193.11 |
  | Brake pads | 0 | 2 | 14 | 21 | 35 | 191.05 |

  I recomputed every row: ROP − SS = 7 × daily rate, and EOQ = √(2·365d·50/2).
- **Peak periods (Table 9.4).**
- **Environmental readings:** 21.7 °C and 76.3 % RH (Section 7.17).
- **Hardware:** 20 kg cells, 10 kg design payload, 15 × 20 cm platforms, HX711 24-bit.
- **Left out on purpose:**
  - the 28.7 % "modeled cost reduction" (an EOQ scenario against an assumed 500-unit order, not measured savings)
  - all SME financial projections (ROI, payback)
  - RMSE (never computed in the report)

## 5. Missing, inconsistent or unverified information (please confirm)
1. **Supervisor name:** the brief says "Dr. Abdulhadi Al-Dhrawi"; the report says **"Dr. Abdulhadi Ali Altherwi"**. The poster uses the report's spelling.
2. **Team names:** the report says "Alwaleed Kameli"; the poster uses the fuller name from the brief, **"Alwaleed Abdu Ali Kameli"**. The dashboard footer spells "Ali Idres"; the poster follows the report: **"Ali Idrees"**.
3. **Product name:** the brief lists "Nutrients", but the report's product is **Sodium Chloride Solution**. The poster uses the report.
4. **Year:** the template shows **2027** (kept); the report cover says (2026).
5. **Two Berain Water snapshots disagree:** the dashboard screenshot shows ROP 1,435 / SS 861 / EOQ 1,223.32 / 82 per day, while export 729 shows 1,365 / 819 / 1,193.11 / 78 per day. The report notes they are different snapshots. The table uses export 729, and the screenshot caption says it differs.
6. **Test metrics are team-reported:** there are no trial logs, count-check denominators or reference-mass records, and the poster labels them that way.
7. **Infrared interaction sensor:** the team describes it, but the report says its installation and logic are not documented. It is left off the diagrams.
8. **Survey wording:** the conclusions chapter of the report says "21 organizations", while Section 5.1 says "21 respondents". The poster uses "respondents".

## 6. Check before printing
- **Logo resolution:** the template's embedded Jazan University logo is only 250 × 130 px (low for a 60 cm print). Replace it with the official high-resolution or vector logo if the department can supply one.
- **Header font:** the template's header text uses **Quicksand**. Install it on the export PC, or PowerPoint will substitute another font.
- **Export the PDF from PowerPoint:** the supplied PDF was rendered with LibreOffice (Arial rendered as the metric-compatible Liberation Sans). For the press file, re-export from PowerPoint (File → Export → PDF, "Standard / high quality").
- **Printer's safe zone:** ask the printer about the roll-up cassette and top-clip area. About 2.4 cm of blue is left below the footer and the header starts at the top edge.
- **Header bleed:** the template's header band extends about 2 mm past each side edge. That works as bleed, but confirm whether the printer needs extra bleed.
- **Editability:** every element is native and editable (text, shapes, arrows, both tables and the survey chart). Photos and screenshots are separate picture objects that can be swapped.
