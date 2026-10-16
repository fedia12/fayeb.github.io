"""Run with Python Playwright and system Chromium; no microphone needed for demo tests."""
import asyncio, json
from pathlib import Path
from playwright.async_api import async_playwright
URL='http://127.0.0.1:8080/'
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  page=await browser.new_page(viewport={'width':1440,'height':1100},device_scale_factor=1)
  errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  await page.clock.install()
  await page.goto(URL)
  await page.screenshot(path='/tmp/koala-desktop.png',full_page=True)
  assert await page.locator('#room').get_attribute('data-state')=='sleep'
  assert await page.locator('.tears').evaluate('(e)=>getComputedStyle(e).display')=='none'
  assert await page.locator('.art-sleep').evaluate('(e)=>getComputedStyle(e).animationName')=='breathe'
  assert await page.locator('.ear-left').evaluate('(e)=>getComputedStyle(e).animationName')=='ear-twitch'
  await page.click('#start');await page.click('#demoStart')
  assert not await page.locator('#settings').evaluate('(e)=>e.open')
  assert await page.locator('#demoControls').is_visible()
  assert await page.evaluate('navigator.mediaDevices.getUserMedia.toString().includes("native")')
  await page.click('[data-demo=loud]');await page.clock.run_for(1800)
  assert await page.locator('#room').get_attribute('data-state')=='warn'
  await page.clock.run_for(4000)
  assert await page.locator('#room').get_attribute('data-state')=='cry'
  assert await page.locator('.tears').is_visible()
  t1=await page.locator('.tears i').first.evaluate('(e)=>getComputedStyle(e).transform')
  await page.clock.run_for(400)
  t2=await page.locator('.tears i').first.evaluate('(e)=>getComputedStyle(e).transform')
  assert t1!=t2,(t1,t2)
  delays=await page.locator('.tears i').evaluate_all('(es)=>es.map(e=>getComputedStyle(e).animationDelay)')
  assert len(set(delays))==6
  await page.screenshot(path='/tmp/koala-cry.png')
  await page.click('#pause');before=await page.locator('#timer').inner_text();await page.clock.run_for(4000)
  assert await page.locator('#timer').inner_text()==before
  await page.click('#pause');await page.click('[data-demo=recovery]');await page.clock.run_for(5000)
  assert await page.locator('#room').get_attribute('data-state')=='recovery'
  assert not await page.locator('.tears').is_visible()
  await page.clock.run_for(3000)
  assert await page.locator('#room').get_attribute('data-state')=='sleep'
  await page.click('[data-demo=finish]')
  assert await page.locator('#result').evaluate('(e)=>e.open')
  assert await page.locator('#room').get_attribute('data-state')=='happy'
  assert await page.locator('#timer').inner_text()=='00:00'
  assert not await page.locator('.tears').is_visible()
  await page.click('#newChallenge');await page.click('#closeSettings')
  assert await page.locator('#timer').inner_text()=='05:00'
  assert not await page.locator('#demoControls').is_visible()
  assert await page.locator('#room').get_attribute('data-state')=='sleep'
  # Graceful permission error using the actual start path.
  await page.evaluate('() => {navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException("Denied","NotAllowedError")}}')
  await page.click('#start');await page.click('#micStart')
  await page.wait_for_function('document.querySelector("#permission").textContent.includes("لم يُمنح")')
  assert await page.locator('#settings').evaluate('(e)=>e.open')
  await page.click('#closeSettings')
  await page.set_viewport_size({'width':390,'height':844})
  await page.screenshot(path='/tmp/koala-mobile.png',full_page=True)
  assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  await page.click('#start')
  assert await page.locator('#demoStart').is_visible()
  await page.screenshot(path='/tmp/koala-mobile-settings.png',full_page=True)
  await page.click('#demoStart');await page.click('[data-demo=quiet]')
  await page.click('#settingsBtn')
  await page.fill('#minutes','1')
  await page.click('#demoStart')
  await page.clock.run_for(150)
  await page.click('[data-demo=loud]')
  await page.clock.run_for(150)
  await page.click('[data-demo=quiet]')
  await page.clock.run_for(2000)
  assert await page.locator('#room').get_attribute('data-state')=='sleep'
  await page.clock.run_for(60000)
  assert await page.locator('#result').evaluate('(e)=>e.open')
  assert await page.locator('#timer').inner_text()=='00:00'
  await page.click('#dismissResult')
  for width in [320,768,1200]:
   await page.set_viewport_size({'width':width,'height':900})
   assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert not errors,errors
  print(json.dumps({'browser':'PASS','states':'sleep, warning, cry, recovery, happy','tears':'flowing, staggered, crying only','controls':'demo, pause/resume, restart, permission error','layouts':'1440 desktop and 390 mobile','console_errors':errors}))
  await browser.close()
asyncio.run(main())
