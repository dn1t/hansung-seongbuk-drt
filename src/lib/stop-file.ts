import { isOldExcel, isZip, readFirstSheet } from "./xlsx.ts";

export interface ParsedStop {
  name: string;
  code: string;
  lat: number;
  lng: number;
}

export type ParseResult = { ok: true; stops: ParsedStop[]; ignored: number } | { ok: false; message: string };

const NAME = /정류소명|정류장명|정류소 명|STOP_NM|STTN_NM|STOP_NAME|BSST_NM/i;
const CODE = /ARS|정류소번호|정류소 번호|STOP_NO|STTN_NO|BSST_ARS/i;
const TYPE = /정류소타입|정류소 타입|정류장타입|STOP_TYPE|STTN_TY|BSST_TY/i;
const UNUSABLE_TYPE = /선착장|중앙차로/;
const X = /X좌표|XCODE|X_COORD|CRDNT_X|경도|LNG|LON|LONGITUDE|^X$/i;
const Y = /Y좌표|YCODE|Y_COORD|CRDNT_Y|위도|LAT|LATITUDE|^Y$/i;

export function decodeText(bytes: ArrayBuffer) {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^﻿/, "");
  } catch {
    return new TextDecoder("euc-kr").decode(bytes);
  }
}

export function parseRows(text: string) {
  const firstLine = text.slice(0, text.indexOf("\n") === -1 ? undefined : text.indexOf("\n"));
  const delimiter = (firstLine.match(/\t/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

const isLat = (value: number) => value > 33 && value < 39;
const isLng = (value: number) => value > 124 && value < 132;

const HEADER_SEARCH_ROWS = 10;

function findColumns(row: string[]) {
  const header = row.map((cell) => String(cell ?? "").trim());
  const column = (pattern: RegExp) => header.findIndex((cell) => pattern.test(cell));
  return { name: column(NAME), code: column(CODE), x: column(X), y: column(Y), type: column(TYPE) };
}

export function parseStopFile(text: string): ParseResult {
  return parseStopRows(parseRows(text));
}

export async function readStopFile(buffer: ArrayBuffer): Promise<ParseResult> {
  const bytes = new Uint8Array(buffer);
  if (isOldExcel(bytes)) {
    return { ok: false, message: "예전 엑셀 파일(.xls)은 읽지 못해요. 엑셀에서 xlsx나 CSV로 저장해서 올려 주세요." };
  }
  if (isZip(bytes)) {
    try {
      return parseStopRows(await readFirstSheet(buffer));
    } catch {
      return { ok: false, message: "엑셀 파일을 읽지 못했어요. 엑셀에서 다시 저장하거나 CSV로 올려 주세요." };
    }
  }
  return parseStopFile(decodeText(buffer));
}

export function parseStopRows(rows: string[][]): ParseResult {
  const headerAt = rows.slice(0, HEADER_SEARCH_ROWS).findIndex((row) => {
    const found = findColumns(row);
    return found.name !== -1 && found.x !== -1 && found.y !== -1;
  });
  if (headerAt === -1) {
    if (rows.length < 2) return { ok: false, message: "파일에 정류장이 없어요." };
    return {
      ok: false,
      message: "정류소명, X좌표, Y좌표 열을 찾지 못했어요. 열 이름이 있는 줄이 들어 있는 파일인지 확인해 주세요.",
    };
  }
  const { name, code, x, y, type } = findColumns(rows[headerAt]);
  if (rows.length < headerAt + 2) return { ok: false, message: "파일에 정류장이 없어요." };

  const stops: ParsedStop[] = [];
  let ignored = 0;
  let projected = 0;
  for (const cells of rows.slice(headerAt + 1)) {
    let lng = Number(cells[x]);
    let lat = Number(cells[y]);
    if (isLat(lng) && isLng(lat)) [lat, lng] = [lng, lat];
    const stopName = cells[name]?.trim() ?? "";
    if (!stopName || !isLat(lat) || !isLng(lng)) {
      if (Number.isFinite(lng) && Math.abs(lng) > 1000) projected++;
      ignored++;
      continue;
    }
    if (type !== -1 && UNUSABLE_TYPE.test(cells[type] ?? "")) {
      ignored++;
      continue;
    }
    stops.push({ name: stopName, code: code === -1 ? "" : (cells[code]?.trim() ?? ""), lat, lng });
  }
  if (stops.length === 0) {
    return {
      ok: false,
      message:
        projected > 0
          ? "좌표가 위도·경도가 아니에요. 위도·경도(WGS84)로 된 파일을 올려 주세요."
          : "읽을 수 있는 정류장이 없어요.",
    };
  }
  return { ok: true, stops, ignored };
}
