import { TRACKS, MusicPlayer } from './music.js?v=c9a3057ee538';
import { libraryTrack, saveLibraryTrack, loadLibraryTracks } from './music-library.js?v=c9a3057ee538';
import { GameState, analyzeSamples, makeChart, clamp } from './engine.js?v=c9a3057ee538';
import { World } from './scene.js?v=c9a3057ee538';
import { weaponForId } from './weapons.js?v=c9a3057ee538';
import { exitGame } from './launch.js?v=c9a3057ee538';
import { setupFullscreen } from './fullscreen.js?v=c9a3057ee538';

const $ = id => document.getElementById(id);
const stage = $('stage');
setupFullscreen($('fullscreenButton'));
let world;
try { world = new World($('scene')); }
catch (error) { $('homeError').textContent = '3D 화면을 시작하지 못했어요. WebGL을 지원하는 브라우저에서 하드웨어 가속을 켜고 다시 열어 주세요.'; $('startButton').disabled = true; console.error(error); }
const audio = new MusicPlayer();
const difficulty = 'normal';
let selected = TRACKS[0], state = null, mode = 'home', playerX = 0;
let preparing = false, countdownTimer = null, countdownRemaining = 3, feedbackUntil = 0, damageUntil = 0;
let drag = null, attackKeyHeld = false, lastFrame = performance.now(), elapsed = 0;
const analyses = new Map();
const formatTime = seconds => `${Math.floor(Math.max(0, seconds) / 60)}:${String(Math.floor(Math.max(0, seconds) % 60)).padStart(2, '0')}`;
const panels = ['home', 'hud', 'loading', 'pausePanel', 'result', 'countdown'];
function show(...ids) { for (const id of panels) $(id).classList.toggle('hidden', !ids.includes(id)); }
function switchMode(next) { mode = next; stage.classList.toggle('playing', next !== 'home' && next !== 'loading'); drag = null; attackKeyHeld = false; }

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
const localTracks = new Map();
function addLocalTrack(track, saved = true) {
  if (localTracks.has(track.id)) {
    if (saved) {
      const row = [...$('trackList').children].find(button => button.dataset.id === track.id);
      if (row) row.querySelector('small').textContent = '내 보관함 · 기기에 저장됨';
    }
    return localTracks.get(track.id);
  }
  localTracks.set(track.id, track);
  const button = document.createElement('button');
  button.className = 'track-option'; button.dataset.id = track.id;
  const art = document.createElement('span'); art.className = 'album-art'; art.textContent = '♫';
  const label = document.createElement('span'), title = document.createElement('strong'), subtitle = document.createElement('small');
  title.textContent = track.title; subtitle.textContent = saved ? '내 보관함 · 기기에 저장됨' : '내 노래 · 이번 탭에서만 사용'; label.append(title, subtitle);
  const check = document.createElement('span'); check.className = 'check';
  button.append(art, label, check);
  button.addEventListener('click', () => { selectTrack(track); $('trackDialog').close(); });
  $('trackList').prepend(button);
  return track;
}
loadLibraryTracks().then(tracks => {
  for (const track of tracks) if (track.localFile && track.id) addLocalTrack(track);
  selectTrack(selected);
}).catch(() => { $('localMusicError').textContent = '저장된 음원을 불러오지 못했어요. 파일 선택으로 이번 탭에서 플레이할 수 있어요.'; });
$('localMusicButton').addEventListener('click', () => $('localMusicFile').click());
$('localMusicFile').addEventListener('change', async () => {
  const file = $('localMusicFile').files?.[0];
  $('localMusicFile').value = '';
  if (!file) return;
  $('localMusicError').textContent = '';
  $('localMusicButton').disabled = true;
  try {
    const track = libraryTrack(file);
    let saved = true;
    try { await saveLibraryTrack(track); }
    catch { saved = false; }
    const stored = addLocalTrack(track, saved);
    selectTrack(stored); $('homeError').textContent = '';
    if (saved) $('trackDialog').close();
    else $('localMusicError').textContent = '기기 저장 공간을 사용할 수 없어 이번 탭에서만 보관해요. 노래는 선택되어 있으니 닫고 플레이할 수 있어요.';
  } catch (error) { $('localMusicError').textContent = error.message; }
  finally { $('localMusicButton').disabled = false; }
});
$('helpButton').addEventListener('click', () => $('helpDialog').showModal());
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => $(button.dataset.close).close()));
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } }));

