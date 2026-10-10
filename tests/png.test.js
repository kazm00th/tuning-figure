const test = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('node:zlib');
const { crc32, addPngText } = require('../png.js');

// A minimal valid PNG (1×1, RGB) built here with Node's zlib, independent of png.js.
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0); out.write(type, 4, 'latin1'); data.copy(out, 8);
  out.writeUInt32BE(zlib.crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}
const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.from([0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]);
const tiny = Buffer.concat([SIGNATURE, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(Buffer.from([0, 255, 0, 0]))), chunk('IEND', Buffer.alloc(0))]);

// Split a PNG into chunks, checking every length and CRC with Node's zlib.
function chunks(bytes) {
  const b = Buffer.from(bytes);
  assert.deepEqual(b.subarray(0, 8), SIGNATURE);
  const list = [];
  for (let p = 8; p < b.length;) {
    const len = b.readUInt32BE(p), type = b.toString('latin1', p + 4, p + 8), data = b.subarray(p + 8, p + 8 + len);
    assert.equal(b.readUInt32BE(p + 8 + len), zlib.crc32(b.subarray(p + 4, p + 8 + len)), `CRC of ${type}`);
    list.push({ type, data }); p += 12 + len;
  }
  return list;
}
// iTXt: keyword NUL, compression flag 0, method 0, language tag NUL, translated keyword NUL, UTF-8 text.
function readITXt(data) {
  const parts = [], b = Buffer.from(data);
  let p = 0;
  const z = () => { const e = b.indexOf(0, p); const s = b.toString('utf8', p, e); p = e + 1; return s; };
  const keyword = z(); const flag = b[p++], method = b[p++]; const lang = z(), translated = z();
  parts.push(keyword, flag, method, lang, translated, b.toString('utf8', p));
  return parts;
}

test('crc32 matches zlib on known inputs', () => {
  for (const s of ['', 'IEND', '123456789', 'tuning-figure 平均律']) {
    const bytes = new TextEncoder().encode(s);
    assert.equal(crc32(bytes), zlib.crc32(Buffer.from(bytes)), s);
  }
  assert.equal(crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
});

test('addPngText inserts UTF-8 iTXt chunks right after IHDR and keeps the rest byte for byte', () => {
  const out = addPngText(new Uint8Array(tiny), [['Title', 'Kirnberger I · 平均律'], ['tuning-figure', '{"pitches":[0,100]}']]);
  const list = chunks(out);
  assert.deepEqual(list.map(c => c.type), ['IHDR', 'iTXt', 'iTXt', 'IDAT', 'IEND']);
  assert.deepEqual(readITXt(list[1].data), ['Title', 0, 0, '', '', 'Kirnberger I · 平均律']);
  assert.deepEqual(readITXt(list[2].data), ['tuning-figure', 0, 0, '', '', '{"pitches":[0,100]}']);
  const original = chunks(tiny);
  for (const t of ['IHDR', 'IDAT', 'IEND']) assert.deepEqual(list.find(c => c.type === t).data, original.find(c => c.type === t).data);
  assert.ok(out instanceof Uint8Array);
});

test('addPngText rejects data that is not a PNG and invalid keywords', () => {
  assert.throws(() => addPngText(new Uint8Array([1, 2, 3]), [['Title', 'x']]), /PNG/);
  const bad = Buffer.from(tiny); bad[12] = 0x58;   // IHDR is no longer the first chunk
  assert.throws(() => addPngText(new Uint8Array(bad), [['Title', 'x']]), /PNG/);
  for (const k of ['', 'x'.repeat(80), ' Title', 'Title ', 'a' + String.fromCharCode(0) + 'b', '平均律']) assert.throws(() => addPngText(new Uint8Array(tiny), [[k, 'x']]), /keyword|キーワード/, JSON.stringify(k));
});
