---
name: DRT
description: 성북구 대학생 전용 심야 귀가 버스 — one amber light on a quiet night screen.
colors:
  last-light-amber: "light-dark(#ffc53d, #ffc53d)"
  last-light-amber-hover: "light-dark(#ffba18, #ffd60a)"
  last-light-amber-pressed: "light-dark(#e2a336, #8f6424)"
  amber-ring: "light-dark(#fbe577, #4d3000)"
  amber-wash: "light-dark(#fefbe9, #1d180f)"
  amber-chip-bg: "light-dark(#fff7c2, #302008)"
  amber-text: "light-dark(#ab6400, #ffca16)"
  ink-fixed: "#21201c"
  asphalt-base: "light-dark(#fdfdfc, #111110)"
  asphalt-raised: "light-dark(#f9f9f8, #191918)"
  asphalt-control: "light-dark(#f1f0ef, #222221)"
  asphalt-line: "light-dark(#e9e8e6, #2a2a28)"
  asphalt-edge: "light-dark(#e2e1de, #31312e)"
  asphalt-divider: "light-dark(#dad9d6, #3b3a37)"
  asphalt-handle: "light-dark(#cfceca, #494844)"
  asphalt-mark: "light-dark(#bcbbb5, #62605b)"
  asphalt-muted: "light-dark(#8d8d86, #6f6d66)"
  asphalt-faint-text: "light-dark(#82827c, #7c7b74)"
  asphalt-text-secondary: "light-dark(#63635e, #b5b3ad)"
  asphalt-text: "light-dark(#21201c, #eeeeec)"
  go-green: "light-dark(#30a46c, #30a46c)"
  go-green-bg: "light-dark(#e6f6eb, #132d21)"
  go-green-text: "light-dark(#218358, #3dd68c)"
  stop-red: "light-dark(#e5484d, #e5484d)"
  stop-red-bg: "light-dark(#feebec, #3b1219)"
  stop-red-text: "light-dark(#ce2c31, #ff9592)"
  white: "#ffffff"
  scrim: "rgb(0 0 0 / 0.6)"
typography:
  display:
    fontFamily: "P, Pretendard Variable, Pretendard, system-ui, Helvetica Neue, Apple SD Gothic Neo, sans-serif"
    fontSize: "40px"
    fontWeight: 700
    lineHeight: "48px"
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "P, Pretendard Variable, Pretendard, system-ui, Helvetica Neue, Apple SD Gothic Neo, sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: "36px"
    letterSpacing: "-0.025em"
  numeral:
    fontFamily: "P, Pretendard Variable, Pretendard, system-ui, Helvetica Neue, Apple SD Gothic Neo, sans-serif"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: "40px"
    letterSpacing: "-0.03em"
    fontFeature: "tnum"
  title:
    fontFamily: "P, Pretendard Variable, Pretendard, system-ui, Helvetica Neue, Apple SD Gothic Neo, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: "28px"
    letterSpacing: "-0.025em"
  body-lg:
    fontFamily: "P, Pretendard Variable, Pretendard, system-ui, Helvetica Neue, Apple SD Gothic Neo, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: "28px"
    letterSpacing: "-0.025em"
  body:
    fontFamily: "P, Pretendard Variable, Pretendard, system-ui, Helvetica Neue, Apple SD Gothic Neo, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
    letterSpacing: "-0.025em"
  label:
    fontFamily: "P, Pretendard Variable, Pretendard, system-ui, Helvetica Neue, Apple SD Gothic Neo, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: "20px"
    letterSpacing: "-0.025em"
  caption:
    fontFamily: "P, Pretendard Variable, Pretendard, system-ui, Helvetica Neue, Apple SD Gothic Neo, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "16px"
    letterSpacing: "-0.025em"
rounded:
  sm: "4px"
  xl: "12px"
  2xl: "16px"
  3xl: "24px"
  full: "9999px"
spacing:
  unit: "4px"
  field-gap: "14px"
  gutter: "24px"
  footer-top: "16px"
  footer-bottom: "28px"
  tab-title-top: "32px"
  section: "48px"
components:
  button-primary:
    backgroundColor: "{colors.last-light-amber}"
    textColor: "{colors.ink-fixed}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    height: "52px"
    padding: "0 20px"
  button-primary-loading:
    backgroundColor: "{colors.last-light-amber}"
    textColor: "{colors.ink-fixed}"
  button-disabled:
    backgroundColor: "{colors.asphalt-line}"
    textColor: "{colors.asphalt-text-secondary}"
    rounded: "{rounded.xl}"
    height: "52px"
    padding: "0 20px"
  button-secondary:
    backgroundColor: "{colors.asphalt-line}"
    textColor: "{colors.asphalt-text}"
    rounded: "{rounded.xl}"
    height: "52px"
    padding: "0 20px"
  button-danger:
    backgroundColor: "{colors.stop-red}"
    textColor: "{colors.white}"
    rounded: "{rounded.xl}"
    height: "52px"
    padding: "0 20px"
  input:
    backgroundColor: "{colors.asphalt-raised}"
    textColor: "{colors.asphalt-text}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.xl}"
    padding: "11px 16px"
  otp-cell:
    backgroundColor: "{colors.asphalt-raised}"
    textColor: "{colors.asphalt-text}"
    rounded: "{rounded.xl}"
    height: "60px"
  option-card:
    backgroundColor: "{colors.asphalt-raised}"
    textColor: "{colors.asphalt-text}"
    rounded: "{rounded.xl}"
    padding: "12px 16px"
  option-card-selected:
    backgroundColor: "{colors.amber-wash}"
  time-cell:
    backgroundColor: "{colors.asphalt-control}"
    textColor: "{colors.asphalt-text}"
    rounded: "{rounded.xl}"
    height: "60px"
  time-cell-selected:
    backgroundColor: "{colors.amber-chip-bg}"
    textColor: "{colors.amber-text}"
    rounded: "{rounded.xl}"
    height: "60px"
  wordmark-plate:
    backgroundColor: "{colors.asphalt-text}"
    textColor: "{colors.asphalt-base}"
    fontSize: "13px"
    fontWeight: 700
    letterSpacing: "0.06em"
    rounded: "{rounded.sm}"
    padding: "0 6px"
  route-chip:
    backgroundColor: "{colors.last-light-amber}"
    textColor: "{colors.ink-fixed}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    height: "24px"
    padding: "0 6px"
  route-chip-quiet:
    backgroundColor: "{colors.amber-chip-bg}"
    textColor: "{colors.amber-text}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    height: "24px"
    padding: "0 6px"
  sample-badge:
    backgroundColor: "{colors.asphalt-control}"
    textColor: "{colors.asphalt-text-secondary}"
    typography: "{typography.caption}"
    rounded: "{rounded.sm}"
    height: "20px"
    padding: "0 6px"
  step-badge:
    backgroundColor: "{colors.asphalt-control}"
    textColor: "{colors.asphalt-text}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    size: "28px"
  card:
    backgroundColor: "{colors.asphalt-raised}"
    textColor: "{colors.asphalt-text}"
    rounded: "{rounded.2xl}"
  ticket-card:
    backgroundColor: "{colors.asphalt-raised}"
    textColor: "{colors.asphalt-text}"
    rounded: "{rounded.2xl}"
    padding: "20px"
  bus-option-card:
    backgroundColor: "{colors.asphalt-raised}"
    textColor: "{colors.asphalt-text}"
    rounded: "{rounded.xl}"
  footer:
    backgroundColor: "{colors.asphalt-base}"
    padding: "16px 0 28px"
  sheet:
    backgroundColor: "{colors.asphalt-raised}"
    textColor: "{colors.asphalt-text}"
    rounded: "{rounded.3xl}"
    padding: "24px"
  tab-bar:
    backgroundColor: "{colors.asphalt-base}"
    textColor: "{colors.asphalt-faint-text}"
    typography: "{typography.caption}"
    height: "64px"
  tab-bar-active:
    textColor: "{colors.asphalt-text}"
