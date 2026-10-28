(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.DevAreaCore=api;})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  function decodeBase64Url(segment){
    if(typeof segment!=='string'||segment.length===0)throw new Error('This segment is empty.');
    if(!/^[A-Za-z0-9_-]+={0,2}$/.test(segment)||/=/.test(segment.slice(0,-2)))throw new Error('The segment contains characters that are not valid Base64url.');
    let normalized=segment.replace(/-/g,'+').replace(/_/g,'/').replace(/=+$/,'');normalized+='='.repeat((4-normalized.length%4)%4);
    let bytes;
    try{
      if(typeof Buffer!=='undefined'&&typeof Buffer.from==='function')bytes=Uint8Array.from(Buffer.from(normalized,'base64'));
      else{const binary=atob(normalized);bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));}
    }catch{throw new Error('The segment could not be Base64url decoded.');}
    try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw new Error('The segment decoded, but it is not valid UTF-8 text.');}
  }
  function decodeJsonSegment(segment,label){
    const decoded=decodeBase64Url(segment);let value;
    try{value=JSON.parse(decoded);}catch{throw new Error(`The ${label} segment decodes, but it is not valid JSON.`);}
    if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(`The ${label} must be a JSON object.`);
    return {decoded,value};
  }
  function parseJwt(raw,nowSeconds=Math.floor(Date.now()/1000)){
    let token=String(raw??'').trim();if(!token)throw new Error('Paste a token to inspect it.');
    token=token.replace(/^Bearer\s+/i,'').trim();token=token.replace(/^['"]|['"]$/g,'');
    const parts=token.split('.');if(parts.length!==3)throw new Error(parts.length===5?'This inspector handles three-part signed JWTs (JWS). Five-part encrypted JWE tokens need a different workflow.':`Expected 3 dot-separated JWT segments, but found ${parts.length}.`);
    if(!parts[0]||!parts[1])throw new Error('The header and payload segments cannot be empty.');
    const header=decodeJsonSegment(parts[0],'header');const payload=decodeJsonSegment(parts[1],'payload');
    if(parts[2]&&!/^[A-Za-z0-9_-]+={0,2}$/.test(parts[2]))throw new Error('The signature segment contains characters outside the Base64url alphabet.');
    const claims=[];const standard={iss:['Issuer','The system or principal that issued the token.'],sub:['Subject','The principal the token is about.'],aud:['Audience','The recipient or recipients the token is intended for.'],exp:['Expiration time','The token must not be accepted on or after this time.'],nbf:['Not before','The token must not be accepted before this time.'],iat:['Issued at','The time the token was issued.'],jti:['JWT ID','A token identifier, often used for replay-related controls.']};
    Object.keys(payload.value).forEach(name=>{const value=payload.value[name];const info=standard[name];let display=typeof value==='object'?JSON.stringify(value):String(value);let status='';let note=info?info[1]:'Application-specific claim.';
      if(['exp','nbf','iat'].includes(name)&&typeof value==='number'&&Number.isFinite(value)){const d=new Date(value*1000);display=Number.isNaN(d.getTime())?String(value):`${d.toISOString()} (${value})`;if(name==='exp')status=value<=nowSeconds?'Expired':'Not expired by time';if(name==='nbf')status=value>nowSeconds?'Not active yet':'Time gate passed';if(name==='iat')status=value>nowSeconds?'Issued in the future':'Timestamp readable';}
      if(['exp','nbf','iat'].includes(name)&&typeof value!=='number')status='Expected numeric date';
      claims.push({name,value,display,description:info?info[0]:'Custom claim',note,status});
    });
    const warnings=[];if(header.value.alg==='none')warnings.push('The header declares alg=none. This inspector does not decide whether a token is acceptable.');if(!parts[2])warnings.push('The signature segment is empty.');if(!Object.prototype.hasOwnProperty.call(payload.value,'exp'))warnings.push('No exp claim is present. Whether it is required depends on the application.');
    return {token,header:header.value,headerPretty:JSON.stringify(header.value,null,2),payload:payload.value,payloadPretty:JSON.stringify(payload.value,null,2),headerDecoded:header.decoded,payloadDecoded:payload.decoded,signature:parts[2],segments:parts,claims,warnings,nowSeconds};
  }
  function fmt(n,precision=4){const fixed=Number(n).toFixed(precision);if(Number(fixed)===0)return '0';return fixed.includes('.')?fixed.replace(/0+$/,'').replace(/\.$/,''):fixed;}
  function clampModel({minSize,maxSize,minViewport,maxViewport,unit='rem',rootFontSize=16,precision=4,property='font-size'}){
    const a=Number(minSize),b=Number(maxSize),v1=Number(minViewport),v2=Number(maxViewport),root=Number(rootFontSize);
    if(![a,b,v1,v2,root].every(Number.isFinite))throw new Error('Enter numeric values for every field.');
    const allowedProperties=['font-size','padding','padding-block','padding-inline','margin-block','gap','border-radius','width'];
    if(!allowedProperties.includes(property))throw new Error('Choose a supported CSS property.');
    if(property!=='margin-block'&&(a<0||b<0))throw new Error('Negative values are only enabled for margin-block.');
    if(b<=a)throw new Error('Maximum size must be greater than minimum size.');
    if(v1<=0||v2<=v1)throw new Error('Maximum viewport must be greater than a positive minimum viewport.');
    if(root<=0||root>200)throw new Error('Root font size must be between 0 and 200 pixels.');
    if(!['rem','px'].includes(unit))throw new Error('Choose px or rem as the output unit.');
    const toPx=x=>unit==='rem'?x*root:x;const fromPx=x=>unit==='rem'?x/root:x;
    const minPx=toPx(a),maxPx=toPx(b),slopeVW=(maxPx-minPx)/(v2-v1)*100;const interceptPx=minPx-(slopeVW/100)*v1;const intercept=fromPx(interceptPx);
    const precisionSafe=Math.max(0,Math.min(6,Number(precision)||0));const minText=fmt(a,precisionSafe),maxText=fmt(b,precisionSafe),interceptText=fmt(intercept,precisionSafe),slopeText=fmt(slopeVW,precisionSafe);
    const preferred=intercept<0?`calc(${interceptText}${unit} + ${slopeText}vw)`:`calc(${interceptText}${unit} + ${slopeText}vw)`;
    const value=`clamp(${minText}${unit}, ${preferred}, ${maxText}${unit})`;const declaration=`${property}: ${value};`;
    const twValue=value.replace(/\s+/g,'_');const twUtilities={'font-size':'text','padding':'p','padding-block':'[padding-block','padding-inline':'[padding-inline','margin-block':'[margin-block','gap':'gap','border-radius':'rounded','width':'w'};
    const utility=twUtilities[property]||'[value';const tailwind=utility.startsWith('[')?`${utility}:${twValue}]`:`${utility}-[${twValue}]`;
    function evaluateAt(width){const raw=interceptPx+(slopeVW/100)*Number(width);return Math.max(minPx,Math.min(maxPx,raw));}
    function evaluateText(width){return `${fmt(fromPx(evaluateAt(width)),precisionSafe)}${unit}`;}
    return {min:a,max:b,minViewport:v1,maxViewport:v2,unit,rootFontSize:root,property,intercept,slopeVW,interceptPx,minPx,maxPx,value,declaration,evaluateAt,evaluateText,tailwind};
  }
  return {decodeBase64Url,parseJwt,clampModel,formatNumber:fmt};
});
