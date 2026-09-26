# 게임 추가 방법

새 게임은 게임마다 별도 폴더를 만듭니다.

```text
games/
└─ my-game/
   ├─ index.html
   ├─ thumbnail.png
   └─ (게임에 필요한 CSS, JavaScript, 이미지)
```

홈페이지 `index.html`에서 게임 카드를 추가하거나 기존 카드를 수정합니다.

```html
<div class="game-entry" data-game-id="my-game">
  <button class="game-card" type="button"
        data-name="새 게임" data-category="single"
        data-description="게임 소개"
        data-href="games/my-game/index.html">
    <span class="art art-standalone">
      <img src="games/my-game/thumbnail.png" alt="새 게임 화면" />
    </span>
    <span class="card-copy">
      <strong>새 게임</strong>
      <span class="card-meta">게임 장르 | 게임 소개</span>
    </span>
  </button>
  <button class="favorite-button" type="button" aria-label="새 게임 즐겨찾기 추가" aria-pressed="false" title="즐겨찾기 추가">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5 3.6 12.7C1.9 11.1 2 8.3 3.6 6.7a4.5 4.5 0 0 1 6.4 0L12 8.6l2-1.9a4.5 4.5 0 0 1 6.4 0c1.6 1.6 1.7 4.4 0 6L12 20.5Z" /></svg>
  </button>
</div>
```

`data-game-id`는 게임마다 고유하고 바뀌지 않는 값으로 지정합니다. 이 값을 브라우저의 즐겨찾기 저장에 사용합니다. `data-category`는 `single`, `multi`, `random`(랜덤 뽑기) 중 하나로 지정합니다. `data-href`가 있으면 카드를 눌렀을 때 게임으로 이동하고, 없으면 준비 중 안내가 표시됩니다. 새 게임에는 `art-standalone`과 독립된 썸네일을 사용하세요.

프리뷰 영역은 높이 150px이고 이미지는 비율을 유지해 전체가 보이도록 맞춥니다. 가로로 긴 배너를 권장하며, 화면 폭에 따라 남는 공간은 같은 이미지를 흐리게 깔아 채웁니다. 중요한 글자와 그림은 이미지 중앙에 배치하세요.

사이트에서 게임을 열 때 전달하는 `returnTo` 주소와 게임의 종료 처리 방식은 [게임 실행·복귀 규약](../GAME_LAUNCH_CONTRACT.md)을 따릅니다.

GitHub Pages는 정적 파일을 게시합니다. 실시간 멀티플레이에는 별도의 서버가 필요합니다.
