if (new URLSearchParams(location.search).has('stage')) { await import('./game-main.js'); } else { await import('./world-map.js'); }
