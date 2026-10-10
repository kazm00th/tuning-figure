const test = require('node:test');
const assert = require('node:assert/strict');
const { buildModel, PRESETS } = require('../tuning.js');
const S = require('../sound.js');

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps * Math.max(1, Math.abs(b)), `${a} != ${b}`);
const C4 = 261.63;
const hz = cents => C4 * Math.pow(2, cents / 1200);

test('sawtooth made of 16 sine partials with amplitude 1/n', () => {
  const { real, imag } = S.sawtoothCoefficients();
  assert.equal(real.length, 17); assert.equal(imag.length, 17);
  assert.ok(real.every(v => v === 0));
  assert.equal(imag[0], 0);
  for (let n = 1; n <= 16; n++) near(imag[n], (n % 2 ? 1 : -1) / n);
});

test('the root is always between C4 and B4, and C4 is 261.63 Hz', () => {
  assert.equal(S.C4_HZ, 261.63);
  for (const key of Object.keys(PRESETS)) {
    const pitches = PRESETS[key];
    for (const s of buildModel(pitches).sectors) {
      const [root] = S.noteFrequencies(pitches, s, 'sector', 'dyad');
      near(root, hz(pitches[s.root]));
      assert.ok(root >= C4 && root < 2 * C4, `${key} ${s.root} ${root}`);
    }
  }
});

test('dyad mode: ellipse sounds root and major third, sector sounds root and fifth', () => {
  const pitches = PRESETS.kirnberger;
  const model = buildModel(pitches);
  for (const s of model.sectors) {
    const f0 = hz(pitches[s.root]);
    const e = S.noteFrequencies(pitches, s, 'ellipse', 'dyad');
    const f = S.noteFrequencies(pitches, s, 'sector', 'dyad');
    assert.equal(e.length, 2); assert.equal(f.length, 2);
    near(e[0], f0); near(e[1], f0 * Math.pow(2, s.third / 1200));
    near(f[0], f0); near(f[1], f0 * Math.pow(2, s.fifth / 1200));
  }
  // B (root 11) in Kirnberger I: the third and the fifth are stacked above the root, past C5.
  const b = model.sectors.find(s => s.root === 11);
  near(S.noteFrequencies(pitches, b, 'ellipse', 'dyad')[1], hz(1088 + (294 + 1200 - 1088)));
});

test('triad mode: ellipse and sector both sound root, major third and fifth', () => {
  const pitches = PRESETS.meantone;
  for (const s of buildModel(pitches).sectors) {
    const f0 = hz(pitches[s.root]), want = [f0, f0 * Math.pow(2, s.third / 1200), f0 * Math.pow(2, s.fifth / 1200)];
    for (const target of ['ellipse', 'sector']) {
      const got = S.noteFrequencies(pitches, s, target, 'triad');
      assert.equal(got.length, 3);
      got.forEach((v, i) => near(v, want[i]));
    }
  }
});

test('unknown target or mode is an error', () => {
  const pitches = PRESETS.equal, s = buildModel(pitches).sectors[0];
  assert.throws(() => S.noteFrequencies(pitches, s, 'disc', 'dyad'));
  assert.throws(() => S.noteFrequencies(pitches, s, 'ellipse', 'chord'));
});

test('envelope: 10 ms attack, exponential decay to -60 dB in 3 s, 10 ms stop; fixed gain that cannot clip', () => {
  assert.equal(S.ATTACK, 0.01);
  assert.equal(S.DECAY, 3);
  assert.equal(S.FLOOR, 0.001);          // -60 dB
  assert.equal(S.RELEASE, 0.01);
  assert.ok(S.NOTE_GAIN * 3 <= 1);
});