async function start() {
  if (preparing || !world) return;
  preparing = true; clearInterval(countdownTimer); audio.stop();
  switchMode('loading'); show('loading'); $('homeError').textContent = ''; $('loadingText').textContent = `${selected.title} · 음악을 불러오는 중`;
  try {
    await audio.unlock();
    const buffer = await audio.load(selected);
    if (selected.localFile) { selected.duration = formatTime(buffer.duration); selectTrack(selected); }
    $('loadingText').textContent = '박자를 찾고 음표의 길을 만드는 중';
    // Allow the loading text to paint before the bounded analysis work.
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    let analysis = analyses.get(selected.id);
    if (!analysis) { analysis = analyzeSamples(buffer.getChannelData(0), buffer.sampleRate); analyses.set(selected.id, analysis); }
    const seed = ([...selected.id].reduce((n, c) => n * 31 + c.charCodeAt(0) >>> 0, 7) ^ Math.floor(Math.random() * 0x100000000)) >>> 0;
    state = new GameState(makeChart(buffer.duration, analysis, difficulty, seed), difficulty);
    playerX = -.5; feedbackUntil = 0; damageUntil = 0; world.clearGameObjects();
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
  $('resultMessage').textContent = won ? '보스를 물리쳤어요!' : '다시 도전해 보세요.';
  $('resultSaved').textContent = state.saved; $('resultCombo').textContent = state.maxCombo; $('resultPower').textContent = state.maxAttackDamage;
  $('result').querySelector('.result-stats small').textContent = won ? '구출한 음표' : '이번 판 만난 음표';
  $('resultDetail').textContent = won ? `${formatTime(state.defeatedAt)}에 보스 격파 · 지뢰 피격 ${state.hits}회` : `코스 ${Math.round(state.time / state.chart.duration * 100)}% · 보스 체력 ${Math.ceil(state.boss / state.chart.bossMax * 100)}% 남음`;
  $('residents').replaceChildren();
  if (won) for (let i = 0; i < Math.min(state.saved, 24); i++) { const resident = document.createElement('span'); resident.textContent = i % 3 === 0 ? '♫' : '♪'; resident.setAttribute('aria-hidden', 'true'); $('residents').append(resident); }
}
function updateHUD() {
  if (!state) return;
  const boss = state.chart.bossMax ? state.boss / state.chart.bossMax * 100 : 0, course = state.time / state.chart.duration * 100;
  $('bossFill').style.width = `${boss}%`; $('bossValue').textContent = `${Math.ceil(boss)}%`; $('bossMeter').setAttribute('aria-valuenow', Math.ceil(boss));
  $('courseFill').style.height = `${course}%`; $('courseValue').textContent = `${Math.floor(course)}%`; $('courseMeter').setAttribute('aria-valuenow', Math.floor(course));
  $('healthFill').style.height = `${state.health / state.maxHealth * 100}%`; $('healthValue').textContent = Number(state.health.toFixed(1)); $('healthMeter').setAttribute('aria-valuenow', state.health); $('healthMeter').setAttribute('aria-valuemax', state.maxHealth); document.querySelector('.health').classList.toggle('low', state.health < state.maxHealth * .3);
  $('savedValue').textContent = state.saved; $('comboValue').textContent = `${state.combo} COMBO`; $('powerValue').textContent = state.power;
  const attack = state.chargedAttack, weapon = weaponForId(attack?.weapon);
  $('weaponName').style.color = '#' + weapon.color.toString(16).padStart(6, '0');
  $('weaponName').textContent = attack ? `${weapon.name} · ${attack.damage} × ${attack.shots}발` : '음표를 모아 에너지를 충전해요';
  $('energyValue').textContent = state.energy;
  $('energyFill').style.width = `${Math.min(100, state.energy / 30 * 100)}%`;
  $('energyMeter').setAttribute('aria-valuenow', Math.min(30, state.energy));
  $('energyMeter').setAttribute('aria-valuetext', `${state.energy}개 충전${attack ? ` · ${weapon.name}` : ''}`);
  $('attackHint').textContent = state.boss <= 0 ? '보스 격파 · 음표를 계속 모아요' : state.energy ? '손을 떼면 공격 · PC는 F키 떼기' : '10 쌍권총 · 20 기관총 · 30 미사일';
  $('timeValue').textContent = `${formatTime(state.time)} / ${formatTime(state.chart.duration)}`;
  const bonus = state.boss <= 0;
  $('bossName').textContent = bonus ? 'HARMONY RESTORED · 구출 타임' : `${state.theme.name} · ${state.theme.bossName}`;
}
function handleEffects(effects) {
  for (const effect of effects) {
    if (effect.type === 'save') { world.burst(effect.lane, 0xb6f6d9); audio.sound('save'); }
    if (effect.type === 'miss') feedback('음표 놓침 · 충전 초기화', true);
    if (effect.type === 'attack') feedback(`${weaponForId(effect.weapon).name} · 피해 ${effect.damage}`, false);
    if (effect.type === 'missile') { world.shootMissiles(effect.projectiles); audio.sound('shot'); }
    if (effect.type === 'shot') { world.shoot(effect.lane, effect.weapon, effect.pellets, effect.projectiles); audio.sound('shot'); }
    if (effect.type === 'hit') world.impact(effect);
    if (effect.type === 'mine') { world.burst(effect.lane, 0xff789d, effect.point); audio.sound('mine'); damageUntil = performance.now() + 200; feedback(`체력 −${effect.damage}`, true); }
    if (effect.type === 'victory') { world.burst(2, 0xe0bcff); feedback('보스 격파 · RESCUE TIME!', false, 2300); }
  }
}
function feedback(text, hurt = false, duration = 750) { $('feedback').textContent = text; $('feedback').classList.toggle('hurt', hurt); feedbackUntil = performance.now() + duration; }

$('startButton').addEventListener('click', start); $('restartButton').addEventListener('click', start); $('againButton').addEventListener('click', start);
$('pauseButton').addEventListener('click', () => pause()); $('resumeButton').addEventListener('click', resume); $('quitButton').addEventListener('click', goHome); $('homeButton').addEventListener('click', goHome);
$('pauseExitButton').addEventListener('click', returnToLauncher);
$('resultExitButton').addEventListener('click', returnToLauncher);
$('volume').addEventListener('input', e => audio.setVolume(Number(e.target.value) / 100));
function attack() {
  if (mode !== 'playing' || !state) return;
  const lane = clamp(Math.round(playerX + 1.5), 0, 3);
  handleEffects(state.releaseAttack(audio.time, lane, world.character.position.x));
  if (state.status !== 'playing') { finish(); return; }
  updateHUD();
}
stage.addEventListener('pointerdown', e => {
  if (mode !== 'playing' || drag || !e.isPrimary || e.button !== 0 || e.target.closest('button')) return;
  drag = { id: e.pointerId, x: e.clientX, player: playerX }; stage.setPointerCapture(e.pointerId);
});
stage.addEventListener('pointermove', e => {
  if (!drag || drag.id !== e.pointerId || mode !== 'playing') return;
  const lanePixels = world.viewWidth * .135;
  playerX = clamp(drag.player + (e.clientX - drag.x) / lanePixels, -1.5, 1.5);
});
stage.addEventListener('pointerup', e => {
  if (drag?.id !== e.pointerId) return;
  drag = null; attack();
});
const cancelDrag = e => { if (drag?.id === e.pointerId) drag = null; };
stage.addEventListener('pointercancel', cancelDrag); stage.addEventListener('lostpointercapture', cancelDrag);
document.addEventListener('keydown', e => {
  if (document.querySelector('dialog[open]') || e.target.matches('input')) return;
  if (e.code === 'KeyF' && mode === 'playing') { e.preventDefault(); attackKeyHeld = true; }
  if (['ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D'].includes(e.key) && mode === 'playing') {
    e.preventDefault(); if (!e.repeat) playerX = clamp(Math.round(playerX + 1.5) - 1.5 + (['ArrowLeft', 'a', 'A'].includes(e.key) ? -1 : 1), -1.5, 1.5);
  }
  if ((e.key === 'Escape' || e.code === 'Space') && ['playing', 'paused', 'countdown'].includes(mode)) { e.preventDefault(); if (mode === 'paused') resume(); else pause(); }
});
document.addEventListener('keyup', e => {
  if (e.code !== 'KeyF') return;
  const held = attackKeyHeld; attackKeyHeld = false;
  if (held && mode === 'playing') { e.preventDefault(); attack(); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden) pause('화면을 벗어나 자동으로 일시정지했어요.'); });
window.addEventListener('blur', () => pause('화면을 벗어나 자동으로 일시정지했어요.'));

function frame(now) {
  const dt = Math.min((now - lastFrame) / 1000, .05); lastFrame = now; elapsed += dt;
  if (mode === 'playing' && state) {
    if (audio.context.state !== 'running') pause('오디오가 중단되어 잠시 멈췄어요. 계속 플레이를 눌러 주세요.');
    else {
      const lane = clamp(Math.round(playerX + 1.5), 0, 3);
      handleEffects(state.advance(audio.time, lane, world.character.position.x)); updateHUD();
      if (state.status !== 'playing') finish();
    }
  }
  $('feedback').classList.toggle('show', now < feedbackUntil && mode === 'playing');
  $('damageFlash').classList.toggle('active', now < damageUntil && mode === 'playing');
  world?.render(elapsed, dt, state, playerX, mode);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

