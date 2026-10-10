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
  const DEG_PER_CENT = 30 / 700 * 10;
  const PURE_THIRD = 1200 * Math.log2(5 / 4);
  const PURE_INNER = (1 - Math.sin(Math.PI / 12)) / (1 + Math.sin(Math.PI / 12));
  const RADIAL_PER_CENT = (PURE_INNER - 0.5) / (400 - PURE_THIRD);
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
  const api = { NAMES, SHORT, ORDER, PRESETS, PURE_THIRD, DEG_PER_CENT, innerRadius, parseCents, ellipseGeometry, buildModel, labelFitScale, rootLabel, thirdLabel };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else host.Tuning = api;
})(globalThis);
