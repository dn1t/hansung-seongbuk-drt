import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { readStopFile } from "./stop-file.ts";
import { readFirstSheet } from "./xlsx.ts";

async function deflate(data: Uint8Array) {
  const stream = new Blob([data.slice()]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function makeZip(files: Record<string, string>, compress = true) {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = [];
  const centrals: Uint8Array[] = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const nameBytes = encoder.encode(name);
    const raw = encoder.encode(content);
    const data = compress ? await deflate(raw) : raw;
    const local = new Uint8Array(30 + nameBytes.length + data.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(8, compress ? 8 : 0, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, raw.length, true);
    lv.setUint16(26, nameBytes.length, true);
    local.set(nameBytes, 30);
    local.set(data, 30 + nameBytes.length);
    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(10, compress ? 8 : 0, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, raw.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }
  const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, centrals.length, true);
  ev.setUint16(10, centrals.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  const out = new Uint8Array(offset + centralSize + 22);
  let at = 0;
  for (const part of [...locals, ...centrals, end]) {
    out.set(part, at);
    at += part.length;
  }
  return out.buffer;
}

const WORKBOOK = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="정류소" sheetId="1" r:id="rId3"/></sheets></workbook>`;
const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Target="worksheets/sheet7.xml" Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"/></Relationships>`;
const SHARED = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="7" uniqueCount="7"><si><t>NODE_ID</t></si><si><t>ARS_ID</t></si><si><t>정류소명</t></si><si><t>X좌표</t></si><si><t>Y좌표</t></si><si><r><rPr><b/></rPr><t>종로2가</t></r><r><t xml:space="preserve">사거리</t></r></si><si><t>월곡역 &amp; 1번 출구</t></si></sst>`;
const SHEET = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:x14ac="http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac"><dimension ref="A1:E4"/><sheetViews><sheetView workbookViewId="0"/></sheetViews><cols><col min="1" max="5" width="12"/></cols><sheetData>
<row r="1" spans="1:5" x14ac:dyDescent="0.3"><c r="A1" s="1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c><c r="D1" t="s"><v>3</v></c><c r="E1" t="s"><v>4</v></c></row>
<row r="2" spans="1:5"><c r="A2"><v>100000001</v></c><c r="B2" t="str"><v>01001</v></c><c r="C2" t="s"><v>5</v></c><c r="D2"><v>126.987752</v></c><c r="E2"><v>37.569808</v></c></row>
<row r="3" spans="1:5"><c r="A3"><v>100000002</v></c><c r="C3" t="s"><v>6</v></c><c r="D3"><v>127.0415</v></c><c r="E3"><v>37.6019</v></c></row>
<row r="4" spans="1:5"><c r="A4"><v>100000003</v></c><c r="B4"/><c r="C4" t="inlineStr"><is><t>노원역</t></is></c><c r="D4"><v>127.0613</v></c><c r="E4"><v>37.6553</v></c></row>
</sheetData></worksheet>`;

const BOOK = {
  "[Content_Types].xml": "<Types/>",
  "xl/workbook.xml": WORKBOOK,
  "xl/_rels/workbook.xml.rels": RELS,
  "xl/sharedStrings.xml": SHARED,
  "xl/worksheets/sheet1.xml":
    '<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>다른 시트</t></is></c></row></sheetData></worksheet>',
  "xl/worksheets/sheet7.xml": SHEET,
};

describe("readFirstSheet", () => {
  it("reads the first sheet with shared, rich, inline and numeric cells", async () => {
    const rows = await readFirstSheet(await makeZip(BOOK));
    assert.deepEqual(rows, [
      ["NODE_ID", "ARS_ID", "정류소명", "X좌표", "Y좌표"],
      ["100000001", "01001", "종로2가사거리", "126.987752", "37.569808"],
      ["100000002", "", "월곡역 & 1번 출구", "127.0415", "37.6019"],
      ["100000003", "", "노원역", "127.0613", "37.6553"],
    ]);
  });

  it("reads stored entries", async () => {
    const rows = await readFirstSheet(await makeZip(BOOK, false));
    assert.equal(rows[1][2], "종로2가사거리");
  });
});

describe("readStopFile", () => {
  it("reads stops from an xlsx file", async () => {
    const result = await readStopFile(await makeZip(BOOK));
    assert.ok(result.ok);
    assert.equal(result.stops.length, 3);
    assert.deepEqual(result.stops[0], { name: "종로2가사거리", code: "01001", lat: 37.569808, lng: 126.987752 });
  });

  it("finds the header below a title row", async () => {
    const sheet = SHEET.replace(
      '<row r="1"',
      '<row r="1"><c r="A1" t="inlineStr"><is><t>서울시 버스정류소 위치정보</t></is></c></row><row r="1b"',
    );
    const result = await readStopFile(await makeZip({ ...BOOK, "xl/worksheets/sheet7.xml": sheet }));
    assert.ok(result.ok);
    assert.equal(result.stops.length, 3);
  });

  it("leaves out median-lane stops and river ferry docks", async () => {
    const csv = new TextEncoder().encode(
      "정류소명,X좌표,Y좌표,정류소타입\n종로2가사거리,126.98775,37.56980,중앙차로\n한강버스.잠실선착장,127.08477,37.51894,한강선착장\n경기상고,126.96936,37.58755,일반차로\n평창파출소,126.96681,37.60568,마을버스\n",
    );
    const result = await readStopFile(csv.buffer);
    assert.ok(result.ok);
    assert.deepEqual(
      result.stops.map((stop) => stop.name),
      ["경기상고", "평창파출소"],
    );
    assert.equal(result.ignored, 2);
  });

  it("still reads CSV", async () => {
    const csv = new TextEncoder().encode("정류소명,X좌표,Y좌표\n노원역,127.0613,37.6553\n");
    const result = await readStopFile(csv.buffer);
    assert.ok(result.ok);
    assert.equal(result.stops[0].name, "노원역");
  });

  it("explains old .xls files", async () => {
    const result = await readStopFile(new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0, 0, 0, 0]).buffer);
    assert.equal(result.ok, false);
    assert.match(result.ok ? "" : result.message, /xls/);
  });

  it("explains a broken xlsx", async () => {
    const result = await readStopFile(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3]).buffer);
    assert.equal(result.ok, false);
    assert.match(result.ok ? "" : result.message, /엑셀/);
  });
});
