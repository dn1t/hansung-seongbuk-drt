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
    fontSize: "36px"
    fontWeight: 700
    lineHeight: "44px"
    letterSpacing: "-0.025em"
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
    letterSpacing: "-0.025em"
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
  footer-bottom: "28px"
  section: "48px"
components:
  button-primary:
    backgroundColor: "{colors.last-light-amber}"
    textColor: "{colors.ink-fixed}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: "14px 28px"
  button-primary-loading:
    backgroundColor: "{colors.last-light-amber-pressed}"
    textColor: "{colors.ink-fixed}"
  button-disabled:
    backgroundColor: "{colors.asphalt-line}"
    textColor: "{colors.asphalt-muted}"
    rounded: "{rounded.xl}"
    padding: "14px 28px"
  button-secondary:
    backgroundColor: "{colors.asphalt-line}"
    textColor: "{colors.asphalt-text}"
    rounded: "{rounded.xl}"
    padding: "14px 28px"
  button-danger:
    backgroundColor: "{colors.stop-red}"
    textColor: "{colors.white}"
    rounded: "{rounded.xl}"
    padding: "14px 28px"
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
  route-chip:
    backgroundColor: "{colors.last-light-amber}"
    textColor: "{colors.ink-fixed}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "2px 6px"
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
  sheet:
    backgroundColor: "{colors.asphalt-raised}"
    textColor: "{colors.asphalt-text}"
    rounded: "{rounded.3xl}"
    padding: "24px"
  tab-bar:
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

Every color is defined as a `light-dark()` pair and the page declares `color-scheme: light dark`, so the app follows the OS setting. The student-facing mockups are drawn in dark mode and dark is the reference rendering, but both modes must work. The operator screens are drawn in light mode.

**Key Characteristics:**

- One amber light per screen. Everything else is warm neutral.
- Flat surfaces stacked tonally: base → raised → control. No shadows.
- Large, one-handed controls: 52px+ touch targets, 12px corners, bold labels.
- Tight Pretendard type, bold wherever the eye needs to land, with tabular numerals for anything that changes over time.
- A single centered mobile column (max 576px), with one full-width primary action pinned at the bottom.

## Colors

A warm, desaturated Radix Sand neutral carries everything except the next action, which is lit in Radix Amber. Green and red are reserved for status. All values come from `src/radix-colors.css`, generated by `pnpm colors` from `@radix-ui/colors`. Code refers to them by Radix step (`amber-9`, `sand-11`). The frontmatter names map 1:1 to those steps.

### Primary

