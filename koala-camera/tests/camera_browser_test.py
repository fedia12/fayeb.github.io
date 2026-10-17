import asyncio,json,os
from playwright.async_api import async_playwright
BASE=os.environ.get('KOALA_CAMERA_URL','http://127.0.0.1:8081/koala-camera/')
async def scale(page):
 return await page.locator('#cameraStage').evaluate('(e)=>{let t=getComputedStyle(e).transform;return t==="none"?1:new DOMMatrixReadOnly(t).a}')
async def advance(page,ms):await page.clock.run_for(ms)
async def state(page):return await page.locator('#room').get_attribute('data-state')
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  results=[]
  for width,height in [(1440,1000),(390,844),(768,1024)]:
   for mode in ['cinematic','fixed']:
    selected=os.environ.get('KOALA_CAMERA_CASES','')
    if selected and f'{width}-{mode}' not in selected.split(','):continue
    page=await browser.new_page(viewport={'width':width,'height':height})
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    await page.clock.install();await page.goto(BASE+'?camera='+mode)
    assert await page.locator('#cameraMode').input_value()==mode
    a=await scale(page);await advance(page,12000);sleep=await scale(page)
    if mode=='cinematic':assert sleep>a+.0005
    else:assert sleep==a==1
    await page.click('#start');await page.click('#demoStart')
    positions=await page.locator('#timer,#pause,#fullscreen').evaluate_all('(es)=>es.map(e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height]})')
    await advance(page,2000)
    assert positions==await page.locator('#timer,#pause,#fullscreen').evaluate_all('(es)=>es.map(e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height]})')
    await page.click('[data-demo=loud]');await advance(page,1800)
    assert await state(page)=='warn'
    await advance(page,6500);assert await state(page)=='cry';cry=await scale(page)
    assert cry<=(1.1851 if width>900 else 1.1351)
    if mode=='cinematic':assert cry>sleep+.04
    else:assert cry==1
    assert await page.locator('.tears').is_visible()
    assert await page.locator('#cameraStage .tears').count()==1
    tear=page.locator('.tears i').first
    t1=await tear.evaluate('(e)=>getComputedStyle(e).transform');await advance(page,350)
    assert t1!=await tear.evaluate('(e)=>getComputedStyle(e).transform')
    if width in [1440,390]:await page.screenshot(path=f'/tmp/koala-camera-{width}-{mode}-cry.png',full_page=True)
    await page.click('#pause');frozen=await scale(page);timer=await page.locator('#timer').inner_text();await advance(page,2000)
    assert await scale(page)==frozen and await page.locator('#timer').inner_text()==timer
    await page.click('#pause');await page.click('[data-demo=recovery]');await advance(page,5000)
    assert await state(page)=='recovery'
    assert not await page.locator('.tears').is_visible()
    await advance(page,8000);assert await state(page)=='sleep'
    if mode=='cinematic':assert await scale(page)<cry
    else:assert await scale(page)==1
    await page.click('[data-demo=loud]');await advance(page,9000)
    zoom_before=await scale(page)
    await page.click('[data-demo=finish]');await page.click('#dismissResult');await advance(page,9000)
    assert await state(page)=='happy'
    if mode=='cinematic':assert await scale(page)<zoom_before-.04
    else:assert await scale(page)==1
    await page.click('#settingsBtn')
    other='fixed' if mode=='cinematic' else 'cinematic'
    await page.select_option('#cameraMode',other)
    assert 'camera='+other in page.url
    await advance(page,3000)
    if other=='fixed':
     assert await scale(page)==1
     await advance(page,1500);assert await scale(page)==1
    await page.reload();assert await page.locator('#cameraMode').input_value()==other
    await page.goto(BASE);assert await page.locator('#cameraMode').input_value()==other
    assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    await page.emulate_media(reduced_motion='reduce');await advance(page,1000)
    assert await scale(page)==1
    await page.click('#start');await page.select_option('#cameraMode','cinematic');await page.click('#demoStart')
    await page.click('[data-demo=loud]');await advance(page,9000)
    assert await state(page)=='cry' and await scale(page)==1
    assert await page.locator('#cameraMotionNote').inner_text()=='تفضيل تقليل الحركة مفعّل: الكاميرا ثابتة في كلا الوضعين.'
    assert not errors,errors
    results.append({'width':width,'mode':mode,'sleep':sleep,'cry':cry,'passed':True})
    print(json.dumps(results[-1]),flush=True)
    await page.close()
  await browser.close()
  print(json.dumps({'camera_tests':results,'checked':'all 5 states, UI stationarity, pause/resume, flowing tears, mode switching, URL and storage, reduced motion, no console errors','character_motion':'original still-art/CSS behavior retained; genuine character clips remain missing'}))
asyncio.run(main())
