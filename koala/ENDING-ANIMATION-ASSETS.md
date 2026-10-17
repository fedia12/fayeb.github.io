# Missing genuine ending animation assets

The end-of-countdown UX and result calculation are implemented, but **the requested full cinematic character animation is not complete**. The available visuals are the approved still illustrations, CSS motion, continuously moving CSS tears and stars. There are no genuine animated koala clips, layered character rig, or 3D source model in this repository. No new images were generated and no static-image video is presented as character animation.

An animator must produce, in the exact approved character design and bedroom:

1. **Celebration entry** (2–3 seconds): eyes open and blink, face brightens into a broad smile, torso rises and stretches, paws lift with articulated shoulders/elbows/wrists.
2. **Celebration loop** (5–8 seconds): relaxed continuous breathing, natural blinking, joyful paw waves, head/ear movement and subtle magical stars/particles.
3. **Gentle disappointment entry** (1–2 seconds): expressive eyes, a soft mouth change, ears gradually drooping and shoulders settling. No frightening distress, accusation or loud crying.
4. **Gentle disappointment loop** (5–8 seconds): continuous independent blinking, subtle shoulder/body motion, left and right tears forming at the lower eyelids, traveling down the cheeks, detaching and falling, then regenerating with staggered timing. No painted static drops. Keep the expression gentle and reassuring.

Export matching full-scene silent VP9 WebM and H.264 MP4 versions, 3:2 framing, preferably 1536 × 1024 at 24 fps. Keep the camera locked in the export: the cinematic/fixed camera is applied separately by the game. Match the first/last poses and velocities for seamless looping, preserve ear margins, and deliver the actual rig/source animation project. The assets must be visually reviewed in both camera modes and on classroom hardware before claiming the animation complete.

The previously prepared video-renderer integration and broader five-state production brief are retained on the separate `koala-animation-system` branch. It is disabled and not deployed as finished animation. An additional `disappointed` state must be added to that manifest/player when real ending assets arrive; a generic crying still is not an acceptable substitute for the requested final animation.

The application dispatches a `koala:ending` event as soon as the result state is committed, carrying `{outcome, percentage, target, demo}`. A future real-animation adapter can use it to start the genuine clip immediately. The result card waits for a scene frame plus 900 ms and is never a playback gate. Existing CSS fallback is deliberately retained so this UX improvement works without broken media requests, while this animation limitation remains explicit.
