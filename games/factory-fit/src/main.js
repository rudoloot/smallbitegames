import {sitePath} from './site-path.js';
const requested=new URLSearchParams(location.search).get('stage');
if (requested===null) {
  await import('./world-map.js');
} else {
  const { STAGES }=await import('./game/config.js');
  if (requested==='editor-preview' || requested==='first-workflow-01' || STAGES.some(stage=>stage.id===requested)) {
    await import('./game-main.js');
  } else {
    location.replace(sitePath('./'));
  }
}
