# Animation playback integration (asset-blocked)

This is a browser-native video renderer for **future genuine character animation assets**. It is not a completed animation upgrade. Production assets are missing, and `manifest.json` is deliberately disabled. The deployed still-art game is unchanged on `main`.

Read [the exact production brief](ASSET-BRIEF.md) for the ten clips, formats, expressions, motion, tear behavior and continuity requirements. No color bars/test patterns or zoomed stills are installed as production media.

## Behavior

- The existing `DreamEngine` remains the single source of truth. `app.js` passes state and pause status to the character renderer; no second countdown or noise detector is introduced.
- Genuine entry clips play once, followed by their continuous loops. A change in classroom noise interrupts an obsolete entry immediately. Finishing the timer requests the celebration entry and loop.
- The old scene remains visible until the replacement video decodes. Two layers crossfade; outgoing video sources are released after the transition. Rapid changes cancel stale loading and cap active video elements at two per player.
- Reset restarts the sleep entry, not the middle of an old loop. Pausing stops media time, including videos being loaded. Hidden tabs and the system's reduced-motion preference also suspend playback.
- Muted inline clips require no microphone permission or media-player installation. Only same-origin asset URLs are accepted. WebM falls back to MP4 when unsupported or undecodable. Playback failures restore the existing artwork rather than leave the class looking at a blank screen.
- With the production manifest disabled, no videos are requested, no original artwork is hidden, and all original controls still work.
- Existing UI, timer, settings, microphone processing, CSS design, fonts and original assets remain intact. Additional film CSS takes effect only once genuine video is ready.

## Integration tests

Start the existing server from the `koala` folder:

```sh
python3 -m http.server 8080 --bind 127.0.0.1
node --test tests/engine.test.mjs tests/animation-player.test.mjs
python3 tests/browser_test.py
python3 tests/microphone_test.py
```

For video-controller tests, create **moving technical test patterns** outside the repository. These are codec/playback fixtures, never koala artwork and never intended for classroom use:

```sh
mkdir -p /tmp/koala-animation-tests
ffmpeg -f lavfi -i testsrc2=size=320x212:rate=24 -t 1.6 -an -c:v libvpx-vp9 -crf 38 -b:v 0 -cpu-used 5 -y /tmp/koala-animation-tests/motion.webm
ffmpeg -f lavfi -i testsrc2=size=320x212:rate=24 -t 1.6 -an -c:v libx264 -pix_fmt yuv420p -movflags +faststart -y /tmp/koala-animation-tests/motion.mp4
python3 tests/animation_player_test.py
```

The Playwright test intercepts the manifest/media URLs to serve fixtures in that test browser only. It verifies changing DECODED video pixels, entry/loop playback, all five engine states through demo mode, pause/resume, restart, interrupted-state cancellation, H.264 fallback, failure cleanup, and no phantom requests when disabled. Passing proves the player works; it does **not** establish that the missing koala animation exists or looks correct.

Set `KOALA_TEST_URL` to test this player against another deployment with the same paths. Set `KOALA_VIDEO_FIXTURES` to use a different local fixture directory.

## Completing the upgrade

1. Commission/produce the animations in `ASSET-BRIEF.md` using the current visual reference; deliver the animator's rig/source project as well as exports.
2. Put the exports in `assets/animation/` and run `python3 animation/check_assets.py` from `koala`.
3. Enable the manifest on this branch only, and test/review each state with the real films.
4. Record actual character-motion QA and classroom-device performance results. Fix any anatomical/looping/tear issues in the animation source.
5. Merge to `main` only when the animation acceptance checklist passes. GitHub Pages then serves the files without any installation by the teacher.
