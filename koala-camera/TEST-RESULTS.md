# Camera experiment verification

- Five camera mathematics tests passed: slow bounded push-in, desktop/mobile limits, smooth damping, interrupted transitions, and conservative head/ear framing bounds.
- Eight existing noise/timer engine tests passed. The experimental `app.js` and `engine.mjs` are byte-for-byte copies of the approved version.
- Chromium camera checks passed for cinematic and fixed modes at desktop (1440 px), phone (390 px), and tablet (768 px) widths. These exercised all five game states through demo mode, stationary timer/buttons, camera pause/resume, independent flowing CSS tears moving with the scene, smooth pullback, selector/URL/local-storage behavior, and reduced-motion accessibility. A status-message timing issue exposed by changing the reduced-motion preference was corrected and the affected phone case plus both tablet cases passed afterward.
- The existing browser regression suite passed against `/koala-camera/`: demo, five states, tears, timer expiration, pause/resume, restart, permission-error messaging, and responsive layout. No JavaScript errors were reported.
- The existing synthetic-microphone suite passed against `/koala-camera/`: permission, calibration, RMS input, pause/resume, fullscreen and track cleanup. This uses Chromium's synthetic microphone, not a physical classroom microphone.
- Reviewed desktop and phone crying screenshots: the face and both ears remained within the scene at the experimental close-up. The interface and captions remained outside the camera transform.
- Relative links, scripts, fonts and images resolved locally. No new image assets were generated; existing assets are shared from `/koala/assets/`.
- The approved `koala/` folder and root project were verified unchanged before deployment.

## Explicit limitations

This is a camera-only experiment over the existing still-art renderer and CSS effects. No genuine articulated koala film/rig has been produced. Continuous anatomical breathing, eyelid blinking, independent shoulder/paw motion and a real animated wipe/stretch/wave remain blocked on animation production. Existing CSS tears do flow; the camera layer keeps them registered with the scene. A moving camera is not evidence of a genuinely animated character.

Public HTTPS inspection from the cloud environment was blocked by a proxy `403 Forbidden` / tunnel failure for `fedia12.github.io`. Local browser checks do not establish that the public page or microphone was tested over HTTPS. GitHub Pages deployment status must be recorded separately from browser test results. The existing public game was reported working by the user.

Production brief for the missing character animation: https://github.com/fedia12/fayeb.github.io/blob/koala-animation-system/koala/animation/ASSET-BRIEF.md
