const { test } = require('node:test');
const assert = require('node:assert/strict');
const T = require('../tuning.js');
const R = require('../ratio.js');
// Defined by the author in cents: the ratio is exactly 2^(c/1200) of the preset value.
const CENT_DEFINED = ['bachSeal15', 'bachSeal10', 'meantonePiano', 'bachPiano', 'verywell1', 'verywell3'];

test('every preset has twelve readable ratios, C = 1, ascending within one octave', () => {
  assert.deepEqual(Object.keys(T.PRESET_RATIOS).sort(), Object.keys(T.PRESETS).sort());
  for (const [key, texts] of Object.entries(T.PRESET_RATIOS)) {
    assert.equal(texts.length, 12, key);
    assert.equal(texts[0], '1', key);
    const cents = texts.map(t => R.checkOctave(R.parseRatio(t)));
    for (let i = 1; i < 12; i++) assert.ok(cents[i] > cents[i - 1], `${key} ${i}`);
  }
});
test('exact ratios stay within the rounding of the source figures', () => {
  for (const [key, texts] of Object.entries(T.PRESET_RATIOS)) {
    const tol = CENT_DEFINED.includes(key) || key === 'equal' || key === 'bachSeal' ? 1e-9 : 0.65;
    texts.forEach((t, i) => {
      const diff = Math.abs(R.ratioCents(R.parseRatio(t)) - T.PRESETS[key][i]);
      assert.ok(diff <= tol, `${key} ${i}: ${diff}`);
    });
  }
});
test('known exact values', () => {
  const g = key => R.parseRatio(T.PRESET_RATIOS[key][7]);
  assert.ok(R.sameRatio(g('valloti'), R.parseRatio('2^(13/6)*3^(-1)')));        // PC/6 narrow fifth
  assert.ok(R.sameRatio(g('verywell2'), R.parseRatio('2^(13/6)/3')));             // read as ratios (case B)
  assert.ok(R.sameRatio(g('meantone'), R.parseRatio('5^(1/4)')));
  assert.ok(R.sameRatio(g('pythagoras'), R.parseRatio('3/2')));
  assert.ok(R.sameRatio(R.parseRatio(T.PRESET_RATIOS.meantone[8]), R.parseRatio('25/16')));
});
test('switching ratio → cent → ratio gives fields that read back, within 1e-8 cent', () => {
  for (const [key, texts] of Object.entries(T.PRESET_RATIOS)) {
    for (const t of texts) {
      const c = R.ratioCents(R.parseRatio(t));
      const back = R.formatRatio(R.centsToRatio(String(c)));
      assert.doesNotThrow(() => R.parseRatio(back), `${key} ${t} → ${back}`);
      assert.ok(Math.abs(R.ratioCents(R.parseRatio(back)) - c) < 1e-8, `${key} ${t}`);
    }
    for (const v of T.PRESETS[key]) assert.doesNotThrow(() => R.parseRatio(R.formatRatio(R.centsToRatio(String(v)))), `${key} ${v}`);
  }
});
test('switching cent → ratio → cent → ratio keeps every field within maxlength', () => {
  for (const [key, texts] of Object.entries(T.PRESET_RATIOS)) {
    // ratio → cent → ratio (the cents are the long decimals String() gives)
    for (const t of texts) {
      const back = R.formatRatio(R.centsToRatio(String(R.ratioCents(R.parseRatio(t)))));
      assert.ok(back.length <= R.MAX_LENGTH, `${key} ${t} → ${back}`);
    }
    // cent → ratio, from the cent presets (Bach / Seal has full double precision)
    for (const v of T.PRESETS[key]) {
      const back = R.formatRatio(R.centsToRatio(String(v)));
      assert.ok(back.length <= R.MAX_LENGTH, `${key} ${v} → ${back}`);
    }
  }
});
