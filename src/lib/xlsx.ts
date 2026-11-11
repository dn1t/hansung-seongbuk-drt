interface ZipEntry {
  method: number;
  compressedSize: number;
  localOffset: number;
}

const EOCD = 0x06054b50;
const CENTRAL = 0x02014b50;
const LOCAL = 0x04034b50;

export function isZip(bytes: Uint8Array) {
  return bytes.length > 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

export function isOldExcel(bytes: Uint8Array) {
  return bytes.length > 4 && bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;
}

function zipEntries(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 0xffff); i--) {
    if (view.getUint32(i, true) === EOCD) {
      end = i;
      break;
    }
  }
  if (end === -1) throw new Error("zip");
  const count = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true);
  const names = new TextDecoder();
  const entries = new Map<string, ZipEntry>();
  for (let i = 0; i < count; i++) {
    if (view.getUint32(offset, true) !== CENTRAL) throw new Error("zip");
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const name = names.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    entries.set(name, {
      method: view.getUint16(offset + 10, true),
      compressedSize: view.getUint32(offset + 20, true),
      localOffset: view.getUint32(offset + 42, true),
    });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return { view, entries };
}

async function inflate(data: Uint8Array) {
  const stream = new Blob([data.slice()]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readEntry(bytes: Uint8Array, view: DataView, entry: ZipEntry) {
  if (view.getUint32(entry.localOffset, true) !== LOCAL) throw new Error("zip");
  const start =
    entry.localOffset +
    30 +
    view.getUint16(entry.localOffset + 26, true) +
    view.getUint16(entry.localOffset + 28, true);
  const data = bytes.subarray(start, start + entry.compressedSize);
  if (entry.method === 0) return data;
  if (entry.method === 8) return inflate(data);
  throw new Error("zip");
}

function decodeXml(text: string) {
  return text
    .replace(/_x([0-9A-Fa-f]{4})_/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&(#x[0-9A-Fa-f]+|#\d+|amp|lt|gt|quot|apos);/g, (_, code: string) => {
      if (code[0] === "#") {
        return String.fromCodePoint(code[1] === "x" ? parseInt(code.slice(2), 16) : Number(code.slice(1)));
      }
      return { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" }[code] ?? "";
    });
}

function attributes(tag: string) {
  const found: Record<string, string> = {};
  for (const match of tag.matchAll(/([\w:]+)="([^"]*)"/g)) found[match[1]] = decodeXml(match[2]);
  return found;
}

function textRuns(xml: string) {
  let text = "";
  for (const match of xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, "").matchAll(/<t\b[^>]*?(?:\/>|>([\s\S]*?)<\/t>)/g)) {
    text += decodeXml(match[1] ?? "");
  }
  return text;
}

function columnIndex(ref: string | undefined) {
  const letters = ref?.match(/^[A-Z]+/)?.[0];
  if (!letters) return -1;
  let index = 0;
  for (const letter of letters) index = index * 26 + letter.charCodeAt(0) - 64;
  return index - 1;
}

function firstSheetPath(workbook: string | undefined, rels: string | undefined) {
  const sheet = workbook?.match(/<sheet\b[^>]*>/)?.[0];
  const id = sheet && attributes(sheet)["r:id"];
  if (!id || !rels) return undefined;
  for (const match of rels.matchAll(/<Relationship\b[^>]*>/g)) {
    const rel = attributes(match[0]);
    if (rel.Id !== id || !rel.Target) continue;
    return rel.Target.startsWith("/") ? rel.Target.slice(1) : `xl/${rel.Target.replace(/^\.\//, "")}`;
  }
  return undefined;
}

export async function readFirstSheet(buffer: ArrayBuffer): Promise<string[][]> {
  const bytes = new Uint8Array(buffer);
  const { view, entries } = zipEntries(bytes);
  const text = new TextDecoder();
  const read = async (name: string) => {
    const entry = entries.get(name);
    return entry ? text.decode(await readEntry(bytes, view, entry)) : undefined;
  };

  const [workbook, rels, shared] = await Promise.all([
    read("xl/workbook.xml"),
    read("xl/_rels/workbook.xml.rels"),
    read("xl/sharedStrings.xml"),
  ]);
  const fallback = [...entries.keys()]
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/\d+/)?.[0]) - Number(b.match(/\d+/)?.[0]))[0];
  const path = firstSheetPath(workbook, rels);
  const sheet = await read(path && entries.has(path) ? path : (fallback ?? ""));
  if (sheet === undefined) throw new Error("sheet");

  const strings = shared ? [...shared.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((match) => textRuns(match[1])) : [];

  const rows: string[][] = [];
  for (const rowMatch of sheet.matchAll(/<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const row: string[] = [];
    for (const cellMatch of (rowMatch[1] ?? "").matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = attributes(cellMatch[1]);
      const body = cellMatch[2] ?? "";
      const raw = body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/)?.[1];
      let value = "";
      if (attrs.t === "s") value = strings[Number(raw)] ?? "";
      else if (attrs.t === "inlineStr") value = textRuns(body);
      else if (raw !== undefined) value = decodeXml(raw);
      const at = columnIndex(attrs.r);
      if (at >= 0) row[at] = value;
      else row.push(value);
    }
    rows.push(Array.from(row, (value) => value ?? ""));
  }
  return rows.filter((row) => row.some((value) => value.trim()));
}
