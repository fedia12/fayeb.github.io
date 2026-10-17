# Character animation production brief — assets not yet available

## Current status (explicitly incomplete)

The repository contains rendered still artwork only. No genuine koala animation clips, 3D character model, layered/rigged 2D character, or animation project was supplied. The available generation tool produces still images, not character motion. **The five animated character states have NOT been produced or visually approved.** The video controller and its moving-test-pattern tests do not change that fact.

The integration is on the separate `koala-animation-system` Git branch. The production manifest remains `enabled: false`; the working Pages website on `main` is preserved. Do not enable this manifest using the old stills, slow zooms, morphs, generated test patterns, or videos made from static crossfades and call it finished character animation.

## Reference assets to give the animator

- `../assets/dreams.png`: original four-view reference, 1536 × 1024. Each quadrant is a 768 × 512 scene. Top left is the primary character, room, material, lighting and camera reference.
- `../assets/recovery.png`: original reassuring recovery expression and eye-wiping gesture.
- Existing public game: https://fedia12.github.io/fayeb.github.io/koala/

Preserve the same pastel-pink fur, rounded ears, plum-colored nose, facial proportions, eyes, bed, lamp, window, plant positions and bedroom palette. Supply a rigged character or layered puppet project in addition to the rendered outputs when possible; these source assets do not exist in this repository. A recreated 3D rig or carefully separated 2D textured rig is necessary to move the anatomy independently without distorting the baked room.

## Export contract

Use full-scene opaque clips so the room and character remain registered exactly; there is no alpha-video requirement or Safari alpha compatibility issue. Camera locked, same framing in every clip, 3:2 aspect ratio, ideally 1536 × 1024, 24 fps. No UI, text, sound, watermark, logo, artificial camera zoom, or baked subtitles. The existing Arabic interface and caption gradient remain over the film. Animate character anatomy, not the entire illustration. Lighting changes gradually and never flashes.

Export **ten actual animated clips** (five entry actions + five seamless idle loops), with two browser formats per clip:

- VP9 `.webm` (8-bit 4:2:0, no audio).
- H.264 `.mp4` (yuv420p, faststart, no audio) for browser fallback.

Both encodings must contain the same timing, framing and animation. Target 4–8 MB or less per loop at this resolution; prefer 1024 × 682 or 1152 × 768 if a classroom computer cannot decode 1536 × 1024 smoothly. Do not change the aspect ratio or frame composition. Start with a keyframe. Loops should run 5–8 seconds and join with continuous position AND velocity, without a repeated frozen endpoint. Entry clips should end on the first loop pose. Cross-state clips must be interruptible; do not assume crying will run to completion before the teacher restores quiet.

Place the files in `../assets/animation/`, using the exact names in `manifest.json`.

| State | Entry clip | Loop clip | Required actual character movement |
| --- | --- | --- | --- |
| sleep | `sleep-entry` (1–2 s) | `sleep-loop` (6–8 s) | Blink twice, eyelids settle closed; chest/blanket breath independently of the room; tiny nose/ear movement; occasional relaxed paw shift. No tears or wet-cheek highlights. |
| warn | `warning-entry` (0.8–1.2 s) | `warning-loop` (5–6 s) | Gradual stirring, head turn and ear swivel; drowsy eyelid movement, brow tension; paws shift. Early warning stays gentle. No tears. |
| cry | `crying-entry` (0.6–1 s) | `crying-loop` (5–8 s) | Eyes open then blink with wet lower lids; mouth trembles, shoulders rise/fall, both paws lift near head. Tears visibly form at the lower lids, travel down cheek curves, release and fall. Left/right streams regenerate at independent staggered intervals. Do not paint permanent tear drops into a static texture. |
| recovery | `recovery-entry` (1.8–2.2 s) | `recovery-loop` (3–5 s) | Tears slow and are wiped by a moving paw; eyelids blink; shoulders relax, small smile returns, head rests down. No new falling tears. Last pose leads naturally into sleep. |
| happy | `celebration-entry` (2–3 s) | `celebration-loop` (5–8 s) | Eyes brighten and blink, body sits up, torso stretches, arms rise; one paw waves with elbow/wrist articulation; broad smile, gentle head tilts. Add drifting stars/magical particles. No tears. |

The game moves from `recovery` back to `sleep` after 2.5 seconds. Keep `recovery-entry` ≤ 2.2 seconds so the actual wipe/relax action is visible before this transition. Any looping recovery segment is a short calm breathing hold. All other state changes may interrupt clips at arbitrary times; the player preserves the last visible clip until the new clip has decoded, then crossfades for 220 ms. Use compatible silhouettes/neutral boundary poses to avoid visible double faces.

## Acceptance checklist before enabling

- At least 24 consecutive decoded frames show real anatomical movement in EACH state, with the bedroom stable.
- Every state is reviewed at normal playback speed in the game, not just inspected as still frames.
- Eyelids fully close over the eyes during a blink; eyes do not merely shrink.
- Ear pivots, shoulder and chest movement are separate from the background.
- Crying tears originate at the eyes, change shape, follow cheek surfaces and detach/fall, stagger independently, then regenerate for the whole loop.
- Sleep, warning and celebration never show tears. Recovery starts without continuing crying streams and visibly wipes the eyes.
- Celebration includes a genuine torso rise/stretch and paw wave; rotating a rectangular crop is insufficient.
- Entry/loop joins and all interrupted-state transitions have no pops, held frames, black frames, jumps or duplicate characters.
- Timer/noise/pause/restart tests pass with the real clips. Video clocks stop during pause. Restart plays the sleep entry from its beginning.
- Review desktop and mobile layouts, reduced-motion behavior, real HTTPS microphone permission, and a representative classroom computer.
- Run the asset verifier and existing engine/browser tests. These automated checks cannot judge anatomical realism, emotional tone or character consistency; human visual review is mandatory.

Only after these checks: set `enabled: true` in `manifest.json`, test with the real assets, then merge the animation branch into `main`. The player never uploads sound or depends on an external video service.
