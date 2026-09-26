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
```

`data-category`는 `single` 또는 `multi`로 지정합니다. `data-href`가 있으면 카드를 눌렀을 때 게임으로 이동하고, 없으면 준비 중 안내가 표시됩니다. 새 게임에는 `art-standalone`과 독립된 썸네일을 사용하세요.

사이트에서 게임을 열 때 전달하는 `returnTo` 주소와 게임의 종료 처리 방식은 [게임 실행·복귀 규약](../GAME_LAUNCH_CONTRACT.md)을 따릅니다.

GitHub Pages는 정적 파일을 게시합니다. 실시간 멀티플레이에는 별도의 서버가 필요합니다.
