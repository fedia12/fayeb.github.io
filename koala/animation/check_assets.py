"""Fail closed on missing/incompatible animation exports. Requires development ffprobe.
This checks packaging/decodability, NOT the quality or anatomical motion of a koala.
"""
import json, shutil, subprocess, sys
from pathlib import Path
root=Path(__file__).resolve().parent
manifest=json.loads((root/'manifest.json').read_text())
assets=(root/manifest['assetRoot']).resolve()
errors=[];checked=0
for state,clips in manifest['states'].items():
 for phase in ('entry','loop'):
  clip=clips.get(phase)
  if not clip:
   errors.append(f'{state}: missing {phase} declaration');continue
  for fmt in ('webm','mp4'):
   file=assets/clip.get(fmt,'MISSING')
   if not file.is_file():errors.append(f'MISSING: {file.relative_to(root.parent)}');continue
   if not shutil.which('ffprobe'):
    errors.append('ffprobe is needed to validate supplied media');continue
   try:
    result=subprocess.run(['ffprobe','-v','error','-count_frames','-show_streams','-show_format','-of','json',str(file)],capture_output=True,text=True,check=True)
    data=json.loads(result.stdout);streams=data['streams'];videos=[s for s in streams if s['codec_type']=='video']
    assert len(videos)==1,'must have exactly one video stream'
    assert all(s['codec_type']!='audio' for s in streams),'must not contain audio'
    v=videos[0];w,h=v['width'],v['height']
    assert abs(w/h-1.5)<.01,'must preserve 3:2 framing'
    assert w<=1920 and h<=1280,'resolution exceeds playback budget'
    assert int(v.get('nb_read_frames',0))>=12,'not a continuous animated clip'
    assert v['codec_name']==('vp9' if fmt=='webm' else 'h264'),'unexpected codec'
    duration=float(data['format']['duration']);assert .4<=duration<=12,'duration outside playback budget'
    if state=='recovery' and phase=='entry':assert duration<=2.2,'recovery entry would be interrupted before its ending'
    assert file.stat().st_size<=12*1024*1024,'clip exceeds 12 MB; optimize before deployment'
    checked+=1
   except (AssertionError,KeyError,ValueError,subprocess.CalledProcessError) as e:
    errors.append(f'{file.name}: {e}')
print(f'Validated {checked} actual media files. Visual character-motion review is still required.')
if errors:
 print('\n'.join(errors));sys.exit(1)
print('Packaging checks passed; do not enable without human review of all five states.')
