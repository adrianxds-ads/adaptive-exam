# Adaptive Exam · B2 First

Paper-first practice app for Cambridge B2 First.

## v1.3.7 · Mobile exam header (2026-10-10)
- Shortens only the visible EngExam provenance in exam and correction headers to `RUOE · Practice Test 01`, while preserving the complete original source in exercise details and the element tooltip.
- Reduces the sticky header from approximately 84 px to 69 px on 320–412 px layouts; retains a readable 16 px secondary label and 52 px Back control.
- Does not change question banks, official answers, checking, achievements, timers or stored progress. Verified in isolated Chromium at 320/360/390/412/768 px.

## v0.2
- The unit of practice is now the **whole Cambridge Part**, not an isolated question.
- Part 1 shows one complete text with 8 gaps; each gap opens its own A/B/C/D selector.
- Part 2 shows one complete text with 8 open-cloze fields.
- Part 3 shows one complete text with 8 word-formation fields and the base words.
- Part 4 shows all 6 key-word transformations together.
- Each Part has one global target timer: 3:20 / 4:00 / 4:00 / 7:30.
- Answers are checked only when the learner presses **CHECK PART**.
- Reading typography and mobile spacing were enlarged substantially.
- Stats stay deliberately simple: accuracy, average Part time and overtime.

## Content architecture
The public repository contains only original Cambridge-shaped prototype content.
User-owned exam transcriptions belong in `data/private/` or `data/imported/`, both excluded from Git.

## Core rule
Cambridge mechanics come first. The app adapts the interface to the paper; it does not simplify the paper to fit the old Adaptive English interaction model.
