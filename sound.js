(function (host) {
  'use strict';
  // Sounding the figure: a click on an ellipse or a sector plays its chord with the drawn intervals.
  const C4_HZ = 261.63;
  const HARMONICS = 16;
  const ATTACK = 0.01, DECAY = 3, FLOOR = 0.001, RELEASE = 0.01;   // seconds; FLOOR is -60 dB
  const NOTE_GAIN = 0.2;
  // Sawtooth Fourier series up to the 16th partial: sine terms (-1)^(n+1) / n.
  function sawtoothCoefficients(harmonics = HARMONICS) {
    const real = new Array(harmonics + 1).fill(0), imag = new Array(harmonics + 1).fill(0);
    for (let n = 1; n <= harmonics; n++) imag[n] = (n % 2 ? 1 : -1) / n;
    return { real, imag };
  }
  // The root sits in C4-B4 (cents 0 to 1200 above C4); the third and the fifth are stacked above it.
  // target: 'ellipse' | 'sector'; mode: 'dyad' | 'triad'.
  function noteFrequencies(pitches, sector, target, mode) {
    if (target !== 'ellipse' && target !== 'sector') throw new Error(`unknown target ${target}`);
    if (mode !== 'dyad' && mode !== 'triad') throw new Error(`unknown mode ${mode}`);
    const root = C4_HZ * Math.pow(2, pitches[sector.root] / 1200);
    const third = root * Math.pow(2, sector.third / 1200), fifth = root * Math.pow(2, sector.fifth / 1200);
    if (mode === 'triad') return [root, third, fifth];
    return target === 'ellipse' ? [root, third] : [root, fifth];
  }
  // One chord at a time: playing a new chord stops the sounding one within RELEASE seconds.
  function createPlayer(context, destination = context.destination) {
    const { real, imag } = sawtoothCoefficients();
    const wave = context.createPeriodicWave(Float32Array.from(real), Float32Array.from(imag));
    let current = null;
    function stop(at = context.currentTime) {
      if (!current) return;
      const { gain, oscillators } = current;
      gain.gain.cancelScheduledValues(at);
      gain.gain.setValueAtTime(gain.gain.value, at);
      gain.gain.linearRampToValueAtTime(0, at + RELEASE);
      for (const o of oscillators) o.stop(at + RELEASE);
      current = null;
    }
    function play(frequencies, at = context.currentTime) {
      stop(at);
      const gain = context.createGain();
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(NOTE_GAIN, at + ATTACK);
      gain.gain.exponentialRampToValueAtTime(NOTE_GAIN * FLOOR, at + ATTACK + DECAY);
      gain.connect(destination);
      const oscillators = frequencies.map(f => {
        const o = context.createOscillator();
        o.setPeriodicWave(wave); o.frequency.value = f; o.connect(gain);
        o.start(at); o.stop(at + ATTACK + DECAY);
        return o;
      });
      current = { gain, oscillators };
      oscillators[0].onended = () => { if (current && current.gain === gain) current = null; };
    }
    return { play, stop };
  }
  const api = { C4_HZ, HARMONICS, ATTACK, DECAY, FLOOR, RELEASE, NOTE_GAIN, sawtoothCoefficients, noteFrequencies, createPlayer };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else host.Sound = api;
})(globalThis);
