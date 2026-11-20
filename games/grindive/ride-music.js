const rideMusic = (() => {
  // Keep the selected MP3 in memory so playback and seeks do not depend on
  // byte-range support on the device or the static host.
  const player = new Audio();
  player.volume = .55;
  player.preload = 'auto';
  let track, controller, objectUrl, prepared = false, playing = false, held = false;
  let lastCourseTime = 0, nextCue = 0, lastTime = -1;

  function selectTrack(selected) {
    if (track === selected) return;
    controller?.abort();
    player.pause();
    player.removeAttribute('src');
    player.load();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = null;
    track = selected;
    prepared = false;
    playing = false;
    if (!track) return;
    const url = 'music/' + track.file;
    player.src = url;
    if (location.protocol === 'file:') return;
    controller = new AbortController();
    const signal = controller.signal;
    player.preload = 'none';
    fetch(url, {signal}).then(async response => {
      if (!response.ok) throw Error('MP3 ' + response.status);
      const data = await response.blob();
      if (signal.aborted) return;
      objectUrl = URL.createObjectURL(new Blob([data], {type:'audio/mpeg'}));
      if (!playing || player.error || (player.readyState < 3 && player.currentTime === 0)) {
        player.src = objectUrl;
        player.preload = 'auto';
        player.load();
        prepared = true;
        if (playing && !held) startAudio();
      }
    }).catch(() => {}); // The original URL remains usable on a failed prefetch.
  }

  function startAudio() {
    const selected = track;
    player.play().catch(error => {
      if (playing && track === selected && error.name !== 'AbortError') tell('음원을 재생할 수 없어요');
    });
  }
  player.addEventListener('error', () => {
    if (!playing || !track || prepared || !objectUrl) return;
    prepared = true;
    player.src = objectUrl;
    if (!held) startAudio();
  });
  function play(resume) {
    if (!track) return;
    if (!resume) {
      nextCue = 0;
      lastTime = -1;
      lastCourseTime = 0;
      if (objectUrl && !prepared) { player.src = objectUrl; prepared = true; }
      player.currentTime = 0;
    }
    playing = true;
    held = false;
    startAudio();
  }
  function sync(time, stopped) {
    if (!track || !playing) return;
    const rewind = time < lastCourseTime - .25;
    lastCourseTime = time;
    if (stopped && !held) player.pause();
    if (rewind && player.readyState >= 1) player.currentTime = time;
    if (!stopped && held) { if (player.readyState >= 1) player.currentTime = time; startAudio(); }
    // Let streaming audio establish playback before attempting clock corrections.
    if (!stopped && !held && player.readyState >= 3 && !player.seeking &&
        player.currentTime > .15 && Math.abs(player.currentTime-time) > .85)
      player.currentTime = Math.min(time, player.duration);
    held = stopped;
  }
  function accent() {
    if (!track || player.paused) return 0;
    const time = player.currentTime;
    if (time < lastTime) nextCue = 0;
    lastTime = time;
    while (nextCue < track.cues.length && track.cues[nextCue] <= time) nextCue++;
    return nextCue ? Math.max(0, 1 - (time - track.cues[nextCue - 1]) / .18) : 0;
  }
  return { selectTrack, play, pause() { playing = false; player.pause(); }, accent, sync };
})();
