const OUTSIDE_SEOUL =
  /^(경기|인천|강원|충북|충남|충청|전북|전남|전라|경북|경남|경상|제주|세종|대전|대구|부산|광주|울산)/;

export function isOutsideSeoul(address: string | null | undefined) {
  return OUTSIDE_SEOUL.test(address?.trim() ?? "");
}
