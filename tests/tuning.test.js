const { test } = require('node:test');
const assert = require('node:assert/strict');
const { buildModel, ellipseGeometry, parseCents, labelFitScale, rootLabel, thirdLabel, PRESETS } = require('../tuning.js');
const equal = Array.from({ length: 12 }, (_, i) => i * 100);
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);

// Transcribed from the reference figures, in D A E B F# C# Ab Eb Bb F C G order.
for (const fixture of [
  {key:'verywell2', fifths:[698,698,700,700,702,702,702,702,700,700,698,698], thirds:[396,400,404,406,408,406,404,400,396,394,392,394]},
  {key:'praetorius', fifths:[696.5,696.5,696.5,696.5,696.5,702,727.5,702,696.5,696.5,696.5,696.5], thirds:[386,386,391.5,422.5,428,428,422.5,391.5,386,386,386,386]},
  {key:'kellner', fifths:[697.2,697.2,702,697.2,702,702,702,702,702,702,697.2,697.2], thirds:[393.6,398.4,403.2,403.2,408,408,408,403.2,398.4,393.6,388.8,393.6]}
]) test(`${fixture.key}: all 24 reference intervals and circle closure agree`, () => {
  const m = buildModel(PRESETS[fixture.key]);
  m.sectors.forEach((s,i) => { near(s.fifth,fixture.fifths[i]); near(s.third,fixture.thirds[i]); });
  near(m.sectors.reduce((sum,s) => sum+s.span,0),360);
});

test('equal temperament closes the circle with twelve equal sectors', () => {
  const m = buildModel(equal);
  near(m.sectors.reduce((s, v) => s + v.span, 0), 360);
  for (const s of m.sectors) { near(s.fifth, 700); near(s.third, 400); near(s.span, 30); }
  near(m.sectors[0].start, 90);
});
test('C major pure third and fifth survive octave wrapping', () => {
  const p = [...equal]; p[4] = 386; p[7] = 702;
  const m = buildModel(p);
  const c = m.sectors.find(s => s.root === 0);
  near(c.third, 386); near(c.fifth, 702); near(c.span, 30.857142857142858);
  near(m.sectors.find(s => s.root === 7).fifth, 698);
  near(m.sectors.reduce((s, v) => s + v.span, 0), 360);
});
test('Kirnberger I rounded example has D-A wolf and pure principal triads', () => {
  assert.ok(PRESETS, 'UI presets must be available for verification');
  const m = buildModel(PRESETS.kirnberger);
  near(m.sectors.find(s => s.root === 2).fifth, 680);
  near(m.sectors.find(s => s.root === 2).third, 386);
  near(m.sectors.find(s => s.root === 6).fifth, 700);
  for (const s of m.sectors) if (s.root !== 2 && s.root !== 6) near(s.fifth, 702);
  for (const root of [5, 0, 7]) { const s = m.sectors.find(v => v.root === root); near(s.third, 386); near(s.fifth, 702); }
});
test('exact 5:4 third in a 700-cent fifth sector is circular and tangent', () => {
  const g = ellipseGeometry(1200 * Math.log2(5/4), 30, 300);
  near(g.radial, g.tangential);
  near(g.center + g.radial, 300);
});

test('non-pure thirds touch both sector sides and the outer circle', () => {
  for (const third of [400, 1200 * Math.log2(81/64)]) {
    const g = ellipseGeometry(third,30,300);
    assert.ok(g.radial > g.tangential);
    near(g.center + g.radial,300);
    const theta = Math.PI / 12;
    near(g.center * Math.sin(theta), Math.hypot(g.radial*Math.sin(theta),g.tangential*Math.cos(theta)));
  }
});
test('400-cent ellipse reaches the half-radius ruler', () => {
  const g = ellipseGeometry(400, 30, 300);
  near(g.center - g.radial, 150); near(g.center + g.radial, 300);
});
test('blank, non-finite, unordered and changed C inputs are rejected', () => {
  assert.throws(() => parseCents('')); assert.throws(() => parseCents('1e999')); assert.throws(() => parseCents('12abc'));
  assert.equal(parseCents('386.314'), 386.314);
  for (const p of [[1, ...equal.slice(1)], equal.map((v, i) => i === 2 ? 90 : v), equal.map((v, i) => i === 11 ? 1200 : v)]) assert.throws(() => buildModel(p));
});
test('valid pitches with impossible exaggerated sectors are rejected explicitly', () => {
  assert.throws(() => buildModel([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]), /五度|作図/);
  assert.throws(() => ellipseGeometry(600, 30, 300), /長三度|作図/);
});

