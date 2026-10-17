/**
 * Genuine video animation renderer. Does not synthesize character motion from stills.
 * Disabled until an animator supplies the clips declared in manifest.json.
 * Keeps the existing scene visible until a decoded, playing video is ready.
 */
const STATES = ['sleep', 'warn', 'cry', 'recovery', 'happy'];
const noop = () => {};
export function validateManifest(manifest) {
  if (manifest.version !== 1) throw new Error('Unsupported animation manifest version');
  if (!manifest.enabled) return;
  if (!Number.isFinite(manifest.crossfadeMs) || manifest.crossfadeMs < 0 || manifest.crossfadeMs > 1000) {
    throw new Error('crossfadeMs must be between 0 and 1000');
  }
  for (const name of STATES) {
    const state = manifest.states?.[name];
    if (!state?.loop || (!state.loop.webm && !state.loop.mp4)) throw new Error(`Missing animated loop: ${name}`);
    for (const clip of [state.entry, state.loop].filter(Boolean)) {
      for (const file of Object.values(clip)) {
        if (typeof file !== 'string' || !file || /^(?:data:|javascript:)/i.test(file)) {
          throw new Error(`Invalid animated source: ${name}`);
        }
      }
    }
  }
}
function waitForFrame(video, timeoutMs) {
  return new Promise((resolve, reject) => {
    let timeout;
    const cleanup = () => {
      clearTimeout(timeout);
      video.removeEventListener('loadeddata', ready);
      video.removeEventListener('error', error);
      video.removeEventListener('abort', error);
    };
    const ready = () => { cleanup(); resolve(); };
    const error = () => { cleanup(); reject(new Error(`Animation could not be decoded: ${video.currentSrc || video.src}`)); };
    video.addEventListener('loadeddata', ready, {once: true});
    video.addEventListener('error', error, {once: true});
    video.addEventListener('abort', error, {once: true});
    timeout = setTimeout(() => { cleanup(); reject(new Error('Animation loading timed out')); }, timeoutMs);
    video.load();
  });
}
export class CharacterAnimationPlayer {
  constructor(host, manifest, manifestURL, {timeoutMs = 15000, onError = noop} = {}) {
    validateManifest(manifest);
    this.host = host;
    this.manifest = manifest;
    this.base = new URL(manifest.assetRoot || './', manifestURL);
    this.timeoutMs = timeoutMs;
    this.onError = onError;
    this.state = null;
    this.phase = null;
    this.paused = false;
    this.disposed = false;
    this.failed = false;
    this.epoch = 0;
    this.current = null;
    this.pending = null;
    this.retiring = new Map();
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    this.motionChange = () => this.applyPause();
    this.reducedMotion.addEventListener('change', this.motionChange);
    this.visibilityChange = () => this.applyPause();
    document.addEventListener('visibilitychange', this.visibilityChange);
    this.layer = document.createElement('div');
    this.layer.className = 'character-film';
    this.layer.setAttribute('aria-hidden', 'true');
    if (manifest.enabled) host.prepend(this.layer);
  }
  sync(state, paused = false) {
    if (!this.manifest.enabled || this.disposed || this.failed) return;
    this.paused = paused;
    if (!STATES.includes(state)) return;
    if (state !== this.state) {
      this.state = state;
      const epoch = ++this.epoch;
      this.loadPhase(state, this.manifest.states[state].entry ? 'entry' : 'loop', epoch);
    }
    this.applyPause();
  }
  get shouldPause() { return this.paused || document.hidden || this.reducedMotion.matches; }
  async loadPhase(state, phase, epoch) {
    // At most one incoming clip. Stale requests never take over the visible character.
    if (this.pending) this.release(this.pending);
    for (const [retired, timer] of this.retiring) { clearTimeout(timer); this.release(retired); }
    this.retiring.clear();
    const video = document.createElement('video');
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.controls = false;
    video.loop = phase === 'loop';
    video.dataset.state = state;
    video.dataset.phase = phase;
    video.style.transitionDuration = `${this.manifest.crossfadeMs}ms`;
    const clip = this.manifest.states[state][phase];
    const sources = [];
    // Source selection retains the MP4 fallback if WebM is unsupported or damaged.
    for (const [format, type] of [['webm', 'video/webm'], ['mp4', 'video/mp4']]) {
      if (clip[format] && video.canPlayType(type)) {
        const url = new URL(clip[format], this.base);
        if (url.origin !== location.origin) return this.fail(new Error('Character clips must be hosted with the game'));
        sources.push(url.href);
      }
    }
    this.pending = video;
    this.layer.append(video);
    try {
      let loaded = false, lastError;
      for (const src of sources) {
        if (epoch !== this.epoch || this.disposed) { this.release(video); return; }
        try {
          video.src = src;
          await waitForFrame(video, this.timeoutMs);
          loaded = true;
          break;
        } catch (error) { lastError = error; }
      }
      if (!loaded) throw lastError || new Error('No supported character animation format');
      if (epoch !== this.epoch || this.disposed) { this.release(video); return; }
      // If paused, decoded first frame is ready, but animation time must not advance.
      if (!this.shouldPause) await video.play();
      if (epoch !== this.epoch || this.disposed) { this.release(video); return; }
      const previous = this.current;
      this.current = video;
      this.pending = null;
      this.phase = phase;
      // Force an initial opacity before revealing the new decoded clip.
      video.getBoundingClientRect();
      video.classList.add('visible');
      this.host.classList.add('animation-ready');
      this.host.dataset.animationStatus = 'playing';
      this.host.dataset.animationPhase = phase;
      if (previous && previous !== video) {
        previous.classList.remove('visible');
        const id = setTimeout(() => {
          this.retiring.delete(previous);
          this.release(previous);
        }, this.manifest.crossfadeMs + 40);
        this.retiring.set(previous, id);
      }
      video.addEventListener('ended', () => {
        if (epoch === this.epoch && !this.disposed && phase === 'entry') this.loadPhase(state, 'loop', epoch);
      }, {once: true});
      video.addEventListener('error', () => {
        if (this.current === video && epoch === this.epoch && !this.disposed) this.fail(new Error('Character animation playback failed'));
      }, {once: true});
      this.applyPause();
    } catch (error) {
      this.release(video);
      if (epoch === this.epoch && !this.disposed) this.fail(error);
    }
  }
  applyPause() {
    if (this.disposed) return;
    for (const video of [this.current, this.pending, ...this.retiring.keys()].filter(Boolean)) {
      if (this.shouldPause) video.pause();
      else if (video.readyState >= 2 && video.paused) video.play().catch(error => {
        if (this.current === video && !this.shouldPause && !this.disposed) this.fail(error);
      });
    }
  }
  reset(state = 'sleep') {
    if (this.disposed || !this.manifest.enabled) return;
    ++this.epoch;
    this.state = null;
    this.phase = null;
    this.paused = false;
    this.failed = false;
    this.clearVideos();
    this.host.classList.remove('animation-ready');
    this.sync(state, false);
  }
  release(video) {
    video.pause();
    video.removeAttribute('src');
    video.load();
    video.remove();
    if (this.pending === video) this.pending = null;
  }
  clearVideos() {
    for (const [video, timer] of this.retiring) { clearTimeout(timer); this.release(video); }
    this.retiring.clear();
    for (const video of new Set([this.current, this.pending].filter(Boolean))) this.release(video);
    this.current = this.pending = null;
  }
  fail(error) {
    if (this.disposed || this.failed) return;
    this.failed = true;
    ++this.epoch;
    this.clearVideos();
    this.host.classList.remove('animation-ready');
    this.host.dataset.animationStatus = 'unavailable';
    this.onError(error);
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    ++this.epoch;
    this.clearVideos();
    this.reducedMotion.removeEventListener('change', this.motionChange);
    document.removeEventListener('visibilitychange', this.visibilityChange);
    this.layer.remove();
    this.host.classList.remove('animation-ready');
  }
}
export async function mountCharacterAnimation(host, {manifestURL = new URL('./manifest.json', import.meta.url), onError = noop} = {}) {
  try {
    const url = new URL(manifestURL, location.href);
    const response = await fetch(url, {cache: 'no-cache'});
    if (!response.ok) throw new Error(`Animation manifest: HTTP ${response.status}`);
    const manifest = await response.json();
    validateManifest(manifest);
    if (!manifest.enabled) {
      host.dataset.animationStatus = 'awaiting-assets';
      return null;
    }
    return new CharacterAnimationPlayer(host, manifest, url, {onError});
  } catch (error) {
    host.dataset.animationStatus = 'unavailable';
    onError(error);
    return null;
  }
}
