(function (host) {
  'use strict';
  // Text metadata for PNG files: iTXt chunks (UTF-8, uncompressed) inserted right after IHDR.
  const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
  const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  function crc32(bytes) {
    let c = 0xffffffff;
    for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  // A keyword is 1-79 printable Latin-1 characters without leading or trailing spaces (PNG spec 11.3.4).
  function checkKeyword(keyword) {
    const ok = keyword.length >= 1 && keyword.length <= 79 && keyword.trim() === keyword
      && [...keyword].every(ch => { const c = ch.charCodeAt(0); return (c >= 32 && c <= 126) || (c >= 161 && c <= 255); });
    if (!ok) throw new Error(`PNG のキーワード（keyword）が不正です：${JSON.stringify(keyword)}`);
  }
  function chunk(type, data) {
    const out = new Uint8Array(12 + data.length), view = new DataView(out.buffer);
    view.setUint32(0, data.length);
    for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
    out.set(data, 8);
    view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
    return out;
  }
  function iTXt(keyword, text) {
    checkKeyword(keyword);
    const key = Uint8Array.from(keyword, ch => ch.charCodeAt(0)), body = new TextEncoder().encode(text);
    // keyword NUL, compression flag 0, method 0, empty language tag NUL, empty translated keyword NUL, text
    const data = new Uint8Array(key.length + 5 + body.length);
    data.set(key, 0); data.set(body, key.length + 5);
    return chunk('iTXt', data);
  }
  // `entries` is a list of [keyword, text]; returns a new Uint8Array.
  function addPngText(bytes, entries) {
    const isPng = bytes.length >= 33 && SIGNATURE.every((b, i) => bytes[i] === b)
      && String.fromCharCode(...bytes.subarray(12, 16)) === 'IHDR';
    if (!isPng) throw new Error('PNG ではありません。');
    const ihdrEnd = 8 + 12 + new DataView(bytes.buffer, bytes.byteOffset).getUint32(8);
    const added = entries.map(([k, t]) => iTXt(k, t));
    const out = new Uint8Array(bytes.length + added.reduce((n, c) => n + c.length, 0));
    out.set(bytes.subarray(0, ihdrEnd), 0);
    let p = ihdrEnd;
    for (const c of added) { out.set(c, p); p += c.length; }
    out.set(bytes.subarray(ihdrEnd), p);
    return out;
  }
  const api = { crc32, addPngText };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else host.Png = api;
})(globalThis);
