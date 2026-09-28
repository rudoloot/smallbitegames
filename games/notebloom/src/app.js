import { TRACKS, MusicPlayer } from './music.js';
import { GameState, analyzeSamples, makeChart, clamp } from './engine.js';
import { World } from './scene.js';
import { exitGame } from './launch.js';

const $ = id => document.getElementById(id);
const stage = $('stage');
let world;
try { world = new World($('scene')); }
catch (error) { $('homeError').textContent = '3D 화면을 시작하지 못했어요. WebGL을 지원하는 브라우저에서 하드웨어 가속을 켜고 다시 열어 주세요.'; $('startButton').disabled = true; console.error(error); }
const audio = new MusicPlayer();
let selected = TRACKS[0], difficulty = 'easy', state = null, mode = 'home', playerX = 0;
let preparing = false, countdownTimer = null, countdownRemaining = 3, feedbackUntil = 0, damageUntil = 0;
let drag = null, lastFrame = performance.now(), elapsed = 0;
const analyses = new Map();
const formatTime = seconds => `${Math.floor(Math.max(0, seconds) / 60)}:${String(Math.floor(Math.max(0, seconds) % 60)).padStart(2, '0')}`;
const panels = ['home', 'hud', 'loading', 'pausePanel', 'result', 'countdown'];
function show(...ids) { for (const id of panels) $(id).classList.toggle('hidden', !ids.includes(id)); }
function switchMode(next) { mode = next; stage.classList.toggle('playing', next !== 'home' && next !== 'loading'); drag = null; }

function selectTrack(track) {
  selected = track; $('selectedTitle').textContent = track.title; $('selectedArtist').textContent = `${track.artist} · ${track.duration}`;
  $('trackButton').querySelector('.album-art').style.background = `radial-gradient(ellipse at 75% 20%,${track.color},transparent 70%),linear-gradient(130deg,#7c6ab0,#303c53)`;
  for (const button of $('trackList').children) { const checked = button.dataset.id === track.id; button.classList.toggle('selected', checked); button.setAttribute('aria-pressed', String(checked)); button.querySelector('.check').textContent = checked ? '✓' : ''; }
}
for (const track of TRACKS) {
  const button = document.createElement('button'); button.className = 'track-option'; button.dataset.id = track.id;
  // All strings here are local, curated catalog entries, not user-supplied HTML.
  button.innerHTML = `<span class="album-art" style="background:linear-gradient(135deg,${track.color},#30344f)">♫</span><span><strong>${track.title}</strong><small>${track.artist} · ${track.genre}</small></span><span class="track-duration">${track.duration}</span><span class="check"></span>`;
  button.addEventListener('click', () => { selectTrack(track); $('trackDialog').close(); }); $('trackList').append(button);
}
selectTrack(selected);
$('trackButton').addEventListener('click', () => $('trackDialog').showModal());
$('helpButton').addEventListener('click', () => $('helpDialog').showModal());
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => $(button.dataset.close).close()));
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } }));
document.querySelectorAll('[data-difficulty]').forEach(button => button.addEventListener('click', () => {
  difficulty = button.dataset.difficulty;
  document.querySelectorAll('[data-difficulty]').forEach(b => { b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button)); });
}));

