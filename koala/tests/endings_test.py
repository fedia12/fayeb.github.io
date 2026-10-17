"""Automatic end-of-countdown UX, using browser clock and real demo input paths.
Character motion beyond the existing CSS tears/particles is NOT certified by this test.
"""
import asyncio,json,os
from playwright.async_api import async_playwright
ROOT=os.environ.get('KOALA_TEST_ROOT','http://127.0.0.1:8083/')
async def run(page,quiet,target=80):
 await page.click('#start');await page.fill('#minutes','1');await page.fill('#successTarget',str(target));await page.click('#demoStart')
 if not quiet:await page.click('[data-demo=loud]')
 await page.clock.run_for(60100)
async def state(page):return await page.locator('#room').get_attribute('data-state')
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  results=[]
  for path,mode,width in [('koala/','',1440),('koala/','',390),('koala-camera/','cinematic',1440),('koala-camera/','fixed',390)]:
   page=await b.new_page(viewport={'width':width,'height':1000 if width>400 else 844})
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   await page.clock.install();await page.goto(ROOT+path+('?camera='+mode if mode else ''))
   assert await page.locator('#result,#dismissResult').count()==0
   assert await page.locator('#successTarget').input_value()=='80'
   await run(page,True)
   # Actual timer expiration, not a click on an ending preview.
   assert await page.locator('#timer').inner_text()=='00:00'
   assert await state(page)=='happy'
   assert await page.locator('dialog[open]').count()==0
   assert await page.locator('.celebration').is_visible()
   assert not await page.locator('.tears').is_visible()
   # Summary follows the visible state; it does not gate the state or steal focus.
   assert not await page.locator('#endingSummary').is_visible()
   await page.clock.run_for(1100)
   assert await page.locator('#endingSummary').is_visible()
   assert await page.locator('#endingSummary').get_attribute('data-outcome')=='success'
   assert await page.locator('#score').inner_text()=='١٠٠٪'
   scene=await page.locator('#room').bounding_box();card=await page.locator('#endingSummary').bounding_box()
   assert card['x']>=scene['x']+scene['width']-1 or card['y']>=scene['y']+scene['height']-1
   await page.screenshot(path=f'/tmp/koala-ending-{path.strip("/")}-{width}-success.png',full_page=True)
   await page.click('#newChallenge');assert await page.locator('#settings').evaluate('(e)=>e.open')
   await page.click('#closeSettings');await run(page,False)
   assert await state(page)=='disappointed'
   assert await page.locator('dialog[open]').count()==0
   assert await page.locator('.tears').is_visible()
   assert not await page.locator('.celebration').is_visible()
   t1=await page.locator('.tears i').first.evaluate('(e)=>getComputedStyle(e).transform')
   await page.clock.run_for(400)
   t2=await page.locator('.tears i').first.evaluate('(e)=>getComputedStyle(e).transform')
   assert t1!=t2
   await page.clock.run_for(900)
   assert await page.locator('#endingSummary').get_attribute('data-outcome')=='retry'
   assert 'أحسنتن' not in await page.locator('body').inner_text()
   assert 'معًا نستطيع' in await page.locator('#resultText').inner_text()
   await page.screenshot(path=f'/tmp/koala-ending-{path.strip("/")}-{width}-retry.png',full_page=True)
   if mode=='fixed':assert await page.locator('#cameraStage').evaluate('(e)=>new DOMMatrixReadOnly(getComputedStyle(e).transform).a')==1
   await page.click('#start');await page.fill('#successTarget','95');await page.click('#demoStart')
   await page.click('[data-demo=success]')
   assert await state(page)=='happy'
   await page.clock.run_for(1100);assert await page.locator('#score').inner_text()=='١٠٠٪'
   await page.click('#newChallenge');await page.click('#demoStart');await page.click('[data-demo=retry]')
   assert await state(page)=='disappointed'
   # Reset before delayed result appears must cancel stale summary work.
   await page.click('#restart');await page.clock.run_for(2000)
   assert await state(page)=='sleep' and not await page.locator('#endingSummary').is_visible()
   assert not await page.locator('.tears').is_visible()
   assert await page.locator('#liveSound').is_visible()
   assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   assert not errors,errors
   result={'path':path,'camera':mode,'width':width,'automatic_success_and_retry':'PASS','demo_previews_and_reset':'PASS','console_errors':errors}
   print(json.dumps(result),flush=True);results.append(result)
   await page.close()
  await b.close()
  print('PASS: automatic countdown endings, non-blocking feedback, threshold, flowing tears, camera compatibility, repeat challenges. Genuine character-animation assets remain missing.')
asyncio.run(main())