- **막차 불빛 Last-Light Amber** (amber-9): the one light. Use it for the primary button background, the caret in focused fields, route-number chips, the rider's own segment of a route line, selected time cells, and the "on" state of toggles. It is the same value in both modes.
- **Hover** (amber-10) and **Pressed / Loading** (amber-8): state shifts of the same light. amber-8 also draws the border of a focused field or a selected option.
- **Amber Ring** (amber-5): the 2px focus halo around a focused field or selected option.
- **Amber Wash** (amber-2): the background fill of a selected option card.
- **Amber Chip Background** (amber-3): the in-between cells of a selected time range, and quiet amber chips.
- **Amber Text** (amber-11): amber used as text, for links and inline actions (로그인, 비밀번호를 잊었어요, 다시 보내기), the remaining-time figure, and drop-off counts on the driver screen.
- **Fixed Ink** (#21201C): text on amber-9 in both modes. It is also the dark color of QR code modules.

### Neutral

- **새벽 아스팔트 Small-Hours Asphalt Base** (sand-1): the page background.
- **Raised** (sand-2): input fields, OTP cells, option cards, grouped list cards, bottom sheets, and modals.
- **Control** (sand-3): the step-number badges, the "@" domain add-on, segmented-control tracks, unselected time cells, the tab bar's top border, and the hairlines that frame the content column on wide screens.
- **Line** (sand-4): the resting border of inputs and option cards, row dividers inside lists, and the background of disabled and secondary buttons.
- **Divider** (sand-6): section dividers between groups on a screen.
- **Handle** (sand-7): the sheet grab handle and the "off" track of a toggle.
- **Mark** (sand-8): row chevrons, dotted walking segments on route diagrams, and the past part of a route line.
- **Muted** (sand-9): text on disabled buttons and input icons. Not for readable text (see Do's and Don'ts).
- **Faint Text** (sand-10): inactive tab labels and icons, passive placeholder states such as "검색 중…" and "검색 결과가 없어요", the inactive password-rule hint, and the middle-dot separator.
- **Secondary Text** (sand-11): field labels, descriptions, helper lines, metadata such as walking time and stop counts, the signup step counter, and the app name on the first screen.
- **Text** (sand-12): all primary text, titles, and the back caret.

### Status

- **Go Green** (green-11 for text, green-3 for chip backgrounds, green-9 for full screens): student verified ("○○대학교 학생으로 확인됐어요"), password rules met, route confirmed (노선 확정), seats available, and the QR reader's "can board" screen.
- **Stop Red** (red-11 for text, red-3 for chip backgrounds, red-9 for full screens): error messages, failed password rules, full bus, destructive buttons (회원 탈퇴, 탈퇴하기), and the QR reader's "can't board" screen.

### Named Rules

**The One Light Rule.** Each screen gets one amber-9 surface: its primary action. Amber text (amber-11) can mark one or two more key figures or links. If two things on a screen are amber-9, one of them is wrong.

**The No-Yellow-Warning Rule.** There is no yellow "caution" color, because it can't be told apart from the brand amber. Show "arriving soon" in amber-11 as emphasis, and show "almost full" with words and an icon, not a color.

**The Fixed Ink Rule.** Text on amber-9 is always #21201C, never white and never sand-12 (sand-12 turns light in dark mode). Text on green-9 or red-9 is always white.

## Typography

**Display, body, and label font:** Pretendard Variable, loaded as a dynamic-subset web font under the family name `P` (`public/fonts.css`), falling back to system-ui, Helvetica Neue, Apple SD Gothic Neo, and sans-serif.

**Character:** one neo-grotesque Korean family doing all the work. Weight carries hierarchy, and the whole document is set at -0.025em tracking so Hangul titles stay dense and confident.

### Hierarchy

- **Display** (700, 36px, 44px line-height): used only for the welcome headline ("막차 때문에 먼저 일어나지 않아도 돼요"). The text is balanced and wraps on word boundaries.
- **Headline** (700, 30px, 36px): titles on full-screen flow pages such as login, signup steps, password reset, and the signup-complete screen. It sits under the back caret.
- **Numeral** (700, 32px, tabular): the countdown on tonight's bus ("17분 후") and departure times on bus option cards. From the mockups; not built yet.
- **Title** (700, 20px, 28px): titles on tab screens (내 QR, 사전 신청, 내 정보), compact page headers that sit next to the back caret (버스 찾기, 집 주소), sheet titles, and section headers. From the plan and mockups; not built yet.
- **Body Large** (400, 18px, 28px): text inside inputs and select boxes, the welcome subline, and the email address echoed on the code screen (600).
- **Body** (400, 16px, 24px): default text, list item titles (600), error and notice lines (500), and button labels (700).
- **Label** (600, 14px, 20px): field labels in sand-11. The same size at 400–500 is used for helper text, row subtitles, password-rule hints, and the address-privacy note.
- **Caption** (500, 12px, 16px): tab bar labels and the smallest chips.

### Named Rules

**The Tabular Time Rule.** Every number that changes or lines up in a column (countdowns, clock times, rider counts such as 14/28명, the OTP timer) uses `tabular-nums`, so the layout doesn't shift as digits change.

**The 16px Input Floor Rule.** Text you type into is never smaller than 16px; inputs are 18px. iOS Safari zooms the page when an input with smaller text gets focus.

**The Four Weights Rule.** Use only 400, 500, 600, and 700.

**The Bold First Rule.** When something needs to stand out, make it bolder before you make it bigger or color it. Bold (600–700) is the default for anything people scan for: titles, button labels, list item titles, times and counts, summary values, chips, inline actions, and small markers such as the step counter (14px, 700). Small text can be bold; the step counter is the reference. Keep 400–500 for descriptions, helper copy, and running sentences, so the bold still stands out.

## Layout

- **Column:** one centered column, max 576px (`max-w-xl`), full height (`min-h-dvh`). On wider screens, 1px sand-3 hairlines are fixed to the column's left and right edges, so the app reads as a phone-shaped strip rather than a stretched page.
- **Gutters:** the page uses 20px horizontal padding, and text blocks add another 4px of inset, so the effective edge is 24px.
- **Full-screen flow pages** (welcome, login, signup, password reset) hide the tab bar. Each is a vertical stack: a top row 32px from the top and 26px tall, with the back caret (or app name) on the left and, on the four signup steps, a step counter on the right → headline (28px below) → a 14px-gap stack of fields → a flexible spacer → one full-width primary button, 28px from the bottom. Secondary links sit centered 16px below that button.
- **Tab screens** (오늘 귀가, 사전 신청, 내 QR, 내 정보) sit above a fixed 64px tab bar. The primary action pins above the tab bar.
- **Rhythm:** a 4px base unit. Fields are 14px apart, label to field is 6px, and major sections are about 48px apart. Lists are separated by hairline dividers, not by gaps.
- **Driver mockup:** one landscape tablet page. The next stop is very large on the left with its drop-off count in amber-11; remaining stops are listed on the right, split by a sand-6 rule.
- **QR reader:** a function-first demo page. Its result fills the whole screen in green-9 or red-9 with white text, so it reads from a distance.
- **Operator screens:** desktop layout with a left sidebar nav (selected item on a sand-3/4 fill) and content tables on sand-1, built from the same tokens. They are drawn in light mode. The scope is data entry only (see PRODUCT.md).

## Elevation & Depth

The system is flat. No component uses `box-shadow`. Depth comes from three tonal steps: base (sand-1), raised (sand-2), and control (sand-3). Borders and focus rings carry the remaining layering. Overlays such as bottom sheets and modals are raised surfaces over a black 60% scrim. The tab bar is the one translucent surface, sand-1 at 80% opacity with a sand-3 top border.

**The Flat-at-Night Rule.** Never add shadows. At night on a dark screen they read as mud. To lift something, raise its surface step or give it a border.

## Shapes

Corners scale with the size of the element: the bigger the container, the rounder it is.

- **Chips and badges** (4px): route-number chips (성북 2번) and status tags.
- **Controls** (12px): buttons, inputs, select boxes, OTP cells, option cards, and time cells. This is the most common radius in the system.
- **Cards and grouped lists** (16px): the selected-bus card, grouped settings lists on 내 정보, and the QR card.
- **Sheets and modals** (24px): the top two corners only for bottom sheets, all four for centered modals.
- **Full** (round): step-number badges, the avatar initial, stop dots on route diagrams, the sheet handle, and toggles.

**The Nesting Rule.** An inner element is always less rounded than its container: a 12px button inside a 16px card, inside a 24px sheet.

## Components

Large and clear, made for one hand. Tap targets are tall, labels are bold, and states are shown by fill and border color, never by shadow.

### Buttons

- **Shape:** gently rounded (12px). Full width at the bottom of the screen, 14px vertical × 28px horizontal padding, bold 16px label.
- **Primary:** amber-9 background with Fixed Ink text. One per screen.
- **Loading:** amber-8 background, cursor shows progress, and a spinning 18px circle-notch icon sits before the label. The button is disabled while loading.
- **Disabled:** sand-4 background with sand-9 text. Used until the form is valid, instead of hiding the button.
- **Secondary:** sand-4 background with sand-12 text. Used for cancel in modals and 운행 끝내기 on the driver screen.
- **Danger:** red-9 background with white text. Only for irreversible actions inside a confirm modal.
- **Text links:** amber-11, 600 weight, no underline (로그인, 비밀번호를 잊었어요, 다시 보내기, 추가). When disabled they turn sand-10.

### Inputs / Fields

- **Style:** sand-2 fill, 1px sand-4 border, 12px corners, 11px × 16px padding, 18px text, amber-9 caret. The label is 14px semibold sand-11, 6px above the field with a 4px inset.
- **Focus:** the border becomes amber-8 and a 2px amber-5 ring appears. No glow or shadow.
- **With icon:** a 20px sand-9 icon sits 16px from the left, and the text starts 44px in. Used for the address search.
- **Joined field:** on the school email field, the input's right corners are squared off and joined to a sand-3 "@" add-on plus a domain select; the whole group shares one focus ring.
- **Error:** a red-11 message (500 weight) below the field stack. The field border itself doesn't change.
- **Password rules:** a row of 14px hints with check or X icons. They are sand-10 before any input, then green-11 when a rule is met and red-11 when it isn't.

### OTP Code Input

Six 60px-tall cells with 12px gaps: sand-2 fill, sand-4 border, 12px corners, 24px semibold digits. The cell that will receive the next digit gets the amber-8 border and amber-5 ring, plus a pulsing amber-9 caret bar. A transparent native input sits over the whole row, so autofill of one-time codes and the numeric keypad work.

### Option Cards (selectable lists)

Every list where you pick one item uses this pattern: address search results, starting points, drop-off stops, and the address change screen.

- **Rest:** sand-2 fill, 1px sand-4 border, 12px corners, 12px × 16px padding, 8px between cards. The title is 16px semibold; the subtitle is 14px sand-11.
- **Selected:** amber-8 border, amber-2 fill, and a 2px amber-5 ring.
- **Pending:** while new results load, the whole list fades to 60% opacity.

### Chips

- **Route chip:** amber-9 fill, Fixed Ink text, 14px bold, 4px corners (성북 2번). The route number is the bus's identity, so it gets the light.
- **Status chips:** a 3-step fill with 11-step text, such as green-3 with green-11 for 운행 중 or 인증됨, and red-3 with red-11 for 6명 넘침. Neutral chips are sand-3 with sand-11.

### Cards / Grouped Lists

- **Corner style:** 16px.
- **Background:** sand-2 on a sand-1 page.
- **Border:** none outside. Rows inside are divided by sand-4 hairlines.
- **Rows:** a 20px sand-11 leading icon, a 16px sand-12 title, an optional 14px sand-11 value, and a sand-8 chevron. Toggles inside rows are amber-9 when on and sand-7 when off.

### Bottom Sheets and Modals

- **Sheet:** sand-2 surface with 24px top corners, a sand-7 full-round grab handle, a 20px bold title with a sand-11 description, and the full-width primary button at the bottom. It sits over a 60% black scrim. Used for the time-range picker and drop-off choice.
- **Modal:** sand-2 surface with 24px corners on all sides, centered over the scrim. Danger and secondary buttons are stacked full width.

### Navigation

- **Tab bar:** fixed to the bottom, 64px tall, sand-1 at 80% opacity with a sand-3 top border, and capped to the column width. It has four equal items: an 18px Phosphor icon over a 12px 500-weight label. The active tab is sand-12; inactive tabs are sand-10. It's hidden on /welcome and /reset-password.
- **Back caret:** a 24px Phosphor caret-left in sand-12, top-left. On the first screen of a flow, the bold sand-11 app name (`VITE_APP_NAME`) takes its place.
- **Step counter:** signup steps 1–4 show "1 / 4" at the top right of the header row in 14px bold sand-11 with tabular numerals. Screen readers hear "4단계 중 1단계". The welcome, login, password reset, and signup-complete screens have no counter.
- **Icons:** Phosphor (`@iconify-json/ph`) throughout, loaded through unplugin-icons as `Ph*` components.

### Step List (signature)

Numbered instructions (이렇게 타요): a 28px round sand-3 badge with a 14px semibold number, beside a 16px semibold title and a 14px sand-11 description. Items are 20px apart.

### Route Timeline (signature, from mockups)

A vertical line down the left edge connects the stops. The rider's own ride, from boarding to drop-off, is drawn in amber-9 with filled amber dots at both ends. Stops in between get hollow amber dots. The rest of the route is sand-6 with sand-7 dots, and that text drops to sand-11. Boarding and drop-off stops are bold, with a 승차 or 하차 tag in amber-11. Times are right-aligned in tabular numerals. Walking legs are dotted sand-8.

### QR Card (signature, from mockups)

The QR card is always light: a white (#fff) 16px card with #21201C modules, even in dark mode, because scanners need dark-on-light contrast. The student's name (Fixed Ink, bold) and school sit inside the card. The tonight's-bus summary sits below it in normal page colors.

## Do's and Don'ts

### Do:

- **Do** use amber-9 for exactly one primary action per screen, with #21201C text.
- **Do** keep the primary button full width, pinned at the bottom, and visible while disabled (sand-4 / sand-9) rather than hiding it.
- **Do** show focus as an amber-8 border plus a 2px amber-5 ring on every field and selectable card.
- **Do** reach for weight (600–700) first when a word, number, or label needs emphasis, and keep descriptions at 400–500.
- **Do** use `tabular-nums` for every time, countdown, and count.
- **Do** use `break-keep` and `text-balance` on Korean headlines and helper copy.
- **Do** define any new color as a Radix step from `src/radix-colors.css` (add palettes through `scripts/radix-colors.ts`), so it works in both modes.
- **Do** show time as four separate values: walk to the stop, wait for the bus, ride time, and walk home.
- **Do** label sample operating data as 예시 데이터 on operator and demo screens.

### Don't:

- **Don't** add shadows, gradients, or glows. Depth is tonal.
- **Don't** put white or sand-12 text on amber-9.
- **Don't** introduce a yellow or orange warning color next to the brand amber.
- **Don't** use sand-9 for text people need to read; it is for disabled states and icons. Use sand-10 only for secondary states (placeholders, separators, inactive tab labels). It sits just under 4.5:1 (about 4.4:1 in dark mode, 3.8:1 in light), so never use it for content.
- **Don't** make a nested element as round as or rounder than its container.
- **Don't** set input text below 16px.
- **Don't** render the QR code in dark mode colors.
- **Don't** mix list styles: selectable lists are always bordered option cards, never rows with a checkmark.
