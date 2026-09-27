# 생성 이미지 — v0.4

현재 사용: `comic-atlas-0.png`~`comic-atlas-6.png`(112개 기본 이미지), `comic-evolution.png`(10개 생물 추가 및 포유류·새 교체), `comic-toys.png`(선반 18종), `family-home-v4.png`(육아 가정집). 모두 내장 image_gen으로 생성했습니다. 정확한 새 프롬프트는 [prompts-v4.json](./prompts-v4.json)에 있습니다.

카툰 객체를 연결 성분별로 분리하고 가로세로 비율을 압축합니다. 변경된 실루엣으로 충돌 형상도 다시 계산합니다. 아래 파일은 이전 버전 원본으로 보존합니다.

2026-09-27, 내장 **image_gen** 도구로 제작했습니다. CLI/API 대체 경로는 사용하지 않았습니다. 게임은 이 폴더에 복사된 이미지를 사용하며 원래 생성 위치에 의존하지 않습니다.

|파일|내용|
|---|---|
|[celestial-home.png](./celestial-home.png)|벽난로·목재 가구·별빛 창문·천문 장식이 있는 신의 가정집|
|[atlas-0.png](./atlas-0.png)|네 원소와 자연 현상 16종|
|[atlas-1.png](./atlas-1.png)|생명·자연·기초 재료 16종|
|[atlas-2.png](./atlas-2.png)|도구·기술 부품·요리 재료 16종|
|[atlas-3.png](./atlas-3.png)|동물·신화동물 등 16종|
|[atlas-4.png](./atlas-4.png)|마법 물건·현대 기술 등 16종|
|[atlas-5.png](./atlas-5.png)|식재료·부품 16종|
|[atlas-6.png](./atlas-6.png)|추가 음식·동물·기술 등 16종|
|[toy-atlas.png](./toy-atlas.png)|원래 선반 18종의 장난감 모습|

정확한 프롬프트 원문은 [prompts.json](./prompts.json)과 [toy-prompt.txt](./toy-prompt.txt)에 있습니다. 이미지 내 셀과 아이템 ID의 대응은 [manifest.json](./manifest.json)에 기록했습니다.

수조 이미지는 실사풍 생성 이미지이고 선반 이미지는 실제 장난감을 촬영한 듯한 스타일입니다. 게임에서 각 셀을 분리하고 투명 경계에 맞게 정규화하여 렌더링합니다. 수조 충돌체는 이 정규화된 이미지의 알파 실루엣을 사용합니다.