async function start() {
  if (preparing || !world) return;
  preparing = true; clearInterval(countdownTimer); audio.stop();
  switchMode('loading'); show('loading'); $('homeError').textContent = ''; $('loadingText').textContent = `${selected.title} · 음악을 불러오는 중`;
  try {
    await audio.unlock();
    const buffer = await audio.load(selected);
    $('loadingText').textContent = '박자를 찾고 음표의 길을 만드는 중';
    // Allow the loading text to paint before the bounded analysis work.
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    let analysis = analyses.get(selected.id);
    if (!analysis) { analysis = analyzeSamples(buffer.getChannelData(0), buffer.sampleRate); analyses.set(selected.id, analysis); }
    const seed = [...selected.id].reduce((n, c) => n * 31 + c.charCodeAt(0) >>> 0, 7);
    state = new GameState(makeChart(buffer.duration, analysis, difficulty, seed), difficulty);
    playerX = 0; feedbackUntil = 0; damageUntil = 0; world.clearGameObjects();
    $('playingTitle').textContent = selected.title; $('feedback').classList.remove('show'); updateHUD();
    countdownRemaining = 3;
    if (document.hidden) { switchMode('paused'); show('hud', 'pausePanel'); }
    else beginCountdown();
  } catch (error) {
    switchMode('home'); show('home'); $('homeError').textContent = error.message || '음악을 준비하지 못했어요. 다시 시도해 주세요.'; console.error(error);
  } finally { preparing = false; }
}
function beginCountdown() {
  switchMode('countdown'); show('hud', 'countdown'); $('countdown').textContent = countdownRemaining;
  clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    if (mode !== 'countdown') return;
    countdownRemaining--;
    if (countdownRemaining <= 0) { clearInterval(countdownTimer); audio.play(); switchMode('playing'); show('hud'); }
    else $('countdown').textContent = countdownRemaining;
  }, 850);
}
function pause(message = '음악과 여정이 함께 멈춰 있어요.') {
  if (!['playing', 'countdown'].includes(mode)) return;
  clearInterval(countdownTimer); audio.pause(); switchMode('paused'); show('hud', 'pausePanel'); $('pauseDescription').textContent = message;
}
async function resume() {
  if (mode !== 'paused') return;
  try {
    await audio.unlock();
    if (mode !== 'paused') return; // Exit/restart may have happened while resuming audio.
    if (countdownRemaining > 0) beginCountdown();
    else { audio.play(); switchMode('playing'); show('hud'); }
  } catch { $('pauseDescription').textContent = '음악을 재개하지 못했어요. 계속 플레이를 다시 눌러 주세요.'; }
}
function stopGame() {
  clearInterval(countdownTimer); audio.stop(); state = null; countdownRemaining = 0;
  switchMode('home'); world?.clearGameObjects(); $('damageFlash').classList.remove('active');
}
function goHome() {
  stopGame(); show('home');
}
function returnToLauncher() {
  exitGame({
    search: window.location.search,
    currentOrigin: window.location.origin,
    stop: stopGame,
    replace: target => window.location.replace(target),
    showMenu: () => show('home'),
  });
}
function finish() {
  audio.pause(); switchMode('result'); show('result'); world.clearGameObjects();
  const won = state.status === 'won';
  $('resultSymbol').textContent = won ? '✳' : '☾';
  $('resultEyebrow').textContent = won ? 'THE WORLD BLOOMS AGAIN' : 'EVERY JOURNEY IS A NEW BEGINNING';
  $('resultTitle').textContent = won ? '다시, 피어난 음악.' : state.status === 'lost-health' ? '잠시, 리듬을 놓쳤어요.' : '조금만 더, 닿을 수 있어요.';
  $('resultMessage').textContent = won ? '보스를 물리쳤어요! 음표 주민들이 돌아왔어요.' : state.status === 'lost-health' ? '아리아의 에너지가 다했어요. 음표를 만나 회복해 주세요.' : '보스가 주민들을 다시 데려갔어요. 양끝 레인에서 더 공격해 보세요.';
  $('resultSaved').textContent = state.saved; $('resultCombo').textContent = state.maxCombo; $('resultPower').textContent = state.power;
  $('result').querySelector('.result-stats small').textContent = won ? '구출한 음표' : '이번 판 만난 음표';
  $('resultDetail').textContent = won ? `${formatTime(state.defeatedAt)}에 보스 격파 · 지뢰 피격 ${state.hits}회` : `코스 ${Math.round(state.time / state.chart.duration * 100)}% · 보스 체력 ${Math.ceil(state.boss / state.chart.bossMax * 100)}% 남음`;
  $('residents').replaceChildren();
  if (won) for (let i = 0; i < Math.min(state.saved, 24); i++) { const resident = document.createElement('span'); resident.textContent = i % 3 === 0 ? '♫' : '♪'; resident.setAttribute('aria-hidden', 'true'); $('residents').append(resident); }
}
function updateHUD() {
  if (!state) return;
  const boss = state.boss / state.chart.bossMax * 100, course = state.time / state.chart.duration * 100;
  $('bossFill').style.width = `${boss}%`; $('bossValue').textContent = `${Math.ceil(boss)}%`; $('bossMeter').setAttribute('aria-valuenow', Math.ceil(boss));
  $('courseFill').style.height = `${course}%`; $('courseValue').textContent = `${Math.floor(course)}%`; $('courseMeter').setAttribute('aria-valuenow', Math.floor(course));
  $('healthFill').style.height = `${state.health}%`; $('healthValue').textContent = state.health; $('healthMeter').setAttribute('aria-valuenow', state.health); document.querySelector('.health').classList.toggle('low', state.health < 30);
  $('savedValue').textContent = state.saved; $('comboValue').textContent = state.combo > 1 ? `${state.combo} COMBO` : '음표를 구해요'; $('powerValue').textContent = state.power;
  $('weaponName').textContent = state.saved >= 50 ? 'BLOOM BLASTER · LV.3' : state.saved >= 20 ? 'PRISM PISTOL · LV.2' : 'PULSE PISTOL · LV.1';
  $('timeValue').textContent = `${formatTime(state.time)} / ${formatTime(state.chart.duration)}`;
  const bonus = state.boss <= 0, attack = !bonus && state.attackWindow;
  $('phase').classList.toggle('attack', attack); $('phase').classList.toggle('bonus', bonus);
  $('phase').querySelector('span').textContent = bonus ? '보스 격파! 남은 주민을 구해요' : attack ? '← 양끝 레인에서 공격 →' : '중앙에서 구출 · 체력 회복';
  $('bossName').textContent = bonus ? 'HARMONY RESTORED · 구출 타임' : 'DISSONANCE · 불협화음';
}
function handleEffects(effects) {
  for (const effect of effects) {
    if (effect.type === 'save') { world.burst(effect.lane, 0xb6f6d9); audio.sound('save'); }
    if (effect.type === 'shot') { world.shoot(effect.lane); audio.sound('shot'); }
    if (effect.type === 'mine') { world.burst(effect.lane, 0xff789d); audio.sound('mine'); damageUntil = performance.now() + 200; feedback(`체력 −${state.rules.mine}`, true); }
    if (effect.type === 'victory') { world.burst(2, 0xe0bcff); feedback('보스 격파 · RESCUE TIME!', false, 2300); }
    if (effect.type === 'save' && state.saved % 10 === 0) feedback(`+${state.rules.heal} HP · ${state.saved} RESCUED`);
  }
}
function feedback(text, hurt = false, duration = 750) { $('feedback').textContent = text; $('feedback').classList.toggle('hurt', hurt); feedbackUntil = performance.now() + duration; }

