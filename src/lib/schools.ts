export const SCHOOLS = {
  "korea.ac.kr": "고려대학교",
  "kookmin.ac.kr": "국민대학교",
  "skuniv.ac.kr": "서경대학교",
  "sungshin.ac.kr": "성신여자대학교",
  "hansung.ac.kr": "한성대학교",
} as const;

export const SCHOOL_START_IDS: Record<(typeof SCHOOLS)[keyof typeof SCHOOLS], string> = {
  고려대학교: "school-1",
  국민대학교: "school-2",
  서경대학교: "school-4",
  성신여자대학교: "school-5",
  한성대학교: "school-7",
};

export const SCHOOL_DOMAINS = Object.keys(SCHOOLS) as (keyof typeof SCHOOLS)[];

export function schoolOf(email: string): string | undefined {
  const domain = email.trim().toLowerCase().split("@").pop() ?? "";
  return SCHOOLS[domain as keyof typeof SCHOOLS];
}

export function isSchoolEmail(email: string) {
  return schoolOf(email) !== undefined;
}

export const VERIFICATION_CODE_TTL = 60 * 10;
