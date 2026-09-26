const categoryToggle = document.querySelector('#category-toggle');
const categoryMenu = document.querySelector('#category-menu');
const categoryOptions = [...document.querySelectorAll('.category-option')];
const searchInput = document.querySelector('#game-search');
const searchTrigger = document.querySelector('#search-trigger');
const searchField = document.querySelector('.search-field');
const entries = [...document.querySelectorAll('.game-entry')];
const cards = entries.map((entry) => entry.querySelector('.game-card'));
const emptyState = document.querySelector('#empty-state');
const dialog = document.querySelector('#info-dialog');
const favoritesStorageKey = 'smallbitegames:favorites:v1';
let favorites = new Set();
let category = 'all';

try {
  const saved = JSON.parse(localStorage.getItem(favoritesStorageKey) || '[]');
  if (Array.isArray(saved)) favorites = new Set(saved.filter((id) => typeof id === 'string'));
} catch {
  // 저장소를 사용할 수 없어도 이 페이지에서 즐겨찾기는 작동합니다.
}

function updateFavoriteButton(entry) {
  const button = entry.querySelector('.favorite-button');
  const gameName = entry.querySelector('.game-card').dataset.name;
  const selected = favorites.has(entry.dataset.gameId);
  button.setAttribute('aria-pressed', String(selected));
  button.setAttribute('aria-label', `${gameName} 즐겨찾기 ${selected ? '해제' : '추가'}`);
  button.title = `즐겨찾기 ${selected ? '해제' : '추가'}`;
}

function updateGames() {
  const query = searchInput.value.trim().toLocaleLowerCase('ko');
  let visible = 0;
  entries.forEach((entry) => {
    const card = entry.querySelector('.game-card');
    const matchesCategory = category === 'all' ||
      (category === 'favorites' ? favorites.has(entry.dataset.gameId) : card.dataset.category === category);
    const matchesSearch = `${card.dataset.name} ${card.textContent}`.toLocaleLowerCase('ko').includes(query);
    const show = matchesCategory && matchesSearch;
    entry.hidden = !show;
    if (show) visible += 1;
  });
  emptyState.hidden = visible !== 0;
  emptyState.textContent = query ? '검색 결과가 없어요. 다른 이름으로 검색해 보세요.' :
    category === 'favorites' ? '즐겨찾기한 게임이 없어요. 카드의 하트를 눌러 추가해 보세요.' :
    '등록된 게임이 없어요.';
}

entries.forEach((entry) => {
  updateFavoriteButton(entry);
  entry.querySelector('.favorite-button').addEventListener('click', () => {
    const id = entry.dataset.gameId;
    if (favorites.has(id)) favorites.delete(id);
    else favorites.add(id);
    try {
      localStorage.setItem(favoritesStorageKey, JSON.stringify([...favorites]));
    } catch {
      // 저장이 차단된 브라우저에서는 현재 페이지에만 상태를 유지합니다.
    }
    updateFavoriteButton(entry);
    updateGames();
  });
});

function closeCategoryMenu() {
  categoryMenu.hidden = true;
  categoryToggle.setAttribute('aria-expanded', 'false');
}

categoryToggle.addEventListener('click', () => {
  const open = categoryMenu.hidden;
  categoryMenu.hidden = !open;
  categoryToggle.setAttribute('aria-expanded', String(open));
});

categoryOptions.forEach((option) => option.addEventListener('click', () => {
  category = option.dataset.category;
  categoryOptions.forEach((item) => item.classList.toggle('active', item === option));
  document.querySelector('#selected-category').textContent = category === 'all' ? '카테고리' : option.textContent;
  closeCategoryMenu();
  updateGames();
}));

document.addEventListener('click', (event) => {
  if (!event.target.closest('.category-control')) closeCategoryMenu();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeCategoryMenu();
});
searchInput.addEventListener('input', updateGames);
searchTrigger.addEventListener('click', () => {
  const open = !searchField.classList.contains('is-open');
  searchField.classList.toggle('is-open', open);
  searchTrigger.setAttribute('aria-expanded', String(open));
  searchTrigger.setAttribute('aria-label', open ? '검색 닫기' : '검색 열기');
  if (open) searchInput.focus();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && searchField.classList.contains('is-open')) {
    searchField.classList.remove('is-open');
    searchTrigger.setAttribute('aria-expanded', 'false');
    searchTrigger.setAttribute('aria-label', '검색 열기');
    searchTrigger.focus();
  }
});

function showDialog(title, description, note) {
  document.querySelector('#dialog-title').textContent = title;
  document.querySelector('#dialog-description').textContent = description;
  document.querySelector('#dialog-note').textContent = note;
  dialog.showModal();
}

cards.forEach((card) => card.addEventListener('click', () => {
  if (card.dataset.href) {
    const gameUrl = new URL(card.dataset.href, window.location.href);
    const returnUrl = new URL('index.html', window.location.href);
    gameUrl.searchParams.set('returnTo', returnUrl.href);
    window.location.assign(gameUrl.href);
    return;
  }
  showDialog(card.dataset.name, card.dataset.description, '게임은 현재 준비 중이에요. 곧 이곳에서 즐길 수 있습니다!');
}));
document.querySelector('#profile-button').addEventListener('click', () => {
  showDialog('내 계정', 'SmallBiteGames에 오신 것을 환영해요.', '계정 기능은 현재 준비 중이에요.');
});
document.querySelector('#dialog-close').addEventListener('click', () => dialog.close());
document.querySelector('#dialog-confirm').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
