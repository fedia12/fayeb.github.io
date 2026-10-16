import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DreamEngine} from '../engine.mjs';
function feed(e,rms,seconds){for(let i=0;i<Math.round(seconds*100);i++)e.advance(rms,.01);}
test('quiet sleep and isolated noise do not wake koala',()=>{const e=new DreamEngine();feed(e,.005,2);assert.equal(e.state,'sleep');feed(e,.2,.15);feed(e,.005,2);assert.equal(e.state,'sleep');});
test('sustained noise warns then cries, quiet recovers then sleeps',()=>{const e=new DreamEngine();feed(e,.16,1.8);assert.equal(e.state,'warn');feed(e,.16,4);assert.equal(e.state,'cry');feed(e,.001,5);assert.equal(e.state,'recovery');feed(e,.001,3);assert.equal(e.state,'sleep');});
test('hysteresis band does not start recovery',()=>{const e=new DreamEngine();feed(e,.16,6);feed(e,.058,10);assert.equal(e.state,'cry');});
test('timer uses all elapsed time when frames are delayed',()=>{const e=new DreamEngine({duration:60});e.advance(.001,20);assert.equal(e.remaining,40);e.advance(.001,40);assert.equal(e.state,'happy');assert.equal(e.done,true);assert.equal(e.measured,0);assert.equal(e.percentage,null);});
test('delayed frame cannot fabricate sustained excessive noise',()=>{const e=new DreamEngine();e.advance(.2,10);assert.equal(e.state,'sleep');});
test('pause freezes timer, measurement and state',()=>{const e=new DreamEngine();feed(e,.16,2);const snapshot=JSON.stringify(e);e.paused=true;e.advance(.16,50);assert.ok(Math.abs(e.remaining-298)<1e-8);e.paused=false;assert.equal(JSON.stringify(e),snapshot);});
test('restart gets a clean model and statistics',()=>{let e=new DreamEngine();feed(e,.2,7);e=new DreamEngine({duration:120});assert.equal(e.state,'sleep');assert.equal(e.remaining,120);assert.equal(e.level,0);assert.equal(e.measured,0);});
test('score reflects measured time, finish always celebrates',()=>{const e=new DreamEngine();feed(e,.001,10);assert.equal(e.percentage,100);feed(e,.2,10);assert.ok(e.percentage>=45&&e.percentage<=55);e.complete();assert.equal(e.state,'happy');});
