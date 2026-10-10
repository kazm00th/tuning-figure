(() => {
  'use strict';
  const { NAMES, SHORT, PURE_THIRD, PRESETS, parseCents, buildModel, innerRadius, ellipseGeometry, labelFitScale, rootLabel, thirdLabel } = Tuning;
  const { thirdColor, fifthColor, textColor } = TuningPalette;
  const NS = 'http://www.w3.org/2000/svg';
  // Modal RGB in an unmarked background patch of each sampled source image.
  const FIGURE_BACKGROUND = '#fce8cf';
  // Number labels use Meiryo UI as in the source figures; other platforms fall back.
  const LABEL_FONT = "'Meiryo UI', Meiryo, system-ui, sans-serif";
  // Note names, matched to the type-A source figures (outer circle R = 315).
  const NAME_STYLE = { root: { size: 26.5, base: 27.3, gap: 21.8, outline: 1.15, sign: .8, kern: -1.5 }, third: { size: 21, base: 18.3, gap: 17, outline: .6, sign: .85, kern: -2 } };
  const NAME_INK = { outline: '#666666', black: '#222222' };
  const SOURCE_BACKGROUNDS ={1783:'#fde9d1',2153:'#fde8d0',2284:'#fde9d1',2295:'#fde9d1',4026:'#fde9d1',4362:'#fde8d0',1545:'#fde9d1'};
  const { equal } = PRESETS;
  const presetInfo = {
    equal: { title: '平均律', note: '平均律は半音ごとに100 centです。' },
    kirnberger: { title: 'Kirnberger I · 整数centの例', note: '参照図の整数centに合わせた値です。', page: 215 },
    jobin: { title: 'Bach WTC / Emile Jobin (2005)', note: '696.5／702 centを基準に、広い五度3個を約703.166667 centにして一周を閉じています。掲載値703.1とは丸めの違いがあります。', page: 1545 },
    meantone: { title: 'Meantone', note: '12音の例。五度696.5 centを11個、G♯–E♭のウルフ738.5 centを1個配置します。二重黒鍵の図は対象外です。', page: 691 },
    baseOfBach: { title: 'Base of Bach WTC', note: '五度696.5 centを5個、702 centを6個、G♯–E♭の705.5 centを1個配置した例です。', page: 2680 },
    verywell2: { title: 'VeryWell 2.0', note: '掲載図の値：五度698・700・702 centが各4個。長三度は392〜408 centの7種類です。', page: 42 },
    praetorius: { title: 'Praetorius', note: '掲載図の値：五度696.5 centが9個、702 centが2個、G♯–E♭が727.5 cent。長三度386 centが6個です。', page: 2284 },
    kellner: { title: 'Bach / Kellner', note: '掲載図の丸め値：五度697.2 centが5個、702 centが7個。狭い五度をC–G・G–D・D–A・A–E・B–F♯に配置します。', page: 4362 },
    kirnberger3: { title: "Kirnberger III", note: '掲載主図の五度・長三度24値と照合した丸めcent値です。', page: 20 },
    werckmeister3: { title: "Werckmeister III", note: '掲載主図の五度・長三度24値と照合した丸めcent値です。', page: 32 },
    valloti: { title: "Valloti", note: '掲載主図の五度・長三度24値と照合した丸めcent値です。', page: 39 },
    pythagoras: { title: "Pythagoras", note: '掲載主図の五度・長三度24値と照合した丸めcent値です。', page: 496 },
    bachSeal: { title: "Bach / Seal", note: '2019年版の掲載図に合わせ、純正五度7個と、ピタゴラス・コンマの1/5ずつ狭めた五度5個（約697.263 cent）を厳密値で置きます。C・Gの長三度は掲載図の388.8に対し389.1です（掲載図の24値は一周に閉じません）。', page: 1783 },
    bachSeal15: { title: "Bach’s Seal 1.5", note: '掲載主図の五度・長三度24値と照合した丸めcent値です。', page: 2153 },
    schnitger: { title: "Schnitger", note: '掲載主図の五度・長三度24値と照合した丸めcent値です。', page: 2295 },
    bachSeal10: { title: "Bach’s Seal 1.0", note: '掲載主図の五度・長三度24値と照合した丸めcent値です。', page: 2306 },
    meantonePiano: { title: "Meantone / forPiano698", note: '掲載主図の五度・長三度24値と照合した丸めcent値です。', page: 3448 },
    bachPiano: { title: "Bach WTC forPiano", note: '掲載主図の五度・長三度24値と照合した丸めcent値です。', page: 4026 },
    young2: { title: "Young II", note: '掲載主図の五度・長三度24値と照合した丸めcent値です。五度698 centが6個、702 centが6個。', page: 36 },
    verywell1: { title: "VeryWell 1.0", note: '掲載主図の五度・長三度24値と照合した丸めcent値です。五度699・700・701 centが各4個。', page: 45 },
    verywell3: { title: "VeryWell 3.0", note: '掲載主図の五度・長三度24値と照合した丸めcent値です。五度697・700・703 centが各4個。', page: 598 },
    lehman: { title: "Bach / Lehman", note: '掲載主図の五度・長三度24値と照合した丸めcent値です。五度698 centが5個、700と702 centが各3個、B♭–Fが704 cent。', page: 1545 }
  };
  const inputArea = document.getElementById('note-inputs');
  const status = document.getElementById('status');
  const download = document.getElementById('download');
  const fields = [], deltas = [];
  const fmt = (v, digits = 1) => Number(v.toFixed(digits)).toString();
  const signed = (v, digits = 1) => `${v > 0 && Number(v.toFixed(digits)) !== 0 ? '+' : ''}${fmt(v, digits)}`;
  function node(tag, attrs = {}, text) {
    const el = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, value);
    if (text !== undefined) el.textContent = text;
    return el;
  }
  const inkContext = document.createElement('canvas').getContext('2d');
  // Painted extent of centred label text: half width from the anchor and height above the baseline.
  function inkExtent(text, size) {
    inkContext.font = `${size}px ${LABEL_FONT}`; inkContext.textAlign = 'center';
    const m = inkContext.measureText(text);
    return { half: Math.max(m.actualBoundingBoxLeft, m.actualBoundingBoxRight), ascent: m.actualBoundingBoxAscent };
  }
  function render(model, title, background = FIGURE_BACKGROUND) {
    const R = 315, center = 425;
    const xy = (r, a) => [center + r * Math.cos(a * Math.PI / 180), center + r * Math.sin(a * Math.PI / 180)];
    // A note name rotated with its sector (top toward the centre), first baseline at R + base.
    // Natural notes are grey outlines and sharps/flats solid black, as on every source figure.
    function noteName({ lines, accidental }, style, angle) {
      const p = xy(R + style.base, angle);
      const paint = accidental ? { fill: NAME_INK.black } : { fill: 'none', stroke: NAME_INK.outline, 'stroke-width': style.outline };
      const text = node('text', { transform: `translate(${p.join(' ')}) rotate(${angle - 90})`, 'data-label': 'name', 'text-anchor': 'middle', 'font-family': LABEL_FONT, 'font-size': style.size, ...paint });
      lines.forEach((line, i) => {
        const start = { x: 0, ...(i ? { dy: style.gap } : {}) };
        // The source's sharp and flat are smaller than the letter and sit close to it.
        if (accidental) text.append(node('tspan', { ...start, 'font-size': style.size * style.sign }, line[0]), node('tspan', { dx: style.kern }, line.slice(1)));
        else text.append(node('tspan', start, line));
      });
      return text;
    }
    // Crop to the source's margins: width 2.43 R and height 2.52 R around the centre.
    const svg = node('svg', { xmlns: NS, viewBox: '43 28 764 794', role: 'img', 'aria-labelledby': 'svg-title svg-desc', 'font-family': 'system-ui, sans-serif' });
    svg.append(node('title', { id: 'svg-title' }, `Temperament Circle Diagram — ${title}`));
    svg.append(node('desc', { id: 'svg-desc' }, 'Dを下に置く五度圏。扇形は五度、楕円は長三度の音程を表します。詳細な値はページ下の表にあります。'));
    svg.append(node('rect', { x: 43, y: 28, width: 764, height: 794, fill: background }));
    // Line greys, widths and the 5-unit dash period were measured from the source figures (pages 32, 496, 691, 2295).
    for (const s of model.sectors) {
      const p = xy(R, s.start), q = xy(R, s.end);
      svg.append(node('path', { d: `M ${center} ${center} L ${p.join(' ')} A ${R} ${R} 0 0 0 ${q.join(' ')} Z`, fill: fifthColor(s.fifth), stroke: '#808080', 'stroke-width': 1 }));
    }
    // 1-cent rings in the third colours up to 428 cent; 400 and 408 (Pythagorean) are emphasised.
    // Range, widths and opacities were matched to radial profiles of the source figures (pages 215, 691, 2284).
    for (let cent = 380; cent <= 428; cent++) {
      const mark = cent === 400 || cent === 408;
      svg.append(node('circle', { cx: center, cy: center, r: innerRadius(cent, R), fill: 'none', stroke: thirdColor(cent), 'stroke-width': mark ? 1.8 : cent < 400 ? .8 : .6, opacity: mark ? .6 : cent > 408 ? .45 : .9 }));
    }
    svg.append(node('circle', { cx: center, cy: center, r: innerRadius(PURE_THIRD, R), fill: 'none', stroke: thirdColor(PURE_THIRD), 'stroke-width': 1.8, opacity: .5 }));
    for (let i = 0; i < 12; i++) {
      const p = xy(R + 20, 90 - i * 30);
      svg.append(node('line', { x1: center, y1: center, x2: p[0], y2: p[1], stroke: '#888888', 'stroke-width': 1, 'stroke-dasharray': '2 3' }));
    }
    for (const s of model.sectors) {
      const mid = (s.start + s.end) / 2;
      const g = ellipseGeometry(s.third, s.span, R);
      const p = xy(g.center, mid);
      const ellipse = node('ellipse', { cx: p[0], cy: p[1], rx: g.radial, ry: g.tangential, transform: `rotate(${mid} ${p[0]} ${p[1]})`, fill: thirdColor(s.third), stroke: '#353535', 'stroke-opacity': .85, 'stroke-width': .9 });
      ellipse.append(node('title', {}, `${SHORT[s.root]}–${SHORT[s.middle]}–${SHORT[s.top]}：長三度 ${fmt(s.third, 3)} cent、五度 ${fmt(s.fifth, 3)} cent`));
      svg.append(ellipse);
      // The source rotates each two-line label with its sector. Third labels start a fixed
      // distance from the ellipse's inner end (baselines 24.5 and 38.5 beyond it), whatever its size.
      const labelPoint = xy(g.inner + 26.5, mid);
      const label = node('text', { x: 0, y: -2, transform: `translate(${labelPoint.join(' ')}) rotate(${mid - 90})`, 'data-label': 'third', 'text-anchor': 'middle', 'font-family': LABEL_FONT, 'font-size': 14, fill: textColor(thirdColor(s.third)) });
      label.append(node('tspan', { x: 0 }, fmt(s.third)), node('tspan', { x: 0, dy: 14, 'font-size': 12 }, `(${signed(s.third - 386)})`));
      svg.append(label);
      // Fifth labels sit just outside the centre disc as in the source (baselines at r = 70 and 81).
      const f = xy(72, mid);
      const fLabel = node('text', { x: 0, y: -2, transform: `translate(${f.join(' ')}) rotate(${mid - 90})`, 'data-label': 'fifth', 'data-span': s.span, 'text-anchor': 'middle', 'font-family': LABEL_FONT, 'font-size': 11, fill: textColor(fifthColor(s.fifth)) });
      fLabel.append(node('tspan', { x: 0 }, fmt(s.fifth)), node('tspan', { x: 0, dy: 11 }, `(${signed(s.fifth - 702)})`));
      svg.append(fLabel);
      svg.append(noteName(rootLabel(s.root), NAME_STYLE.root, s.start));
      svg.append(noteName(thirdLabel(s.middle), NAME_STYLE.third, mid));
    }
    svg.append(node('circle', { cx: center, cy: center, r: R, fill: 'none', stroke: '#778975', 'stroke-width': 1 }));
    svg.append(node('circle', { cx: center, cy: center, r: 53, fill: '#f7b779', stroke: '#7a6450', 'stroke-width': 1 }));
    svg.append(node('text', { x: center, y: center - 9, 'text-anchor': 'middle', 'font-size': 17, fill: '#624322', 'font-weight': 600 }, 'C = 0'));
    svg.append(node('text', { x: center, y: center + 14, 'text-anchor': 'middle', 'font-size': 11, fill: '#7b5832' }, 'cent'));
    document.getElementById('figure').replaceChildren(svg);
    // Narrow fifths with decimals would cross the sector sides: shrink those labels to fit, keeping
    // their baselines (r = 70, 81). Fit uses the painted glyph extents, not the taller em box.
    for (const t of svg.querySelectorAll('text[data-label="fifth"]')) {
      const size = 11, lines = [...t.children].map((line, i) => {
        const ink = inkExtent(line.textContent, size);
        return { width: 2 * ink.half, top: [70, 81][i] - ink.ascent };
      });
      const scale = labelFitScale(lines, Number(t.getAttribute('data-span')));
      if (scale < 1) t.setAttribute('font-size', size * scale);
    }
    const tbody = document.getElementById('intervals');
    tbody.replaceChildren(...model.sectors.map(s => {
      const tr = document.createElement('tr');
      for (const text of [SHORT[s.root], fmt(s.fifth, 3), signed(s.fifth - 702, 3), fmt(s.third, 3), signed(s.third - 386, 3)]) {
        const td = document.createElement('td'); td.textContent = text; tr.append(td);
      }
      return tr;
    }));
  }
  function update() {
    for (const field of fields) field.removeAttribute('aria-invalid');
    try {
      const pitches = fields.map((field, i) => {
        try { return parseCents(field.value); }
        catch (error) { field.setAttribute('aria-invalid', 'true'); throw new Error(`${NAMES[i]}：${error.message}`); }
      });
      for (let i = 1; i < 12; i++) if (pitches[i] <= pitches[i - 1] || pitches[i] >= 1200) fields[i].setAttribute('aria-invalid', 'true');
      const model = buildModel(pitches);
      const presetKey = Object.keys(PRESETS).find(key => pitches.every((v, i) => v === PRESETS[key][i]));
      const info = presetInfo[presetKey];
      const title = info ? info.title : 'カスタム調律';
      render(model, title, SOURCE_BACKGROUNDS[info?.page] || FIGURE_BACKGROUND);
      document.getElementById('figure-title').textContent = title;
      const note = document.getElementById('preset-note');
      note.textContent = info ? info.note : '入力した値で描画しています。';
      if (info && info.page) {
        const link = document.createElement('a');
        link.href = `https://pianotuning.jp/?page_id=${info.page}`; link.target = '_blank'; link.rel = 'noreferrer'; link.textContent = '参照ページ';
        note.append(' ', link);
      }
      for (const key of Object.keys(PRESETS)) document.getElementById(key).setAttribute('aria-pressed', String(key === presetKey));
      pitches.forEach((v, i) => { deltas[i].textContent = signed(v - equal[i], 2); });
      status.textContent = '入力値を反映しました · 点線は平均律の位置'; status.className = 'status'; download.disabled = false;
    } catch (error) {
      status.textContent = `${error.message} 現在は直前の有効な図・表を表示しています。`;
      status.className = 'status error'; download.disabled = true;
    }
  }
  for (let i = 0; i < 12; i++) {
    const row = document.createElement('div'); row.className = 'note-row';
    const label = document.createElement('label'); label.htmlFor = `pitch-${i}`; label.textContent = NAMES[i];
    const input = document.createElement('input'); input.type = 'text'; input.inputMode = 'decimal'; input.id = `pitch-${i}`; input.value = equal[i]; input.autocomplete = 'off'; input.spellcheck = false;
    input.setAttribute('aria-label', `${NAMES[i]} の音程 cent`); input.setAttribute('aria-describedby', 'status');
    if (i === 0) { input.readOnly = true; input.setAttribute('aria-label', 'C の音程 cent 固定'); }
    else input.addEventListener('input', update);
    const delta = document.createElement('span'); delta.className = 'delta'; delta.textContent = '0';
    fields.push(input); deltas.push(delta); row.append(label, input, delta); inputArea.append(row);
  }
  function setPreset(values) { fields.forEach((f, i) => { f.value = values[i]; }); update(); }
  for (const [key, values] of Object.entries(PRESETS)) document.getElementById(key).addEventListener('click', () => setPreset(values));
  download.addEventListener('click', () => {
    const svg = document.querySelector('#figure svg').cloneNode(true);
    const metadata = node('metadata', {}, JSON.stringify({ pitches: fields.map(f => Number(f.value)), reference: 'https://pianotuning.jp/?page_id=236', fifthReference: 702, thirdReference: 386, circleThirdReference: PURE_THIRD, circleFifthReference: 700, colorReferences: [20, 32, 36, 39, 42, 45, 100, 135, 215, 496, 598, 691, 1545, 1783, 2153, 2284, 2295, 2306, 2680, 3448, 3462, 3717, 4026, 4362], fifthColorModel: 'lab-d50-invpow-grey-quadratic-pink-v2', fifthColorRange: [680, 738.5], thirdColorModel: 'lch-d50-bumped-main-figures-v2', thirdColorRange: [384, 428], rgbGamutMapping: 'component-clipping', figureBackground: svg.querySelector('rect').getAttribute('fill') }));
    svg.append(metadata);
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'tuning-figure.svg'; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  update();
})();



