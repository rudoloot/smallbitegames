import { audibleContextTime } from './timing.js?v=7b71865ac2d8';
export const NOTE_SOUND_GAIN = 1.6;

// Titles, artists and reference durations transcribed from music 정보.md's image.
export const TRACKS = [
  { id: 'escape', title: 'Escape Your Love', artist: 'FASSounds', genre: 'DANCE POP', duration: '2:18', color: '#c1a5ff', file: 'fassounds-escape-your-love-upbeat-fashion-pop-dance-412230.mp3' },
  { id: 'medicine', title: 'Medicine', artist: 'Gvidon', genre: 'DRUM & BASS', duration: '2:37', color: '#89dacb', file: 'gvidon-gvidon-medicine-364031.mp3' },
  { id: 'carnaval', title: 'Carnaval', artist: 'Alec Koff', genre: 'SAMBA LATIN', duration: '1:00', color: '#ffb991', file: 'alec_koff-carnaval-484622.mp3' },
  { id: 'water', title: 'Water', artist: 'kontraa', genre: 'AFRO POP', duration: '1:09', color: '#87beff', file: 'kontraa-water-afro-pop-music-445661.mp3' },
  { id: 'funk', title: 'Funk & Breakbeat', artist: 'AlexGuz', genre: 'FUNK', duration: '2:04', color: '#f9cc7c', file: 'alexguz-funk-amp-breakbeat-upbeat-advertising-happy-cook-541097.mp3' },
  { id: 'football', title: 'Football', artist: 'SigmaMusicArt', genre: 'ENERGETIC', duration: '0:59', color: '#aee0a6', file: 'sigmamusicart-football-football-music-551346.mp3' },
  { id: 'future', title: 'No Copyright Music', artist: 'SigmaMusicArt', genre: 'FUTURE BASS', duration: '2:03', color: '#dfadf4', file: 'sigmamusicart-no-copyright-music-537751.mp3' },
  { id: 'peace', title: 'Moment of Peace', artist: 'MickeysCat', genre: 'SOLO PIANO', duration: '2:32', color: '#bdcbe8', file: 'mickeyscat-moment-of-peace-mickeyscat-554494.mp3' },
  { id: 'wonders', title: 'Wonders of the Earth', artist: 'Grand_Project', genre: 'ADVENTURE', duration: '2:29', color: '#83d6c3', file: 'grand_project-wonders-of-the-earth-550792.mp3' },
  { id: 'dark', title: 'Dark', artist: 'AudioCopper', genre: 'CINEMATIC', duration: '2:38', color: '#a7adff', file: 'audiocopper-dark-571483.mp3' },
  { id: 'background', title: 'Background Music', artist: 'ikoliks_aj', genre: 'GROOVE', duration: '2:23', color: '#ffb3c5', file: 'ikoliks_aj-background-music-320427.mp3' },
  { id: 'dramatic', title: 'Dramatic Cinematic', artist: '_musicdream_', genre: 'ORCHESTRAL', duration: '3:16', color: '#b5d2e7', file: 'musicdream-dramatic-cinematic-documentary-609202.mp3' },
];

// A short kick with a crisp, filtered noise attack: audible over the soundtrack
// without a pitched melody that could clash with the selected song.
export function rescueBeatSamples(sampleRate) {
  const samples = new Float32Array(Math.ceil(sampleRate * .15));
  let phase = 0, noise = 73, previousNoise = 0;
  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate;
    phase += 2 * Math.PI * (65 + 155 * Math.exp(-t * 55)) / sampleRate;
    noise = (1664525 * noise + 1013904223) >>> 0;
    const currentNoise = noise / 4294967296 * 2 - 1;
    const click = (currentNoise - previousNoise) * .23 * Math.exp(-t * 130);
    previousNoise = currentNoise;
    const attack = Math.min(1, t / .0015), release = Math.min(1, (samples.length - 1 - i) / (sampleRate * .012));
    samples[i] = (.72 * Math.sin(phase) * Math.exp(-t * 26) + click) * attack * release;
  }
  return samples;
}

export function localTrackFromFile(file, id) {
  if (!file || file.size === 0) throw new Error('비어 있는 파일이에요. 다른 음원을 선택해 주세요.');
  if (file.size > 50 * 1024 * 1024) throw new Error('50MB 이하의 음원을 선택해 주세요.');
  return { id: `local-${id}`, title: file.name.replace(/\.[^.]+$/, '') || file.name, artist: '내 기기', genre: 'MY MUSIC', duration: '선택한 음원', color: '#89dacb', localFile: file };
}

