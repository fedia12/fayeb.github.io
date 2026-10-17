import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateManifest} from '../animation/player.mjs';
const states=['sleep','warn','cry','recovery','happy'];
const valid=()=>({version:1,enabled:true,crossfadeMs:220,states:Object.fromEntries(states.map(s=>[s,{loop:{webm:s+'.webm',mp4:s+'.mp4'}}]))});
test('disabled manifest allows existing site to remain untouched',()=>assert.doesNotThrow(()=>validateManifest({version:1,enabled:false})));
test('requires a real animated loop for all five states',()=>{const m=valid();delete m.states.cry.loop;assert.throws(()=>validateManifest(m),/cry/);});
test('validates enabled manifest and crossfade budget',()=>{assert.doesNotThrow(()=>validateManifest(valid()));const m=valid();m.crossfadeMs=9000;assert.throws(()=>validateManifest(m),/crossfade/);});
test('rejects script and inline fake clip sources',()=>{const m=valid();m.states.sleep.loop.webm='javascript:alert(1)';assert.throws(()=>validateManifest(m),/Invalid/);});
