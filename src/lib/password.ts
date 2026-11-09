export const PASSWORD_RULES = [
  { label: "8자 이상", test: (password: string) => password.length >= 8 },
  { label: "숫자 포함", test: (password: string) => /\d/.test(password) },
] as const;

export const PASSWORD_MAX_LENGTH = 128;

export function isValidPassword(password: string) {
  return password.length <= PASSWORD_MAX_LENGTH && PASSWORD_RULES.every((rule) => rule.test(password));
}
