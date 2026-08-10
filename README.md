# 강계람 PWA v1.0

아이폰/아이패드 Safari에서 홈 화면에 추가해 앱처럼 사용하는 웹앱입니다.

## 포함 기능
- 폴더 / 하위 폴더
- 프롬프트 추가·수정·삭제
- NovelAI / Stable Diffusion / Midjourney / 영상 / 기타 타입
- 태그 / 검색 / 즐겨찾기
- 이미지 여러 장 첨부
- 휴지통 / 복원 / 영구 삭제
- 프롬프트 생성기
- 클립보드 복사
- JSON 전체 백업 / 복원 (이미지 포함)
- 다크 모드
- PWA 오프라인 캐시

## 중요한 점
PWA 설치(홈 화면 추가)를 제대로 사용하려면 웹사이트가 HTTPS로 열려야 합니다.
Windows에서 ZIP을 그냥 더블클릭해 index.html을 열면 화면 테스트는 가능하지만,
Service Worker/PWA 설치 및 일부 브라우저 저장 기능은 제한될 수 있습니다.

## 가장 쉬운 배포: GitHub Pages
1. GitHub에서 새 저장소를 만듭니다.
2. 이 폴더 안의 파일(index.html, app.js, styles.css, manifest.webmanifest, sw.js, icons 폴더)을 저장소 최상단에 업로드합니다.
3. GitHub 저장소 → Settings → Pages로 이동합니다.
4. Build and deployment를 `Deploy from a branch`로 선택합니다.
5. Branch를 `main` / `(root)`로 선택하고 저장합니다.
6. 생성된 HTTPS 주소를 iPhone Safari에서 엽니다.
7. Safari 공유 버튼 → `홈 화면에 추가`를 누릅니다.

## 데이터 저장
데이터는 브라우저의 IndexedDB에 저장됩니다. 서버로 전송하지 않습니다.
Safari 사이트 데이터 삭제, 기기 초기화 등에 대비하여 JSON 백업을 주기적으로 내보내는 것을 권장합니다.