---

# Design System: DRT

## Overview

**Creative North Star: "막차 뒤의 불빛 (The Light After the Last Bus)"**

DRT is used past midnight, on a phone, by a tired student standing outside. The screen is a dark, quiet field of warm gray asphalt, with exactly one light switched on: the amber of the thing to do next. That might be the primary button, the minutes until the bus leaves, or the route number on the bus. Everything else steps back into sand-gray text and hairlines so that one light can be found in a single glance.

The system is flat and tonal. Depth comes from small steps in surface lightness, never from shadows. Type is Pretendard throughout, set tight (-0.025em) and heavy where it carries a decision: big bold titles, bold button labels, and bold tabular numerals for times. Controls are large and generously rounded (12px) so they can be hit with one thumb. Copy wraps on Korean word boundaries (`break-keep`) and balances its lines.

The second idea is the **노선표 (timetable)**: the app borrows the structure of bus signage, never its pictures. The app name sits in a small inverted plate like a destination sign, sections open with a bold label and a hairline that runs to the edge, and progress is always drawn as stops on a route that ends at a house. These are small, static parts. There are no drawn maps, no street grids, and no drawing animations. The one map in the app is the optional Kakao map of the walk to the boarding stop: a real tool, not decoration.

Every color is defined as a `light-dark()` pair and the page declares `color-scheme: light dark`, so the app follows the OS setting. The student-facing mockups are drawn in dark mode and dark is the reference rendering, but both modes must work. The operator screens are drawn in light mode.

**Key Characteristics:**

- One amber light per screen. Everything else is warm neutral.
- Flat surfaces stacked tonally: base → raised → control. No shadows.
- Large, one-handed controls: 52px+ touch targets, 12px corners, bold labels.
- Tight Pretendard type, bold wherever the eye needs to land, with tabular numerals for anything that changes over time.
- A single centered mobile column (max 576px), with one full-width primary action pinned at the bottom on a solid sand-1 backing.
- Signage structure: an inverted wordmark plate, hairline section rules, and progress drawn as route dots ending at a house.

## Colors

A warm, desaturated Radix Sand neutral carries everything except the next action, which is lit in Radix Amber. Green and red are reserved for status. All values come from `src/radix-colors.css`, generated by `pnpm colors` from `@radix-ui/colors`. Code refers to them by Radix step (`amber-9`, `sand-11`). The frontmatter names map 1:1 to those steps.

### Primary

