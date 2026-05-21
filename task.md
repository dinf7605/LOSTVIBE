# 📋 LOSTVIBE Portal 개발 태스크 리스트 (Task Checklist)

각 단계별 작업이 완료될 때마다 깃에 커밋 및 푸시(Commit & Push)할 수 있도록 설계된 독립적이고 유기적인 10단계 개발 일정표입니다.

---

- [x] **Step 1: 프로젝트 초기화 및 백엔드 프레임워크 구축**
  - [x] `npm init` 프로젝트 초기화 및 기본 패키지(`express`, `dotenv`, `cors`, `node-fetch`) 설치
  - [x] `.env.example` 템플릿 생성
  - [x] 기본 `server.js` 서버 구조 설계 (정적 파일 서빙 및 기본 핑 테스트 엔드포인트)
  - *추천 커밋 메시지:* `Feat: Initialize Node/Express server boilerplate`

- [x] **Step 2: 백엔드 로스트아크 API 동적 프록시 라우터 구현**
  - [x] 프론트엔드가 전송할 `x-lostark-api-key` 헤더 가로채기 로직 구현
  - [x] `/api/calendar` (게임 캘린더) 중계 엔드포인트 구현
  - [x] `/api/market` (거래소/경매장 검색) 중계 엔드포인트 구현
  - *추천 커밋 메시지:* `Feat: Add Lost Ark API proxy routes with user-key headers`

- [x] **Step 3: 백엔드 Gemini AI 분석 엔드포인트 구현**
  - [x] 서버 사이드 `GEMINI_API_KEY` 환경변수 세팅
  - [x] `/api/analyze` 엔드포인트 생성: 프론트로부터 시세 데이터를 받아 Gemini 1.5 Flash에 질의 및 응답 반환 로직 구현
  - *추천 커밋 메시지:* `Feat: Add server-side Gemini AI analysis endpoint`

- [x] **Step 4: 프론트엔드 퍼블리싱 (HTML 뼈대 및 CSS 디자인 시스템)**
  - [x] `public/index.html` 생성: 5-Card 메인 홈, 설정 모달 및 각 유틸리티별 빈 레이아웃 구조화
  - [x] `public/index.css` 구축: HSL 기반 다크/네온 테마 토큰, Glassmorphism 카드, 호버 애니메이션 스타일링
  - *추천 커밋 메시지:* `Style: Build CSS design system and SPA layout shell`

- [x] **Step 5: 프론트엔드 SPA 라우터 및 오늘의 일정 캘린더 위젯 구현**
  - [x] hashchange 기반의 부드러운 SPA 탭 네비게이션 및 로컬스토리지 API Key 저장 모듈 구현
  - [x] 메인 홈 화면의 '오늘의 일정 캘린더' 위젯 연동 및 실시간 카운트다운 타이머 구현
  - *추천 커밋 메시지:* `Feat: Implement SPA router and live schedule calendar widget`

- [ ] **Step 6: 아비도스 제작 효율 계산기 및 영지 타이머 구현**
  - [ ] 일반/상급 아비도스 T4 소모 재료비 및 수수료 할인, 대성공 슬라이더 계산식 구현
  - [ ] 활동력 완충 및 목표 제작 횟수별 대기 시간 카운트다운 타이머 개발
  - *추천 커밋 메시지:* `Feat: Implement Abidos crafting calculator and Stronghold timer`

- [ ] **Step 7: 스펙 & 특성 효율(치적/음속돌파/뭉가) 진단기 구현**
  - [ ] 신속/치명 스탯 실시간 변환 로직 탑재
  - [ ] **뭉툭한 가시** 딜 기댓값 비교 분석기(치피/초과치적/레벨별 변환율 공식) 구현
  - [ ] **음속 돌파** 초과 공이속 대비 진피증 효율 게이지 연산 구현
  - *추천 커밋 메시지:* `Feat: Implement Spec, Blunt Thorn and Sonic Breakthrough calculators`

- [ ] **Step 8: 낙원 지옥 보상 효율 및 레이드 분배금 계산기 구현**
  - [ ] 낙원 지옥 단계별(1640/1700/1730) 보상 랭킹(복원석, 공명석 실시간 환산 가치) 모듈 구현
  - [ ] 4인 / 8인 / 16인 레이드 경매 적정 손익분기점 및 10% 선점 마진 낙찰가 계산식 구현
  - *추천 커밋 메시지:* `Feat: Implement Paradise Hell rewards and Raid auction calculators`

- [ ] **Step 9: 실시간 거래소 검색 및 Gemini AI 리포트 인터랙션 구현**
  - [ ] 각인서/보석 시세 검색 리스트 및 프록시 호출 프론트 바인딩
  - [ ] AI 애널리스트 피드 UI 및 터미널 타자기 출력 인터랙션 결합
  - *추천 커밋 메시지:* `Feat: Integrate market search UI and Gemini AI typist feed`

- [ ] **Step 10: 전체 통합 테스트, 예외 처리 및 최종 폴리싱**
  - [ ] 모바일/태블릿 디바이스 반응형 세부 보정
  - [ ] API Key 미입력 시 예외 흐름 및 예쁜 다크 테마 경고 배너 보강
  - *추천 커밋 메시지:* `Fix: Final UI polish, responsiveness and error-handling wrap up`
