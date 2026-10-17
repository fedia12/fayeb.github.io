import {test} from 'node:test';
import assert from 'node:assert/strict';
import {damp,cameraTarget,CAMERA_STATES} from '../camera.mjs';
test('sleep push-in is very slow, bounded and monotonic',()=>{const values=[0,10,60,300,3600].map(t=>cameraTarget('sleep',t,false));for(let i=1;i<values.length;i++)assert.ok(values[i]>=values[i-1]);assert.ok(values[1]-values[0]<.004);assert.ok(values.at(-1)<=1.0281);});
test('all targets stay within safe desktop and mobile zoom bounds',()=>{for(const s of Object.keys(CAMERA_STATES))for(const t of [0,10,300]){assert.ok(cameraTarget(s,t,false)<=1.18);assert.ok(cameraTarget(s,t,true)<=1.13);}});
test('critically damped movement is gradual and does not overshoot a constant target',()=>{let x=1,v=0;for(let i=0;i<600;i++){const previous=x;[x,v]=damp(x,v,1.18,.95,1/30);assert.ok(x>=previous&&x<=1.18000001);assert.ok(x-previous<.004);}assert.ok(Math.abs(x-1.18)<.0001);});
test('interrupted motion maintains position and velocity continuity',()=>{let x=1,v=0;for(let i=0;i<60;i++)[x,v]=damp(x,v,1.18,.95,1/30);const before=x;[x,v]=damp(x,v,1.01,.85,1/30);assert.ok(Math.abs(x-before)<.004);for(let i=0;i<600;i++)[x,v]=damp(x,v,1.01,.85,1/30);assert.ok(Math.abs(x-1.01)<.0001);});
test('head/ear reference envelope remains inside frame even at the maximum zoom',()=>{for(const zoom of [1.185,1.135]){for(const x of [.19,.84])assert.ok(.5+(x-.5)*zoom>0&&.5+(x-.5)*zoom<1);for(const y of [.10,.69])assert.ok(.43+(y-.43)*zoom>0&&.43+(y-.43)*zoom<1);}});