test('Jobin preset closes with three shared wide fifths and two pure thirds', () => {
  const m = buildModel(PRESETS.jobin);
  near(m.sectors.reduce((sum, s) => sum + s.span, 0), 360);
  for (const s of m.sectors) {
    near(s.fifth, [0, 7, 2, 9, 4].includes(s.root) ? 696.5 : [8, 3, 10].includes(s.root) ? 703 + 1/6 : 702);
  }
  assert.deepEqual(m.sectors.filter(s => Math.abs(s.third - 386) < 1e-9).map(s => s.root).sort((a,b) => a-b), [0,7]);
});

test('Meantone preset has eight pure thirds, four 428-cent thirds and one wolf', () => {
  const m = buildModel(PRESETS.meantone);
  near(m.sectors.reduce((sum, s) => sum + s.span, 0), 360);
  for (const s of m.sectors) near(s.fifth, s.root === 8 ? 738.5 : 696.5);
  assert.equal(m.sectors.filter(s => Math.abs(s.third - 386) < 1e-9).length, 8);
  assert.equal(m.sectors.filter(s => Math.abs(s.third - 428) < 1e-9).length, 4);
});

test('Base of Bach preset has one wide fifth and pure C and G thirds', () => {
  const m = buildModel(PRESETS.baseOfBach);
  near(m.sectors.reduce((sum, s) => sum + s.span, 0), 360);
  for (const s of m.sectors) near(s.fifth, [0,7,2,9,4].includes(s.root) ? 696.5 : s.root === 8 ? 705.5 : 702);
  assert.deepEqual(m.sectors.filter(s => Math.abs(s.third - 386) < 1e-9).map(s => s.root).sort((a,b) => a-b), [0,7]);
});

test('fifth labels keep their size when they fit inside the sector', () => {
  // 30-degree sector, glyph top at r = 61.2: about 29.8 units are free after padding.
  assert.equal(labelFitScale([{ width: 18, top: 61.2 }, { width: 16, top: 72.2 }], 30), 1);
});

test('fifth labels shrink just enough to fit the narrowest line between the sector sides', () => {
  const span = 30 + (679.9 - 700) * 30 / 700 * 10, pad = 1.5;
  const lines = [{ width: 27.8, top: 61.2 }, { width: 30.5, top: 72.2 }];
  const scale = labelFitScale(lines, span, pad);
  const free = l => 2 * l.top * Math.tan(span * Math.PI / 360) - 2 * pad;
  assert.ok(scale < 1);
  for (const l of lines) assert.ok(l.width * scale <= free(l) + 1e-9);
  near(Math.max(...lines.map(l => l.width * scale - free(l))), 0);
});

// Note names as written on the type-A source figures (17 of 25, e.g. Kirnberger III, page 20):
// sharp/flat before the letter; lines listed from the outer circle outwards.
test('outer note names follow the type-A source figures', () => {
  const want = [['C'], ['♯C', '♭D'], ['D'], ['♭E'], ['E'], ['F'], ['♯F', '♭G'], ['G'], ['♭A'], ['A'], ['♭B'], ['B']];
  want.forEach((lines, pc) => {
    assert.deepEqual(rootLabel(pc), { lines, accidental: [1, 3, 6, 8, 10].includes(pc) });
  });
});
test('third names are keyboard names in lower case, A♯/B♭ in two lines', () => {
  const want = [['c'], ['♯c'], ['d'], ['♯d'], ['e'], ['f'], ['♯f'], ['g'], ['♯g'], ['a'], ['♯a', '♭b'], ['b']];
  want.forEach((lines, pc) => {
    assert.deepEqual(thirdLabel(pc), { lines, accidental: [1, 3, 6, 8, 10].includes(pc) });
  });
  assert.deepEqual(thirdLabel(-4), thirdLabel(8)); assert.deepEqual(thirdLabel(16), thirdLabel(4));
});
