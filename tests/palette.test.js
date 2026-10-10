const {test} = require('node:test');
const assert = require('node:assert/strict');
const {thirdColor,thirdLch,fifthColor,fifthLab,labToRgb,textColor} = require('../palette.js');
// Expected colours from an independent Python implementation of the v2 formulas (fit to the main figures).
test('third colors agree with independent Python LCh palette including gamut clipping', () => {
  for(const [cent,want] of [[384,'#dacd46'],[386,'#fef454'],[392,'#bdd65c'],[397,'#6fbd66'],[400,'#13ae68'],[402,'#04a375'],[405,'#018c80'],[408,'#00757f'],[412,'#005c71'],[428,'#024b65']]) assert.equal(thirdColor(cent),want);
});
test('third L*/C* peak at the measured maximum, held from 386 cent to the pure third',()=>{
  for(const c of [386,1200*Math.log2(5/4)]) {
    const [L,C]=thirdLch(c);
    assert.ok(Math.abs(L-94.908)<1e-9);assert.ok(Math.abs(C-75.018)<1e-9);
  }
});
test('third LCh boundaries are continuous and wide thirds have monotonic L/C/h',()=>{
  for(const b of [386,1200*Math.log2(5/4),1200*Math.log2(81/64),400]) {
    const left=thirdLch(b-1e-7),right=thirdLch(b+1e-7);
    left.forEach((v,i)=>assert.ok(Math.abs(v-right[i])<1e-5));
  }
  let prev=thirdLch(400);
  for(let i=1;i<=2800;i++) {
    const next=thirdLch(400+i/100);
    assert.ok(next[0]<=prev[0]+1e-10);assert.ok(next[1]<=prev[1]+1e-10);assert.ok(next[2]>=prev[2]);prev=next;
  }
  assert.equal(thirdColor(300),thirdColor(384));
  assert.throws(()=>thirdColor(NaN));assert.throws(()=>thirdColor(Infinity));
});
test('fifth colors agree with independent Python Lab-to-sRGB palette conversion', () => {
  // Expected values from the independent Python implementation of the v2 fifth formulas.
  for(const [cent,want] of [[680,'#000000'],[690,'#767676'],[696.5,'#c4c4c4'],[700,'#ececec'],[702,'#ffffff'],[702.1,'#fff1f7'],[703,'#fdeef4'],[705.5,'#f6e4ec'],[716.5,'#d8b7c5'],[727.5,'#b8869d'],[738.5,'#965274']]) assert.equal(fifthColor(cent),want);
  assert.deepEqual(labToRgb([100,0,0]),[255,255,255]);
});
test('gray fifths are neutral and pink jumps immediately above 702',()=>{
  for (const c of [678,680,681,696,700,701.999,702]) {
    const [r,g,b]=labToRgb(fifthLab(c));assert.equal(r,g);assert.equal(g,b);
  }
  const [L,a,b]=fifthLab(702+1e-7);
  // The source already shows pink at 702.1 cent (L* 97.7, C* 3.9); v2 starts at L* 96.6, C* 5.8.
  assert.ok(L<97 && Math.hypot(a,b)>5);
  assert.notEqual(fifthColor(702+1e-7),fifthColor(702));
});
test('palette clamps beyond fit bounds and rejects non-finite fifths', () => {
  assert.equal(thirdColor(450),thirdColor(428));
  assert.equal(fifthColor(650),fifthColor(680));
  assert.equal(fifthColor(800),fifthColor(738.5));
  assert.throws(()=>fifthColor(NaN));assert.throws(()=>fifthColor(Infinity));
});
test('label text chooses stronger contrast on black and white',()=>{
  assert.equal(textColor('#000000'),'#ffffff');
  assert.equal(textColor('#ffffff'),'#000000');
});