export class MusicPlayer {
  constructor() { this.context = null; this.source = null; this.buffer = null; this.offset = 0; this.started = 0; this.position = 0; this.playing = false; this.volume = .65; this.cache = new Map(); this.rescueVoices = new Set(); }
  async unlock() {
    if (!this.context) {
      this.context = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
      this.gain = this.context.createGain(); this.gain.connect(this.context.destination); this.gain.gain.value = this.volume;
      this.rescueGain = this.context.createGain(); this.rescueGain.gain.value = this.volume * NOTE_SOUND_GAIN;
      this.rescueGain.connect(this.context.destination);
      const samples = rescueBeatSamples(this.context.sampleRate);
      this.rescueBuffer = this.context.createBuffer(1, samples.length, this.context.sampleRate);
      this.rescueBuffer.copyToChannel(samples, 0);
    }
    await this.context.resume();
  }
  async load(track) {
    this.stop();
    if (this.cache.has(track.id)) this.buffer = this.cache.get(track.id);
    else {
      let data;
      if (track.localFile) data = await track.localFile.arrayBuffer();
      else {
        const response = await fetch(`./music/${track.file}`);
        if (!response.ok) throw new Error('음악 파일을 불러오지 못했습니다. 서버와 music 폴더를 확인해 주세요.');
        data = await response.arrayBuffer();
      }
      try { this.buffer = await this.context.decodeAudioData(data); }
      catch { throw new Error('이 음원을 재생할 수 없어요. 손상되지 않은 MP3 또는 이 브라우저가 지원하는 다른 음원을 선택해 주세요.'); }
      if (track.localFile && (this.buffer.duration < 10 || this.buffer.duration > 600)) {
        this.buffer = null;
        throw new Error('10초 이상, 10분 이하의 노래를 선택해 주세요.');
      }
      if (this.cache.size >= 2) this.cache.delete(this.cache.keys().next().value);
      this.cache.set(track.id, this.buffer);
    }
    this.offset = this.position = 0;
    return this.buffer;
  }
  play() {
    if (!this.buffer || this.playing) return;
    this.source = this.context.createBufferSource(); this.source.buffer = this.buffer; this.source.connect(this.gain);
    // Schedule an explicit start so source playback and our clock share an origin.
    this.started = this.context.currentTime + .025;
    this.position = this.offset; this.source.start(this.started, this.offset); this.playing = true;
  }
  timeAt(now = performance.now()) {
    if (!this.playing) return this.offset;
    const elapsed = Math.max(0, audibleContextTime(this.context, now) - this.started);
    // Output timestamp estimates can wobble slightly; judgment must not rewind.
    this.position = Math.min(this.buffer?.duration || 0, Math.max(this.position, this.offset + elapsed));
    return this.position;
  }
  get time() { return this.timeAt(); }
  pause() {
    for (const voice of this.rescueVoices) { voice.stop(); voice.disconnect(); }
    this.rescueVoices.clear();
    if (!this.playing) return;
    this.offset = this.time; this.playing = false; this.source?.stop(); this.source?.disconnect(); this.source = null;
  }
  stop() { this.pause(); this.offset = this.position = 0; }
  setVolume(value) {
    this.volume = value;
    if (this.gain) this.gain.gain.setTargetAtTime(value, this.context.currentTime, .04);
    if (this.rescueGain) this.rescueGain.gain.setTargetAtTime(value * NOTE_SOUND_GAIN, this.context.currentTime, .04);
  }
  sound(kind) {
    if (!this.context || !this.playing) return;
    if (kind === 'save') {
      const voice = this.context.createBufferSource(); voice.buffer = this.rescueBuffer;
      voice.connect(this.rescueGain); this.rescueVoices.add(voice);
      voice.onended = () => { voice.disconnect(); this.rescueVoices.delete(voice); };
      voice.start();
      return;
    }
    const osc = this.context.createOscillator(), gain = this.context.createGain(), now = this.context.currentTime;
    osc.type = kind === 'mine' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(kind === 'mine' ? 110 : kind === 'shot' ? 480 : 1046, now);
    osc.frequency.exponentialRampToValueAtTime(kind === 'mine' ? 40 : kind === 'shot' ? 90 : 1568, now + .09);
    gain.gain.setValueAtTime((kind === 'shot' ? .022 : .045) * this.volume, now); gain.gain.exponentialRampToValueAtTime(.001, now + .12);
    osc.connect(gain); gain.connect(this.context.destination); osc.start(); osc.stop(now + .13);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }
}