$('startButton').addEventListener('click', start); $('restartButton').addEventListener('click', start); $('againButton').addEventListener('click', start);
$('pauseButton').addEventListener('click', () => pause()); $('resumeButton').addEventListener('click', resume); $('quitButton').addEventListener('click', goHome); $('homeButton').addEventListener('click', goHome);
$('pauseExitButton').addEventListener('click', returnToLauncher);
$('resultExitButton').addEventListener('click', returnToLauncher);
$('volume').addEventListener('input', e => audio.setVolume(Number(e.target.value) / 100));
stage.addEventListener('pointerdown', e => {
  if (mode !== 'playing' || e.target.closest('button')) return;
  drag = { id: e.pointerId, x: e.clientX, player: playerX }; stage.setPointerCapture(e.pointerId);
});
stage.addEventListener('pointermove', e => {
  if (!drag || drag.id !== e.pointerId || mode !== 'playing') return;
  const lanePixels = stage.clientWidth * .135;
  playerX = clamp(drag.player + (e.clientX - drag.x) / lanePixels, -2, 2);
});
const release = e => { if (drag?.id === e.pointerId) drag = null; };
stage.addEventListener('pointerup', release); stage.addEventListener('pointercancel', release); stage.addEventListener('lostpointercapture', release);
document.addEventListener('keydown', e => {
  if (document.querySelector('dialog[open]') || e.target.matches('input')) return;
  if (['ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D'].includes(e.key) && mode === 'playing') {
    e.preventDefault(); if (!e.repeat) playerX = clamp(Math.round(playerX) + (['ArrowLeft', 'a', 'A'].includes(e.key) ? -1 : 1), -2, 2);
  }
  if ((e.key === 'Escape' || e.code === 'Space') && ['playing', 'paused', 'countdown'].includes(mode)) { e.preventDefault(); if (mode === 'paused') resume(); else pause(); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) pause('화면을 벗어나 자동으로 일시정지했어요.'); });
window.addEventListener('blur', () => pause('화면을 벗어나 자동으로 일시정지했어요.'));

function frame(now) {
  const dt = Math.min((now - lastFrame) / 1000, .05); lastFrame = now; elapsed += dt;
  if (mode === 'playing' && state) {
    if (audio.context.state !== 'running') pause('오디오가 중단되어 잠시 멈췄어요. 계속 플레이를 눌러 주세요.');
    else {
      const lane = clamp(Math.round(playerX) + 2, 0, 4);
      handleEffects(state.advance(audio.time, lane)); updateHUD();
      if (state.status !== 'playing') finish();
    }
  }
  $('feedback').classList.toggle('show', now < feedbackUntil && mode === 'playing');
  $('damageFlash').classList.toggle('active', now < damageUntil && mode === 'playing');
  world?.render(elapsed, dt, state, playerX, mode);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
