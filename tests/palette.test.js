const {test} = require('node:test');
const assert = require('node:assert/strict');
const {thirdColor,thirdLch,fifthColor,fifthLab,labToRgb,textColor} = require('../palette.js');
// Independent modal RGB measurements from the supplied reference images.
test('third colors agree with independent Python LCh palette including gamut clipping', () => {
  for(const [cent,want] of [[384,'#d8cd46'],[386,'#fbf555'],[392,'#bed85e'],[400,'#27b36c'],[402,'#00a279'],[408,'#00767f'],[412,'#056174'],[428,'#124861']]) assert.equal(thirdColor(cent),want);
});
test('third LCh boundaries are continuous and wide thirds have monotonic L/C/h',()=>{
  for(const b of [1200*Math.log2(5/4),400]) {
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
  // Expected values from fifth-color-palette-data.json, computed with inverse matrices.
  for(const [cent,want] of [[680,'#000000'],[696.5,'#c4c4c4'],[700,'#e9e9e9'],[702,'#ffffff'],[702.1,'#ffeff5'],[703,'#fcebf2'],[705.5,'#f6e2ea'],[716.5,'#d7b6c5'],[727.5,'#b8859d'],[738.5,'#965072']]) assert.equal(fifthColor(cent),want);
  assert.deepEqual(labToRgb([100,0,0]),[255,255,255]);
});
test('gray fifths are neutral and pink jumps immediately above 702',()=>{
  for (const c of [678,680,681,696,700,701.999,702]) {
    const [r,g,b]=labToRgb(fifthLab(c));assert.equal(r,g);assert.equal(g,b);
  }
  const [L,a,b]=fifthLab(702+1e-7);
  assert.ok(L<96 && Math.hypot(a,b)>6.4);
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
  assert.equal(textColor('#ffffff'),'#26352b');
});
