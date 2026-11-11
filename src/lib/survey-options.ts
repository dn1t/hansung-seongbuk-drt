export const SURVEY_FREQUENCIES = ["rare", "1", "2-3", "4+"] as const;
export const SURVEY_WAYS = ["taxi", "night-bus", "first-train", "walk", "stay", "leave-early", "other"] as const;
export const SURVEY_FARES = ["1000", "2000", "3000", "5000", "5000+"] as const;

export type SurveyFrequency = (typeof SURVEY_FREQUENCIES)[number];
export type SurveyWay = (typeof SURVEY_WAYS)[number];
export type SurveyFare = (typeof SURVEY_FARES)[number];

export const FREQUENCY_LABELS: Record<SurveyFrequency, string> = {
  rare: "거의 안 탈 것 같아요",
  "1": "주 1일쯤",
  "2-3": "주 2–3일",
  "4+": "주 4일 이상",
};

export const WAY_LABELS: Record<SurveyWay, string> = {
  taxi: "택시를 타요",
  "night-bus": "N버스를 타요",
  "first-train": "첫차를 기다려요",
  walk: "걸어가요",
  stay: "학교나 친구 집에서 자요",
  "leave-early": "막차에 맞춰 먼저 나가요",
  other: "그 밖의 방법",
};

export const FARE_LABELS: Record<SurveyFare, string> = {
  "1000": "1,000원까지",
  "2000": "2,000원까지",
  "3000": "3,000원까지",
  "5000": "5,000원까지",
  "5000+": "5,000원이 넘어도 타요",
};

export const RIDE_SHARE: Record<SurveyFrequency, number> = { rare: 0.1, "1": 0.2, "2-3": 0.5, "4+": 0.9 };

export const SURVEY_COMMENT_MAX = 300;

export interface SurveyAnswers {
  frequency: SurveyFrequency;
  slot: string;
  startId: string;
  way: SurveyWay;
  fare: SurveyFare;
  comment: string;
}
