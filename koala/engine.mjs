// Pure classroom state machine. Sound samples are normalized RMS, never audio recordings.
export class DreamEngine {
 constructor({duration=300,threshold=.065,wakeAfter=4,recoverAfter=4,successTarget=80}={}){
  this.duration=duration;this.remaining=duration;this.threshold=threshold;this.wakeAfter=wakeAfter;this.recoverAfter=recoverAfter;
  this.successTarget=Math.min(100,Math.max(1,Number(successTarget)||80));this.outcome=null;
  this.state='sleep';this.level=0;this.highFor=0;this.calmFor=0;this.recoveryFor=0;this.measured=0;this.quiet=0;this.paused=false;this.done=false;
 }
 advance(raw,elapsed){
  if(this.paused||this.done)return;
  const dt=Math.min(this.remaining,Math.max(0,elapsed)),sampleDt=Math.min(dt,.25);
  // A delayed frame advances the clock fully, but cannot invent unobserved sound history.
  this.remaining=Math.max(0,this.remaining-dt);
  this.level+=(Math.max(0,raw)-this.level)*(1-Math.exp(-sampleDt/.28));
  if(elapsed<=.5){this.measured+=dt;if(this.level<=this.threshold)this.quiet+=dt;}
  const loud=this.level>this.threshold,quiet=this.level<this.threshold*.78;
  if(loud){
   this.highFor+=sampleDt;this.calmFor=0;this.recoveryFor=0;
   if(this.state==='recovery')this.state='warn';
   if(this.highFor>=this.wakeAfter)this.state='cry';
   else if(this.highFor>=.8 && this.state==='sleep')this.state='warn';
  }else if(quiet){
   this.highFor=0;this.calmFor+=sampleDt;
   if(this.state==='cry' && this.calmFor>=this.recoverAfter){this.state='recovery';this.recoveryFor=0;}
   else if(this.state==='warn' && this.calmFor>=this.recoverAfter)this.state='sleep';
   else if(this.state==='recovery'){this.recoveryFor+=sampleDt;if(this.recoveryFor>=2.5)this.state='sleep';}
  }else{
   // Hysteresis band: neither quiet recovery nor excessive noise accumulates.
   this.highFor=Math.max(0,this.highFor-sampleDt);this.calmFor=0;
  }
  if(this.remaining===0)this.complete();
 }
 complete(){
  if(this.done)return;
  this.remaining=0;this.done=true;
  const score=this.percentage;
  this.outcome=score===null?'unmeasured':score>=this.successTarget?'success':'retry';
  this.state=this.outcome==='success'?'happy':this.outcome==='retry'?'disappointed':'recovery';
 }
 // Whole challenge duration is the denominator; unobserved time is never invented as quiet.
 // Round down so 79.9% is not shown as meeting an 80% target.
 get percentage(){return this.measured ? Math.min(100,Math.max(0,Math.floor(this.quiet/this.duration*100+1e-8))) : null;}
}
