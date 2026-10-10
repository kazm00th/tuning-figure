(function (host) {
  'use strict';
  // Modal fill RGB from page 1027's GIFs. The pure-ratio point shares the 386 swatch.
  const THIRD_STOPS = [
    [384,[217,205,70]], [386,[255,243,82]], [1200*Math.log2(5/4),[255,243,82]],
    [388,[237,235,86]], [390,[226,230,87]], [392,[202,220,91]], [394,[161,205,95]],
    [396,[130,195,98]], [398,[87,183,101]], [400,[20,174,103]], [402,[1,162,117]],
    [404,[1,149,126]], [406,[1,134,129]], [408,[0,117,127]], [410,[0,102,121]], [412,[0,94,115]],
    // Beyond page 1027's range: modal JPEG fills from pages 3448 / 2284 / 691.
    [416,[0,84,108]], [422.5,[1,77,103]], [428,[0,74,99]]
  ];
  // Modal fill RGB from page 3956. Its 697 filename is labelled 697.2 in the image.
  const FIFTH_STOPS = [
    [680,[0,0,0]], [696,[190,190,190]], [696.5,[196,196,196]], [697.2,[204,204,204]],
    [698,[213,213,213]], [699,[224,224,224]], [700,[232,232,232]], [701,[246,246,246]],
    [702,[255,255,255]], [703,[253,238,243]], [705.5,[245,222,232]],
    [716.5,[215,184,199]], [727.5,[184,132,155]], [738.5,[150,80,114]]
  ];
  const hex = rgb => '#' + rgb.map(v => Math.round(v).toString(16).padStart(2,'0')).join('');
  function interpolate(stops,value) {
    if (!Number.isFinite(value)) throw new Error('色の計算には有限のcent値が必要です。');
    if (value <= stops[0][0]) return hex(stops[0][1]);
    for (let i=1;i<stops.length;i++) {
      if (value<=stops[i][0]) {
        const [lo,a]=stops[i-1], [hi,b]=stops[i];
        const t=(value-lo)/(hi-lo);
        return hex(a.map((v,k)=>v+(b[k]-v)*t));
      }
    }
    return hex(stops[stops.length-1][1]);
  }
  // Third colours (v2), fitted to the main figures' per-cent mean colours (CIE LCh, D50).
  // L* and C* rise linearly from 384 to the measured maximum at 386 cent and hold it to the pure third.
  const PURE=1200*Math.log2(5/4), PYTH=1200*Math.log2(81/64);
  const L384=81.62269140256141, C384=65.56911951541251, LMAX=94.908, CMAX=75.018;
  // L*: concave quadratic to the Pythagorean third, then an exponential tail with matching value and slope,
  // plus a flat-topped bump over 401-410 cent.
  const TL={s:-2.218905275533379,q:-0.009054941960713913,inf:28.78607567578492,B:1.832479628286403,mu:405.82191800474095,w:4.741119322453047,beta:5.540519608922919};
  // C*: logistic decay plus a sharp bump peaking at 400 cent and a narrow dip at 397.5 cent.
  const TC={inf:24.839992064046672,m:392.10391797514643,w:5.108862639939975,B:20.601497506641685,s:4.225485001064182,beta:1.40757352809885,dip:2.433621220960859,dipMu:397.5229357862231,dipW:0.7692967344574323};
  // h: logistic plus a flat-topped downward bump.
  const TH={a:91.39054896048499,b:148.08210279439027,k:0.21173656564902385,m:400.8648534935343,B:-11.427943887179248,mu:403.8227397496136,w:4.153265433743644,beta:3.0352432241339424};
  const genGauss=(x,B,mu,w,beta)=>B*Math.exp(-(Math.abs((x-mu)/w)**beta));
  const thirdBumpC=x=>genGauss(x,TC.B,400,TC.s,TC.beta)-TC.dip*Math.exp(-(((x-TC.dipMu)/TC.dipW)**2));
  const thirdDecayC=x=>1/(1+Math.exp((x-TC.m)/TC.w));
  function thirdLch(value) {
    if (!Number.isFinite(value)) throw new Error('色の計算には有限のcent値が必要です。');
    const c=Math.max(384,Math.min(428,value));
    const h=TH.a+TH.b/(1+Math.exp(-TH.k*(c-TH.m)))+genGauss(c,TH.B,TH.mu,TH.w,TH.beta);
    if (c<386) { const t=(c-384)/2; return [L384+(LMAX-L384)*t,C384+(CMAX-C384)*t,h]; }
    if (c<PURE) return [LMAX,CMAX,h];
    const d=c-PURE, dk=PYTH-PURE;
    let L;
    if (c<=PYTH) L=LMAX+TL.s*d+TL.q*d*d;
    else {
      const L1=LMAX+TL.s*dk+TL.q*dk*dk, s1=TL.s+2*TL.q*dk;
      L=TL.inf+(L1-TL.inf)*Math.exp(-(c-PYTH)/((L1-TL.inf)/-s1));
    }
    L+=genGauss(c,TL.B,TL.mu,TL.w,TL.beta);
    const C=TC.inf+(CMAX-TC.inf-thirdBumpC(PURE))/thirdDecayC(PURE)*thirdDecayC(c)+thirdBumpC(c);
    return [L,C,h];
  }
  function thirdLab(value) {
    const [L,C,h]=thirdLch(value),r=h*Math.PI/180;
    return [L,C*Math.cos(r),C*Math.sin(r)];
  }
  const thirdColor = value => hex(labToRgb(thirdLab(value)));
  // Fifth colours (v2), CIE Lab D50: black up to 680, a grey ramp to white at 702 (inverse power; the
  // figures have no data between 680 and 696), then a discontinuous pink with quadratic L*/C* and constant hue.
  const FIFTH_GREY=1.1251404620039, FIFTH_L=[96.64117060136272,-1.2320812972133477,-0.00578128025561412];
  const FIFTH_C=[5.818261166099397,0.4956988742233433,0.006655015773331193], FIFTH_H=348.6281776102556*Math.PI/180;
  function fifthLab(value) {
    if (!Number.isFinite(value)) throw new Error('色の計算には有限のcent値が必要です。');
    if (value<=680) return [0,0,0];
    if (value<=702) return [100*(1-((702-value)/22)**FIFTH_GREY),0,0];
    // Extrapolation beyond the measured range is unverified: retain its endpoint.
    const d=Math.min(value,738.5)-702;
    const L=FIFTH_L[0]+FIFTH_L[1]*d+FIFTH_L[2]*d*d, C=FIFTH_C[0]+FIFTH_C[1]*d+FIFTH_C[2]*d*d;
    return [L,C*Math.cos(FIFTH_H),C*Math.sin(FIFTH_H)];
  }
  const multiply=(m,v)=>m.map(row=>row.reduce((sum,x,i)=>sum+x*v[i],0));
  function labToRgb([L,a,b]) {
    const fy=(L+16)/116;
    const white=[.3457/.3585,1,(1-.3457-.3585)/.3585];
    const xyz=[fy+a/500,fy,fy-b/200].map((f,i)=>white[i]*(f**3>216/24389?f**3:(116*f-16)/(24389/27)));
    const d65=multiply([
      [.955473421488075,-.02309845494876471,.06325924320057072],
      [-.0283697093338637,1.0099953980813041,.021041441191917323],
      [.012314014864481998,-.020507649298898964,1.330365926242124]
    ],xyz);
    const linear=multiply([
      [12831/3959,-329/214,-1974/3959],
      [-851781/878810,1648619/878810,36519/878810],
      [705/12673,-2585/12673,705/667]
    ],d65);
    return linear.map(v=>Math.round(255*Math.max(0,Math.min(1,v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055))));
  }
  const fifthColor = value => hex(labToRgb(fifthLab(value)));
  function luminance(color) {
    const rgb = [1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255).map(v=>v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4);
    return rgb[0]*0.2126+rgb[1]*0.7152+rgb[2]*0.0722;
  }
  function textColor(color) {
    // Decide light/dark against #26352b (keeps the source's white text on 404–406 cent ellipses),
    // but draw dark text in black as the source does.
    const l=luminance(color), dark=luminance('#26352b');
    const contrastDark=(Math.max(l,dark)+0.05)/(Math.min(l,dark)+0.05);
    return 1.05/(l+0.05)>contrastDark?'#ffffff':'#000000';
  }
  const api={THIRD_STOPS,FIFTH_STOPS,thirdColor,thirdLch,thirdLab,fifthColor,fifthLab,labToRgb,textColor};
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  else host.TuningPalette=api;
})(globalThis);
