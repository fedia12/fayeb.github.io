"""Genuine getUserMedia/Web Audio lifecycle using Chromium's synthetic microphone."""
import asyncio
from playwright.async_api import async_playwright
async def main():
 async with async_playwright() as p:
  b=await p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'])
  page=await b.new_page(permissions=['microphone'],viewport={'width':1280,'height':1000})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  await page.add_init_script('''window.testStreams=[]; const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async options=>{let s=await original(options);testStreams.push(s);return s;}''')
  await page.goto('http://127.0.0.1:8080/')
  await page.click('#start');await page.click('#calibrate')
  await page.wait_for_function('document.querySelector("#calibrationText").textContent.includes("اكتملت")')
  assert await page.evaluate('testStreams[0].getTracks().every(t=>t.readyState==="ended")')
  await page.click('#micStart')
  await page.wait_for_function('document.querySelector("#micStatus").textContent.includes("الميكروفون مفعّل")')
  await page.wait_for_timeout(1800)
  assert int(await page.locator('#soundValue').inner_text())>0
  assert await page.evaluate('testStreams[1].getTracks().some(t=>t.readyState==="live")')
  await page.click('#pause');timer=await page.locator('#timer').inner_text();await page.wait_for_timeout(1100)
  assert timer==await page.locator('#timer').inner_text()
  await page.click('#pause')
  await page.click('#fullscreen');await page.wait_for_function('!!document.fullscreenElement')
  await page.click('#fullscreen');await page.wait_for_function('!document.fullscreenElement')
  await page.click('#restart')
  assert await page.evaluate('testStreams.every(s=>s.getTracks().every(t=>t.readyState==="ended"))')
  assert await page.locator('#soundValue').inner_text()=='٠'
  assert not errors,errors
  print('PASS: synthetic microphone permission, 3-second calibration, RMS input, pause/resume, fullscreen, restart and track cleanup; no console errors')
  await b.close()
asyncio.run(main())
