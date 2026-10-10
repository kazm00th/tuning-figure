// Frequency ratios written as one-line expressions (kazmus「音律の表現」: ∏ p_k^(n_k/m_k)).
// A ratio is a Map from prime (number) to a reduced BigInt fraction {n, d}; the value itself is never
// multiplied out, so huge powers stay small and nothing is ever evaluated as code.
(function (host) {
  'use strict';
  const MAX_LENGTH = 200, MAX_DEPTH = 50, MAX_INTEGER = 1e12;
  const fail = message => new Error(message);

  // ---- exact fractions (BigInt, reduced, positive denominator)
  const babs = x => (x < 0n ? -x : x);
  function gcd(a, b) { a = babs(a); b = babs(b); while (b) [a, b] = [b, a % b]; return a; }
  function frac(n, d = 1n) {
    if (d === 0n) throw fail('0 で割る数は使えません。');
    if (d < 0n) { n = -n; d = -d; }
    const g = gcd(n, d);
    return g > 1n ? { n: n / g, d: d / g } : { n, d };
  }
  const fadd = (a, b) => frac(a.n * b.d + b.n * a.d, a.d * b.d);
  const fmul = (a, b) => frac(a.n * b.n, a.d * b.d);
  const fneg = a => ({ n: -a.n, d: a.d });

  // ---- ratios as prime-exponent tables
  function combine(a, b, sign) {
    const out = new Map(a);
    for (const [p, e] of b) {
      const s = fadd(out.get(p) || { n: 0n, d: 1n }, sign < 0 ? fneg(e) : e);
      if (s.n === 0n) out.delete(p); else out.set(p, s);
    }
    return out;
  }
  const multiply = (a, b) => combine(a, b, 1), divide = (a, b) => combine(a, b, -1);
  function power(a, q) {
    const out = new Map();
    if (q.n === 0n) return out;
    for (const [p, e] of a) out.set(p, fmul(e, q));
    return out;
  }
  // Trial division; n <= 10^12 is exact in a double and needs at most 10^6 steps.
  function factorize(n) {
    const out = new Map();
    for (let p = 2; p * p <= n; p += p === 2 ? 1 : 2) {
      let k = 0n;
      while (n % p === 0) { n /= p; k++; }
      if (k) out.set(p, frac(k));
    }
    if (n > 1) out.set(n, frac(1n));
    return out;
  }
  function ratioCents(r) {
    let c = 0;
    for (const [p, e] of r) c += Number(e.n) / Number(e.d) * Math.log2(p);
    return 1200 * c;
  }
  function formatRatio(r) {
    const parts = [...r.keys()].sort((a, b) => a - b).map(p => {
      const { n, d } = r.get(p), sign = n < 0n ? '−' : '', m = babs(n);
      if (d === 1n) return n === 1n ? `${p}` : n > 0n ? `${p}^${n}` : `${p}^(${sign}${m})`;
      return `${p}^(${sign}${m}/${d})`;
    });
    return parts.length ? parts.join('·') : '1';
  }
  function sameRatio(a, b) {
    if (a.size !== b.size) return false;
    for (const [p, e] of a) { const f = b.get(p); if (!f || f.n !== e.n || f.d !== e.d) return false; }
    return true;
  }
  // A power of two is compared exactly; anything else by its cents.
  function powerOfTwo(r) {
    const two = r.get(2);
    return r.size === (two ? 1 : 0) ? (two || { n: 0n, d: 1n }) : null;
  }
  function checkOctave(r) {
    const q = powerOfTwo(r);
    if (q) {
      if (q.n >= 0n && q.n < q.d) return ratioCents(r);
    } else {
      const c = ratioCents(r);
      if (Number.isFinite(c) && c >= 0 && c < 1200) return c;
    }
    const c = ratioCents(r), v = 2 ** (c / 1200);
    const now = Number.isFinite(v) && v > 1e-6 && v < 1e6 ? String(Number(v.toPrecision(4))) : (c > 0 ? 'とても大きい値' : 'とても小さい値');
    throw fail(`C からの比は 1 以上 2 未満にしてください（いま ${now}）。「オクターブを合わせる」で直せます。`);
  }
  function reduceOctave(r) {
    const q = powerOfTwo(r);
    if (q && q.d === 1n) return new Map();
    const k = Math.floor(ratioCents(r) / 1200);
    if (!Number.isFinite(k)) throw fail('値が大きすぎて、オクターブを合わせられません。');
    return k ? multiply(r, new Map([[2, frac(BigInt(-k))]])) : r;
  }
  // "696.5" → 2^(1393/2400): the decimal text is read as an exact fraction of a cent.
  function centsToRatio(text) {
    // Accepts what Number() accepts for a non-negative cent value: "+100", ".5", "100.", "5e-7".
    const m = /^\+?(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(String(text).trim());
    if (!m || !(m[1] || m[2])) throw fail('cent の値として読めません。');
    const fraction = m[2] || '', e = Number(m[3] || 0);
    if (Math.abs(e) > 400) throw fail('cent の値として読めません。');
    let n = BigInt((m[1] || '0') + fraction), places = fraction.length - e;
    if (places < 0) { n *= 10n ** BigInt(-places); places = 0; }
    // Round to the most decimal places whose exponent c/1200 still has numerator and denominator within
    // MAX_INTEGER, so the converted field reads back (long doubles like 94.13499740383777 keep 8-9 places).
    const limit = BigInt(MAX_INTEGER), d = 10n ** BigInt(places);
    for (let k = places; k >= 0; k--) {
      const scale = 10n ** BigInt(k), rounded = (2n * n * scale + d) / (2n * d);   // half up
      const q = frac(rounded, scale * 1200n);
      if (q.n <= limit && q.d <= limit) return q.n === 0n ? new Map() : new Map([[2, q]]);
    }
    throw fail('cent の値が大きすぎます。');
  }

  // ---- parser: hand-written recursive descent over a whitelist of tokens
  function normalize(text) {
    const raw = String(text);
    if (raw.length > MAX_LENGTH * 4) throw fail(`式が長すぎます（${MAX_LENGTH} 文字まで）。`);
    // NFKC would turn 3² into 32; superscripts mean powers, so ask for ^ instead of reading another value.
    if (/[⁰¹²³⁴⁵⁶⁷⁸⁹]/.test(raw)) throw fail('上付きの数字は使えません。^ で書いてください（例：3^2）。');
    const s = raw.normalize('NFKC').replace(/[·⋅×]/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/\s+/g, '').toLowerCase();
    if (s.length > MAX_LENGTH) throw fail(`式が長すぎます（${MAX_LENGTH} 文字まで）。`);
    return s;
  }
  function tokenize(s) {
    const tokens = [];
    for (let i = 0; i < s.length;) {
      const c = s[i];
      if (c >= '0' && c <= '9') {
        let j = i;
        while (j < s.length && s[j] >= '0' && s[j] <= '9') j++;
        tokens.push({ t: 'num', v: s.slice(i, j), at: i }); i = j;
      } else if (s.startsWith('sqrt', i)) { tokens.push({ t: 'sqrt', at: i }); i += 4; }
      else if ('*/^()[]√+-'.includes(c)) { tokens.push({ t: c, at: i }); i++; }
      else if (c === '.' || c === ',') throw fail('小数は使えません。分数で書いてください（例：3/2）。');
      else throw fail(`${i + 1} 文字目の「${c}」は使えません。`);
    }
    return tokens;
  }
  function parseRatio(text) {
    const s = normalize(text);
    if (s === '') throw fail('式を入力してください。');
    const tk = tokenize(s);
    let i = 0, depth = 0;
    const peek = () => (tk[i] ? tk[i].t : 'end');
    const where = () => (tk[i] ? `${tk[i].at + 1} 文字目` : '式の終わり');
    const expect = t => { if (peek() !== t) throw fail(`${where()}に「${t}」が必要です。`); i++; };
    const STARTS = ['num', '(', '√', 'sqrt'];
    function integer() {
      if (peek() !== 'num') throw fail(peek() === 'end' ? '式が途中で終わっています。' : `${where()}に数が必要です。`);
      const v = tk[i++].v;
      if (v.length > 13 || Number(v) > MAX_INTEGER) throw fail('大きすぎる整数は使えません（10^12 まで）。べきで書いてください（例：3^12）。');
      return Number(v);
    }
    function signedInt() {
      let sign = 1n;
      if (peek() === '+' || peek() === '-') { if (peek() === '-') sign = -1n; i++; }
      return sign * BigInt(integer());
    }
    function exponent() {
      if (peek() !== '(') return frac(signedInt());
      i++;
      const n = signedInt();
      let d = 1n;
      if (peek() === '/') { i++; d = BigInt(integer()); if (d === 0n) throw fail('0 で割る数は使えません。'); }
      expect(')');
      return frac(n, d);
    }
    function factor() {
      if (++depth > MAX_DEPTH) throw fail(`入れ子が深すぎます（${MAX_DEPTH} 段まで）。`);
      let v;
      const t = peek();
      if (t === 'num') { const n = integer(); if (n === 0) throw fail('0 は使えません。'); v = factorize(n); }
      else if (t === '(') { i++; v = expr(); expect(')'); }
      else if (t === '√') {
        i++;
        let k = 2;
        if (peek() === '[') { i++; k = integer(); expect(']'); if (k < 2) throw fail('根の次数は 2 以上にしてください。'); }
        v = power(factor(), frac(1n, BigInt(k)));
      } else if (t === 'sqrt') { i++; expect('('); v = power(expr(), frac(1n, 2n)); expect(')'); }
      else if (t === '-') throw fail('負の数は使えません（指数の負は使えます）。');
      else if (t === 'end') throw fail('式が途中で終わっています。');
      else throw fail(`${where()}の「${t}」が読めません。`);
      depth--;
      return v;
    }
    function term() {
      const f = factor();
      if (peek() !== '^') return f;
      i++;
      const v = power(f, exponent());
      if (peek() === '^') throw fail('べきは続けて書けません。括弧でまとめてください（例：(2^3)^2）。');
      return v;
    }
    function expr() {
      let v = term();
      for (;;) {
        const t = peek();
        if (t === '*' || t === '/') { i++; const r = term(); v = t === '*' ? multiply(v, r) : divide(v, r); }
        else if (STARTS.includes(t)) throw fail('掛け算の * を省略できません（例：2*√5）。');
        else return v;
      }
    }
    const v = expr();
    if (i < tk.length) throw fail(`${where()}の「${tk[i].t}」が読めません。`);
    return v;
  }

  const api = { MAX_LENGTH, MAX_DEPTH, MAX_INTEGER, parseRatio, ratioCents, formatRatio, sameRatio, centsToRatio, reduceOctave, checkOctave };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else host.Ratio = api;
})(globalThis);
