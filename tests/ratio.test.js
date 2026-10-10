const { test } = require('node:test');
const assert = require('node:assert/strict');
const R = require('../ratio.js');
const near = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} != ${b}`);
const cents = text => R.ratioCents(R.parseRatio(text));
const form = text => R.formatRatio(R.parseRatio(text));
const throwsWith = (text, part) => assert.throws(() => R.parseRatio(text), e => e instanceof Error && e.message.includes(part), text);

// Examples from kazmus「音律の表現」(2024-04-27); expected cents computed independently in Python.
test('blog examples read to their normal forms and cents', () => {
  for (const [text, normal, c] of [
    ['5/4', '2^(−2)·5', 386.3137138648346],
    ['5^(1/4)', '5^(1/4)', 696.5784284662086],
    ['2^(13/6)*3^(-1)', '2^(13/6)·3^(−1)', 698.0449991346126],
    ['10^(7/8)/5', '2^(7/8)·5^(−1/8)', 701.7107857668957],
    ['2^(1/31)', '2^(1/31)', 38.70967741935484],
    ['3/2', '2^(−1)·3', 701.9550008653873],
    ['1', '1', 0],
  ]) { assert.equal(form(text), normal, text); near(cents(text), c); }
});
test('roots: √, sqrt and √[n]', () => {
  for (const text of ['√5/2', 'sqrt(5)/2', 'SQRT(5)/2', '√(5/4)*2/2']) { assert.equal(form(text), '2^(−1)·5^(1/2)', text); near(cents(text), 193.1568569324173); }
  assert.equal(form('√[4]5'), '5^(1/4)');
  assert.equal(form('√√5'), '5^(1/4)');
});
test('precedence: √ binds to the next factor, ^ to the previous one, * and / left to right', () => {
  assert.equal(form('2^13/6'), '2^12·3^(−1)');          // (2^13)/6
  assert.equal(form('√5^2'), '5');                       // (√5)^2
  assert.equal(form('3/2/2'), '2^(−2)·3');               // (3/2)/2
  assert.equal(form('(3/2)^3/2'), '2^(−4)·3^3');         // 27/16
  near(cents('(3/2)^3/2'), 905.8650025961618);
  assert.equal(form('3^-1*3'), '1');
  assert.equal(form('2^(+1)'), '2');
});
test('typing helpers: spaces, full-width characters, ·, ×, ÷ and −', () => {
  for (const text of ['3 / 2', '３／２', '3÷2', '3×2^-1', '3·2^(−1)', '3⋅2^(-1)']) assert.equal(form(text), '2^(−1)·3', text);
  assert.equal(form('５＾（１／４）'), '5^(1/4)');
  assert.equal(form('√５／２'), '2^(−1)·5^(1/2)');
});
test('normal forms read back to the same ratio', () => {
  for (const text of ['10^(7/8)/5', '2^(13/6)*3^(-1)', '√[4]5', '9*5^(5/4)/64', '2^(-13/3)*3^(5/3)*5^(5/6)', '1']) {
    const r = R.parseRatio(text);
    assert.ok(R.sameRatio(R.parseRatio(R.formatRatio(r)), r), text);
  }
  assert.ok(R.sameRatio(R.parseRatio('3/2'), R.parseRatio('3*2^(-1)')));
  assert.ok(!R.sameRatio(R.parseRatio('3/2'), R.parseRatio('4/3')));
});
test('superscript digits are rejected instead of read as plain digits (3² is not 32)', () => {
  for (const text of ['3²', '2³/4', '5^(1/4)·2⁰']) throwsWith(text, '上付き');
});
test('syntax errors explain what to do', () => {
  throwsWith('1.5', '小数');
  throwsWith('2√5', '省略');
  throwsWith('2(3)', '省略');
  throwsWith('2^3^2', '続けて');
  throwsWith('0', '0');
  throwsWith('3/0', '0');
  throwsWith('2^(1/0)', '0 で割る');
  throwsWith('-3/2', '負の数');
  throwsWith('√[1]5', '2 以上');
  throwsWith('√[0]5', '2 以上');
  throwsWith('(3/2', '「)」');
  throwsWith('3/', '途中');
  throwsWith('', '入力');
  throwsWith('   ', '入力');
});
test('limits: 200 characters, 50 nesting levels, integers up to 10^12', () => {
  assert.doesNotThrow(() => R.parseRatio('1*'.repeat(99) + '11'));          // 200 characters
  throwsWith('1*'.repeat(100) + '1', '200');                                 // 201
  assert.doesNotThrow(() => R.parseRatio('('.repeat(49) + '5' + ')'.repeat(49)));   // depth 50
  throwsWith('('.repeat(50) + '5' + ')'.repeat(50), '50');                 // depth 51
  assert.doesNotThrow(() => R.parseRatio('1000000000000'));
  throwsWith('1000000000001', '大きすぎる');
});
test('hostile input is rejected as an ordinary error and never evaluated', () => {
  for (const text of ['<script>alert(1)</script>', 'constructor', '__proto__', 'alert(1)', '1;2', 'this', '2**3', '${1}', '1e3']) {
    assert.throws(() => R.parseRatio(text), Error, text);
  }
});
test('huge exponents stay small: values are never multiplied out', () => {
  const t0 = Date.now();
  const r = R.parseRatio('(2^1000000)^1000000');
  assert.ok(Date.now() - t0 < 200);
  assert.equal(R.formatRatio(r), '2^1000000000000');
  assert.throws(() => R.checkOctave(r), /1 以上 2 未満/);
});
test('worst-case inputs within 200 characters finish quickly', () => {
  const nested = '((((((((2^(1/999999999989))^(1/999999999989))^(1/999999999989))^(1/999999999989))^(1/999999999989))^(1/999999999989))^(1/999999999989))^(1/999999999989))';
  const primes = Array(14).fill('999999999989').join('*');      // trial division up to 10^6 each
  for (const text of [nested, primes]) {
    assert.ok(text.length <= 200, String(text.length));
    const t0 = Date.now(); R.parseRatio(text); assert.ok(Date.now() - t0 < 200, text);
  }
});
test('octave range: 1 <= ratio < 2, checked exactly at 1 and 2', () => {
  near(R.checkOctave(R.parseRatio('1')), 0);
  assert.throws(() => R.checkOctave(R.parseRatio('2')), /1 以上 2 未満/);
  assert.throws(() => R.checkOctave(R.parseRatio('9/4')), /いま 2\.25/);
  assert.throws(() => R.checkOctave(R.parseRatio('2/3')), /オクターブを合わせる/);
  near(R.checkOctave(R.parseRatio('2^(1199/1200)')), 1199);
});
test('reduceOctave brings any ratio into one octave', () => {
  assert.equal(R.formatRatio(R.reduceOctave(R.parseRatio('9/4'))), '2^(−3)·3^2');      // 9/8
  near(R.ratioCents(R.reduceOctave(R.parseRatio('9/4'))), 203.91000173077458);
  assert.equal(R.formatRatio(R.reduceOctave(R.parseRatio('3^5'))), '2^(−7)·3^5');
  assert.equal(R.formatRatio(R.reduceOctave(R.parseRatio('2/3'))), '2^2·3^(−1)');       // 4/3
  assert.equal(R.formatRatio(R.reduceOctave(R.parseRatio('8'))), '1');
  assert.equal(R.formatRatio(R.reduceOctave(R.parseRatio('3/2'))), '2^(−1)·3');
});
test('cents convert exactly to powers of two', () => {
  assert.equal(R.formatRatio(R.centsToRatio('696.5')), '2^(1393/2400)');
  assert.equal(R.formatRatio(R.centsToRatio('386')), '2^(193/600)');
  assert.equal(R.formatRatio(R.centsToRatio('0')), '1');
  assert.equal(R.formatRatio(R.centsToRatio('1200')), '2');
  assert.equal(R.formatRatio(R.centsToRatio('5e-7')), '2^(1/2400000000)');
  // Long decimals are rounded to the most digits whose exponent still reads back (integers up to 10^12).
  assert.equal(R.formatRatio(R.centsToRatio('0.123456789')), '2^(41152263/400000000000)');      // 9 decimals fit
  assert.equal(R.formatRatio(R.centsToRatio('0.1234567891')), '2^(41152263/400000000000)');     // 10th dropped
  assert.equal(R.formatRatio(R.centsToRatio('0.1234567896')), '2^(51440329/500000000000)');      // 10 decimals still fit after reducing
  assert.equal(R.formatRatio(R.centsToRatio('0.1234567897')), '2^(12345679/120000000000)');      // rounds half up to 0.12345679
  for (const text of ['701.9550008653874', '94.13499740383777', '1199.999999999999']) {
    const r = R.centsToRatio(text);
    assert.doesNotThrow(() => R.parseRatio(R.formatRatio(r)), text);
    near(R.ratioCents(r), Number(text), 1e-8);
  }
  // Everything parseCents (Number()) accepts for a drawn figure must convert too.
  assert.equal(R.formatRatio(R.centsToRatio('.5')), '2^(1/2400)');
  assert.equal(R.formatRatio(R.centsToRatio('+100')), '2^(1/12)');
  assert.equal(R.formatRatio(R.centsToRatio('100.')), '2^(1/12)');
  assert.throws(() => R.centsToRatio('.'), Error);
  assert.throws(() => R.centsToRatio('abc'), Error);
  assert.throws(() => R.centsToRatio('-5'), Error);
});
