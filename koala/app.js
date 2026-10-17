import {DreamEngine} from './engine.mjs?v=endings-1';
const $=id=>document.getElementById(id),arabic=new Intl.NumberFormat('ar', {numberingSystem:'arab'});
const messages={sleep:['حلم هادئ','كوالا نائم بهدوء… شكرًا لكنّ.','وقت الأحلام الجميلة'],warn:['نستعيد الهدوء','بدأ كوالا يتململ… لنخفض أصواتنا قليلًا.','قليل من الهدوء يصنع الفرق'],cry:['نساعده معًا','لنأخذ نفسًا هادئًا، ونساعد صديقنا على الاسترخاء.','نستطيع المحاولة مجددًا'],recovery:['عاد الاطمئنان','أصبح أفضل الآن… شكرًا لتعاونكن.','نعود إلى الحلم برفق'],disappointed:['نحاول مجددًا','لنأخذ نفسًا هادئًا… معًا نستطيع المحاولة من جديد.','فرصة جديدة للهدوء'],happy:['صباح سعيد','كوالا سعيد بتعاونكن ومحاولاتكن!','حلم جميل بفضلكنّ']};
let endingTimer=0,endingFrame=0;
let engine=new DreamEngine(),running=false,demo=false,demoMode='quiet',demoSince=0,lastFrame=0,raf=0,stream=null,context=null,analyser=null,samples=null,source=null,baseline=0,operation=0,busy=false,calibrating=false;
function settings(){return {successTarget:Number($('successTarget').value)||80,duration:Math.min(30,Math.max(1,Number($('minutes').value)||5))*60,threshold:Math.min(.16,Number($('mode').value)+baseline),wakeAfter:Math.min(20,Math.max(2,Number($('seconds').value)||4)),recoverAfter:Math.min(20,Math.max(2,Number($('recovery').value)||4))};}
function format(s){s=Math.ceil(Math.max(0,s));return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;}
function render(){
 const state=engine.state;
 if($('room').dataset.state!==state){$('room').dataset.state=state;$('stateTag').textContent=messages[state][0];$('sceneLabel').textContent=messages[state][2];$('room').setAttribute('aria-label',`كوالا وردي صغير: ${messages[state][0]}`);}
 const text=engine.paused?'التحدي متوقف مؤقتًا… نستأنف حين نكون مستعدات.':messages[state][1];
 if($('status').textContent!==text)$('status').textContent=text;
 $('timer').textContent=format(engine.remaining);$('progress').style.width=`${(1-engine.remaining/engine.duration)*100}%`;
 const value=Math.min(100,Math.round(engine.level/.18*100));$('soundValue').textContent=arabic.format(value);$('bar').style.width=value+'%';$('thresholdMark').style.left=Math.min(98,engine.threshold/.18*100)+'%';
 $('soundText').textContent=running?(engine.paused?'القياس متوقف مؤقتًا':engine.level>engine.threshold?'لنخفض أصواتنا برفق':'المستوى مناسب للأحلام'):(engine.done?'اكتملت رحلة الأحلام':'بانتظار بداية التحدي');
 document.querySelectorAll('[data-demo]').forEach(b=>{const disabled=!running||engine.paused;if(b.disabled!==disabled)b.disabled=disabled;});
 $('pause').disabled=!running;$('pause').textContent=engine.paused?'استئناف التحدي':'إيقاف مؤقت';document.body.classList.toggle('paused',engine.paused);
 $('start').hidden=running;
 if($('start').dataset.ending!==String(engine.done)){$('start').dataset.ending=String(engine.done);$('start').innerHTML=engine.done?'تحدٍّ جديد <span>←</span>':'ابدئي رحلة الأحلام <span>←</span>';}
 $('settingsBtn').textContent=running?'إعدادات · إيقاف التحدي':'إعدادات المعلمة';
}
async function stopAudio(){
 const oldContext=context;const oldStream=stream;stream=null;context=null;analyser=null;samples=null;source=null;
 oldStream?.getTracks().forEach(t=>t.stop());if(oldContext&&oldContext.state!=='closed')await oldContext.close().catch(()=>{});
}
function clearEnding(){clearTimeout(endingTimer);cancelAnimationFrame(endingFrame);endingTimer=endingFrame=0;$('endingSummary').hidden=true;$('liveSound').hidden=false;$('liveSound').parentElement.classList.remove('ending-active');delete $('room').dataset.ending;}
function stop(){clearEnding();operation++;running=false;cancelAnimationFrame(raf);stopAudio();$('micStatus').textContent='الميكروفون غير مفعّل';}
function reset(){stop();engine=new DreamEngine(settings());$('demoControls').hidden=true;$('sourceBadge').textContent='جاهز للحلم';$('timerHint').textContent='دقائق صغيرة… وأثر جميل';render();}
function setBusy(value){busy=value;['micStart','demoStart','calibrate','closeSettings','start','settingsBtn','restart'].forEach(id=>$(id).disabled=value);}
async function connectMic(token){
 if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw new Error('يلزم اتصال HTTPS أو localhost ومتصفح يدعم الميكروفون.');
 const acquired=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});
 if(token!==operation){acquired.getTracks().forEach(t=>t.stop());throw new Error('أُلغي طلب الميكروفون.');}
 stream=acquired;context=new(window.AudioContext||window.webkitAudioContext)();await context.resume();
 analyser=context.createAnalyser();analyser.fftSize=2048;samples=new Float32Array(analyser.fftSize);source=context.createMediaStreamSource(stream);source.connect(analyser);
 // No destination connection, MediaRecorder, upload, or audio persistence.
 for(const track of stream.getAudioTracks())track.addEventListener('ended',()=>{if(running&&!demo){engine.paused=true;render();$('micStatus').textContent='انقطع الميكروفون. أعيدي البدء لاستعادة القياس.';}});
 context.addEventListener('statechange',()=>{if(context?.state==='suspended'&&running&&!engine.paused){engine.paused=true;render();$('micStatus').textContent='توقف الصوت مؤقتًا. اضغطي استئناف.';}});
}
function readMic(){if(!analyser||!samples)return 0;analyser.getFloatTimeDomainData(samples);let sum=0;for(const x of samples)sum+=x*x;return Math.sqrt(sum/samples.length)*Number($('gain').value)/100;}
function permissionError(error){const text=error.name==='NotAllowedError'?'لم يُمنح إذن الميكروفون. اسمحي به من إعدادات الموقع، أو اختاري التجربة دونه.':error.name==='NotFoundError'?'لم نعثر على ميكروفون. وصّلي جهازًا أو استخدمي العرض التجريبي.':error.name==='NotReadableError'?'الميكروفون مشغول أو غير متاح. أغلقي التطبيقات التي تستخدمه وحاولي مجددًا.':error.message;$('permission').textContent=text;$('micStatus').textContent='تعذّر تفعيل الميكروفون';}
async function startChallenge(useDemo=false){
 if(busy)return;if(!$('settingsForm').reportValidity())return;reset();demo=useDemo;demoMode='quiet';demoSince=performance.now();
 if(!demo){setBusy(true);$('permission').textContent='جارٍ طلب إذن الميكروفون…';try{await connectMic(operation);}catch(error){await stopAudio();permissionError(error);if(!$('settings').open)$('settings').showModal();setBusy(false);return;}setBusy(false);}
 running=true;lastFrame=performance.now();$('settings').close();$('demoControls').hidden=!demo;$('sourceBadge').textContent=demo?'عرض تجريبي':'حلم جارٍ';$('micStatus').textContent=demo?'عرض تجريبي · دون ميكروفون':'الميكروفون مفعّل · تحليل محلي';$('permission').textContent=demo?'لم يُستخدم الميكروفون في العرض التجريبي.':'إذن الميكروفون متاح.';setDemo('quiet');render();raf=requestAnimationFrame(tick);
}
function setDemo(mode){demoMode=mode;demoSince=performance.now();document.querySelectorAll('[data-demo]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.demo===mode)));}
function demoLevel(now){if(demoMode==='loud')return engine.threshold*2.3;if(demoMode==='rising')return Math.min(engine.threshold*2.3,engine.threshold*.15+(now-demoSince)/1000*engine.threshold*.3);return .004;}
function tick(now){if(!running)return;const dt=Math.max(0,(now-lastFrame)/1000);lastFrame=now;engine.advance(demo?demoLevel(now):readMic(),dt);render();if(engine.done){finish();return;}raf=requestAnimationFrame(tick);}
function finish(){
 running=false;cancelAnimationFrame(raf);stopAudio();
 $('micStatus').textContent='انتهى القياس · الميكروفون غير مفعّل';
 $('room').dataset.ending=engine.outcome;
 $('timerHint').textContent='كل محاولة فرصة للتعلّم';$('sourceBadge').textContent='انتهى التحدي';
 // Commit the emotional state now. No result dialog, focus trap, click or media permission gate.
 render();
 document.dispatchEvent(new CustomEvent('koala:ending',{detail:{outcome:engine.outcome,percentage:engine.percentage,target:engine.successTarget,demo}}));
 const token=operation;
 endingFrame=requestAnimationFrame(()=>{endingTimer=setTimeout(()=>{
  if(token!==operation||!engine.done)return;
  $('score').textContent=engine.percentage===null?'—':arabic.format(engine.percentage)+'٪';
  const copy={success:['حققنا هدف الهدوء!','شكرًا لتعاونكن! لنحتفل بمحاولاتكن الجميلة.'],retry:['فرصة جديدة للهدوء','لم نصل إلى هدفنا هذه المرة. لنحاول مجددًا، معًا نستطيع.'],unmeasured:['لنحاول مجددًا','لم نتمكّن من قياس الهدوء هذه المرة. يمكننا بدء محاولة جديدة.']};
  [$('resultTitle').textContent,$('resultText').textContent]=copy[engine.outcome];
  $('resultContext').textContent='الهدف: '+arabic.format(engine.successTarget)+'٪'+(demo?' · نتيجة تجريبية، لا تُقيّم الصف':' · مؤشر تقريبي للوقت، وليس تقييمًا لكل طالبة');
  $('endingSummary').dataset.outcome=engine.outcome;$('liveSound').hidden=true;$('liveSound').parentElement.classList.add('ending-active');$('endingSummary').hidden=false;
 },900);});
}
function demoEnding(outcome){
 // Explicitly labelled synthetic full-challenge outcomes; inaccessible in microphone mode.
 if(!demo||!running||engine.paused)return;
 const percentage=outcome==='success'?Math.min(100,engine.successTarget+5):Math.max(0,engine.successTarget-10);
 engine.quiet=engine.duration*percentage/100;engine.measured=engine.duration;engine.complete();finish();
}
async function togglePause(){if(!running)return;if(engine.paused){if(!demo&&(!stream||stream.getAudioTracks().every(t=>t.readyState==='ended'))){$('micStatus').textContent='أعيدي البدء لتوصيل الميكروفون.';return;}try{await context?.resume();}catch(e){permissionError(e);return;}}engine.paused=!engine.paused;lastFrame=performance.now();render();}
async function calibrate(){
 if(busy)return;setBusy(true);calibrating=true;stop();const token=operation;$('permission').textContent='اسمحي بالميكروفون، ثم حافظي على ضجيج الغرفة الطبيعي.';
 try{await connectMic(token);$('calibrationText').textContent='جارٍ قياس ضجيج الغرفة… ٣ ثوانٍ من الهدوء الطبيعي.';const readings=[];const end=performance.now()+3000;while(performance.now()<end&&token===operation){readings.push(readMic());await new Promise(resolve=>setTimeout(resolve,50));}if(token===operation){readings.sort((a,b)=>a-b);baseline=Math.min(.06,readings[Math.floor(readings.length*.8)]*1.5||0);$('calibrationText').textContent='اكتملت المعايرة. أُضيف هامش لضجيج الغرفة الطبيعي.';$('permission').textContent='اكتملت المعايرة وأُغلق الميكروفون حتى بدء التحدي.';engine=new DreamEngine(settings());render();}}
 catch(e){permissionError(e);$('calibrationText').textContent='لم تكتمل المعايرة. يمكنكِ المحاولة مجددًا.';}finally{await stopAudio();calibrating=false;setBusy(false);}
}
$('settingsForm').addEventListener('submit',e=>{e.preventDefault();startChallenge(false);});$('demoStart').onclick=()=>startChallenge(true);$('start').onclick=()=>{reset();$('settings').showModal();};$('closeSettings').onclick=()=>{$('settings').close();};$('settingsBtn').onclick=()=>{if(busy)return;reset();$('settings').showModal();};$('pause').onclick=togglePause;$('restart').onclick=()=>{if(!busy)reset();};$('calibrate').onclick=calibrate;
$('gain').oninput=()=>{ $('gainText').textContent=$('gain').value+'%';baseline=0;$('calibrationText').textContent='تغيّرت الحساسية؛ أعيدي المعايرة إن لزم.';};$('settingsForm').addEventListener('input',()=>{if(!running&&!busy){engine=new DreamEngine(settings());render();}});
$('settings').addEventListener('cancel',e=>{if(busy)e.preventDefault();});
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else $('micStatus').textContent='ملء الشاشة غير مدعوم في هذا المتصفح.';}catch{$('micStatus').textContent='تعذّر فتح ملء الشاشة في هذا المتصفح.';}};
document.querySelectorAll('[data-demo]').forEach(b=>b.onclick=()=>{if(!demo||!running||engine.paused)return;if(b.dataset.demo==='success'||b.dataset.demo==='retry'){demoEnding(b.dataset.demo);}else if(b.dataset.demo==='finish'){engine.complete();finish();}else setDemo(b.dataset.demo);});$('newChallenge').onclick=()=>{reset();$('settings').showModal();};
for(let i=0;i<22;i++){const p=document.createElement('i');p.textContent=i%3?'✧':'✦';p.style.cssText=`--x:${5+(i*43)%90}%;--delay:${-i*.31}s;--size:${12+i%5*4}px`;document.querySelector('.celebration').append(p);}
// Background tabs pause explicitly: no sound is assumed while the classroom is unobserved.
document.addEventListener('visibilitychange',()=>{if(document.hidden&&running){engine.advance(engine.level,(performance.now()-lastFrame)/1000);lastFrame=performance.now();if(engine.done)finish();else{engine.paused=true;render();}}});
window.addEventListener('pagehide',()=>{stop();});render();
