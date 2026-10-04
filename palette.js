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
  // Full-precision L/C coefficients from third-lch-fit.json (ascending powers of t).
  const THIRD_LC = [
    [[81.62269140256141,65.56911951541251],[15.24041412348106,10.223982612576535]],
    [[96.86310552604247,75.79310212798904],[-51.408753707784165,-28.734905442729183],[89.69325403924225,-65.3629360200593],[-148.46586265911628,124.3698153802159],[77.8610494039813,-50.017991789371294]],
    [[64.54279260236558,56.04708425604517],[-79.00191137253961,-133.10236613567264],[17.46783419913339,199.6535492035091],[55.71146577369541,-133.10236613567267],[-30.767038586703254,33.27559153391815]]
  ];
  function thirdLch(value) {
    if (!Number.isFinite(value)) throw new Error('色の計算には有限のcent値が必要です。');
    const c=Math.max(384,Math.min(428,value));
    const knots=[384,1200*Math.log2(5/4),400,428];
    const j=c<knots[1]?0:c<400?1:2;
    const t=(c-knots[j])/(knots[j+1]-knots[j]);
    const [L,C]=THIRD_LC[j].reduceRight(([l,a],[x,y])=>[l*t+x,a*t+y],[0,0]);
    const h=91.62802015984734+152.42338423628564/(1+Math.exp(-.18828126070410406*(c-402.11542070352215)));
    return [L,C,h];
  }
  function thirdLab(value) {
    const [L,C,h]=thirdLch(value),r=h*Math.PI/180;
    return [L,C*Math.cos(r),C*Math.sin(r)];
  }
  const thirdColor = value => hex(labToRgb(thirdLab(value)));
  // Gray curve plus a discontinuous quadratic pink fit, in CIE Lab D50.
  function fifthLab(value) {
    if (!Number.isFinite(value)) throw new Error('色の計算には有限のcent値が必要です。');
    if (value<=680) return [0,0,0];
    if (value<=702) return [100*((value-680)/22)**.82,0,0];
    // Extrapolation beyond the measured range is unverified: retain its endpoint.
    const d=Math.min(value,738.5)-702;
    return [95.8634-1.18098*d-.00692859*d*d,
            6.40959+.410919*d+.00884569*d*d,
            -.840578-.157662*d+.000665994*d*d];
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
    const l=luminance(color), dark=luminance('#26352b');
    const contrastDark=(Math.max(l,dark)+0.05)/(Math.min(l,dark)+0.05);
    return 1.05/(l+0.05)>contrastDark?'#ffffff':'#26352b';
  }
  const api={THIRD_STOPS,FIFTH_STOPS,thirdColor,thirdLch,thirdLab,fifthColor,fifthLab,labToRgb,textColor};
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  else host.TuningPalette=api;
})(globalThis);
