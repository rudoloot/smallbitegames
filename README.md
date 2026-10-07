# SmallBiteGames

모바일 브라우저에서 즐기는 HTML 게임 홈페이지입니다. 빌드 도구 없이 GitHub Pages에 올릴 수 있는 정적 사이트입니다.

## 폴더 구조

```text
smallbitegames/
├─ index.html                 # 홈페이지 (게시 루트)
├─ .nojekyll                  # GitHub Pages에서 파일을 그대로 게시
├─ assets/
│  ├─ css/styles.css          # 홈페이지 스타일
│  ├─ js/script.js            # 검색, 카테고리, 카드 동작
│  └─ images/home-reference.png
└─ games/
   └─ README.md              # 새 게임을 추가하는 방법
```

## GitHub Pages에 올리기

1. GitHub에서 새 저장소를 만듭니다. 예: `smallbitegames`.
2. **이 폴더 안의 파일과 폴더**를 새 저장소 최상위에 업로드합니다. `index.html`이 저장소 최상위에 보여야 합니다. `smallbitegames` 폴더 자체를 한 단계 더 감싸서 올리지 마세요.
3. 저장소의 **Settings → Pages → Build and deployment**에서 **Deploy from a branch**를 선택합니다.
4. 업로드한 브랜치(보통 `main`)와 **/(root)**를 선택하고 저장합니다.
5. Pages 화면에 표시된 사이트 주소로 접속합니다. 업로드 후 게시까지 시간이 걸릴 수 있습니다.

이미지·CSS·JavaScript 경로는 모두 상대 경로이므로 일반 프로젝트 사이트(`사용자명.github.io/저장소명/`)에서도 사용할 수 있습니다.

현재 등록된 게임은 `마인런`, `마지막 전사`, `데드콰이엇`, `XenoTide Defense`, `LaundryDone`, `디바인드랍`, `노트블룸`, `매트릭스 셀렉션`, `GoFlickDuel`, `엘리멘탈 다이스`, `Steel Agents`입니다. 게임을 추가할 때는 [games/README.md](games/README.md)를 참고하세요. 데드콰이엇은 방장의 모바일 브라우저가 게임을 진행하며, Cloudflare Worker로 방 목록과 연결 정보를 교환합니다. 현재 TURN 중계는 설정하지 않아 모바일망 환경에 따라 연결되지 않을 수 있습니다.

카드의 하트 버튼으로 게임을 즐겨찾기에 추가할 수 있습니다. 즐겨찾기는 사용 중인 브라우저에 저장되며, 카테고리 메뉴의 `즐겨찾기`에서 모아 볼 수 있습니다.

다른 게임 프로젝트에서 홈페이지 복귀 기능을 구현할 때는 [게임 실행·복귀 규약](GAME_LAUNCH_CONTRACT.md)을 참고하세요. 홈페이지는 게임을 열 때 `returnTo` 주소를 전달합니다.
