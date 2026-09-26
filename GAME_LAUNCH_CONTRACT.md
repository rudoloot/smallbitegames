# 게임 실행·복귀 규약 (v1)

SmallBiteGames와 다른 사이트에서 같은 HTML 게임을 실행할 때 사용하는 주소 규약입니다. **게임 화면의 구조나 배포 위치를 특정 사이트에 고정하지 않습니다.** 현재 SmallBiteGames는 실행 주소 전달만 구현합니다. 마인런의 종료 메뉴는 아직 이 규약을 처리하지 않습니다.

## 1. 사이트에서 게임 실행

게임 주소의 쿼리 매개변수 이름은 정확히 `returnTo`입니다. 값은 게임 종료 후 돌아갈 **절대 HTTPS URL**입니다. 사이트는 URL을 문자열로 직접 이어 붙이지 말고 `URL`과 `URLSearchParams`로 인코딩합니다.

```js
const gameUrl = new URL('games/mine-run/index.html', window.location.href);
const returnUrl = new URL('index.html', window.location.href);
gameUrl.searchParams.set('returnTo', returnUrl.href);
window.location.assign(gameUrl.href);
```

SmallBiteGames에서 만든 게임 주소 예시:

```text
https://rudoloot.github.io/smallbitegames/games/mine-run/index.html?returnTo=https%3A%2F%2Frudoloot.github.io%2Fsmallbitegames%2Findex.html
```

다른 사이트는 자신이 운영하는 게임 목록 주소를 `returnTo`로 전달합니다. 게임은 **같은 탭**에서 엽니다. 돌아갈 주소에 비밀번호, 인증 토큰 같은 민감한 값을 넣지 않습니다.

## 2. 게임에서 종료 처리

게임의 **명시적인 “게임 종료하기” 동작**에서만 복귀합니다. 게임 오버가 되었다는 이유만으로 자동 이동하지 않습니다. 게임 오버 화면에서 점수나 재시작 선택지를 볼 수 있어야 합니다.

1. `new URLSearchParams(window.location.search).get('returnTo')`로 값을 읽습니다. `URLSearchParams`가 이미 디코딩하므로 `decodeURIComponent`를 다시 호출하지 않습니다.
2. `new URL(value)`로 절대 주소인지 확인합니다. 배포 환경에서는 HTTPS만 허용합니다.
3. 게임 배포자가 허용한 **사이트 출처(origin)** 에 속하는지 확인합니다. 필요하면 복귀 경로도 제한합니다. 새 협력 사이트는 허용 목록에 추가합니다.
4. 유효한 주소라면 필요한 종료·기록 저장을 마친 뒤 `window.location.replace(target.href)`로 이동합니다. `replace`는 뒤로 가기로 종료한 게임에 다시 들어가는 일을 줄입니다.
5. 값이 없거나 유효하지 않으면 외부 사이트로 이동하지 않습니다. 게임 자체 시작 화면이나 종료 안내를 보여줍니다. `document.referrer`나 브라우저 방문 기록을 복귀 주소로 추측하지 않습니다.

게임 프로젝트에서 사용할 수 있는 검증 예시:

```js
const allowedOrigins = new Set([
  window.location.origin, // 같은 사이트에서 실행한 경우
  // 'https://partner.example', // 신뢰하는 다른 사이트를 등록
]);

function getReturnUrl() {
  const raw = new URLSearchParams(window.location.search).get('returnTo');
  if (!raw) return null;

  try {
    const target = new URL(raw);
    if (target.protocol !== 'https:' || !allowedOrigins.has(target.origin)) return null;
    return target.href;
  } catch {
    return null;
  }
}

function exitGame() {
  const returnUrl = getReturnUrl();
  if (returnUrl) window.location.replace(returnUrl);
  else showGameMenu(); // 게임 프로젝트에서 구현할 자체 메뉴
}
```

개발 중 `http://localhost`를 허용할지는 게임 프로젝트가 별도로 정합니다. 배포용 허용 목록에는 등록된 HTTPS 사이트만 넣습니다.

## 3. 확인할 동작

- SmallBiteGames에서 카드를 누르면 게임 주소에 인코딩된 `returnTo`가 포함됩니다.
- 게임 주소를 직접 열어 `returnTo`가 없어도 게임은 시작됩니다.
- 유효한 주소를 전달한 뒤 “게임 종료하기”를 누르면 해당 사이트로 돌아갑니다.
- 잘못된 주소나 허용되지 않은 출처는 리디렉션하지 않습니다.
- 점수 저장이 필요한 게임은 저장 완료 또는 실패 처리를 마친 뒤 이동합니다. 스코어보드 데이터 규약은 이 문서와 별개입니다.
