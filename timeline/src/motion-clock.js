/** Let WAAPI advance between clock samples; correct seeks and media drift. */
export function motionClock(animations, duration, sample = time => time) {
  let running = false;
  let speed = 1;
  let last = NaN;
  return {
    seek(seconds, { playing = false, rate = 1 } = {}) {
      const time = sample(Math.max(0, Math.min(duration, seconds))) * 1000;
      const changed = running !== playing || speed !== rate;
      const actual = animations[0]?.currentTime ?? 0;
      // A paused clock must land exactly. During playback, avoid invalidating
      // every SVG effect each frame just to repeat the browser's own clock.
      if (changed || (playing ? Math.abs(actual - time) > 80 : time !== last)) {
        for (const animation of animations) animation.currentTime = time;
      }
      if (speed !== rate) for (const animation of animations) animation.playbackRate = rate;
      if (running !== playing) for (const animation of animations) playing ? animation.play() : animation.pause();
      running = playing;
      speed = rate;
      last = time;
    },
  };
}
