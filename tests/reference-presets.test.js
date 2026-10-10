const {test}=require('node:test');
const assert=require('node:assert/strict');
const {PRESETS,buildModel}=require('../tuning.js');
const refs=require('./reference-presets.json');
for(const [key,ref] of Object.entries(refs))test(`${key}: all 24 reference intervals and valid geometry`,()=>{
  const model=buildModel(PRESETS[key]);
  // With "rounding", the reference is the value printed in the figure; exact intervals must round to it.
  const same=(v,r)=>ref.rounding?Number(v.toFixed(1))===r:Math.abs(v-r)<1e-8;
  const unmatched=ref.unmatchedThirds||{};
  model.sectors.forEach((s,i)=>{
    assert.ok(same(s.fifth,ref.fifths[i]),`${key} fifth ${i}: ${s.fifth}`);
    // The figure's own values cannot all be closed into one circle; record what is drawn instead.
    if(i in unmatched)assert.ok(same(s.third,unmatched[i])&&!same(s.third,ref.thirds[i]),`${key} third ${i}: ${s.third}`);
    else assert.ok(same(s.third,ref.thirds[i]),`${key} third ${i}: ${s.third}`);
  });
  assert.ok(Math.abs(model.sectors.reduce((sum,s)=>sum+s.span,0)-360)<1e-8);
});
