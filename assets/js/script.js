const categoryToggle = document.querySelector('#category-toggle');
const categoryMenu = document.querySelector('#category-menu');
const categoryOptions = [...document.querySelectorAll('.category-option')];
const searchInput = document.querySelector('#game-search');
const searchTrigger = document.querySelector('#search-trigger');
const searchField = document.querySelector('.search-field');
const cards = [...document.querySelectorAll('.game-card')];
const emptyState = document.querySelector('#empty-state');
const dialog = document.querySelector('#info-dialog');
let category = 'all';

function updateGames() {
  const query = searchInput.value.trim().toLocaleLowerCase('ko');
  let visible = 0;
  cards.forEach((card) => {
    const matchesCategory = category === 'all' || card.dataset.category === category;
    const matchesSearch = `${card.dataset.name} ${card.textContent}`.toLocaleLowerCase('ko').includes(query);
    const show = matchesCategory && matchesSearch;
    card.hidden = !show;
    if (show) visible += 1;
  });
  emptyState.hidden = visible !== 0;
}

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
    window.location.href = card.dataset.href;
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
