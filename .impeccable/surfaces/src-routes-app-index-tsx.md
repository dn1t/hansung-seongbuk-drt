---
version: 1
slug: "src-routes-app-index-tsx"
primary_target: "src/routes/(app)/index.tsx"
related_targets: ["src/routes/(app)/today"]
---

# 오늘 귀가 (home tab + day-of request)

Mode: Operate. A verified student, past midnight, outside, one hand on the phone. They need to know in one glance: is there a bus for me, which one, when, where do I get off.

Scope: the home tab in five states (no ride tonight, booked but no bus chosen, bus chosen and waiting, riding, arrived) and the optional day-of flow 출발지 → 시간대 → 버스 고르기 (→ 노선 상세) → 하차 정류장. Runs on a typed sample dataset shaped like the future route output, always labeled 예시 데이터. Change of bus allowed until boarding. Small Kakao map only for the walk to the boarding stop.

Unresolved (show neutral placeholders, never invent): day-of deadline, whether unbooked students may request, drop-off for QR-only riders, over-capacity, no-shows, the final starting-point list.

## Direction contract

THESIS: The tab is one bus ticket, not a dashboard. One card answers which bus, how long, where on and off. It refuses the dashboard of tiles, the map-first home, and the fixed timetable.

OWN-WORLD: The 노선표 world from DESIGN.md: sand ground, one amber light (the route chip on the card, the pinned button when there is a choice to make), wordmark plate, hairline rules, bold tabular numerals, route dots and the Route Timeline. No new tokens.

STORY: The student learns tonight's route was built from bookings, that only the departure time moves, and that the bus stops near home. Time is always walk, wait, ride, walk.

FIRST VIEWPORT: Title 오늘 귀가, then the ticket card: route chip and departure clock, the countdown as the largest thing on screen in amber text, the boarding stop, a four-cell time row on hairlines, board → alight stops.

SIGNATURE: The countdown that ticks on a tabular numeral without layout shift, and the Route Timeline with the rider's own segment lit.

RISK: Sample data could read as real operations; the 예시 데이터 chip must stay visible on every data surface.

seed: none (skipped: the user settled structure and layout in the shape round, so no concept roll ran)
