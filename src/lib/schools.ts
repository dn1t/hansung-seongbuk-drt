export const SCHOOLS = {
  "korea.ac.kr": "고려대학교",
  "kookmin.ac.kr": "국민대학교",
  "dongduk.ac.kr": "동덕여자대학교",
  "skuniv.ac.kr": "서경대학교",
  "sungshin.ac.kr": "성신여자대학교",
  "karts.ac.kr": "한국예술종합학교",
  "hansung.ac.kr": "한성대학교",
  "dongbang.ac.kr": "동방문화대학원대학교",
} as const;

export const SCHOOL_DOMAINS = Object.keys(SCHOOLS) as (keyof typeof SCHOOLS)[];

export function schoolOf(email: string): string | undefined {
  const domain = email.trim().toLowerCase().split("@").pop() ?? "";
  return SCHOOLS[domain as keyof typeof SCHOOLS];
}

export function isSchoolEmail(email: string) {
  return schoolOf(email) !== undefined;
}

export const VERIFICATION_CODE_TTL = 60 * 10;
