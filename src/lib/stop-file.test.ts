import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { decodeText, parseStopFile } from "./stop-file.ts";

describe("parseStopFile", () => {
  it("reads the Seoul open-data columns", () => {
    const text =
      'NODE_ID,ARS_ID,정류소명,X좌표,Y좌표,정류소타입\n100000001,01001,"종로2가사거리",126.987752,37.569808,일반차로\n';
    const result = parseStopFile(text);
    assert.ok(result.ok);
    assert.deepEqual(result.stops, [{ name: "종로2가사거리", code: "01001", lat: 37.569808, lng: 126.987752 }]);
  });

  it("reads tab-separated files and swapped coordinates", () => {
    const text = "STOP_NO\tSTOP_NM\tXCODE\tYCODE\n10123\t노원역\t37.6553\t127.0613\n";
    const result = parseStopFile(text);
    assert.ok(result.ok);
    assert.equal(result.stops[0].lat, 37.6553);
    assert.equal(result.stops[0].lng, 127.0613);
  });

  it("keeps commas inside quotes", () => {
    const result = parseStopFile('정류소명,X좌표,Y좌표\n"월곡역, 1번 출구",127.0415,37.6019\n');
    assert.ok(result.ok);
    assert.equal(result.stops[0].name, "월곡역, 1번 출구");
  });

  it("explains projected coordinates", () => {
    const result = parseStopFile("정류소명,X좌표,Y좌표\n노원역,205000.5,460000.2\n");
    assert.equal(result.ok, false);
    assert.match(result.ok ? "" : result.message, /WGS84/);
  });

  it("asks for the right columns", () => {
    const result = parseStopFile("이름,주소\n노원역,서울\n");
    assert.equal(result.ok, false);
  });

  it("decodes EUC-KR", () => {
    const bytes = new Uint8Array([0xb3, 0xeb, 0xbf, 0xf8]);
    assert.equal(decodeText(bytes.buffer), "노원");
  });
});
