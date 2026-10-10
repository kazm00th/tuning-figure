(() => {
  'use strict';
  const { NAMES, SHORT, CIRCLE_THIRD, PRESETS, PRESET_RATIOS, parseCents, buildModel, innerRadius, ellipseGeometry, labelFitScale, rootLabel, thirdLabel, matchPreset } = Tuning;
  const { thirdColor, fifthColor, textColor } = TuningPalette;
  const { parseRatio, ratioCents, formatRatio, sameRatio, centsToRatio, reduceOctave, checkOctave, MAX_LENGTH } = Ratio;
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
    kirnberger: { title: 'Kirnberger I', note: '参照図の整数centに合わせた値です。', page: 215 },
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
    bachSeal: { title: "Bach / Seal", note: '2019年版の掲載図に合わせ、純正五度7個と、ピタゴラス・コンマの1/5ずつ狭めた五度5個（約697.263 cent）を厳密値で置きます。C・Gの長三度は掲載図の388.8に対し389.1です。', page: 1783 },
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
  const downloadPng = document.getElementById('download-png');
  const pngScale = document.getElementById('png-scale');
  const fields = [], deltas = [], notes = [];
  // Sectors and ellipses on screen → what a click on them sounds. Kept out of the SVG so saved files are unchanged.
  const soundTargets = new WeakMap();
  // 'dyad' (ellipse: root + third, sector: root + fifth) or 'triad' (both: root, third, fifth).
  let soundMode = 'dyad', audio = null, player = null;
  // 'cents' or 'ratio'; lastPitches are the cents last drawn (used for the SVG metadata).
  let mode = 'cents', lastField = null, lastPitches = equal.slice();
  const PRESET_PARSED = Object.fromEntries(Object.entries(PRESET_RATIOS).map(([key, texts]) => [key, texts.map(parseRatio)]));
  const PRESET_CENTS = Object.fromEntries(Object.entries(PRESET_PARSED).map(([key, ratios]) => [key, ratios.map(ratioCents)]));
  const PRESET_TOLERANCE = 1e-6;
  const HELP = {
    cents: 'Cからの音程をcentで入力。小数に対応し、入力のたびに描画します。',
    ratio: 'Cからの周波数比を式で入力（1以上2未満）。例：3/2、5^(1/4)、2^(13/6)/3、√5/2、√[4]5、10^(7/8)/5。小数は使えません。'
  };
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
      const sector = node('path', { d: `M ${center} ${center} L ${p.join(' ')} A ${R} ${R} 0 0 0 ${q.join(' ')} Z`, fill: fifthColor(s.fifth), stroke: '#808080', 'stroke-width': 1 });
      soundTargets.set(sector, { pitches: model.pitches, sector: s, target: 'sector' });
      svg.append(sector);
    }
    // 1-cent rings in the third colours up to 428 cent; 400 and 408 (Pythagorean) are emphasised.
    // Range, widths and opacities were matched to radial profiles of the source figures (pages 215, 691, 2284).
    for (let cent = 380; cent <= 428; cent++) {
      const mark = cent === 400 || cent === 408;
      svg.append(node('circle', { cx: center, cy: center, r: innerRadius(cent, R), fill: 'none', stroke: thirdColor(cent), 'stroke-width': mark ? 1.8 : cent < 400 ? .8 : .6, opacity: mark ? .6 : cent > 408 ? .45 : .9 }));
    }
    // The ring the inscribed 386-cent circle touches is emphasised (yellow in the source method).
    svg.append(node('circle', { cx: center, cy: center, r: innerRadius(CIRCLE_THIRD, R), fill: 'none', stroke: thirdColor(CIRCLE_THIRD), 'stroke-width': 1.8, opacity: .5 }));
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
      soundTargets.set(ellipse, { pitches: model.pitches, sector: s, target: 'ellipse' });
      svg.append(ellipse);
      // The source rotates each two-line label with its sector. Third labels start a fixed
      // distance from the ellipse's inner end (baselines 24.5 and 38.5 beyond it), whatever its size.
      const labelPoint = xy(g.inner + 26.5, mid);
      const label = node('text', { x: 0, y: -2, transform: `translate(${labelPoint.join(' ')}) rotate(${mid - 90})`, 'data-label': 'third', 'text-anchor': 'middle', 'font-family': LABEL_FONT, 'font-size': 14, fill: textColor(thirdColor(s.third)) });
      label.append(node('tspan', { x: 0 }, fmt(s.third)), node('tspan', { x: 0, dy: 14, 'font-size': 12 }, `(${signed(s.third - 386)})`));
      svg.append(label);
      // Fifth labels sit just outside the centre disc as in the source (baselines at r = 70 and 81).
      // A 0.1 stroke in the text colour thickens the strokes to the source's ink (216 labels, 18 figures).
      const f = xy(72, mid);
      const fInk = textColor(fifthColor(s.fifth));
      const fLabel = node('text', { x: 0, y: -2, transform: `translate(${f.join(' ')}) rotate(${mid - 90})`, 'data-label': 'fifth', 'data-span': s.span, 'text-anchor': 'middle', 'font-family': LABEL_FONT, 'font-size': 11, fill: fInk, stroke: fInk, 'stroke-width': .1, 'paint-order': 'stroke' });
      fLabel.append(node('tspan', { x: 0 }, fmt(s.fifth)), node('tspan', { x: 0, dy: 11 }, `(${signed(s.fifth - 702)})`));
      svg.append(fLabel);
      svg.append(noteName(rootLabel(s.root), NAME_STYLE.root, s.start));
      svg.append(noteName(thirdLabel(s.middle), NAME_STYLE.third, mid));
    }
    svg.append(node('circle', { cx: center, cy: center, r: R, fill: 'none', stroke: '#778975', 'stroke-width': 1 }));
    svg.append(node('circle', { cx: center, cy: center, r: 53, fill: '#f7b779', stroke: '#7a6450', 'stroke-width': 1 }));
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
  function readCents() {
    return fields.map((field, i) => {
      try { return parseCents(field.value); }
      catch (error) { field.setAttribute('aria-invalid', 'true'); throw new Error(`${NAMES[i]}：${error.message}`); }
    });
  }
  // Ratio mode reads every field so each shows its own normal form or error, then reports the first error.
  function readRatios() {
    let first = null;
    const pitches = fields.map((field, i) => {
      try {
        const r = parseRatio(field.value), cents = checkOctave(r);
        notes[i].textContent = `= ${formatRatio(r)}　${cents.toFixed(3)} cent`; notes[i].className = 'ratio-note';
        return cents;
      } catch (error) {
        field.setAttribute('aria-invalid', 'true');
        notes[i].textContent = error.message; notes[i].className = 'ratio-note error';
        first = first || new Error(`${NAMES[i]}：${error.message}`);
        return NaN;
      }
    });
    if (first) throw first;
    return pitches;
  }
  // Exact match first; otherwise a preset within PRESET_TOLERANCE cent on every note, so values rounded by
  // switching (cent → 2^(c/1200) keeps 8-10 decimals) still count as their preset.
  function findPreset(pitches) {
    if (mode === 'cents') {
      return Object.keys(PRESETS).find(key => pitches.every((v, i) => v === PRESETS[key][i]))
        || matchPreset(pitches, PRESETS, PRESET_TOLERANCE) || matchPreset(pitches, PRESET_CENTS, PRESET_TOLERANCE);
    }
    const parsed = fields.map(f => parseRatio(f.value));
    return Object.keys(PRESET_PARSED).find(key => PRESET_PARSED[key].every((r, i) => sameRatio(r, parsed[i])))
      || matchPreset(pitches, PRESET_CENTS, PRESET_TOLERANCE);
  }
  function update() {
    for (const field of fields) field.removeAttribute('aria-invalid');
    try {
      const pitches = mode === 'cents' ? readCents() : readRatios();
      for (let i = 1; i < 12; i++) if (pitches[i] <= pitches[i - 1] || pitches[i] >= 1200) fields[i].setAttribute('aria-invalid', 'true');
      const model = buildModel(pitches);
      lastPitches = pitches;
      const presetKey = findPreset(pitches);
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
      status.textContent = '入力値を反映しました · 点線は平均律の位置'; status.className = 'status'; download.disabled = downloadPng.disabled = false;
    } catch (error) {
      status.textContent = `${error.message} 現在は直前の有効な図・表を表示しています。`;
      status.className = 'status error'; download.disabled = downloadPng.disabled = true;
    }
  }
  for (let i = 0; i < 12; i++) {
    const row = document.createElement('div'); row.className = 'note-row';
    const label = document.createElement('label'); label.htmlFor = `pitch-${i}`; label.textContent = NAMES[i];
    const input = document.createElement('input'); input.type = 'text'; input.inputMode = 'decimal'; input.id = `pitch-${i}`; input.value = equal[i]; input.autocomplete = 'off'; input.spellcheck = false;
    input.setAttribute('aria-label', `${NAMES[i]} の音程 cent`); input.setAttribute('aria-describedby', `status ratio-note-${i}`);
    input.addEventListener('focus', () => { lastField = input; });
    if (i === 0) { input.readOnly = true; input.setAttribute('aria-label', 'C の音程 cent 固定'); }
    else input.addEventListener('input', update);
    const delta = document.createElement('span'); delta.className = 'delta'; delta.textContent = '0';
    const note = document.createElement('span'); note.className = 'ratio-note'; note.id = `ratio-note-${i}`; note.hidden = true;
    fields.push(input); deltas.push(delta); notes.push(note); row.append(label, input, delta, note); inputArea.append(row);
  }
  // In ratio mode a preset fills its exact ratios (PRESET_RATIOS), not the rounded figure cents.
  function setPreset(key) { const values = mode === 'cents' ? PRESETS[key] : PRESET_RATIOS[key]; fields.forEach((f, i) => { f.value = values[i]; }); update(); }
  for (const key of Object.keys(PRESETS)) document.getElementById(key).addEventListener('click', () => setPreset(key));
  // Switching converts every field (cent → 2^(c/1200), ratio → cents); an unreadable field stops the switch.
  function setMode(next) {
    if (next === mode) return;
    let values;
    try {
      values = fields.map((f, i) => {
        try { return next === 'ratio' ? formatRatio(centsToRatio(f.value)) : String(checkOctave(parseRatio(f.value))); }
        catch (error) { throw new Error(`${NAMES[i]}：${error.message}`); }
      });
    } catch (error) {
      status.textContent = `${error.message} 入力を直してから切り替えてください。`; status.className = 'status error';
      return;
    }
    mode = next;
    fields.forEach((f, i) => {
      f.value = values[i];
      f.inputMode = mode === 'cents' ? 'decimal' : 'text';
      if (mode === 'ratio') f.setAttribute('maxlength', String(MAX_LENGTH)); else f.removeAttribute('maxlength');
      f.setAttribute('aria-label', `${NAMES[i]} の${mode === 'cents' ? '音程 cent' : '周波数比'}${i === 0 ? ' 固定' : ''}`);
      notes[i].hidden = mode === 'cents'; notes[i].textContent = '';
    });
    document.getElementById('mode-cents').setAttribute('aria-checked', String(mode === 'cents'));
    document.getElementById('mode-ratio').setAttribute('aria-checked', String(mode === 'ratio'));
    document.getElementById('ratio-tools').hidden = mode === 'cents';
    document.getElementById('input-help').textContent = HELP[mode];
    document.getElementById('value-heading').textContent = mode === 'cents' ? 'Cから / cent' : 'Cからの比';
    update();
  }
  function setSoundMode(next) {
    soundMode = next;
    document.getElementById('sound-dyad').setAttribute('aria-checked', String(next === 'dyad'));
    document.getElementById('sound-triad').setAttribute('aria-checked', String(next === 'triad'));
  }
  document.getElementById('sound-dyad').addEventListener('click', () => setSoundMode('dyad'));
  document.getElementById('sound-triad').addEventListener('click', () => setSoundMode('triad'));
  // The audio context starts on the first click (browsers allow sound only after a user gesture).
  document.getElementById('figure').addEventListener('click', event => {
    const hit = soundTargets.get(event.target);
    if (!hit) return;
    if (!audio) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) { status.textContent = 'このブラウザでは音を出せません。'; status.className = 'status error'; return; }
      audio = new AudioContextClass(); player = Sound.createPlayer(audio);
    }
    if (audio.state === 'suspended') audio.resume();
    player.play(Sound.noteFrequencies(hit.pitches, hit.sector, hit.target, soundMode));
  });
  document.getElementById('mode-cents').addEventListener('click', () => setMode('cents'));
  document.getElementById('mode-ratio').addEventListener('click', () => setMode('ratio'));
  document.getElementById('insert-root').addEventListener('click', () => {
    const f = lastField && !lastField.readOnly ? lastField : fields[1];
    if (typeof f.setRangeText === 'function') f.setRangeText('√', f.selectionStart ?? f.value.length, f.selectionEnd ?? f.value.length, 'end');
    else f.value += '√';
    if (typeof f.focus === 'function') f.focus();
    update();
  });
  // Rewrites only the fields that read but fall outside one octave; unreadable fields keep their message.
  document.getElementById('reduce-octave').addEventListener('click', () => {
    fields.forEach((f, i) => {
      if (i === 0) return;
      let r;
      try { r = parseRatio(f.value); } catch { return; }
      try { checkOctave(r); } catch { f.value = formatRatio(reduceOctave(r)); }
    });
    update();
  });
  // The same JSON goes into the SVG's <metadata> and the PNG's iTXt chunk "tuning-figure".
  function figureMetadata(svg) {
    return JSON.stringify({ pitches: lastPitches, reference: 'https://pianotuning.jp/?page_id=236', fifthReference: 702, thirdReference: 386, circleThirdReference: CIRCLE_THIRD, circleFifthReference: 700, colorReferences: [20, 32, 36, 39, 42, 45, 100, 135, 215, 496, 598, 691, 1545, 1783, 2153, 2284, 2295, 2306, 2680, 3448, 3462, 3717, 4026, 4362], fifthColorModel: 'lab-d50-invpow-grey-quadratic-pink-v2', fifthColorRange: [680, 738.5], thirdColorModel: 'lch-d50-bumped-main-figures-v2', thirdColorRange: [384, 428], rgbGamutMapping: 'component-clipping', figureBackground: svg.querySelector('rect').getAttribute('fill') });
  }
  function saveBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const svgBlob = svg => new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' });
  download.addEventListener('click', () => {
    const svg = document.querySelector('#figure svg').cloneNode(true);
    svg.append(node('metadata', {}, figureMetadata(svg)));
    saveBlob(svgBlob(svg), 'tuning-figure.svg');
  });
  // PNG: draw the figure's SVG at the chosen scale on a canvas (fonts are the viewer's, as on screen),
  // then add the title and the same metadata as iTXt chunks.
  downloadPng.addEventListener('click', async () => {
    const svg = document.querySelector('#figure svg').cloneNode(true);
    const scale = Number(pngScale.value);
    const [, , w, h] = svg.getAttribute('viewBox').split(' ').map(Number);
    svg.setAttribute('width', w * scale); svg.setAttribute('height', h * scale);
    const url = URL.createObjectURL(svgBlob(svg));
    downloadPng.disabled = true;
    try {
      const image = new Image();
      await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('図を画像にできませんでした。')); image.src = url; });
      const canvas = document.createElement('canvas');
      canvas.width = w * scale; canvas.height = h * scale;
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      const png = await new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('PNG を作れませんでした。倍率を下げてください。')), 'image/png'));
      const bytes = Png.addPngText(new Uint8Array(await png.arrayBuffer()), [
        ['Title', svg.querySelector('title').textContent],
        ['Software', 'tuning-figure (https://kazm00th.github.io/tuning-figure/)'],
        ['tuning-figure', figureMetadata(svg)]
      ]);
      saveBlob(new Blob([bytes], { type: 'image/png' }), 'tuning-figure.png');
    } catch (error) {
      status.textContent = error.message; status.className = 'status error';
    } finally {
      URL.revokeObjectURL(url);
      downloadPng.disabled = download.disabled;
    }
  });
  update();
})();



