const {test}=require('node:test');
const assert=require('node:assert/strict');
const {PRESETS,buildModel}=require('../tuning.js');
const refs=require('./reference-presets.json');
for(const [key,ref] of Object.entries(refs))test(`${key}: all 24 reference intervals and valid geometry`,()=>{
  const model=buildModel(PRESETS[key]);
  model.sectors.forEach((s,i)=>{
    assert.ok(Math.abs(s.fifth-ref.fifths[i])<1e-8);
    assert.ok(Math.abs(s.third-ref.thirds[i])<1e-8);
  });
  assert.ok(Math.abs(model.sectors.reduce((sum,s)=>sum+s.span,0)-360)<1e-8);
});
