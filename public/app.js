/**
 * LOSTVIBE - 프론트엔드 메인 컨트롤러 (app.js)
 * SPA 라우팅, API Key 설정 및 실시간 캘린더 위젯 구현
 */

document.addEventListener('DOMContentLoaded', () => {
  // === 1. DOM 요소 및 상태 정의 ===
  const state = {
    apiKey: localStorage.getItem('lostark-api-key') || '',
    currentPage: 'home',
    calendarData: null,
    timerIntervalId: null,
    // 기본 모의 시세 가격 정보 (Step 6 및 Step 9에서 사용 예정)
    marketPrices: {
      '아비도스 대검': 45,
      '아비도스 유물': 60,
      '오레하 유물': 20,
      '희귀한 유물': 10,
      '고대 유물': 0.2,
      '융화 재료': 280
    }
  };

  // UI 요소 참조
  const ui = {
    apiWarning: document.getElementById('api-warning'),
    btnSettings: document.getElementById('btn-settings'),
    modalSettings: document.getElementById('modal-settings'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    btnSaveKey: document.getElementById('btn-save-key'),
    btnDeleteKey: document.getElementById('btn-delete-key'),
    inputApiKey: document.getElementById('input-api-key'),
    liveClock: document.getElementById('live-clock'),
    navBrand: document.getElementById('nav-brand'),
    navButtons: document.querySelectorAll('.nav-btn'),
    menuCards: document.querySelectorAll('.menu-card'),
    pageViews: document.querySelectorAll('.page-view'),
    
    // 캘린더 타이머
    chaosTimer: document.getElementById('chaos-timer'),
    chaosStatus: document.getElementById('chaos-status'),
    bossTimer: document.getElementById('boss-timer'),
    bossStatus: document.getElementById('boss-status'),
    islandTimer: document.getElementById('island-timer'),
    islandStatus: document.getElementById('island-status')
  };

  // === 2. SPA 라우터 및 네비게이션 제어 ===
  
  // 페이지 뷰 전환 함수
  function switchPage(pageId) {
    if (!pageId) pageId = 'home';
    state.currentPage = pageId;

    // 모든 뷰 비활성화 및 타겟 뷰 활성화
    ui.pageViews.forEach(view => {
      view.classList.remove('active');
    });
    const targetPage = document.getElementById(`page-${pageId}`);
    if (targetPage) {
      targetPage.classList.add('active');
    }

    // 내비게이션 버튼 활성화 클래스 동기화
    ui.navButtons.forEach(btn => {
      if (btn.getAttribute('data-target') === pageId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // 해시 값 변경 (무한 루프 방지를 위해 조건부 설정)
    if (window.location.hash !== `#/${pageId}`) {
      window.location.hash = `#/${pageId}`;
    }

    // 페이지별 진입 시 초기화 이벤트 트리거 (필요 시)
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // URL 해시 감지 및 라우팅 바인딩
  function handleRouting() {
    const hash = window.location.hash;
    if (hash.startsWith('#/')) {
      const pageId = hash.replace('#/', '');
      switchPage(pageId);
    } else {
      switchPage('home');
    }
  }

  // 이벤트 리스너: 해시 체인지
  window.addEventListener('hashchange', handleRouting);

  // 이벤트 리스너: 헤더 네비게이션 버튼 클릭
  ui.navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-target');
      switchPage(target);
    });
  });

  // 이벤트 리스너: 메인 로고 클릭 시 홈 이동
  if (ui.navBrand) {
    ui.navBrand.addEventListener('click', () => {
      switchPage('home');
    });
  }

  // 이벤트 리스너: 홈 화면 5-Card 메뉴 카드 클릭 시 이동
  ui.menuCards.forEach(card => {
    card.addEventListener('click', () => {
      const target = card.getAttribute('data-navigate');
      if (target) {
        switchPage(target);
      }
    });
  });


  // === 3. API Key 설정 및 모달 관리 ===

  // API 경고 배너 및 인풋 상태 업데이트
  function updateApiStatus() {
    if (state.apiKey) {
      ui.apiWarning.style.display = 'none';
      ui.inputApiKey.value = state.apiKey;
    } else {
      ui.apiWarning.style.display = 'block';
      ui.inputApiKey.value = '';
    }
  }

  // 모달 열기
  ui.btnSettings.addEventListener('click', () => {
    ui.modalSettings.classList.add('active');
  });

  // 모달 닫기
  const closeModal = () => {
    ui.modalSettings.classList.remove('active');
  };
  ui.btnCloseModal.addEventListener('click', closeModal);
  ui.modalSettings.addEventListener('click', (e) => {
    if (e.target === ui.modalSettings) closeModal();
  });

  // API 설정 저장
  ui.btnSaveKey.addEventListener('click', () => {
    const key = ui.inputApiKey.value.trim();
    if (!key) {
      alert('올바른 API Key를 입력해 주세요.');
      return;
    }
    state.apiKey = key;
    localStorage.setItem('lostark-api-key', key);
    updateApiStatus();
    closeModal();
    // 캘린더 데이터를 다시 조회하도록 갱신
    initCalendarWidget();
  });

  // API 설정 삭제
  ui.btnDeleteKey.addEventListener('click', () => {
    if (confirm('등록된 API Key를 삭제하시겠습니까?')) {
      state.apiKey = '';
      localStorage.removeItem('lostark-api-key');
      updateApiStatus();
      closeModal();
      // 캘린더 데이터 리셋 및 모의 일정으로 전환
      initCalendarWidget();
    }
  });


  // === 4. 실시간 캘린더 일정 및 타이머 엔진 ===

  // 실시간 시스템 시계 구동
  function startClock() {
    setInterval(() => {
      const now = new Date();
      ui.liveClock.textContent = now.toTimeString().split(' ')[0];
    }, 1000);
  }

  // 모의(Mock) 캘린더 데이터 생성 (API Key가 없거나 호출 실패 시의 예비책)
  function getMockCalendarData() {
    const now = new Date();
    const mockEvents = [];

    // 카오스 게이트: 매시간 정각 (월, 목, 토, 일)
    const chaosDays = [1, 4, 6, 0]; // 0: 일요일, 1: 월요일...
    let nextChaos = new Date(now);
    nextChaos.setMinutes(0, 0, 0);

    // 가장 가까운 다음 카게 일정 탐색
    let limit = 0;
    while (!chaosDays.includes(nextChaos.getDay()) || nextChaos <= now) {
      nextChaos.setHours(nextChaos.getHours() + 1);
      limit++;
      if (limit > 168) break; // 최대 일주일 검사
    }
    mockEvents.push({ Name: '카오스 게이트', TargetTime: nextChaos });

    // 필드 보스: 매시간 정각 (화, 금, 일)
    const bossDays = [2, 5, 0];
    let nextBoss = new Date(now);
    nextBoss.setMinutes(0, 0, 0);

    limit = 0;
    while (!bossDays.includes(nextBoss.getDay()) || nextBoss <= now) {
      nextBoss.setHours(nextBoss.getHours() + 1);
      limit++;
      if (limit > 168) break;
    }
    mockEvents.push({ Name: '필드 보스', TargetTime: nextBoss });

    // 모험 섬: 매일 정해진 타임라인 (평일: 11시, 13시, 19시, 21시, 23시 / 주말: 9시 추가)
    let nextIsland = new Date(now);
    const getIslandHours = (day) => {
      return (day === 0 || day === 6) ? [9, 11, 13, 19, 21, 23] : [11, 13, 19, 21, 23];
    };

    let islandHours = getIslandHours(nextIsland.getDay());
    let found = false;
    
    // 오늘의 일정 중 남은 것 탐색
    for (let h of islandHours) {
      const target = new Date(now);
      target.setHours(h, 0, 0, 0);
      if (target > now) {
        nextIsland = target;
        found = true;
        break;
      }
    }

    // 오늘 남은 일정이 없으면 내일 첫 일정으로 설정
    if (!found) {
      nextIsland.setDate(nextIsland.getDate() + 1);
      const nextDayHours = getIslandHours(nextIsland.getDay());
      nextIsland.setHours(nextDayHours[0], 0, 0, 0);
    }
    mockEvents.push({ Name: '모험 섬', TargetTime: nextIsland });

    return mockEvents;
  }

  // 실시간 카운트다운 타이머 연산 엔진
  function runCalendarTimer(events) {
    if (state.timerIntervalId) {
      clearInterval(state.timerIntervalId);
    }

    const updateTimerDisplays = () => {
      const now = new Date();

      events.forEach(evt => {
        const timeDiff = evt.TargetTime - now;
        let displayStr = '--:--:--';
        let statusText = '대기중';
        let isActive = false;

        if (timeDiff > 0) {
          const hours = String(Math.floor(timeDiff / (1000 * 60 * 60))).padStart(2, '0');
          const minutes = String(Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
          const seconds = String(Math.floor((timeDiff % (1000 * 60)) / 1000)).padStart(2, '0');
          displayStr = `${hours}:${minutes}:${seconds}`;

          // 10분 전부터 입장 가능 상태
          if (timeDiff <= 10 * 60 * 1000) {
            statusText = '입장 대기';
            isActive = true;
          }
        } else if (timeDiff <= 0 && timeDiff > -15 * 60 * 1000) {
          // 일정 시작 후 15분 동안 진행중으로 표시
          displayStr = '00:00:00';
          statusText = '진행중';
          isActive = true;
        } else {
          // 경과 시 다음 일정으로 데이터 재계산 호출
          initCalendarWidget();
        }

        // 해당 DOM에 적용
        if (evt.Name.includes('카오스')) {
          ui.chaosTimer.textContent = displayStr;
          ui.chaosStatus.textContent = statusText;
          toggleActiveStatus(ui.chaosStatus, ui.chaosTimer, isActive);
        } else if (evt.Name.includes('보스')) {
          ui.bossTimer.textContent = displayStr;
          ui.bossStatus.textContent = statusText;
          toggleActiveStatus(ui.bossStatus, ui.bossTimer, isActive);
        } else if (evt.Name.includes('섬')) {
          ui.islandTimer.textContent = displayStr;
          ui.islandStatus.textContent = statusText;
          toggleActiveStatus(ui.islandStatus, ui.islandTimer, isActive);
        }
      });
    };

    function toggleActiveStatus(statusEl, timerEl, isActive) {
      const cardEl = statusEl.parentElement;
      if (isActive) {
        statusEl.classList.add('active');
        cardEl.classList.add('active');
        timerEl.classList.add('text-cyan');
      } else {
        statusEl.classList.remove('active');
        cardEl.classList.remove('active');
        timerEl.classList.remove('text-cyan');
      }
    }

    updateTimerDisplays();
    state.timerIntervalId = setInterval(updateTimerDisplays, 1000);
  }

  // 캘린더 일정 초기화 및 데이터 로딩
  async function initCalendarWidget() {
    if (!state.apiKey) {
      // API Key가 없으면 완벽히 동작하는 정적 모의 데이터 바인딩
      const mockEvents = getMockCalendarData();
      runCalendarTimer(mockEvents);
      return;
    }

    try {
      const response = await fetch('/api/calendar', {
        headers: {
          'x-lostark-api-key': state.apiKey
        }
      });

      if (!response.ok) {
        throw new Error('API Key가 만료되었거나 올바르지 않습니다.');
      }

      const data = await response.json();
      const now = new Date();
      const parsedEvents = [];

      // API 결과에서 카게, 필보, 모험섬 데이터 분류 및 추출
      const categories = {
        '카오스 게이트': '카오스 게이트',
        '필드 보스': '필드 보스',
        '모험 섬': '모험 섬'
      };

      for (const catName in categories) {
        const item = data.find(x => x.CategoryName === catName);
        if (item && item.StartTimes) {
          // 다가오는 미래의 첫 번째 시작 일정 탐색
          const nextTimeStr = item.StartTimes.find(tStr => new Date(tStr) > now);
          if (nextTimeStr) {
            parsedEvents.push({
              Name: categories[catName],
              TargetTime: new Date(nextTimeStr)
            });
          }
        }
      }

      // 만약 API 응답에서 파싱된 일정이 부족하면 Mock과 병합하여 신뢰성 보장
      const mockData = getMockCalendarData();
      mockData.forEach(mockEvt => {
        if (!parsedEvents.some(p => p.Name === mockEvt.Name)) {
          parsedEvents.push(mockEvt);
        }
      });

      runCalendarTimer(parsedEvents);
    } catch (err) {
      console.warn('로아 API 캘린더 로드 오류 (모의 데이터로 우회 구동):', err.message);
      const mockEvents = getMockCalendarData();
      runCalendarTimer(mockEvents);
    }
  }


  // === 5. 앱 초기 구동 및 이벤트 트리거 ===
  function init() {
    handleRouting();
    updateApiStatus();
    startClock();
    initCalendarWidget();
    
    // Lucide 아이콘 초기 렌더링 적용
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  init();
});
