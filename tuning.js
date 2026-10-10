(function (host) {
  'use strict';
  const NAMES = ['C', 'C♯ / D♭', 'D', 'D♯ / E♭', 'E', 'F', 'F♯ / G♭', 'G', 'G♯ / A♭', 'A', 'A♯ / B♭', 'B'];
  const SHORT = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  const ORDER = [2, 9, 4, 11, 6, 1, 8, 3, 10, 5, 0, 7];
  // Pitches from eleven successive fifths starting on C (C G D A E B F♯ C♯ G♯ D♯ A♯ F).
  const fromFifths = fifths => { const p = Array(12).fill(0); let c = 0; fifths.forEach((f, i) => { c += f; p[(i + 1) * 7 % 12] = c % 1200; }); return p; };
  // Bach/Seal (2019 figure): exact pure fifths, five of them narrowed by 1/5 Pythagorean comma.
  const PURE_FIFTH = 1200 * Math.log2(3 / 2), SEAL_NARROW = PURE_FIFTH - (12 * PURE_FIFTH - 8400) / 5;
  const PRESETS = {
    equal: Array.from({ length: 12 }, (_, i) => i * 100),
    kirnberger: [0, 90, 204, 294, 386, 498, 590, 702, 792, 884, 996, 1088],
    // Rounded reference construction; retain the thirds of a cent so the circle closes.
    jobin: [0, 86.5, 193, 291 + 2/3, 386, 498, 584.5, 696.5, 788.5, 889.5, 994 + 5/6, 1082.5],
    meantone: [0, 75.5, 193, 310.5, 386, 503.5, 579, 696.5, 772, 889.5, 1007, 1082.5],
    baseOfBach: [0, 86.5, 193, 294, 386, 498, 584.5, 696.5, 788.5, 889.5, 996, 1082.5],
    verywell2: [0, 94, 196, 298, 392, 500, 592, 698, 796, 894, 1000, 1092],
    praetorius: [0, 75.5, 193, 305, 386, 503.5, 579, 696.5, 777.5, 889.5, 1007, 1082.5],
    kellner: [0, 90, 194.4, 294, 388.8, 498, 588, 697.2, 792, 891.6, 996, 1090.8],
    kirnberger3: [0,90,193,294,386,498,590,696.5,792,889.5,996,1088],
    werckmeister3: [0,90,192,294,390,498,588,696,792,888,996,1092],
    valloti: [0,94,196,298,392,502,592,698,796,894,1000,1090],
    pythagoras: [0,114,204,294,408,498,612,702,816,906,996,1110],
    bachSeal: fromFifths([...Array(5).fill(SEAL_NARROW), ...Array(6).fill(PURE_FIFTH)]),
    bachSeal15: [0,92.5,195.8,295.5,391.6,498.5,591,697.9,794,893.7,997,1089.5],
    schnitger: [0,81,193,299.5,386,503.5,579,696.5,783,889.5,1001.5,1082.5],
    bachSeal10: [0,95,197.2,297,394.4,499,594,698.6,796,895.8,998,1093],
    meantonePiano: [0,86,196,306,392,502,588,698,784,894,1004,1090],
    bachPiano: [0,90.1,194.6,294,389.2,498.2,588.3,697.3,791.9,891.9,996.1,1086.5],
    young2: [0,90,196,294,392,498,588,698,792,894,996,1090],
    verywell1: [0,97,198,299,396,500,596,699,798,897,1000,1096],
    verywell3: [0,91,194,297,388,500,588,697,794,891,1000,1088],
    lehman: [0,98,196,298,392,502,596,698,798,894,998,1094]
  };
  // Exact ratios from C for the ratio input mode (work/analysis/exact_presets.md). Sixteen presets come
  // from their temperament's definition (pure fifths and fractions of the syntonic / Pythagorean comma or
  // schisma), so they differ from the rounded figure values above by up to 0.63 cent per note. VeryWell 2.0
  // reads 702 as a pure fifth and 700 as an equal one. Six presets are defined by the author in cents and
  // are exactly 2^(c/1200).
  const PRESET_RATIOS = {
    equal: ['1', '2^(1/12)', '2^(1/6)', '2^(1/4)', '2^(1/3)', '2^(5/12)', '2^(1/2)', '2^(7/12)', '2^(2/3)', '2^(3/4)', '2^(5/6)', '2^(11/12)'],
    kirnberger: ['1', '256/243', '9/8', '32/27', '5/4', '4/3', '45/32', '3/2', '128/81', '5/3', '16/9', '15/8'],
    jobin: ['1', '9*5^(5/4)/64', '5^(1/2)/2', '2^(-13/3)*3^(5/3)*5^(5/6)', '5/4', '4/3', '3*5^(5/4)/16', '5^(1/4)', '27*5^(5/4)/128', '5^(3/4)/2', '2^(-2/3)*3^(1/3)*5^(5/12)', '5^(5/4)/4'],
    meantone: ['1', '5^(7/4)/16', '5^(1/2)/2', '4*5^(-3/4)', '5/4', '2*5^(-1/4)', '5^(3/2)/8', '5^(1/4)', '25/16', '5^(3/4)/2', '4*5^(-1/2)', '5^(5/4)/4'],
    baseOfBach: ['1', '9*5^(5/4)/64', '5^(1/2)/2', '32/27', '5/4', '4/3', '3*5^(5/4)/16', '5^(1/4)', '27*5^(5/4)/128', '5^(3/4)/2', '16/9', '5^(5/4)/4'],
    verywell2: ['1', '2^(29/6)/27', '2^(10/3)/9', '2^(11/6)/3', '2^(20/3)/81', '2^(5/12)', '2^(41/6)/81', '2^(13/6)/3', '2^(23/6)/9', '2^(11/2)/27', '2^(5/6)', '2^(29/4)/81'],
    praetorius: ['1', '5^(7/4)/16', '5^(1/2)/2', '8*5^(-1/2)/3', '5/4', '2*5^(-1/4)', '5^(3/2)/8', '5^(1/4)', '3*5^(7/4)/32', '5^(3/4)/2', '4*5^(-1/2)', '5^(5/4)/4'],
    kellner: ['1', '256/243', '2^(23/5)*3^(-14/5)', '32/27', '2^(46/5)*3^(-28/5)', '4/3', '1024/729', '2^(14/5)*3^(-7/5)', '128/81', '2^(37/5)*3^(-21/5)', '16/9', '2^(41/5)*3^(-23/5)'],
    kirnberger3: ['1', '256/243', '5^(1/2)/2', '32/27', '5/4', '4/3', '45/32', '5^(1/4)', '128/81', '5^(3/4)/2', '16/9', '15/8'],
    werckmeister3: ['1', '256/243', '2^(13/2)/81', '32/27', '2^(33/4)/243', '4/3', '1024/729', '2^(15/4)/9', '128/81', '2^(41/4)/729', '16/9', '2^(29/4)/81'],
    valloti: ['1', '2^(29/6)/27', '2^(10/3)/9', '2^(11/6)/3', '2^(20/3)/81', '3*2^(-7/6)', '2^(41/6)/81', '2^(13/6)/3', '2^(23/6)/9', '2^(11/2)/27', '2^(5/6)', '2^(53/6)/243'],
    pythagoras: ['1', '2187/2048', '9/8', '32/27', '81/64', '4/3', '729/512', '3/2', '6561/4096', '27/16', '16/9', '243/128'],
    bachSeal: ['1', '256/243', '2^(23/5)*3^(-14/5)', '32/27', '2^(46/5)*3^(-28/5)', '4/3', '1024/729', '2^(14/5)*3^(-7/5)', '128/81', '2^(37/5)*3^(-21/5)', '16/9', '4096/2187'],
    bachSeal15: ['1', '2^(37/480)', '2^(979/6000)', '2^(197/800)', '2^(979/3000)', '2^(997/2400)', '2^(197/400)', '2^(6979/12000)', '2^(397/600)', '2^(2979/4000)', '2^(997/1200)', '2^(2179/2400)'],
    schnitger: ['1', '3*5^(3/2)/32', '5^(1/2)/2', '16*5^(-1/4)/9', '5/4', '2*5^(-1/4)', '5^(3/2)/8', '5^(1/4)', '9*5^(3/2)/64', '5^(3/4)/2', '8*5^(-1/4)/3', '5^(5/4)/4'],
    bachSeal10: ['1', '2^(19/240)', '2^(493/3000)', '2^(99/400)', '2^(493/1500)', '2^(499/1200)', '2^(99/200)', '2^(3493/6000)', '2^(199/300)', '2^(1493/2000)', '2^(499/600)', '2^(1093/1200)'],
    meantonePiano: ['1', '2^(43/600)', '2^(49/300)', '2^(51/200)', '2^(49/150)', '2^(251/600)', '2^(49/100)', '2^(349/600)', '2^(49/75)', '2^(149/200)', '2^(251/300)', '2^(109/120)'],
    bachPiano: ['1', '2^(901/12000)', '2^(973/6000)', '2^(49/200)', '2^(973/3000)', '2^(2491/6000)', '2^(1961/4000)', '2^(6973/12000)', '2^(7919/12000)', '2^(2973/4000)', '2^(9961/12000)', '2^(2173/2400)'],
    young2: ['1', '256/243', '2^(10/3)/9', '32/27', '2^(20/3)/81', '4/3', '1024/729', '2^(13/6)/3', '128/81', '2^(11/2)/27', '16/9', '2^(53/6)/243'],
    verywell1: ['1', '2^(97/1200)', '2^(33/200)', '2^(299/1200)', '2^(33/100)', '2^(5/12)', '2^(149/300)', '2^(233/400)', '2^(133/200)', '2^(299/400)', '2^(5/6)', '2^(137/150)'],
    verywell3: ['1', '2^(91/1200)', '2^(97/600)', '2^(99/400)', '2^(97/300)', '2^(5/12)', '2^(49/100)', '2^(697/1200)', '2^(397/600)', '2^(297/400)', '2^(5/6)', '2^(68/75)'],
    lehman: ['1', '2^(5/3)/3', '2^(10/3)/9', '2^(11/6)/3', '2^(20/3)/81', '3*2^(-7/6)', '2^(11/3)/9', '2^(13/6)/3', '2^(9/4)/3', '2^(11/2)/27', '2^(29/12)/3', '2^(17/3)/27']
  };
  const DEG_PER_CENT = 30 / 700 * 10;
  // As in the source method (page 236): the 386-cent third (not the exact 5:4) is the circle inscribed in
  // the 700-cent sector, and the ruler gap between 400 (half radius) and 386 is divided into 14 cents.
  const CIRCLE_THIRD = 386;
  const CIRCLE_INNER = (1 - Math.sin(Math.PI / 12)) / (1 + Math.sin(Math.PI / 12));
  const RADIAL_PER_CENT = (CIRCLE_INNER - 0.5) / (400 - CIRCLE_THIRD);
  function parseCents(text) {
    if (String(text).trim() === '' || !Number.isFinite(Number(text))) throw new Error('すべての音に有限の数値を入力してください。');
    return Number(text);
  }
  function innerRadius(third, radius = 1) { return radius * (0.5 - (third - 400) * RADIAL_PER_CENT); }
  function ellipseGeometry(third, span, radius = 1) {
    const inner = innerRadius(third, radius);
    if (!(inner > 0 && inner < radius)) throw new Error('長三度が同心円定規の作図範囲外です。入力値を調律の範囲に戻してください。');
    if (!(span > 0 && span < 180)) throw new Error('五度の拡大角度が作図範囲外です。');
    const center = (radius + inner) / 2;
    const radial = (radius - inner) / 2;
    const tangential = Math.tan(span * Math.PI / 360) * Math.sqrt(radius * inner);
    // Side tangency must not push an unusually wide ellipse outside the outer circle.
    if (tangential * tangential > radial * radius) throw new Error('五度が広すぎて楕円を外周内に作図できません。');
    return { center, radial, tangential, inner };
  }
  function buildModel(pitches) {
    if (!Array.isArray(pitches) || pitches.length !== 12 || pitches.some(v => !Number.isFinite(v))) throw new Error('12音の数値が必要です。');
    if (pitches[0] !== 0) throw new Error('Cは0 cent固定です。');
    for (let i = 1; i < 12; i++) if (!(pitches[i] > pitches[i - 1] && pitches[i] < 1200)) throw new Error(`${NAMES[i]}：Cから昇順で、0より大きく1200未満の値を入力してください。`);
    const interval = (root, steps) => pitches[(root + steps) % 12] + (root + steps >= 12 ? 1200 : 0) - pitches[root];
    let angle = 90;
    const sectors = ORDER.map(root => {
      const fifth = interval(root, 7), third = interval(root, 4);
      const span = 30 + (fifth - 700) * DEG_PER_CENT;
      const geometry = ellipseGeometry(third, span);
      const sector = { root, top: (root + 7) % 12, middle: (root + 4) % 12, fifth, third, span, start: angle, end: angle - span, geometry };
      angle -= span;
      return sector;
    });
    return { pitches: [...pitches], sectors };
  }
  // Scale (≤ 1) that fits straight label lines between the sector sides. Each line is perpendicular
  // to the sector's middle radius; its narrowest point is the glyph top at radius `top`.
  function labelFitScale(lines, span, pad = 1.5) {
    const half = Math.tan(span * Math.PI / 360);
    return Math.min(1, ...lines.map(l => (2 * l.top * half - 2 * pad) / l.width));
  }
  // Note names drawn in the figure, as on the type-A source figures (17 of 25): sharp/flat before
  // the letter, lines from the outer circle outwards. Thirds use keyboard names in lower case.
  const ROOT_LABELS = [['C'], ['♯C', '♭D'], ['D'], ['♭E'], ['E'], ['F'], ['♯F', '♭G'], ['G'], ['♭A'], ['A'], ['♭B'], ['B']];
  const THIRD_LABELS = [['c'], ['♯c'], ['d'], ['♯d'], ['e'], ['f'], ['♯f'], ['g'], ['♯g'], ['a'], ['♯a', '♭b'], ['b']];
  const BLACK_KEYS = [1, 3, 6, 8, 10];
  const figureLabel = table => pc => {
    const i = ((pc % 12) + 12) % 12;
    return { lines: table[i], accidental: BLACK_KEYS.includes(i) };
  };
  const rootLabel = figureLabel(ROOT_LABELS), thirdLabel = figureLabel(THIRD_LABELS);
  // The preset (key of `presets`, each twelve cents) whose every note is within `tolerance` cent of `pitches`.
  const matchPreset = (pitches, presets, tolerance) =>
    Object.keys(presets).find(key => presets[key].every((v, i) => Math.abs(v - pitches[i]) <= tolerance));
  const api = { NAMES, SHORT, ORDER, PRESETS, PRESET_RATIOS, CIRCLE_THIRD, DEG_PER_CENT, innerRadius, parseCents, ellipseGeometry, buildModel, labelFitScale, rootLabel, thirdLabel, matchPreset };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else host.Tuning = api;
})(globalThis);
