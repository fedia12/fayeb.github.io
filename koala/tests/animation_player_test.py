"""Player plumbing tests with MOVING TEST PATTERNS, not finished koala animation.
No fixture is included in production. Generate via the README ffmpeg commands.
"""
import asyncio, json, os
from pathlib import Path
from playwright.async_api import async_playwright
URL=os.environ.get('KOALA_TEST_URL','http://127.0.0.1:8080/')
FIXTURES=Path(os.environ.get('KOALA_VIDEO_FIXTURES','/tmp/koala-animation-tests'))
STATES=['sleep','warn','cry','recovery','happy']
def manifest():
 return {'version':1,'enabled':True,'assetRoot':'../animation-fixtures/','crossfadeMs':150,'states':{s:{phase:{'webm':'motion.webm','mp4':'motion.mp4'} for phase in ['entry','loop']} for s in STATES}}
async def wait_state(page,state,phase=None):
 await page.wait_for_function('s=>{const v=document.querySelector(".character-film video.visible");return v?.dataset.state===s[0]&&(!s[1]||v?.dataset.phase===s[1])}',arg=[state,phase])
async def verify_motion(page,state):
 await wait_state(page,state)
 await page.wait_for_timeout(240)
 # Sample decoded pixels, not just a PID, CSS property or nonzero video duration.
 sample='''() => {const v=document.querySelector('.character-film video.visible');const c=document.createElement('canvas');c.width=64;c.height=42;const x=c.getContext('2d');x.drawImage(v,0,0,64,42);return {time:v.currentTime,pixels:Array.from(x.getImageData(0,0,64,42).data),frames:v.getVideoPlaybackQuality().totalVideoFrames};}'''
 a=await page.evaluate(sample);await page.wait_for_timeout(330);b=await page.evaluate(sample)
 assert a['pixels']!=b['pixels'],state
 assert a['time']!=b['time'],state
 assert b['frames']>=a['frames'],state
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  page=await b.new_page(viewport={'width':1200,'height':900})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await page.route('**/animation/manifest.json',lambda r:r.fulfill(json=manifest()))
  await page.route('**/animation-fixtures/*.webm',lambda r:r.fulfill(path=str(FIXTURES/'motion.webm'),content_type='video/webm'))
  await page.route('**/animation-fixtures/*.mp4',lambda r:r.fulfill(path=str(FIXTURES/'motion.mp4'),content_type='video/mp4'))
  await page.goto(URL)
  await verify_motion(page,'sleep');await wait_state(page,'sleep','loop')
  await page.click('#start');await page.click('#demoStart')
  await verify_motion(page,'sleep')
  await page.click('[data-demo=loud]')
  await verify_motion(page,'warn')
  await verify_motion(page,'cry')
  await wait_state(page,'cry','loop')
  await page.click('#pause');v=page.locator('.character-film video.visible')
  before=await v.evaluate('(v)=>v.currentTime');await page.wait_for_timeout(400);after=await v.evaluate('(v)=>v.currentTime')
  assert abs(after-before)<.06,(before,after)
  await page.click('#pause');await page.click('[data-demo=recovery]')
  await verify_motion(page,'recovery')
  await wait_state(page,'sleep')
  await page.click('[data-demo=finish]');await page.click('#dismissResult')
  await verify_motion(page,'happy');await wait_state(page,'happy','loop')
  await page.click('#restart');await wait_state(page,'sleep','entry')
  assert await page.locator('.character-film video').count()<=2
  assert await page.locator('#timer').inner_text()=='05:00'
  # A stale entry must not restart an obsolete emotional state.
  await page.evaluate('''async()=>{const {CharacterAnimationPlayer}=await import('./animation/player.mjs');window.testPlayer=new CharacterAnimationPlayer(document.querySelector('#room'),{version:1,enabled:true,crossfadeMs:80,assetRoot:'../animation-fixtures/',states:Object.fromEntries(['sleep','warn','cry','recovery','happy'].map(s=>[s,{entry:{webm:'motion.webm'},loop:{webm:'motion.webm'}}]))},new URL('./animation/manifest.json',location.href));testPlayer.sync('cry');testPlayer.sync('warn');testPlayer.sync('happy');}''')
  await page.wait_for_function('testPlayer.current?.dataset.state==="happy"')
  await page.wait_for_timeout(1900)
  assert await page.evaluate('testPlayer.current.dataset.state')=='happy'
  await page.evaluate('testPlayer.dispose()')
  assert not errors,errors
  await page.close()
  # Bad WebM falls back to actual H.264 decoding; failure restores old scene.
  page=await b.new_page()
  await page.route('**/animation/manifest.json',lambda r:r.fulfill(json=manifest()))
  await page.route('**/animation-fixtures/*.webm',lambda r:r.fulfill(body=b'invalid video',content_type='video/webm'))
  await page.route('**/animation-fixtures/*.mp4',lambda r:r.fulfill(path=str(FIXTURES/'motion.mp4'),content_type='video/mp4'))
  await page.goto(URL);await wait_state(page,'sleep')
  assert await page.locator('.character-film video.visible').evaluate('(v)=>v.currentSrc.endsWith(".mp4")')
  await verify_motion(page,'sleep')
  await page.route('**/animation-fixtures/*.mp4',lambda r:r.fulfill(status=404,body='Not found'))
  await page.click('#start');await page.click('#demoStart')
  await page.wait_for_function('document.querySelector("#room").dataset.animationStatus==="unavailable"')
  assert not await page.locator('#room').evaluate('(r)=>r.classList.contains("animation-ready")')
  assert await page.locator('.character-film video').count()==0
  await page.close()
  # Disabled production manifest must not request phantom media or change visuals.
  page=await b.new_page();requests=[];page.on('request',lambda r:requests.append(r.url))
  await page.goto(URL);await page.wait_for_function('document.querySelector("#room").dataset.animationStatus==="awaiting-assets"')
  assert await page.locator('.character-film').count()==0
  assert not any(u.endswith(('.mp4','.webm')) for u in requests)
  print(json.dumps({'player_tests':'PASS','decoded_motion':'all 5 states using test patterns ONLY','synchronization':'demo noise, recovery, timer completion, pause, restart','media':'entry to loop, stale request cancellation, MP4 fallback, failure cleanup, disabled manifest','koala_character_clips':'MISSING - not visually validated'}))
  await b.close()
asyncio.run(main())
