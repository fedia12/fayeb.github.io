/** Separate camera-only experiment. This does not generate character animation. */
export const CAMERA_STATES = Object.freeze({
  sleep: {desktop:1.004,mobile:1.003,omega:.42},
  warn: {desktop:1.075,mobile:1.055,omega:1.0},
  cry: {desktop:1.18,mobile:1.13,omega:.95},
  recovery: {desktop:1.01,mobile:1.007,omega:.85},
  disappointed: {desktop:1.065,mobile:1.045,omega:.85},
  happy: {desktop:1.0,mobile:1.0,omega:.85}
});
export function damp(position, velocity, target, omega, dt) {
  const delta=position-target, decay=Math.exp(-omega*dt), step=(velocity+omega*delta)*dt;
  return [target+(delta+step)*decay,(velocity-omega*step)*decay];
}
export function cameraTarget(state, ageSeconds, mobile) {
  const config=CAMERA_STATES[state]||CAMERA_STATES.sleep;
  let target=mobile?config.mobile:config.desktop;
  if(state==='sleep')target+=(mobile?.016:.024)*(1-Math.exp(-Math.max(0,ageSeconds)/70));
  return target;
}
const validMode=mode=>mode==='fixed'||mode==='cinematic';
export class CameraController {
  constructor(room, select) {
    this.room=room;this.select=select;this.stage=document.createElement('div');
    this.stage.className='camera-stage';this.stage.id='cameraStage';this.stage.setAttribute('aria-hidden','true');
    for(const child of [...room.children]) {
      if(child.matches('.art,.ear,.recovery-paw,.tears,.sleep-motes,.celebration,.character-film'))this.stage.append(child);
    }
    room.prepend(this.stage);
    this.scale=1;this.velocity=0;this.age=0;this.last=0;this.paint=0;this.raf=0;this.state=room.dataset.state||'sleep';
    this.reduced=matchMedia('(prefers-reduced-motion: reduce)');this.mobile=matchMedia('(max-width: 900px)');
    this.paused=document.body.classList.contains('paused');this.hidden=document.hidden;this.fixedTransition=null;
    const query=new URLSearchParams(location.search).get('camera');
    let saved;try{saved=localStorage.getItem('koala-camera-experiment-mode');}catch{}
    this.mode=validMode(query)?query:validMode(saved)?saved:'cinematic';select.value=this.mode;
    this.change=()=>this.setMode(select.value);
    this.motionChange=()=>{this.cancel();if(this.reduced.matches)this.stationary();this.updateNote();this.wake();};
    this.resize=()=>{this.last=0;this.wake();};
    this.visibility=()=>{this.hidden=document.hidden;this.cancel();if(!this.hidden)this.wake();};
    this.observer=new MutationObserver(records=>{
      for(const r of records){
        if(r.target===room){const next=room.dataset.state||'sleep';if(next!==this.state){this.state=next;this.age=0;}}
        else this.paused=document.body.classList.contains('paused');
      }
      if(this.paused)this.cancel();else this.wake();
    });
    this.observer.observe(room,{attributes:true,attributeFilter:['data-state']});
    this.observer.observe(document.body,{attributes:true,attributeFilter:['class']});
    this.select.addEventListener('change',this.change);
    this.reduced.addEventListener('change',this.motionChange);this.mobile.addEventListener('change',this.resize);
    document.addEventListener('visibilitychange',this.visibility);
    this.tick=this.tick.bind(this);this.room.dataset.camera=this.mode;this.updateNote();
    if(this.mode==='fixed'||this.reduced.matches)this.stationary();this.wake();
  }
  updateNote(){const note=document.getElementById('cameraMotionNote');if(note)note.textContent=this.reduced.matches?'تفضيل تقليل الحركة مفعّل: الكاميرا ثابتة في كلا الوضعين.':'حركة هادئة داخل المشهد فقط.';}
  stationary(){this.scale=1;this.velocity=0;this.fixedTransition=null;this.apply();this.stage.classList.add('camera-stationary');}
  apply(){this.stage.style.transform=`scale(${this.scale.toFixed(7)})`;}
  setMode(mode) {
    this.updateNote();
    if(!validMode(mode)||this.mode===mode)return;
    this.mode=mode;this.select.value=mode;this.room.dataset.camera=mode;
    try{localStorage.setItem('koala-camera-experiment-mode',mode);}catch{}
    const url=new URL(location.href);url.searchParams.set('camera',mode);history.replaceState(null,'',url);
    if(this.reduced.matches)this.stationary();
    else if(mode==='fixed'&&Math.abs(this.scale-1)>.000001)this.fixedTransition={from:this.scale,elapsed:0};
    else if(mode==='fixed')this.stationary();
    else {this.fixedTransition=null;this.velocity=0;this.stage.classList.remove('camera-stationary');}
    this.cancel();this.wake();
  }
  wake(){if(!this.raf&&!this.paused&&!this.hidden&&!this.reduced.matches&&(this.mode==='cinematic'||this.fixedTransition))this.raf=requestAnimationFrame(this.tick);}
  cancel(){cancelAnimationFrame(this.raf);this.raf=0;this.last=0;this.paint=0;}
  tick(now) {
    this.raf=0;
    if(this.reduced.matches){this.stationary();this.updateNote();return;}
    if(this.paused||this.hidden)return;
    if(!this.last){this.last=now;this.paint=now;this.wake();return;}
    // Render only ~30 camera updates/sec. Cap long gaps so resuming never jumps.
    if(now-this.paint<30){this.wake();return;}
    const dt=Math.min(.1,(now-this.last)/1000);this.last=this.paint=now;this.age+=dt;
    if(this.fixedTransition){
      const move=this.fixedTransition;move.elapsed+=dt;const t=Math.min(1,move.elapsed/1.8),smooth=t*t*(3-2*t);
      this.scale=move.from+(1-move.from)*smooth;this.velocity=0;
      if(t===1){this.stationary();return;}
    }else if(this.mode==='cinematic'){
      const target=cameraTarget(this.state,this.age,this.mobile.matches),config=CAMERA_STATES[this.state]||CAMERA_STATES.sleep;
      [this.scale,this.velocity]=damp(this.scale,this.velocity,target,config.omega,dt);
      this.scale=Math.min(this.mobile.matches?1.135:1.185,Math.max(1,this.scale));
    }else {this.stationary();return;}
    this.apply();this.wake();
  }
  dispose(){
    this.cancel();this.observer.disconnect();this.select.removeEventListener('change',this.change);
    this.reduced.removeEventListener('change',this.motionChange);this.mobile.removeEventListener('change',this.resize);
    document.removeEventListener('visibilitychange',this.visibility);
  }
}
if(typeof document!=='undefined'){
  const room=document.getElementById('room'),select=document.getElementById('cameraMode');
  if(room&&select){const camera=new CameraController(room,select);window.addEventListener('pagehide',()=>camera.dispose(),{once:true});}
}