- **막차 불빛 Last-Light Amber** (amber-9): the one light. Use it for the primary button background, the caret in focused fields, the route chip on the home ticket card, the rider's own segment of a route line, and the "on" state of toggles. It is the same value in both modes. Selected time cells are not amber-9 (see Amber Chip Background).
- **Hover / Pressed** (amber-10): the state shift of the same light on buttons. **amber-8** is a border color only: the border of a focused field, a selected option, or the edge cells of a selected time range. Never use it as a fill; in dark mode it is a muddy brown (#8f6424) that drops Fixed Ink to about 3:1.
- **Amber Ring** (amber-5): the 2px focus halo around a focused field, a selected option, or a selected time range's edge cells; also the 3px ring on the current stop or the live bus position.
- **Amber Wash** (amber-2): the background fill of a selected option card.
- **Amber Chip Background** (amber-3): the fill of every selected time cell (edges and in-between), and the quiet route chip in bus lists.
- **Amber Text** (amber-11): amber used as text, for links and inline actions (로그인, 비밀번호를 잊었어요, 다시 보내기), the countdown on the ticket card, 승차 / 하차 tags on route timelines, the 가장 가까워요 marker on the default drop-off stop, text in selected time cells and quiet route chips, and drop-off counts on the driver screen.
- **Fixed Ink** (#21201C): text on amber-9 in both modes. It is also the dark color of QR code modules.

### Neutral

- **새벽 아스팔트 Small-Hours Asphalt Base** (sand-1): the page background, and the solid backing of the sticky footer.
- **Raised** (sand-2): input fields, OTP cells, option cards, bus option cards, the ticket card, grouped list cards, and bottom sheets.
- **Control** (sand-3): the step-number badges, the "@" domain add-on, segmented-control tracks, unselected time cells, the sample badge, the pressed state of bus option cards, the map placeholder, the tab bar's top border, and the hairlines that frame the content column on wide screens.
- **Line** (sand-4): row dividers inside lists and cards, the hairlines between ticket-card regions and time-row cells, the walk-row border, section rules, and the background of disabled and secondary buttons.
- **Edge** (sand-5): the resting border of inputs, selects, OTP cells, option cards, and bus option cards. One step above Line so fields still read as fields on the dark base.
- **Divider** (sand-6): section dividers between groups on a screen.
- **Handle** (sand-7): the sheet grab handle and the "off" track of a toggle.
- **Mark** (sand-8): row chevrons, the starting-point dot and dotted walking segments on route diagrams, and the past part of a route line.
- **Muted** (sand-9): text on disabled buttons and input icons. Not for readable text (see Do's and Don'ts).
- **Faint Text** (sand-10): inactive tab labels and icons, passive placeholder states such as "검색 중…" and "검색 결과가 없어요", the inactive password-rule hint, and the middle-dot separator.
- **Secondary Text** (sand-11): field labels, descriptions, helper lines, metadata such as walking time and stop counts, and the app name on the first screen.
- **Text** (sand-12): all primary text, titles, the back caret, and the wordmark plate's fill (its letters are sand-1, so the plate inverts in each mode).

### Status

- **Go Green** (green-11 for text, green-3 for chip backgrounds, green-9 for full screens): student verified ("○○대학교 학생으로 확인됐어요"), password rules met, route confirmed (노선 확정), seats available, and the QR reader's "can board" screen.
- **Stop Red** (red-11 for text, red-3 for chip backgrounds, red-9 for full screens): error messages, failed password rules, full bus, destructive buttons (회원 탈퇴, 탈퇴하기), and the QR reader's "can't board" screen.

### Named Rules

**The One Light Rule.** Each screen gets one amber-9 surface: its primary action. When the home tab has no button pinned, the route chip on the ticket card is that light. Amber text (amber-11) can mark one or two more key figures or links. If two things on a screen are amber-9, one of them is wrong.

**The No-Yellow-Warning Rule.** There is no yellow "caution" color, because it can't be told apart from the brand amber. Show "arriving soon" in amber-11 as emphasis, and show "almost full" with words and an icon, not a color.

**The Quiet Selection Rule.** Selection and lists never borrow amber-9. Selected time cells and list route chips are amber-3 with amber-11 text, so the pinned button stays the only lit surface.

**The Fixed Ink Rule.** Text on amber-9 is always #21201C, never white and never sand-12 (sand-12 turns light in dark mode). Text on green-9 or red-9 is always white.

## Typography

**Display, body, and label font:** Pretendard Variable, loaded as a dynamic-subset web font under the family name `P` (`public/fonts.css`), falling back to system-ui, Helvetica Neue, Apple SD Gothic Neo, and sans-serif.

**Character:** one neo-grotesque Korean family doing all the work. Weight carries hierarchy, and the whole document is set at -0.025em tracking so Hangul titles stay dense and confident.

### Hierarchy

- **Display** (700, 40px, 48px line-height, -0.03em): used only for the welcome headline ("막차 때문에 먼저 일어나지 않아도 돼요"). It is held to 288px so it always breaks into three lines: 막차 때문에 / 먼저 일어나지 / 않아도 돼요.
- **Headline** (700, 30px, 36px): titles on full-screen flow pages such as login, signup steps, password reset, the signup-complete screen, and the day-of flow (어디서 출발해요?, the bus title 성북 2번 01:30 버스). It sits under the back caret. An optional one-line description (16px, 500, sand-11) sits 8px below it; this is the only place a screen explains itself.
- **Numeral** (700, 32px, 40px, -0.03em, tabular): the largest thing on the home tab, in amber-11: the countdown on the waiting ticket card (17분 후, 곧 와요) and the stops-left figure while riding (3정거장 남았어요). It re-reads the clock every 15 seconds without shifting layout.
- **Title** (700, 20px, 28px): titles on tab screens (오늘 귀가; 내 QR, 사전 신청, 내 정보 to come), the state line on a ticket card (오늘은 운행하지 않아요), and departure times on bus option cards. Compact headers beside the back caret (버스 찾기, 집 주소) and sheet titles are from the plan; not built yet.
- **Body Large** (400, 18px, 28px): text inside inputs and select boxes, the welcome subline, and the email address echoed on the code screen (600).
- **Body** (400, 16px, 24px): default text, list item titles (600), error and notice lines (500), and button labels (700).
- **Label** (600, 14px, 20px): field labels in sand-11. The same size at 400–500 is used for helper text, row subtitles, password-rule hints, and the address-privacy note.
- **Caption** (500, 12px, 16px): tab bar labels, time-row labels, the ~end line in time cells, and the sample badge (600). The active tab label is 700.
- **Plate** (700, 13px, 20px, +0.06em): the wordmark inside its plate. The only positive tracking in the system, because it is set in Latin capitals.

### Named Rules

**The Tabular Time Rule.** Every number that changes or lines up in a column (countdowns, clock times, rider counts such as 14/28명, the OTP timer) uses `tabular-nums`, so the layout doesn't shift as digits change.

**The 16px Input Floor Rule.** Text you type into is never smaller than 16px; inputs are 18px. iOS Safari zooms the page when an input with smaller text gets focus.

**The Four Weights Rule.** Use only 400, 500, 600, and 700.

**The Bold First Rule.** When something needs to stand out, make it bolder before you make it bigger or color it. Bold (600–700) is the default for anything people scan for: titles, button labels, list item titles, times and counts, summary values, chips, inline actions, and small markers (14px, 700). Small text can be bold. Keep 400–500 for descriptions, helper copy, and running sentences, so the bold still stands out.

## Layout

- **Column:** one centered column, max 576px (`max-w-xl`), full height (`min-h-dvh`). On wider screens, 1px sand-3 hairlines are fixed to the column's left and right edges, so the app reads as a phone-shaped strip rather than a stretched page.
- **Gutters (the 4px text inset):** every screen and sheet uses 20px horizontal padding. Boxes (buttons, fields, option cards, cards, lists, grids of cells) run to that 20px edge; bare text (titles, descriptions, labels, notes, errors, section rules, links) adds another 4px (`px-1`), so it sits at 24px. The text lines up with the text inside the boxes rather than with their borders. Text inside a card follows the card's own padding instead.
- **Location ask:** right after login or signup, if the browser hasn't decided on location yet, a full-screen page (wordmark plate, headline, why it's asked, a lock-icon line that the location stays on the phone) offers 위치 허용하기 as the primary button and 나중에 할게요 as a centered 600 sand-11 text button below it. Either one leads home.
- **Signup consent and survey:** step 1 has a consent row under the email field (an amber checkbox, the 16px 500 line 개인정보 수집과 이용에 동의해요, and a 14px semibold underlined sand-11 자세히 on the right that opens a bottom sheet listing what is collected, what it is for, how long it is kept, and what refusing means, with one 동의해요 button). 인증 코드 받기 stays off until the box is checked. Step 5 (이용 계획을 알려 주세요, also /me/survey) is one scrolling page of questions 36px apart: an 18px bold question with an optional 14px sand-11 hint, then two-column choice cells that follow the time-cell style (52px, sand-3, selected amber-3 with an amber-8 border, amber-5 ring and amber-11 text), the slot grid from booking, a select for the starting place (own school first), and an optional comment box.
- **Full-screen flow pages** (welcome, login, signup, password reset, and every /today/* page of the day-of flow) hide the tab bar. Each is a vertical stack: a top row 32px from the top and 26px tall, with the back caret (or the wordmark plate) on the left and, on the five signup steps and the four day-of steps, a step route on the right → headline (28px below) → optional description (8px below) → a 14px-gap stack of fields starting 24px below the header → a flexible spacer → the footer: one full-width primary button, 28px from the bottom or the device's safe-area inset, whichever is larger. Secondary links sit centered 16px below that button.
- **Sticky footer:** the footer sticks to the bottom on a solid sand-1 backing with 16px above the button, so long pages such as bus detail keep the action in reach while content scrolls under it.
- **Welcome** is bottom-anchored like a poster at a stop: the plate alone at the top, then open space, then the route mark, headline, and subline stacked right above the button, so the words and the action read as one unit near the thumb.
- **Tab screens** (오늘 귀가, 사전 신청, 내 QR, 내 정보) sit above a fixed 64px tab bar. Each opens with a 28px title row 32px from the top: the 20px bold title on the left and, where the screen shows sample data, the sample badge on the right, both 4px inset. A primary action uses the same sticky footer, pinned above the tab bar (64px plus the safe-area inset) with 16px below the button; the page reserves that height in its bottom padding.
- **Rhythm:** a 4px base unit. Fields are 14px apart, label to field is 6px, and major sections are about 48px apart. Lists are separated by hairline dividers, not by gaps.
- **Driver mockup:** one landscape tablet page. The next stop is very large on the left with its drop-off count in amber-11; remaining stops are listed on the right, split by a sand-6 rule.
- **QR reader:** a function-first demo page. Its result fills the whole screen in green-9 or red-9 with white text, so it reads from a distance.
- **Operator screens** (/operator, behind the shared staff code): always light (`color-scheme: light` on the shell, whatever the OS setting), full width instead of the phone column. A 224px sand-2 sidebar with a sand-4 right hairline holds the wordmark plate with 운영, the nav (40px rows, 12px corners, sand-4 fill and sand-12 on the current page, sand-11 otherwise), and 학생 앱 열기 / 나가기 at the bottom. Below 768px it folds into a top bar with the nav on its own row. Content sits on sand-1, max 1152px, 40px side padding, with a 30px bold page title, a sand-11 description, and section rules like the student app. The scope is data entry plus read-only views of what the system built (see PRODUCT.md).
  - **운행일:** a one-line summary (다가오는 운행일 · 신청 · 다음 운행, values in bold sand-12), a 기간으로 넣기 row (two native date fields, a 주말 빼기 checkbox in amber, and a 기간 넣기 button), then three month grids side by side (one column on phones) with prev / 이번 달 / next controls. Day cells are 52px with 12px corners: open days have a sand-4 border, operating days use the quiet selection style (amber-3, amber-8 border, amber-11 bold) and show the night's booking count (N명) under the number, past days are bare sand-8, and today is underlined. A click saves at once; the cell dims to 60% while saving, and a status line above the grids says what happened in green-11 or red-11. A night with bookings can't be removed.
  - **운행일** also opens with a 학생들에게 알리기 row: how many operating nights haven't been announced and how many students will get the email, and a 메일 보내기 button that asks once more (N명에게 보내기, with 그만두기) before sending.
  - **정류장:** a table (sand-2 header, sand-4 row hairlines, 16px outer corners and border) of name, address, and coordinates linking to Kakao Map, with inline 이름 바꾸기 and a two-step 삭제 (삭제할까요? 삭제 / 취소) as text actions. A 목록에서 찾기 filter sits above it. A sticky 352px panel on the right adds stops: Kakao place search with option-card results in a fading scroll panel, an editable name prefilled from the place, and a 정류장 넣기 button. Under it, 파일로 한꺼번에 넣기: a native file input (sand-4 file button), a radius select (5/8/12km from the schools), a status line (sand-11 while working, then green-11 or red-11), and a secondary 파일에서 넣기 button. The table shows the first 200 matches with a sand-11 note on how many more the filter would reach.
  - **출발지:** the same two-column layout as 정류장: a rounded list of nightlife areas (name linking to Kakao Map, sand-11 address, two-step 삭제), the eight schools as a read-only two-column list of sand-11 links, and the same search panel on the right titled 번화가 넣기.
  - **운행 설정** (max 768px): two section rules. 운행 시간 holds two native selects (첫 시간대 / 마지막 시간대, 18:00–05:30) and a sand-11 line restating the window (23:00–04:00 사이 30분 칸 10개). Under it, two more fields side by side: 당일 신청 마감 (분 전) and 안 탄 날 제한 (번, 0 turns it off). 노선 기준 is a two-column grid of number fields with the unit inside the field on the right (명, m, 분) and a 14px sand-11 line under each giving the allowed range and what the value does. One 저장하기 button, disabled until something changes, with the status beside it. Below it, a read-only 외부 서비스 list (sand-11 labels in a 160px column) says which source each travel time and the map use right now, how many results are stored, and which variable turns the real service on.
  - **노선:** a night picker (native select) on the right of the title, a summary line (확정 in amber-11 or 미리 보기 in sand-12, then 신청 · 예상 탑승 (upcoming nights) · 버스 · 집까지 평균, and buses that couldn't take everyone in red-11), a 배차표 내려받기 text button that saves a CSV (one row per stop with times and boarding/drop-off counts, no student data), and 다시 만들기 (secondary button) only while nobody has chosen or boarded a bus. Past nights stay in the picker (marked 지난 운행) and add 당일 신청 and 탄 학생 with the share of bookings who boarded. Buses are grouped under section rules per departure slot, two columns on wide screens. Each bus is a native `<details>` card (sand-2, sand-4 border, 12px corners): departure time (a moved departure shows the planned time struck through after it), the quiet route chip, and a sand-11 facts line; opened, it lists every stop with its time and 타요 N명 in amber-11 or 내려요 N명 in sand-11.
  - **탑승 확인** (the demo-phone reader, max 448px): a bus select, 탄 학생 / 탈 예정 counts, a square camera panel (sand-3 with a camera icon and 카메라 켜기 until the camera runs, then the live video with a 2px amber-9 frame), a result card under it, and a manual code field for when the camera can't read. The result card is green-3 with a green-7 border and green-11 탈 수 있어요 (or 이미 탄 학생이에요), the student's name and school, and where they get off with the walk home (plus a 14px semibold red-11 line when that stop is more than 1km from home, asking staff to point the student to a bus going their way); or red-3 / red-7 / red-11 탈 수 없어요 with the reason. The phone vibrates once for yes, three times for no. The reader, the driver screen, and 내 QR ask the browser to keep the screen on while they are open.
  - **가입 조사:** a three-way segmented control on the right of the title (실제 응답 / 데모 포함 / 데모만; sand-3 track, the chosen segment sand-1), a sand-11 count line with a 답변 내려받기 text button, then a two-column grid of section-ruled charts. Category answers are horizontal bar lists (a bold label, a 12px sand-3 track holding a sand-9 bar with 4px ends, then the count in bold and its share in sand-11); time slots and the last 14 days are columns of sand-9 bars with the count above and the label below. Comments are a bordered sand-2 list with school and date in sand-11. A 352px sticky panel on the right holds 가입 링크 (the QR on a white tile, the URL, 링크 복사 in amber-11 and QR 내려받기) and 데모 데이터 (a 학생 수 field, a secondary 만들기 / 다시 만들기 button, and a two-step red-11 모두 지우기).
  - **모의 노선:** 조건 (two amber checkboxes for real and demo answers, a two-way segmented control for 모두 탄다면 / 답한 횟수만큼 with a sand-11 line explaining it, four number fields and an 이 조건으로 만들기 button that lights only when a field changed), then 결과 as a bordered 4 × 2 grid of sand-2 cells (sand-11 label, 24px bold value, sand-11 note), 노선을 만든 순서 as five numbered step badges with this run's numbers, 지도 (slot filter chips in the quiet selection style and a Kakao map: sand routes, the opened bus in amber-9 over an amber-11 edge, black boarding dots and white drop-off dots sized by riders), and the bus cards from 노선, which add (데모 N명) when demo riders are on board. While a new run computes, the results dim to 60%.
  - **발표 화면:** full screen with no sidebar, for a projector. A top row (wordmark plate, the slide name, a sand-3 데모 데이터 포함 tag when demo answers are in, 발표 끝내기 on the right), a 48px slide title, the slide body, and a footer with the data label in sand-11, the slide count, and two 48px sand-3 arrow buttons. Seven slides: cover (the route dots, a 72px title), who answered, when and how they go home, how often and at what fare (large bar lists and columns), the five planning steps at large size, the result grid at large size, and the map with a slot list on the right. Arrow keys, space and Page Up/Down move between slides; `f` toggles full screen.
  - **기사님 화면** (max 672px): a bus select, the route chip with departure and counts, then every stop as a row with its time, name, 타는 곳 / 내리는 곳, and on drop-off stops the number getting off in 20px bold (amber-11 when above zero) with 아직 안 탄 N명 under it. The next stop is filled amber-3 and passed stops fade to sand-10. It refreshes every 10 seconds.

## Elevation & Depth

The system is flat. No component uses a visible `box-shadow` (the inset fill that stops browser autofill from repainting a field is the one technical exception). Depth comes from three tonal steps: base (sand-1), raised (sand-2), and control (sand-3). Borders and focus rings carry the remaining layering. Overlays are bottom sheets: raised surfaces over a black 60% scrim. There are no centered modals. The tab bar is opaque sand-1 with a sand-3 top border, and the sticky footer is opaque sand-1 too; content scrolls under both with no fade, shadow, translucency, or blur.

**The Flat-at-Night Rule.** Never add shadows. At night on a dark screen they read as mud. To lift something, raise its surface step or give it a border.

## Shapes

Corners scale with the size of the element: the bigger the container, the rounder it is.

- **Chips and badges** (4px): the wordmark plate, route chips (성북 2번), the sample badge, and status tags.
- **Controls** (12px): buttons, inputs, select boxes, OTP cells, option cards, bus option cards, time cells, and the bordered time row on bus detail. This is the most common radius in the system.
- **Cards and grouped lists** (16px): the home ticket card, the walk row, grouped settings lists on 내 정보, and the QR card.
- **Sheets** (24px): the top two corners only.
- **Full** (round): step-number badges, the avatar initial, stop dots on route diagrams, the sheet handle, and toggles.

**The Nesting Rule.** An inner element is always less rounded than its container: a 12px button inside a 16px card, inside a 24px sheet.

## Components

Large and clear, made for one hand. Tap targets are tall, labels are bold, and states are shown by fill and border color, never by shadow.

### Buttons

- **Shape:** gently rounded (12px), 52px tall, full width in the sticky footer at the bottom of the screen, 20px side padding. The bold 16px label is centered, with no icon.
- **Primary:** amber-9 background with Fixed Ink text. One per screen. Hover and press both shift to amber-10; press also scales to 0.98, which is off under reduced motion.
- **Loading:** stays amber-9 (the light stays on while it works), cursor shows progress, `aria-busy` is set, and a spinning bold 18px circle-notch sits 8px before the centered label. The button is disabled while loading.
- **Motion:** background, text color, and scale move together over 200ms on an exponential ease-out (`cubic-bezier(0.16, 1, 0.3, 1)`). When a form becomes valid, the gray button fades into amber: the one light switching on.
- **Touch:** the button carries an empty touchstart handler so iOS Safari applies the pressed state.
- **Disabled:** sand-4 background and a sand-11 label (6.9:1 dark, 4.9:1 light), so the next step stays readable while the gray fill says "not yet". Used until the form is valid, instead of hiding the button.
- **Secondary:** sand-4 background with sand-12 text (sand-5 on hover). Used for cancel in sheets and 운행 끝내기 on the driver screen.
- **Danger:** red-9 background with white text (red-10 on hover). Only for irreversible actions inside a confirm sheet (신청 취소하기, 탈퇴하기).
- **Text links:** amber-11, 600 weight, no underline (로그인, 비밀번호를 잊었어요, 다시 보내기, 추가). Their hit area is the words, not the whole row. When disabled they turn sand-10. Links inside the ticket card (노선 보기, 버스 바꾸기, 사전 신청으로 가기) are sand-12 at 600, with a sand-11 caret when they lead away, so amber stays on the chip and the countdown.

### Inputs / Fields

- **Style:** sand-2 fill, 1px sand-5 border, 12px corners, 11px × 16px padding, 18px text, amber-9 caret, sand-10 placeholder. The label is 14px semibold sand-11, 6px above the field with a 4px inset. Browser autofill keeps the sand-2 fill and sand-12 text.
- **Select:** same as a field, with a bold 14px sand-11 caret-down 16px from the right so it reads as tappable.
- **Focus:** the border becomes amber-8 and a 2px amber-5 ring appears. No glow or shadow.
- **With icon:** a 20px sand-9 icon sits 16px from the left, and the text starts 44px in. Used for the address search.
- **Joined field:** on the school email field, the input's right corners are squared off and joined to a sand-3 "@" add-on plus a domain select; the whole group shares one focus ring.
- **Error:** a red-11 message (500 weight) below the field stack. The field border itself doesn't change.
- **Password rules:** a row of 14px hints with check or X icons. They are sand-10 before any input, then green-11 when a rule is met and red-11 when it isn't.

### OTP Code Input

Six 60px-tall cells with 12px gaps: sand-2 fill, sand-5 border, 12px corners, 24px semibold tabular digits. The cell that will receive the next digit gets the amber-8 border and amber-5 ring, plus a pulsing amber-9 caret bar. A transparent native input sits over the whole row, so autofill of one-time codes and the numeric keypad work.

### Option Cards (selectable lists)

Every list where you pick one item uses this pattern: address search results, starting points, drop-off stops, and the address change screen. It is one shared button component that reports its state with `aria-pressed`.

- **Rest:** sand-2 fill, 1px sand-5 border, 12px corners, 12px × 16px padding, 8px between cards. The title is 16px semibold; the subtitle is 14px sand-11.
- **Selected:** amber-8 border, amber-2 fill, and a 2px amber-5 ring.
- **Pending:** while new results load, the whole list fades to 60% opacity.
- **Markers:** the default drop-off stop, and the starting point nearest the student's current location on 어디서 출발해요?, carry 가장 가까워요 in 14px bold amber-11.
- **Starting points with location:** the own school stays first and the nearest place second (selected by default); the rest sort by distance, and every card adds 지금 위치에서 350m to its subtitle. Without location permission, a 14px semibold sand-12 text button with a navigation arrow (지금 위치로 가까운 곳 찾기) sits above the list.

### Time Cells

A 3-column grid with 8px gaps, one cell per 30 minutes. Each cell is 60px tall with 12px corners and shows its start time (18px bold, tabular) over ~end (12px, 500). Unselected cells are sand-3 with a sand-3 border and sand-11 ~end. The first tap anchors a range and the second closes it: the two edge cells get an amber-3 fill, amber-8 border, 2px amber-5 ring, and amber-11 text; cells in between are amber-3 with amber-11 text. Under the grid, a summary line reads 01:00–02:00 사이에 타요 with the range in bold sand-12. When the night has no slots left, the line reads 오늘 밤 남은 시간대가 없어요 instead.

The advance-booking time step uses the same cells for a single choice: a 5-column grid with 6px gaps (23:00 to 03:30 in two rows), one selected cell at a time, styled like a range edge.

### Night Calendar

The advance-booking date picker: a 7-column grid (일 to 토, 12px 500 sand-10 headers) covering the weeks that hold open nights, 6px gaps. Cells are 48px tall with 12px corners and tabular day numbers. Open nights are sand-3 at 600; nights without service are bare sand-8 and disabled; selected nights use the time-cell edge style (amber-3, amber-8 border, 2px amber-5 ring, amber-11, 700). Several nights can be selected. The first cell and each month's 1st carry a 10px month label above the number. A night already booked gets a 4px amber-9 dot at the bottom (amber-11 when selected), explained by a 신청한 날 legend under the grid. The footer button counts the selection (3일 골랐어요). When the student is blocked by the no-show limit, 사전 신청 shows the reason in 14px semibold red-11 with a warning icon under the nights box, and 새로 신청하기 is disabled.

### Chips

- **Route chip:** 24px tall, 6px side padding, 14px bold, 4px corners (성북 2번). Loud (amber-9 fill, Fixed Ink text) only on the home ticket card, where it is the screen's one light. Quiet (amber-3 fill, amber-11 text) in bus lists, so a list of buses doesn't light up.
- **Sample badge:** retired. Every student surface now shows real data (operator-set nights, slots, stops, starting areas, and generated buses), so the 예시 데이터 badge no longer appears anywhere. Bring it back only if a surface starts showing sample operating data again.
- **Status chips:** a 3-step fill with 11-step text, such as green-3 with green-11 for 운행 중 or 인증됨, and red-3 with red-11 for 6명 넘침. Neutral chips are sand-3 with sand-11.

### Cards / Grouped Lists

- **Corner style:** 16px.
- **Background:** sand-2 on a sand-1 page.
- **Border:** none outside. Rows inside are divided by sand-4 hairlines.
- **Rows:** 52px tall: a 20px bold-weight sand-11 leading icon, a 16px 500 sand-12 title, an optional 14px sand-11 value right-aligned and truncated, and a bold 14px sand-8 chevron; sand-3 while pressed. Toggles inside rows are amber-9 when on and sand-7 when off.
- **Used for:** 내 정보 (이름, 집 주소, 비밀번호 바꾸기, 탑승 기록, and a 신청 기간 알림 메일 switch; then a second group with 로그아웃 and 회원 탈퇴 in red-11) the 내 신청 list on 사전 신청 (each row a link: night in 16px semibold tabular, slot · 집으로 or the other address in 14px sand-11, and a sand-8 chevron), and a booking's own page (시간 and 가는 곳 rows leading to their edit screens, then a separate group with 이 날 신청 취소하기 in red-11). Once booking for that night has closed, the 시간 and 가는 곳 rows lose their chevron and link, and the header says only cancelling is left. The 탑승 기록 page uses the same grouped list without links: night in 16px semibold over 01:31 탑승 · ○○에서 내림 in 14px sand-11, and the quiet route chip on the right. The rows are the shared `LinkRow` and `ActionRow` components (a `LinkRow` without `href` drops its chevron and link). `ToggleRow` ends in a 44×26 switch (amber-9 track when on, sand-6 when off, a white 20px knob, `role="switch"`); it flips at once and flips back if saving fails.
- **Saved notices:** after a save, the page it returns to shows a green-11 semibold line with a check icon (`SavedNotice`, `role="status"`): 집 주소를 바꿨어요 on 내 정보, 시간을 바꿨어요 on a booking, 3일 신청했어요 or 신청을 취소했어요 on 사전 신청. It is driven by a `?saved=` search parameter so it survives a server render.

### Ticket Card (signature)

The home tab is one ticket: a 16px sand-2 card, 20px below the title row, split into regions by full-width sand-4 hairlines rather than gaps. One state shows at a time.

- **Waiting:** a top region (20px inset) with the loud route chip beside the boarding clock (14px semibold sand-11, 01:15 승차), the countdown numeral 16px below in amber-11, then the boarding stop in sand-11. A moved departure adds a 14px semibold line with an amber-11 clock-counter icon (출발이 01:30 → 01:15로 당겨졌어요; the 로/으로 particle follows the last digit). Then the time row on hairlines, the trip timeline, and a bottom row with the seat count on the left and 노선 보기 / 버스 바꾸기 on the right.
- **Missed:** when the chosen bus left more than 2 minutes ago and no boarding was recorded: the quiet route chip with the boarding clock, 20px bold 고른 버스가 떠났어요, a sand-11 line naming the stop, and the pinned 다른 버스 고르기 button (back to the time step with the same starting point).
- **Riding:** the chip with 타고 있어요, the stops-left numeral in amber-11, the drop-off arrival line, the riding timeline, and a closing line that the drop-off stop is on the 기사님 screen.
- **Booked (no bus chosen):** the booked slot as a 20px bold line, a sand-11 note that the QR alone is enough, and a hairline region labeled 집에서 가까운 정류장 with that stop and its walk, stacked label over value. The stop is the one the night's plan put the student on; the region is left out until the plan exists. It states a fact, not a drop-off decision, because drop-off for QR-only riders is still open. The pinned 탈 버스 고르기 button above the tab bar is the light.
- **Arrived:** the route mark with all four stops lit and the house amber (wide spacing), then 20px bold ○○에서 내렸어요 and the walk home.
- **No service / not booked:** a 20px bold line and a sand-11 explanation; not booked adds a sand-12 link to 사전 신청.

### Time Row

The four time values, always in this order: 정류장까지 / 기다림 / 타고 가요 / 집까지. Four equal cells, each a 12px sand-11 label over the minutes in 16px bold tabular, always written as N분 (never hours). Cells are split by sand-4 hairlines with 12px inset; the first cell's inset matches its container (20px on the ticket card, 16px on bus option cards). It sits between hairlines inside cards, and in its own 12px sand-4 bordered box on bus detail.

### Bus Option Card

The bus list is a list of links, not a selection: each card is a sand-2 block with a sand-5 border and 12px corners, sand-3 while pressed. The top row has the boarding time in 20px bold tabular, 승차 in 14px semibold sand-11, the quiet route chip pushed right, and a sand-8 caret. A 14px sand-11 line says where you board and get off. Below, the time row and the seat count each sit on a sand-4 hairline.

### Seat Count

Riders over capacity (14/28명) in 14px, 500, sand-11, tabular, after a 13px users icon. At 85% full or more it adds · 거의 찼어요 in 600 sand-12, and a full bus the student isn't already counted on says · 자리가 다 찼어요 the same way: words and weight, never a color. On a full bus's detail screen the footer button turns disabled and reads 자리가 다 찼어요.

### Walk Row

The walk to the boarding stop on bus detail, under a 정류장까지 걷기 section rule: a 16px card with a sand-4 border. When a Kakao key is set, a 160px static map (no drag or scroll zoom, two markers, sand-3 while loading) sits on top; if the map fails it is removed and the row stands alone. The row is sand-2 with 16px × 12px padding: a 18px sand-11 walking icon, 걸어서 N분 in semibold tabular over from → to in 14px sand-11, and 길찾기 with an up-right arrow (14px semibold sand-11) that opens Kakao walking directions.

Under the 노선 section rule, the same Kakao key also draws a 224px route map (16px corners, sand-4 border, sand-3 while loading, draggable but no scroll zoom): the whole route as a 4px sand line, the part the student rides as a 6px amber-9 (#ffc53d) line on top, and markers at 승차 and 하차. Without a key, or if the map fails, it is left out and the timeline stands alone.

### Bottom Sheets

Every popup is a bottom sheet (the shared `Sheet` component); there are no centered modals.

- **Surface:** a native `<dialog>` opened with `showModal()`, so focus is trapped and Escape closes it. Anchored to the bottom, as wide as the content column (max 576px), at most 90% of the screen tall. sand-2 with 24px top corners, the 20px gutter with the 4px text inset (buttons at 20px, title, description and errors at 24px), and 28px or the safe-area inset at the bottom.
- **Content:** a 36px × 4px sand-7 grab handle centered in a 32px full-width drag strip at the top, a 20px bold title 4px below the strip, a 16px 500 sand-11 description, then the buttons stacked full width 8px apart (danger or primary first, secondary last).
- **Backdrop:** black 60%. Only a tap that lands outside the sheet's box closes it; taps on the sheet, including its padding and the handle, never do. Escape closes it too.
- **Drag:** the handle strip follows the pointer downward. Pulling up never lifts the sheet off the bottom edge: it stays anchored and stretches taller (its bottom padding grows on a rubber band that tops out at 64px), so the backdrop never shows beneath it. On release it closes if dragged down past a quarter of its height or flicked faster than 0.5px/ms; otherwise it springs back, and a stretch eases back over 320ms.
- **Motion:** slides up while the backdrop fades in (320ms, exponential ease-out); closing slides down and fades out faster (240ms, ease-in) and only then removes the dialog, so the close animates in every browser. A close always starts from wherever the sheet is, including mid-drag. The content stays in place while it slides away. Off under reduced motion.
- **Used for:** 신청 취소하기 on a booking's page, and 회원 탈퇴 on 내 정보 (which also asks for the password inside the sheet).

### Navigation

- **Tab bar:** fixed to the bottom, 64px tall plus the safe-area inset, opaque sand-1 with a sand-3 top border, and capped to the column width. It has four equal, full-height items: a 20px Phosphor icon over a 12px label. Inactive tabs use the regular icon in sand-10 at 500; the active tab switches to the fill icon in sand-12 at 700 and carries `aria-current="page"`. It shows only on the four tab screens (/, /booking, /qr, /me); every other page, including the 404 page and the booking edit screens, hides it.
- **Back caret:** a 24px Phosphor caret-left in sand-12, top-left, with a 44px round hit area. On the first screen of a flow, the wordmark plate takes its place.
- **Wordmark plate:** the app name (`VITE_APP_NAME`) in 13px bold capitals with +0.06em tracking, sand-1 on a sand-12 plate with 4px corners and 6px side padding. It inverts per mode, like a lit destination sign. It is never amber, so it never competes with the one light.
- **Step route:** signup steps 1–5 and day-of steps 1–4 (출발할 곳, 탈 시간, 버스 고르기 and bus detail, 내릴 정류장) show a small route at the top right of the header row: one dot per step joined by 14px × 2px sand-6 segments, with the last stop drawn as a 15px Phosphor house. Passed steps are 8px amber-9 dots on amber-9 segments; the current step is a 10px amber-9 dot with a 3px amber-5 ring; later steps are 8px hollow sand-7 dots, and the house stays sand-7 until the last step, where it turns amber-9. Screen readers hear "5단계 중 1단계" (signup) or "4단계 중 1단계" (day-of). The welcome, login, password reset, signup-complete, and route-only bus detail (노선 보기) screens have no step route.
- **Icons:** Phosphor (`@iconify-json/ph`) throughout, loaded through unplugin-icons as `Ph*` components.

### Step List (signature)

Numbered instructions (이렇게 타요), drawn as stops on a route, under a section rule: a 28px round sand-3 badge with a 14px semibold number, beside a 16px semibold title and a 14px sand-11 description. Items are 20px apart, and a 2px sand-6 line joins each badge to the next, leaving 4px of space at both ends.

### Scroll Fade

Lists that scroll inside a fixed-height panel, rather than with the page, fade at their edges so content dissolves instead of being cut off: the starting-point list on 어디서 출발해요? and the address search results (signup, booking, 집 주소). It is a mask on the scroll container, not a colored overlay, so it works on any surface in both modes. Each edge fades over 24px only when there is more content past it, so a list at rest at the top has a crisp top edge, and the fade eases in and out over 200ms. Built as the shared `FadeScroll` component.

### Section Rule

A section opens with its label (14px, 700, sand-11) followed by a 1px sand-4 hairline that runs to the column's right edge, 12px after the label. One shared component, used for 이렇게 타요, and for 정류장까지 걷기 and 노선 on bus detail (32px above each). It replaces boxed section cards.

### Route Mark (signature)

One component (`RouteDots`) draws every route in the app: the header step route (14px segments) and the larger route mark (24px segments). Passed stops are 8px amber-9 dots on amber-9 segments, the current stop is a 10px amber-9 dot with a 3px amber-5 ring, later stops are 8px hollow sand-7 dots on sand-6 segments, and the last stop is a 15px house that turns amber-9 when reached. It is decorative and hidden from screen readers.

- **Welcome:** stop 1 of 4 above the headline: the trip hasn't started.
- **Signup complete:** every stop lit and the house amber, in the same place above the headline. It bookends the welcome mark and replaces a generic success icon.
- **Arrived ticket card:** the same all-lit mark opens the card once the rider is off the bus.

These small markers don't count against the One Light Rule; the rule is about surfaces. Keep route imagery this small and abstract: no drawn maps, street grids, labels, or drawing animations.

### Route Timeline (signature)

A 2px vertical line down the left edge connects the stops, rows 14px apart. The rider's own ride, from boarding to drop-off, is drawn in amber-9 with 12px filled amber-9 dots at both ends; stops in between get 8px hollow dots with a 2px amber-9 ring, names at 500. The rest of the route is sand-6 with 8px hollow sand-7 dots, and that text drops to sand-11. Boarding and drop-off names are bold, with a 승차 or 하차 tag in 14px bold amber-11. Times are right-aligned in 14px tabular numerals: bold sand-12 on tagged stops, 500 sand-11 elsewhere. Walking legs are dotted 2px sand-8 lines; the starting point is a small filled sand-8 dot and home is a 15px sand-11 house. Hollow dots fill with the surface they sit on (sand-2 on a card, sand-1 on the page). Decorative marks are hidden from screen readers.

- **Trip** (waiting ticket card): starting point → 승차 → N개 정류장 지나서 (14px sand-11) → 하차 → 집, with walk minutes under the ends.
- **Full route** (bus detail, under a 노선 section rule): every stop on the bus, the rider's span lit, with walk notes under 승차 and 하차.
- **Riding** (riding ticket card): 지금 버스 위치 as a bold 10px amber-9 dot with a 3px amber-5 ring, then the stops still ahead, 하차, and 집.

### QR Card (signature)

The QR card is always light: a white (#fff) 16px card with a 1px sand-4 border (so it keeps an edge on the light page), #21201C modules drawn as one crisp-edged SVG path at medium error correction, even in dark mode, because scanners need dark-on-light contrast. The code is up to 240px wide and holds the student's app ID signed with a one-minute window; it quietly redraws every 30 seconds (keeping the last code if the network drops) and the line under the card says a screenshot stops working after 10 minutes. The student's name (20px bold Fixed Ink) and school (14px 500 #63635E) sit under it inside the card. Below the card: a 14px sand-11 line about showing it at the reader and raising brightness, then a bordered summary of tonight's bus in normal page colors (quiet route chip and boarding time; that the QR alone is enough; 버스에 탔어요 while riding; 오늘 귀가를 마쳤어요 after).

## Do's and Don'ts

### Do:

- **Do** use amber-9 for exactly one primary action per screen, with #21201C text.
- **Do** keep the primary button full width, in the sticky sand-1 footer at the bottom (above the tab bar on tab screens), and visible while disabled (sand-4 / sand-11) rather than hiding it.
- **Do** show focus as an amber-8 border plus a 2px amber-5 ring on every field and selectable card.
- **Do** rely on the global keyboard focus outline (2px amber-8, 2px offset) for buttons and links, and the amber-5 text selection; both live in `src/tailwind.css`.
- **Do** reach for weight (600–700) first when a word, number, or label needs emphasis, and keep descriptions at 400–500.
- **Do** use `tabular-nums` for every time, countdown, and count.
- **Do** use `break-keep` and `text-balance` on Korean headlines and helper copy.
- **Do** center button labels, with no trailing icon.
- **Do** open a group of content with a section rule, not a card or a kicker label.
- **Do** respect the device safe area at the bottom of every screen (footer and tab bar).
- **Do** define any new color as a Radix step from `src/radix-colors.css` (add palettes through `scripts/radix-colors.ts`), so it works in both modes.
- **Do** show time as four separate values: walk to the stop, wait for the bus, ride time, and walk home.
- **Do** label sample operating data with the 예시 데이터 sample badge if any surface ever shows it again, student screens included.

### Don't:

- **Don't** add shadows, gradients, or glows. Depth is tonal. The one exception is the scroll fade: a mask on the edges of an in-panel scroll list, never a colored gradient.
- **Don't** put white or sand-12 text on amber-9.
- **Don't** introduce a yellow or orange warning color next to the brand amber.
- **Don't** use sand-9 for text people need to read; it is for disabled states and icons. Use sand-10 only for secondary states (placeholders, separators, inactive tab labels). It sits just under 4.5:1 (about 4.4:1 in dark mode, 3.8:1 in light), so never use it for content.
- **Don't** make a nested element as round as or rounder than its container.
- **Don't** set input text below 16px.
- **Don't** render the QR code in dark mode colors.
- **Don't** mix list styles: selectable lists are always bordered option cards, never rows with a checkmark.
- **Don't** use amber-9 for selected time cells or route chips in lists; selection and lists are amber-3 with amber-11 text.
