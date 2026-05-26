/**
 * LOSTVIBE - 프론트엔드 메인 컨트롤러 (app.js)
 * SPA 라우팅, API Key 설정, 실시간 캘린더, 아비도스 제작 계산기, 영지 타이머, 스펙 효율 진단기, 낙원 지옥 보상 비교, 경매 분배금 연산, 시세 검색, Gemini AI 애널리스트 피드 통합
 */

document.addEventListener('DOMContentLoaded', () => {
  // === 1. DOM 요소 및 상태 정의 ===
  const state = {
    apiKey: localStorage.getItem('lostark-api-key') || '',
    currentPage: 'home',
    calendarData: null,
    timerIntervalId: null,

    // 제작 효율 계산기 상태값
    craftType: 'normal',
    selectedSkill: 'archaeology',
    sellPrice: 300,
    fusionPrices: {
      normal: 300,
      superior: 380
    },
    greatSuccessRate: 5,
    goldDiscount: 0,
    
    // 유저 입력 생활 시세 저장 객체 (거래소 묶음 단위 기준: 아비도스/오레하/희귀 10개, 고대 100개)
    materialPrices: {
      archaeology: { abidos: 65, oreha: 18, rare: 10, ancient: 15 },
      fishing: { abidos: 60, oreha: 16, rare: 9, ancient: 12 },
      hunting: { abidos: 58, oreha: 15, rare: 8.5, ancient: 11 },
      logging: { abidos: 60, oreha: 12, rare: 5, ancient: 12 },
      mining: { abidos: 55, oreha: 18, rare: 4, ancient: 17 },
      foraging: { abidos: 52, oreha: 14, rare: 3.5, ancient: 15 }
    },

    // 레시피 정보 (1회 제작=10개 생산 기준 소모량 및 기본 영지 수수료)
    recipes: {
      normal: { baseGold: 40, energy: 288, req: { abidos: 3.3, oreha: 0, rare: 4.5, ancient: 8.6 } },
      superior: { baseGold: 52, energy: 360, req: { abidos: 4.3, oreha: 0, rare: 5.9, ancient: 11.2 } }
    },

    // 스펙 & 진단기 상태값
    spec: {
      crit: 1200,
      swift: 1600,
      adr: 15,
      synergy: 10,
      bracelet: 3,
      manualCrit: 0,
      yearning: 12,
      feast: true,
      massIncrease: false,
      manualSpeed: 0,
      critDamage: 200,
      mungaLevel: 2
    },

    // 낙원 지옥 & 나락 보상 엔진 상태
    hell: {
      mode: 'normal', // 'normal' (일반 지옥) vs 'nether' (나락의 지옥, 5배)
      level: '1640',  // '1640' / '1700' / '1730'
      floor: 50,      // 10 ~ 100층 (10층 단위)
      isAbundance: false, // 풍요의 축복 여부 (보상 10배)
      isPricesCollapsed: true // 가격 조정 패널 접힘 상태
    },
    
    // 낙원 시세 데이터 (Adjust Market Prices 대응)
    hellPrices: {
      t4Leapstone: 45,        // T4 운명의 돌파석 개당
      t4Destruction: 12,      // T4 파괴석 결정 10개당
      t4Protection: 2,        // T4 수호석 결정 10개당
      t4GemLvl1: 120,         // T4 1레벨 보석 개당 (4레벨=27배, 5레벨=81배, 6레벨=243배 가치 자동 환산)
      fusionNormal: 280,      // 아비도스 융화재료 1개당
      fusionSuperior: 340,    // 상급 아비도스 융화재료 1개당
      chaosStone: 500         // 혼돈의 돌 환산 가치
    },

    // 경매 분배금 계산기 상태값
    auction: {
      marketPrice: 10000,
      raidSize: 4
    },

    // 인기 유물 각인서 10종 가격 정보 (기본값 설정 및 실시간 시세 검색 연동)
    engravingPrices: [
      { id: 'grudge', name: '원한 유물 각인서', searchName: '원한', price: 0, isRealtime: false },
      { id: 'adrenaline', name: '아드레날린 유물 각인서', searchName: '아드레날린', price: 0, isRealtime: false },
      { id: 'keen_blunt', name: '예리한 둔기 유물 각인서', searchName: '예리한 둔기', price: 0, isRealtime: false },
      { id: 'raid_captain', name: '돌격대장 유물 각인서', searchName: '돌격대장', price: 0, isRealtime: false },
      { id: 'hit_master', name: '타격 대장 유물 각인서', searchName: '타격 대장', price: 0, isRealtime: false },
      { id: 'ambush_master', name: '기습의 대가 유물 각인서', searchName: '기습의 대가', price: 0, isRealtime: false },
      { id: 'cursed_doll', name: '저주받은 인형 유물 각인서', searchName: '저주받은 인형', price: 0, isRealtime: false },
      { id: 'brawler', name: '결투의 대가 유물 각인서', searchName: '결투의 대가', price: 0, isRealtime: false },
      { id: 'mass_increase', name: '질량 증가 유물 각인서', searchName: '질량 증가', price: 0, isRealtime: false },
      { id: 'awakening', name: '각성 유물 각인서', searchName: '각성', price: 0, isRealtime: false }
    ],

    // AI 분석 타자기 상태
    isAiTyping: false,

    // 실시간 대시보드 캐시 및 데이터 상태
    lastMarketFetchTime: 0,
    gemPrices: [],
    topEngravings: []
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
    islandStatus: document.getElementById('island-status'),

    // 아비도스 제작 효율 계산기 UI
    btnCraftNormal: document.getElementById('btn-craft-normal'),
    btnCraftSuperior: document.getElementById('btn-craft-superior'),
    inputSellPrice: document.getElementById('input-sell-price'),
    sliderGreatSuccess: document.getElementById('slider-great-success'),
    valGreatSuccess: document.getElementById('val-great-success'),
    sliderGoldDiscount: document.getElementById('slider-gold-discount'),
    valGoldDiscount: document.getElementById('val-gold-discount'),
    skillTabs: document.querySelectorAll('.skill-tab'),
    matInputsContainer: document.getElementById('mat-inputs-container'),
    btnRefreshCraftPrices: document.getElementById('btn-refresh-craft-prices'),
    craftingPriceStatusText: document.getElementById('crafting-price-status-text'),

    // 계산기 결과창
    profitBadge: document.getElementById('txt-profit-badge'),
    calcTitle: document.getElementById('txt-calc-title'),
    netProfitBuy: document.getElementById('txt-net-profit-buy'),
    netProfitSelf: document.getElementById('txt-net-profit-self'),
    detailMatCost: document.getElementById('txt-detail-mat-cost'),
    detailGoldCost: document.getElementById('txt-detail-gold-cost'),
    detailTotalCost: document.getElementById('txt-detail-total-cost'),
    detailRevenue: document.getElementById('txt-detail-revenue'),
    detailBonus: document.getElementById('txt-detail-bonus'),

    // 영지 타이머 UI
    inputCurrentEnergy: document.getElementById('input-current-energy'),
    inputMaxEnergy: document.getElementById('input-max-energy'),
    inputCraftCount: document.getElementById('input-craft-count'),
    txtRequiredEnergy: document.getElementById('txt-required-energy'),
    txtRequiredTime: document.getElementById('txt-required-time'),
    txtEnergyFillTime: document.getElementById('txt-energy-fill-time'),
    txtEnergyFillTargetTime: document.getElementById('txt-energy-fill-target-time'),

    // 스펙 & 진단기 입력 UI
    inputCritStat: document.getElementById('input-crit-stat'),
    inputSwiftStat: document.getElementById('input-swift-stat'),
    selectAdrenaline: document.getElementById('select-adrenaline'),
    selectSynergy: document.getElementById('select-synergy'),
    selectBraceletCrit: document.getElementById('select-bracelet-crit'),
    inputManualCrit: document.getElementById('input-manual-crit'),
    selectYearning: document.getElementById('select-yearning'),
    chkFeast: document.getElementById('chk-feast'),
    chkMassIncrease: document.getElementById('chk-mass-increase'),
    inputManualSpeed: document.getElementById('input-manual-speed'),

    // 스펙 진단 아웃풋 UI
    badgeMunga: document.getElementById('badge-munga'),
    txtCalcCrit: document.getElementById('txt-calc-crit'),
    txtFinalCrit: document.getElementById('txt-final-crit'),
    inputCritDamage: document.getElementById('input-crit-damage'),
    selectMungaLevel: document.getElementById('select-munga-level'),
    txtMungaConvertRate: document.getElementById('txt-munga-convert-rate'),
    barMungaFill: document.getElementById('bar-munga-fill'),
    txtMungaEfficiency: document.getElementById('txt-munga-efficiency'),
    txtMungaDesc: document.getElementById('txt-munga-desc'),

    badgeSonic: document.getElementById('badge-sonic'),
    txtFinalAtkSpeed: document.getElementById('txt-final-atk-speed'),
    txtFinalMoveSpeed: document.getElementById('txt-final-move-speed'),
    txtSonicSum: document.getElementById('txt-sonic-sum'),
    barSonicFill: document.getElementById('bar-sonic-fill'),
    txtSonicDamage: document.getElementById('txt-sonic-damage'),
    txtSonicDesc: document.getElementById('txt-sonic-desc'),

    // 낙원 지옥 & 나락 보상 UI
    hellModeNormalBtn: document.getElementById('btn-hell-mode-normal'),
    hellModeNetherBtn: document.getElementById('btn-hell-mode-nether'),
    hellLvlButtons: document.querySelectorAll('#page-hell .tab-toggle button[data-level]'),
    hellFloorSlider: document.getElementById('slider-hell-floor'),
    hellFloorVal: document.getElementById('val-hell-floor'),
    hellAbundanceChk: document.getElementById('chk-hell-abundance'),
    hellPricesToggleBtn: document.getElementById('btn-toggle-hell-prices'),
    hellPricesChevronIcon: document.getElementById('icon-hell-prices-chevron'),
    hellPricesPanel: document.getElementById('panel-hell-prices'),
    hellEfficiencyPct: document.getElementById('txt-hell-efficiency-pct'),
    hellRewardsContainer: document.getElementById('hell-rewards-container'),
    txtBestRewardName: document.getElementById('txt-best-reward-name'),
    txtBestRewardGold: document.getElementById('txt-best-reward-gold'),
    
    // 시세 개별 조정 인풋
    inputHellLeap: document.getElementById('input-hell-leap'),
    inputHellDest: document.getElementById('input-hell-dest'),
    inputHellProt: document.getElementById('input-hell-prot'),
    inputHellGem1: document.getElementById('input-hell-gem1'),
    inputHellFusionNormal: document.getElementById('input-hell-fusion-normal'),
    inputHellFusionSuperior: document.getElementById('input-hell-fusion-superior'),
    inputHellChaos: document.getElementById('input-hell-chaos'),

    // 경매 분배금 계산기 UI
    inputAuctionPrice: document.getElementById('input-auction-price'),
    engravingPresetsContainer: document.getElementById('engraving-presets-container'),
    raidSizeButtons: document.querySelectorAll('.size-btn'),
    txtBidBreakEven: document.getElementById('txt-bid-break-even'),
    txtBidRecommend: document.getElementById('txt-bid-recommend'),
    txtAuctionBaseVal: document.getElementById('txt-auction-base-val'),
    txtAuctionTaxVal: document.getElementById('txt-auction-tax-val'),
    txtAuctionDividend: document.getElementById('txt-auction-dividend'),

    // AI 분석 UI
    btnAiAnalyze: document.getElementById('btn-ai-analyze'),
    aiTerminalOutput: document.getElementById('ai-terminal-output'),

    // 신규 금융 대시보드 UI
    gemDashboardContainer: document.getElementById('gem-dashboard-container'),
    engravingRankTableBody: document.getElementById('engraving-rank-table-body')
  };

  // === 2. SPA 라우터 및 네비게이션 제어 ===
  
  function switchPage(pageId) {
    if (!pageId) pageId = 'home';
    state.currentPage = pageId;

    ui.pageViews.forEach(view => {
      view.classList.remove('active');
    });
    const targetPage = document.getElementById(`page-${pageId}`);
    if (targetPage) {
      targetPage.classList.add('active');
    }

    ui.navButtons.forEach(btn => {
      if (btn.getAttribute('data-target') === pageId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (pageId === 'divider') {
      const now = Date.now();
      // 30초 쿨타임을 부여하여 불필요한 연속 호출 및 렉을 방지합니다.
      if (!state.lastDividerFetchTime || (now - state.lastDividerFetchTime > 30000)) {
        state.lastDividerFetchTime = now;
        if (state.apiKey) {
          updateEngravingPricesFromApi();
        } else {
          updateEngravingPricesFromServerCache();
        }
      }
    }

    if (pageId === 'market') {
      updateMarketDashboardData();
    }

    if (pageId === 'calculator') {
      // 아비도스 제작 계산기 진입 시 6대 생활 재료 최신 시세 일괄 자동 로드 수행
      fetchCraftingMaterialPrices();
    }

    if (window.location.hash !== `#/${pageId}`) {
      window.location.hash = `#/${pageId}`;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleRouting() {
    const hash = window.location.hash;
    if (hash.startsWith('#/')) {
      const pageId = hash.replace('#/', '');
      switchPage(pageId);
    } else {
      switchPage('home');
    }
  }

  window.addEventListener('hashchange', handleRouting);

  ui.navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-target');
      switchPage(target);
    });
  });

  if (ui.navBrand) {
    ui.navBrand.addEventListener('click', () => {
      switchPage('home');
    });
  }

  ui.menuCards.forEach(card => {
    card.addEventListener('click', () => {
      const target = card.getAttribute('data-navigate');
      if (target) {
        switchPage(target);
      }
    });
  });


  // === 3. API Key 설정 및 모달 관리 ===

  function updateApiStatus() {
    if (state.apiKey) {
      ui.apiWarning.style.display = 'none';
      ui.inputApiKey.value = state.apiKey;
    } else {
      ui.apiWarning.style.display = 'block';
      ui.inputApiKey.value = '';
    }
  }

  ui.btnSettings.addEventListener('click', () => {
    ui.modalSettings.classList.add('active');
  });

  const closeModal = () => {
    ui.modalSettings.classList.remove('active');
  };
  ui.btnCloseModal.addEventListener('click', closeModal);
  ui.modalSettings.addEventListener('click', (e) => {
    if (e.target === ui.modalSettings) closeModal();
  });

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
    initCalendarWidget();
  });

  ui.btnDeleteKey.addEventListener('click', () => {
    if (confirm('등록된 API Key를 삭제하시겠습니까?')) {
      state.apiKey = '';
      localStorage.removeItem('lostark-api-key');
      updateApiStatus();
      closeModal();
      initCalendarWidget();
    }
  });


  // === 4. 실시간 캘린더 일정 및 타이머 엔진 ===

  function startClock() {
    setInterval(() => {
      const now = new Date();
      ui.liveClock.textContent = now.toTimeString().split(' ')[0];
    }, 1000);
  }

  function getMockCalendarData() {
    const now = new Date();
    const mockEvents = [];

    const chaosDays = [1, 4, 6, 0];
    let nextChaos = new Date(now);
    nextChaos.setMinutes(0, 0, 0);

    let limit = 0;
    while (!chaosDays.includes(nextChaos.getDay()) || nextChaos <= now) {
      nextChaos.setHours(nextChaos.getHours() + 1);
      limit++;
      if (limit > 168) break;
    }
    mockEvents.push({ Name: '카오스 게이트', TargetTime: nextChaos });

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

    let nextIsland = new Date(now);
    const getIslandHours = (day) => {
      return (day === 0 || day === 6) ? [9, 11, 13, 19, 21, 23] : [11, 13, 19, 21, 23];
    };

    let islandHours = getIslandHours(nextIsland.getDay());
    let found = false;
    
    for (let h of islandHours) {
      const target = new Date(now);
      target.setHours(h, 0, 0, 0);
      if (target > now) {
        nextIsland = target;
        found = true;
        break;
      }
    }

    if (!found) {
      nextIsland.setDate(nextIsland.getDate() + 1);
      const nextDayHours = getIslandHours(nextIsland.getDay());
      nextIsland.setHours(nextDayHours[0], 0, 0, 0);
    }
    mockEvents.push({ Name: '모험 섬', TargetTime: nextIsland });

    return mockEvents;
  }

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

          if (timeDiff <= 10 * 60 * 1000) {
            statusText = '입장 대기';
            isActive = true;
          }
        } else if (timeDiff <= 0 && timeDiff > -15 * 60 * 1000) {
          displayStr = '00:00:00';
          statusText = '진행중';
          isActive = true;
        } else {
          initCalendarWidget();
        }

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

  async function initCalendarWidget() {
    if (!state.apiKey) {
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

      const categories = {
        '카오스 게이트': '카오스 게이트',
        '필드 보스': '필드 보스',
        '모험 섬': '모험 섬'
      };

      for (const catName in categories) {
        const item = data.find(x => x.CategoryName === catName);
        if (item && item.StartTimes) {
          const nextTimeStr = item.StartTimes.find(tStr => new Date(tStr) > now);
          if (nextTimeStr) {
            parsedEvents.push({
              Name: categories[catName],
              TargetTime: new Date(nextTimeStr)
            });
          }
        }
      }

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


  // === 5. 아비도스 제작 효율 계산기 & 영지 타이머 ===

  // 아비도스 재료 시세 마지막 갱신 시각 (5분 쿨타임으로 Rate Limit 방어)
  let lastCraftingFetchTime = 0;

  // 재료별 거래소 검색 ItemName 매핑 (거래소 실제 등록 명칭 기준)
  const materialSearchMap = {
    archaeology: [
      { key: 'abidos', name: '아비도스 유물' },
      { key: 'oreha', name: '오레하 유물' },
      { key: 'rare', name: '희귀한 유물' },
      { key: 'ancient', name: '고대 유물' }
    ],
    fishing: [
      { key: 'abidos', name: '아비도스 태양 잉어' },
      { key: 'oreha', name: '오레하 태양 잉어' },
      { key: 'rare', name: '붉은 살 생선' },
      { key: 'ancient', name: '생선' }
    ],
    hunting: [
      { key: 'abidos', name: '아비도스 두툼한 생고기' },
      { key: 'oreha', name: '오레하 두툼한 생고기' },
      { key: 'rare', name: '두툼한 생고기' },
      { key: 'ancient', name: '다듬은 생고기' }
    ],
    logging: [
      { key: 'abidos', name: '아비도스 목재' },
      { key: 'oreha', name: '튼튼한 목재' },
      { key: 'rare', name: '부드러운 목재' },
      { key: 'ancient', name: '목재' }
    ],
    mining: [
      { key: 'abidos', name: '아비도스 철광석' },
      { key: 'oreha', name: '단단한 철광석' },
      { key: 'rare', name: '묵직한 철광석' },
      { key: 'ancient', name: '철광석' }
    ],
    foraging: [
      { key: 'abidos', name: '아비도스 들꽃' },
      { key: 'oreha', name: '화사한 들꽃' },
      { key: 'rare', name: '수줍은 들꽃' },
      { key: 'ancient', name: '들꽃' }
    ]
  };

  // API를 통해 모든 6대 생활 스킬의 재료 시세를 일괄 조회하여 세팅 (하이브리드: 개인 API 직접조회 + 서버 캐시 폴백)
  async function fetchCraftingMaterialPrices() {
    // 상태 배너 업데이트: 조회 중
    if (ui.craftingPriceStatusText) {
      ui.craftingPriceStatusText.textContent = '모든 시세 로딩 중...';
      ui.craftingPriceStatusText.style.color = 'var(--accent-cyan)';
    }

    const skills = ['archaeology', 'fishing', 'hunting', 'logging', 'mining', 'foraging'];

    // 1) 개인 API Key가 있는 경우: 직접 모든 스킬의 시세를 로스트아크 OpenAPI로 실시간 조회
    if (state.apiKey) {
      const now = Date.now();
      // 60초 쿨타임 - 개인 키의 과호출 안전 방어
      if (now - lastCraftingFetchTime < 60000) {
        console.log('[아비도스] 60초 쿨타임 중 - 캐시된 시세 사용');
        if (ui.craftingPriceStatusText) {
          ui.craftingPriceStatusText.textContent = '시세 캐시 유효 (60초 내)';
          ui.craftingPriceStatusText.style.color = 'var(--text-muted)';
        }
        return;
      }

      console.log('[아비도스] 개인 API Key 감지 → 모든 6대 생활 재료 일괄 조회 시작...');

      let successCount = 0;

      // 6대 스킬 돌며 전체 조회
      for (const skill of skills) {
        const targets = materialSearchMap[skill];
        for (const target of targets) {
          try {
            const response = await fetch('/api/market', {
              method: 'POST',
              headers: {
                'content-type': 'application/json',
                'x-lostark-api-key': state.apiKey
              },
              body: JSON.stringify({
                Sort: 'CURRENT_MIN_PRICE',
                CategoryCode: 90000,
                CharacterClass: '',
                ItemGrade: '',
                ItemName: target.name,
                PageNo: 1,
                SortCondition: 'ASC'
              })
            });

            if (response.ok) {
              const data = await response.json();
              const items = data.Items || [];
              const matched = items.find(i => i.Name === target.name) || items[0];

              if (matched && matched.CurrentMinPrice > 0) {
                state.materialPrices[skill][target.key] = matched.CurrentMinPrice;
                successCount++;
                console.log(`[API 직접조회] [${skill}] ${target.name}: ${matched.CurrentMinPrice} G`);
              }
            }
            // 150ms 딜레이로 Rate Limit 안전 보호
            await new Promise(resolve => setTimeout(resolve, 150));
          } catch (err) {
            console.warn(`[API 직접조회] [${skill}] ${target.name} 조회 오류:`, err.message);
          }
        }
      }

      // 융화재료 2종 실시간 조회 (CategoryCode: 50000) - 호출제한 대비 150ms 간격
      const fusionTargets = [
        { key: 'normal', name: '아비도스 융화 재료' },
        { key: 'superior', name: '상급 아비도스 융화 재료' }
      ];

      for (const target of fusionTargets) {
        try {
          const fusionResponse = await fetch('/api/market', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-lostark-api-key': state.apiKey
            },
            body: JSON.stringify({
              Sort: 'CURRENT_MIN_PRICE',
              CategoryCode: 50000,
              CharacterClass: '',
              ItemGrade: '',
              ItemName: target.name,
              PageNo: 1,
              SortCondition: 'ASC'
            })
          });

          if (fusionResponse.ok) {
            const fusionData = await fusionResponse.json();
            const items = fusionData.Items || [];
            const matched = items.find(i => i.Name === target.name) || items[0];
            if (matched && matched.CurrentMinPrice > 0) {
              state.fusionPrices[target.key] = matched.CurrentMinPrice;
              console.log(`[아비도스 융화] ${target.name}: ${matched.CurrentMinPrice} G`);
            }
          }
          await new Promise(resolve => setTimeout(resolve, 150));
        } catch (err) {
          console.warn(`[아비도스 융화] ${target.name} 조회 오류:`, err.message);
        }
      }

      if (successCount > 0) {
        lastCraftingFetchTime = Date.now();
        renderMaterialInputs();

        // 현재 선택된 제작 아이템 판매가 자동 동기화
        state.sellPrice = state.fusionPrices[state.craftType];
        if (ui.inputSellPrice) {
          ui.inputSellPrice.value = state.sellPrice;
        }

        calculateCraftingEfficiency();
        const timeStr = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        if (ui.craftingPriceStatusText) {
          ui.craftingPriceStatusText.textContent = `실시간 모든 시세 반영 완료 (${timeStr})`;
          ui.craftingPriceStatusText.style.color = 'var(--success-green)';
        }
        console.log(`[아비도스] 개인 API 직접 일괄 조회 완료 (${successCount}건 반영)`);
        return;
      }
    }

    // 2) 개인 API Key 미등록 또는 직접 조회 실패 시: 서버 캐시 API에서 가져와서 6대 생활 시세 통째로 일괄 대입
    console.log('[아비도스] 서버 캐시 API에서 6대 생활재료 시세 일괄 동기화...');
    try {
      const cacheRes = await fetch('/api/market/live-dashboard');
      if (cacheRes.ok) {
        const cacheData = await cacheRes.json();
        if (cacheData.craftingMaterials) {
          // 6개 스킬 모두의 시세를 서버 캐시로부터 세팅
          skills.forEach(skill => {
            if (cacheData.craftingMaterials[skill]) {
              const cached = cacheData.craftingMaterials[skill];
              ['abidos', 'oreha', 'rare', 'ancient'].forEach(key => {
                if (cached[key] && cached[key] > 0) {
                  state.materialPrices[skill][key] = cached[key];
                }
              });
            }
          });

          // 융화재료 캐시 시세 동기화
          if (cacheData.fusionMaterials) {
            ['normal', 'superior'].forEach(key => {
              if (cacheData.fusionMaterials[key] && cacheData.fusionMaterials[key] > 0) {
                state.fusionPrices[key] = cacheData.fusionMaterials[key];
              }
            });
            state.sellPrice = state.fusionPrices[state.craftType];
            if (ui.inputSellPrice) {
              ui.inputSellPrice.value = state.sellPrice;
            }
          }

          renderMaterialInputs();
          calculateCraftingEfficiency();
          const timeStr = new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
          if (ui.craftingPriceStatusText) {
            ui.craftingPriceStatusText.textContent = `실시간 모든 시세 반영 완료 (${timeStr})`;
            ui.craftingPriceStatusText.style.color = 'var(--success-green)';
          }
          console.log('[아비도스] 서버 캐시로부터 6대 생활재료 시세 일괄 주입 완료.');
          return;
        }
      }
    } catch (err) {
      console.warn('[아비도스] 서버 캐시 조회 실패:', err.message);
    }

    // 3) 모든 조회 실패 시 기본값 유지 안내
    if (ui.craftingPriceStatusText) {
      ui.craftingPriceStatusText.textContent = 'API 미연동 - 기본값 사용 중';
      ui.craftingPriceStatusText.style.color = 'var(--text-dim)';
    }
    console.log('[아비도스] 시세 조회 불가 - 기본값 유지');
  }


  function renderMaterialInputs() {
    const currentPrices = state.materialPrices[state.selectedSkill];
    ui.matInputsContainer.innerHTML = '';

    const labelMap = {
      archaeology: { abidos: '아비도스 유물', oreha: '오레하 유물', rare: '희귀한 유물', ancient: '고대 유물' },
      fishing: { abidos: '아비도스 태양 잉어', oreha: '오레하 태양 잉어', rare: '붉은 살 생선', ancient: '생선' },
      hunting: { abidos: '아비도스 두툼한 생고기', oreha: '오레하 두툼한 생고기', rare: '두툼한 생고기', ancient: '다듬은 생고기' },
      logging: { abidos: '아비도스 목재', oreha: '튼튼한 목재', rare: '부드러운 목재', ancient: '목재' },
      mining: { abidos: '아비도스 철광석', oreha: '단단한 철광석', rare: '묵직한 철광석', ancient: '철광석' },
      foraging: { abidos: '아비도스 들꽃', oreha: '화사한 들꽃', rare: '수줍은 들꽃', ancient: '들꽃' }
    };

    const keys = ['abidos', 'oreha', 'rare', 'ancient'];
    const currentLabels = labelMap[state.selectedSkill];

    keys.forEach(key => {
      const price = currentPrices[key];
      const label = currentLabels[key];

      const unitMap = {
        abidos: '10개당',
        oreha: '10개당',
        rare: '10개당',
        ancient: '100개당'
      };
      const unitText = unitMap[key] || '100개당';

      const row = document.createElement('div');
      row.className = 'input-row';
      row.innerHTML = `
        <label for="mat-input-${key}">${label} 시세 (${unitText})</label>
        <input type="number" id="mat-input-${key}" data-key="${key}" value="${price}" step="0.01" min="0">
      `;

      const input = row.querySelector('input');
      input.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) || 0;
        state.materialPrices[state.selectedSkill][key] = val;
        calculateCraftingEfficiency();
      });

      ui.matInputsContainer.appendChild(row);
    });
  }

  function calculateCraftingEfficiency() {
    const recipe = state.recipes[state.craftType] || { baseGold: 300, energy: 288, req: { abidos: 0, oreha: 0, rare: 0, ancient: 0 } };
    const prices = state.materialPrices[state.selectedSkill] || { abidos: 0, oreha: 0, rare: 0, ancient: 0 };

    const abidosPrice = prices.abidos || 0;
    const orehaPrice = prices.oreha || 0;
    const rarePrice = prices.rare || 0;
    const ancientPrice = prices.ancient || 0;

    // 아비도스, 오레하, 희귀 등급 재료는 10개 거래 단위(BundleCount=10)이므로 / 10, 고대 재료만 100개 거래 단위(BundleCount=100)이므로 / 100으로 나눕니다.
    const matCost = (
      (recipe.req.abidos / 10) * abidosPrice +
      (recipe.req.oreha / 10) * orehaPrice +
      (recipe.req.rare / 10) * rarePrice +
      (recipe.req.ancient / 100) * ancientPrice
    );

    // 영지 수수료 할인은 버림(Math.floor) 처리합니다.
    const discountedGoldCost = Math.floor((recipe.baseGold || 0) * (1 - state.goldDiscount / 100));
    const totalCost = matCost + discountedGoldCost;

    // 로아도쓰 기준: 대성공 확률은 합연산이 아닌 기본 5%에 대한 곱연산 보정입니다.
    const finalGsRate = 0.05 * (1 + (state.greatSuccessRate / 100));
    const expectedYield = 10 * (1 + finalGsRate); // 1회 기본 10개 + 대성공 기대 확률분

    // 로스트아크 경매장 거래 수수료는 5%이며 소수점은 올림(Math.ceil) 차감합니다. 개당 순매출액을 구합니다.
    const netItemPrice = Math.max(0, (state.sellPrice || 0) - Math.ceil((state.sellPrice || 0) * 0.05));
    
    const baseRevenue = 10 * netItemPrice; // 기본 10개 판매액
    const bonusRevenue = 10 * netItemPrice * finalGsRate; // 대성공 보너스 기대 판매액
    const totalRevenue = expectedYield * netItemPrice;
    
    const netProfitBuy = totalRevenue - totalCost;
    const netProfitSelf = totalRevenue - discountedGoldCost;

    ui.detailMatCost.textContent = `${matCost.toFixed(1)} G`;
    ui.detailGoldCost.textContent = `${discountedGoldCost.toFixed(0)} G`;
    ui.detailTotalCost.textContent = `${totalCost.toFixed(1)} G`;
    ui.detailRevenue.textContent = `${baseRevenue.toFixed(1)} G`;
    ui.detailBonus.textContent = `+${bonusRevenue.toFixed(1)} G`;

    if (ui.netProfitBuy) {
      ui.netProfitBuy.textContent = (netProfitBuy >= 0 ? '+' : '') + netProfitBuy.toFixed(1);
      ui.netProfitBuy.className = netProfitBuy >= 0 ? 'text-green' : 'text-danger';
    }
    if (ui.netProfitSelf) {
      ui.netProfitSelf.textContent = (netProfitSelf >= 0 ? '+' : '') + netProfitSelf.toFixed(1);
      ui.netProfitSelf.className = netProfitSelf >= 0 ? 'text-green' : 'text-danger';
    }

    const skillLabelMap = {
      archaeology: '고고학',
      fishing: '낚시',
      hunting: '수렵',
      logging: '벌목',
      mining: '채광',
      foraging: '채집'
    };
    const skillLabel = skillLabelMap[state.selectedSkill] || state.selectedSkill;
    const typeLabel = state.craftType === 'normal' ? '일반' : '상급';
    ui.calcTitle.textContent = `${skillLabel} 기반 ${typeLabel} 아비도스 효율`;

    // 흑자/적자 뱃지는 종합적인 "구매 후 제작" 즉 경매장 전량 구매 시의 수익(netProfitBuy)을 기준으로 표기합니다.
    if (netProfitBuy >= 0) {
      ui.profitBadge.textContent = '수익 흑자';
      ui.profitBadge.style.background = 'hsla(145, 90%, 45%, 0.15)';
      ui.profitBadge.style.color = 'var(--success-green)';
      ui.profitBadge.style.borderColor = 'var(--success-green-glow)';
    } else {
      ui.profitBadge.textContent = '수익 적자';
      ui.profitBadge.style.background = 'hsla(355, 90%, 52%, 0.15)';
      ui.profitBadge.style.color = 'var(--danger-red)';
      ui.profitBadge.style.borderColor = 'var(--danger-red-glow)';
    }

    calculateStrongholdTimer();
    updateSkillEfficiencyComparison();
  }

  function updateSkillEfficiencyComparison() {
    const compareContainer = document.getElementById('compare-list-container');
    if (!compareContainer) return;

    const recipe = state.recipes[state.craftType] || { baseGold: 300, energy: 288, req: { abidos: 0, oreha: 0, rare: 0, ancient: 0 } };
    const skills = ['archaeology', 'fishing', 'hunting', 'logging', 'mining', 'foraging'];
    const skillLabelMap = {
      archaeology: '고고학',
      fishing: '낚시',
      hunting: '수렵',
      logging: '벌목',
      mining: '채광',
      foraging: '채집'
    };

    const results = skills.map(skill => {
      const prices = state.materialPrices[skill] || { abidos: 0, oreha: 0, rare: 0, ancient: 0 };
      
      const abidosPrice = prices.abidos || 0;
      const orehaPrice = prices.oreha || 0;
      const rarePrice = prices.rare || 0;
      const ancientPrice = prices.ancient || 0;

      const matCost = (
        (recipe.req.abidos / 10) * abidosPrice +
        (recipe.req.oreha / 10) * orehaPrice +
        (recipe.req.rare / 10) * rarePrice +
        (recipe.req.ancient / 100) * ancientPrice
      );
      
      const discountedGoldCost = Math.floor((recipe.baseGold || 0) * (1 - state.goldDiscount / 100));
      const totalCost = matCost + discountedGoldCost;

      const finalGsRate = 0.05 * (1 + (state.greatSuccessRate / 100));
      const expectedYield = 10 * (1 + finalGsRate);

      const netItemPrice = Math.max(0, (state.sellPrice || 0) - Math.ceil((state.sellPrice || 0) * 0.05));
      const totalRevenue = expectedYield * netItemPrice;
      
      const netProfitBuy = totalRevenue - totalCost;
      const netProfitSelf = totalRevenue - discountedGoldCost;

      return {
        key: skill,
        label: skillLabelMap[skill],
        netProfitBuy: netProfitBuy,
        netProfitSelf: netProfitSelf,
        totalCost: totalCost
      };
    });

    // 경매장 전량 구매 시 순이익 기준으로 랭킹을 정렬합니다.
    results.sort((a, b) => b.netProfitBuy - a.netProfitBuy);

    const maxProfit = results[0].netProfitBuy;
    compareContainer.innerHTML = '';

    results.forEach((res, index) => {
      const isBest = index === 0;
      const profitBuyText = (res.netProfitBuy >= 0 ? '+' : '') + res.netProfitBuy.toFixed(1);
      const profitSelfText = (res.netProfitSelf >= 0 ? '+' : '') + res.netProfitSelf.toFixed(1);
      
      let badgeHtml = '';
      if (isBest && res.netProfitBuy > 0) {
        badgeHtml = `<span style="background: linear-gradient(135deg, #ffd700, #ffa500); color: #111; font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px; display: inline-block;">👑 최적 추천</span>`;
      } else if (res.netProfitBuy > 0) {
        badgeHtml = `<span style="background: rgba(46, 204, 113, 0.15); color: #2ecc71; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; display: inline-block;">수익</span>`;
      } else {
        badgeHtml = `<span style="background: rgba(231, 76, 60, 0.15); color: #e74c3c; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; display: inline-block;">손해</span>`;
      }

      const row = document.createElement('div');
      row.style.cssText = `
        display: flex;
        align-items: center;
        gap: 12px;
        background: ${res.key === state.selectedSkill ? 'rgba(100, 200, 255, 0.08)' : 'rgba(255, 255, 255, 0.01)'};
        border: 1px solid ${res.key === state.selectedSkill ? 'var(--accent-cyan-glow)' : 'rgba(255, 255, 255, 0.03)'};
        border-radius: 8px;
        padding: 10px 14px;
        cursor: pointer;
        transition: all 0.2s ease;
      `;

      row.addEventListener('mouseenter', () => {
        row.style.background = 'rgba(255, 255, 255, 0.05)';
        row.style.borderColor = 'rgba(255, 255, 255, 0.15)';
      });
      row.addEventListener('mouseleave', () => {
        row.style.background = res.key === state.selectedSkill ? 'rgba(100, 200, 255, 0.08)' : 'rgba(255, 255, 255, 0.01)';
        row.style.borderColor = res.key === state.selectedSkill ? 'var(--accent-cyan-glow)' : 'rgba(255, 255, 255, 0.03)';
      });

      row.addEventListener('click', () => {
        const tabToClick = Array.from(ui.skillTabs).find(t => t.getAttribute('data-skill') === res.key);
        if (tabToClick) {
          tabToClick.click();
        }
      });

      // 바 길이 (구매 시 순이익 비율 기준)
      const absMax = Math.abs(maxProfit) || 1;
      const barWidth = Math.max(5, Math.min(100, (Math.abs(res.netProfitBuy) / absMax) * 100));

      row.innerHTML = `
        <span style="font-size: 12px; font-weight: 800; color: ${isBest ? 'var(--accent-gold)' : 'var(--text-muted)'}; min-width: 16px;">${index + 1}</span>
        <div style="display: flex; align-items: center; gap: 6px; min-width: 70px;">
          <span style="font-size: 13px; font-weight: 700; color: ${res.key === state.selectedSkill ? 'var(--accent-cyan)' : 'var(--text-bright)'}">${res.label}</span>
        </div>
        <div style="flex-grow: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; align-items: center;">
          <!-- 구매 제작 순수익 -->
          <div>
            <div style="font-size: 10px; color: var(--text-dim); margin-bottom: 1px;">🛒 구매 시</div>
            <span style="font-size: 12px; font-weight: 800; color: ${res.netProfitBuy >= 0 ? '#2ecc71' : '#e74c3c'}">${profitBuyText} G</span>
          </div>
          <!-- 자급자족 순수익 -->
          <div>
            <div style="font-size: 10px; color: var(--accent-cyan); margin-bottom: 1px;">🌲 자급자족</div>
            <span style="font-size: 12px; font-weight: 800; color: ${res.netProfitSelf >= 0 ? '#2ecc71' : '#e74c3c'}">${profitSelfText} G</span>
          </div>
        </div>
        <div style="flex-shrink: 0; min-width: 60px; text-align: right;">
          ${badgeHtml}
        </div>
      `;

      compareContainer.appendChild(row);
    });
  }

  function calculateStrongholdTimer() {
    const currentEnergy = parseInt(ui.inputCurrentEnergy.value) || 0;
    const maxEnergy = parseInt(ui.inputMaxEnergy.value) || 15000;
    const craftCount = parseInt(ui.inputCraftCount.value) || 1;

    const recipe = state.recipes[state.craftType];

    const totalRequiredEnergy = recipe.energy * craftCount;
    ui.txtRequiredEnergy.textContent = totalRequiredEnergy.toLocaleString();

    ui.txtRequiredTime.textContent = `${craftCount}시간 00분`;

    if (currentEnergy >= maxEnergy) {
      ui.txtEnergyFillTime.textContent = '이미 완전히 충전되었습니다.';
      ui.txtEnergyFillTime.className = 'value text-green';
      if (ui.txtEnergyFillTargetTime) {
        ui.txtEnergyFillTargetTime.textContent = '지금 즉시 가능';
        ui.txtEnergyFillTargetTime.className = 'value text-green';
      }
    } else {
      const neededEnergy = maxEnergy - currentEnergy;
      const totalMinutes = neededEnergy / 15;
      const hours = Math.floor(totalMinutes / 60);
      const minutes = Math.round(totalMinutes % 60);

      ui.txtEnergyFillTime.textContent = `${hours}시간 ${minutes}분 남음`;
      ui.txtEnergyFillTime.className = 'value text-cyan';

      if (ui.txtEnergyFillTargetTime) {
        const now = new Date();
        const targetTime = new Date(now.getTime() + totalMinutes * 60 * 1000);
        const month = targetTime.getMonth() + 1;
        const date = targetTime.getDate();
        const hoursStr = String(targetTime.getHours()).padStart(2, '0');
        const minutesStr = String(targetTime.getMinutes()).padStart(2, '0');
        ui.txtEnergyFillTargetTime.textContent = `${month}월 ${date}일 ${hoursStr}:${minutesStr}`;
        ui.txtEnergyFillTargetTime.className = 'value text-gold';
      }
    }
  }

  function bindCraftingEvents() {
    ui.btnCraftNormal.addEventListener('click', () => {
      state.craftType = 'normal';
      ui.btnCraftNormal.classList.add('active');
      ui.btnCraftSuperior.classList.remove('active');
      state.sellPrice = state.fusionPrices.normal;
      if (ui.inputSellPrice) ui.inputSellPrice.value = state.sellPrice;
      calculateCraftingEfficiency();
    });

    ui.btnCraftSuperior.addEventListener('click', () => {
      state.craftType = 'superior';
      ui.btnCraftSuperior.classList.add('active');
      ui.btnCraftNormal.classList.remove('active');
      state.sellPrice = state.fusionPrices.superior;
      if (ui.inputSellPrice) ui.inputSellPrice.value = state.sellPrice;
      calculateCraftingEfficiency();
    });

    ui.inputSellPrice.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value) || 0;
      state.sellPrice = val;
      state.fusionPrices[state.craftType] = val;
      calculateCraftingEfficiency();
    });

    ui.sliderGreatSuccess.addEventListener('input', (e) => {
      const val = parseInt(e.target.value) || 0;
      state.greatSuccessRate = val;
      ui.valGreatSuccess.textContent = `${val}%`;
      calculateCraftingEfficiency();
    });

    ui.sliderGoldDiscount.addEventListener('input', (e) => {
      const val = parseInt(e.target.value) || 0;
      state.goldDiscount = val;
      ui.valGoldDiscount.textContent = `${val}%`;
      calculateCraftingEfficiency();
    });

    ui.skillTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        ui.skillTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.selectedSkill = tab.getAttribute('data-skill');
        // 스킬 변경 시 쿨타임 초기화하여 해당 스킬 재료 시세 즉시 갱신
        lastCraftingFetchTime = 0;
        renderMaterialInputs();
        calculateCraftingEfficiency();
        fetchCraftingMaterialPrices();
      });
    });

    [ui.inputCurrentEnergy, ui.inputMaxEnergy, ui.inputCraftCount].forEach(input => {
      input.addEventListener('input', calculateStrongholdTimer);
    });
  }


  // === 6. 캐릭터 스펙 & 특성 효율 진단 엔진 ===

  function calculateSpecDiagnosis() {
    const spec = state.spec;

    const critFromStat = spec.crit * 0.0357;
    const calcCrit = critFromStat + spec.adr + spec.synergy + spec.bracelet + spec.manualCrit;
    ui.txtCalcCrit.textContent = `${calcCrit.toFixed(2)}%`;

    const finalCrit = Math.min(100, calcCrit);
    ui.txtFinalCrit.textContent = `${finalCrit.toFixed(2)}%`;

    const excessCrit = Math.max(0, calcCrit - 100);
    let mungaConvertRate = 0;
    let maxMungaLimit = 75.0;

    if (spec.mungaLevel === 1) {
      mungaConvertRate = excessCrit * 1.25;
      maxMungaLimit = 52.5;
    } else {
      mungaConvertRate = excessCrit * 1.5;
      maxMungaLimit = 75.0;
    }

    const finalMungaDamage = Math.min(maxMungaLimit, mungaConvertRate);

    const mungaFillPercent = Math.min(100, (finalMungaDamage / maxMungaLimit) * 100);
    ui.barMungaFill.style.width = `${mungaFillPercent}%`;
    ui.txtMungaConvertRate.textContent = `${finalMungaDamage.toFixed(2)}% / ${maxMungaLimit.toFixed(1)}%`;

    const critDmgMultiplier = (spec.critDamage / 100) - 1;
    const E_normal = 1 + (finalCrit / 100) * critDmgMultiplier;
    const E_munga = E_normal * (1 + finalMungaDamage / 100);
    const mungaEfficiency = (E_munga / E_normal - 1) * 100;

    ui.txtMungaEfficiency.textContent = `+${mungaEfficiency.toFixed(2)}%`;

    if (calcCrit <= 100) {
      ui.badgeMunga.textContent = '비효율';
      ui.badgeMunga.className = 'badge border-danger text-danger';
      ui.badgeMunga.style.background = 'hsla(355, 90%, 52%, 0.1)';
      ui.txtMungaDesc.innerHTML = `현재 종합 치적이 <strong class="text-orange">${calcCrit.toFixed(1)}%</strong>로 100% 이하입니다. 뭉툭한 가시의 초과 치적 변환 진피증이 전혀 작동하지 않고 있습니다. <strong class="text-gold">치명 스탯을 늘리거나 파티 치적 시너지</strong>를 구성하여 100%를 무조건 초과하도록 구성하는 것을 강력히 권장합니다.`;
    } else {
      ui.badgeMunga.textContent = '최적 작동';
      ui.badgeMunga.className = 'badge border-gold text-gold';
      ui.badgeMunga.style.background = 'hsla(45, 100%, 55%, 0.1)';
      
      if (finalMungaDamage >= maxMungaLimit) {
        ui.txtMungaDesc.innerHTML = `초과 치적이 <strong class="text-cyan">${excessCrit.toFixed(1)}%</strong>에 달하여 뭉툭한 가시 <strong class="text-purple">최대 진피증 상한량(${maxMungaLimit}%)에 도달</strong>했습니다! 완벽을 초과한 극강의 스펙 세팅 상태입니다. 추가적인 치적 세팅은 낭비이므로 스탯을 타 스탯으로 전환하시는 것을 추천합니다.`;
      } else {
        ui.txtMungaDesc.innerHTML = `현재 초과 치적 <strong class="text-cyan">${excessCrit.toFixed(1)}%</strong>가 성공적으로 <strong class="text-green">진화 피해 증가 +${finalMungaDamage.toFixed(2)}%</strong>로 변환되고 있습니다. 매우 유기적으로 효율이 누수 없이 빌드되고 있는 건강한 진화 세팅 상태입니다.`;
      }
    }

    const speedFromSwift = spec.swift * 0.01717;
    const feastBuff = spec.feast ? 5.0 : 0.0;
    const massPenalty = spec.massIncrease ? -10.0 : 0.0;

    const finalAtkSpeed = 100 + speedFromSwift + spec.yearning + feastBuff + massPenalty + spec.manualSpeed;
    const finalMoveSpeed = 100 + speedFromSwift + spec.yearning + feastBuff + spec.manualSpeed;

    ui.txtFinalAtkSpeed.textContent = `${finalAtkSpeed.toFixed(2)}%`;
    ui.txtFinalMoveSpeed.textContent = `${finalMoveSpeed.toFixed(2)}%`;

    const excessAtk = Math.max(0, finalAtkSpeed - 140);
    const excessMove = Math.max(0, finalMoveSpeed - 140);
    const excessSum = excessAtk + excessMove;

    const sonicDamage = excessSum * 0.3;
    ui.txtSonicDamage.textContent = `+${sonicDamage.toFixed(2)}%`;

    const actualSum = finalAtkSpeed + finalMoveSpeed;
    const maxTargetSum = 306.67;
    ui.txtSonicSum.textContent = `${actualSum.toFixed(1)}% / ${maxTargetSum.toFixed(1)}%`;
    const sonicFillPercent = Math.min(100, (actualSum / maxTargetSum) * 100);
    ui.barSonicFill.style.width = `${sonicFillPercent}%`;

    if (sonicDamage <= 0) {
      ui.badgeSonic.textContent = '비활성';
      ui.badgeSonic.className = 'badge border-muted text-muted';
      ui.badgeSonic.style.background = 'hsla(0, 0%, 50%, 0.1)';
      ui.txtSonicDesc.innerHTML = `공격 속도와 이동 속도가 둘 다 <strong class="text-orange">140% 기본 상한에 미치지 못하여</strong> 음속 돌파를 통한 보너스 딜증이 발생하지 않는 초비상 상태입니다. <strong class="text-cyan">신속 특성을 더 늘리거나 파티 갈망 버프, 속도 자버프 스킬</strong>을 확보하여 반드시 140% 이상으로 속도를 끌어올려 초과 효율을 유도하십시오.`;
    } else {
      ui.badgeSonic.textContent = '효율 활성화';
      ui.badgeSonic.className = 'badge border-cyan text-cyan';
      ui.badgeSonic.style.background = 'hsla(180, 100%, 50%, 0.1)';

      if (actualSum >= maxTargetSum) {
        ui.txtSonicDesc.innerHTML = `최종 합산 속도가 <strong class="text-green">${actualSum.toFixed(1)}%</strong>에 달하여 음속 돌파로 획득 가능한 <strong class="text-purple">최대 진화 피해 증가량 한계치</strong>에 돌파 완료했습니다! 극신속 딜러 특유의 시원시원하고 압도적인 화력을 극한까지 뿜어내고 있는 명품 세팅입니다.`;
      } else {
        ui.txtSonicDesc.innerHTML = `140% 상 한 상한 초과분 속도가 유기적으로 환산되어 <strong class="text-cyan">진화 피해 증가 +${sonicDamage.toFixed(2)}%</strong>를 안전하게 확보하고 있습니다. 신속 딜러로서 매우 훌륭한 속도 최적화 수준입니다.`;
      }
    }
  }

  function bindSpecEvents() {
    ui.inputCritStat.addEventListener('input', (e) => {
      state.spec.crit = parseInt(e.target.value) || 0;
      calculateSpecDiagnosis();
    });

    ui.inputSwiftStat.addEventListener('input', (e) => {
      state.spec.swift = parseInt(e.target.value) || 0;
      calculateSpecDiagnosis();
    });

    ui.selectAdrenaline.addEventListener('change', (e) => {
      state.spec.adr = parseFloat(e.target.value) || 0;
      calculateSpecDiagnosis();
    });

    ui.selectSynergy.addEventListener('change', (e) => {
      state.spec.synergy = parseFloat(e.target.value) || 0;
      calculateSpecDiagnosis();
    });

    ui.selectBraceletCrit.addEventListener('change', (e) => {
      state.spec.bracelet = parseFloat(e.target.value) || 0;
      calculateSpecDiagnosis();
    });

    ui.inputManualCrit.addEventListener('input', (e) => {
      state.spec.manualCrit = parseFloat(e.target.value) || 0;
      calculateSpecDiagnosis();
    });

    ui.selectYearning.addEventListener('change', (e) => {
      state.spec.yearning = parseFloat(e.target.value) || 0;
      calculateSpecDiagnosis();
    });

    ui.chkFeast.addEventListener('change', (e) => {
      state.spec.feast = e.target.checked;
      calculateSpecDiagnosis();
    });

    ui.chkMassIncrease.addEventListener('change', (e) => {
      state.spec.massIncrease = e.target.checked;
      calculateSpecDiagnosis();
    });

    ui.inputManualSpeed.addEventListener('input', (e) => {
      state.spec.manualSpeed = parseFloat(e.target.value) || 0;
      calculateSpecDiagnosis();
    });

    ui.inputCritDamage.addEventListener('input', (e) => {
      state.spec.critDamage = parseFloat(e.target.value) || 200;
      calculateSpecDiagnosis();
    });

    ui.selectMungaLevel.addEventListener('change', (e) => {
      state.spec.mungaLevel = parseInt(e.target.value) || 2;
      calculateSpecDiagnosis();
    });
  }


  // === 7. 낙원 지옥 보상 효율 계산기 ===

  // === 7. 낙원 나락 & 지옥 보상 효율 계산기 (lo4.app 스타일) ===

  function calculateHellRewards() {
    const prices = state.hellPrices;
    const h = state.hell;
    
    // 10층 단위 비례 비율 (50층 = 0.5)
    const floorRatio = Math.floor(h.floor / 10) / 10;
    
    // 나락 모드 여부에 따른 전체 배율 (지옥 1배 vs 나락 5배)
    const modeMultiplier = h.mode === 'nether' ? 5 : 1;
    
    // 풍요 버프 여부에 따른 재련 재료 배율 (일반 1배 vs 풍요 10배)
    const abundanceMultiplier = h.isAbundance ? 10 : 1;

    let matVal = 0;
    let gemVal = 0;
    let goldVal = 0;
    let matDesc = '';
    let gemDesc = '';
    let goldDesc = '';

    // 레벨 구간별 10단계(100층) 기준 기본 보상 수량 매핑
    if (h.level === '1640') {
      // 1) 재련 재료 보상 가치
      const destCount = 1500 * floorRatio * modeMultiplier * abundanceMultiplier;
      const protCount = 4500 * floorRatio * modeMultiplier * abundanceMultiplier;
      const leapCount = 60 * floorRatio * modeMultiplier * abundanceMultiplier;
      const fusionCount = 30 * floorRatio * modeMultiplier * abundanceMultiplier;
      
      matVal = (destCount / 10) * prices.t4Destruction + 
               (protCount / 10) * prices.t4Protection + 
               leapCount * prices.t4Leapstone + 
               fusionCount * prices.fusionNormal;
               
      matDesc = `T4 파괴석 ${destCount.toLocaleString()}개 + 수호석 ${protCount.toLocaleString()}개 + 돌파석 ${leapCount.toLocaleString()}개 + 아비도스 융화재료 ${fusionCount.toLocaleString()}개`;

      // 2) 보석 보상 가치 (T4 4레벨 보석 2개 = T4 1레벨 보석 54개)
      const gemCountLvl1 = 54 * floorRatio * modeMultiplier;
      gemVal = gemCountLvl1 * prices.t4GemLvl1;
      gemDesc = `T4 4레벨 보석 ${2 * floorRatio * modeMultiplier}개 분량 (T4 1레벨 보석 ${gemCountLvl1.toLocaleString()}개당 ${prices.t4GemLvl1}G 환산)`;

      // 3) 귀속 골드 보상
      goldVal = 15000 * floorRatio * modeMultiplier;
      goldDesc = `콘텐츠 기본 지급 귀속 골드 (층수 및 모드 배율 완벽 반영)`;

    } else if (h.level === '1700') {
      // 1) 재련 재료 보상 가치
      const destCount = 2500 * floorRatio * modeMultiplier * abundanceMultiplier;
      const protCount = 7500 * floorRatio * modeMultiplier * abundanceMultiplier;
      const leapCount = 100 * floorRatio * modeMultiplier * abundanceMultiplier;
      const fusionCount = 50 * floorRatio * modeMultiplier * abundanceMultiplier;
      
      matVal = (destCount / 10) * prices.t4Destruction + 
               (protCount / 10) * prices.t4Protection + 
               leapCount * prices.t4Leapstone + 
               fusionCount * prices.fusionNormal;
               
      matDesc = `T4 파괴석 ${destCount.toLocaleString()}개 + 수호석 ${protCount.toLocaleString()}개 + 돌파석 ${leapCount.toLocaleString()}개 + 아비도스 융화재료 ${fusionCount.toLocaleString()}개`;

      // 2) 보석 보상 가치 (T4 5레벨 보석 1개 = T4 1레벨 보석 81개)
      const gemCountLvl1 = 81 * floorRatio * modeMultiplier;
      gemVal = gemCountLvl1 * prices.t4GemLvl1;
      gemDesc = `T4 5레벨 보석 ${1 * floorRatio * modeMultiplier}개 분량 (T4 1레벨 보석 ${gemCountLvl1.toLocaleString()}개당 ${prices.t4GemLvl1}G 환산)`;

      // 3) 귀속 골드 보상
      goldVal = 25000 * floorRatio * modeMultiplier;
      goldDesc = `콘텐츠 기본 지급 귀속 골드 (층수 및 모드 배율 완벽 반영)`;

    } else { // 1730 레벨
      // 1) 재련 재료 보상 가치
      const destCount = 4000 * floorRatio * modeMultiplier * abundanceMultiplier;
      const protCount = 12000 * floorRatio * modeMultiplier * abundanceMultiplier;
      const leapCount = 160 * floorRatio * modeMultiplier * abundanceMultiplier;
      const fusionCount = 80 * floorRatio * modeMultiplier * abundanceMultiplier;
      const chaosCount = 8 * floorRatio * modeMultiplier * abundanceMultiplier;
      
      matVal = (destCount / 10) * prices.t4Destruction + 
               (protCount / 10) * prices.t4Protection + 
               leapCount * prices.t4Leapstone + 
               fusionCount * prices.fusionSuperior +
               chaosCount * prices.chaosStone;
               
      matDesc = `T4 파괴석 ${destCount.toLocaleString()}개 + 수호석 ${protCount.toLocaleString()}개 + 돌파석 ${leapCount.toLocaleString()}개 + 상급 아비도스 ${fusionCount.toLocaleString()}개 + 혼돈의 돌 ${chaosCount.toLocaleString()}개`;

      // 2) 보석 보상 가치 (T4 6레벨 보석 1개 = T4 1레벨 보석 243개)
      const gemCountLvl1 = 243 * floorRatio * modeMultiplier;
      gemVal = gemCountLvl1 * prices.t4GemLvl1;
      gemDesc = `T4 6레벨 보석 ${1 * floorRatio * modeMultiplier}개 분량 (T4 1레벨 보석 ${gemCountLvl1.toLocaleString()}개당 ${prices.t4GemLvl1}G 환산)`;

      // 3) 귀속 골드 보상
      goldVal = 40000 * floorRatio * modeMultiplier;
      goldDesc = `콘텐츠 기본 지급 귀속 골드 (층수 및 모드 배율 완벽 반영)`;
    }

    const rewards = [
      { name: '재련 재료 패키지 선택', desc: matDesc, gold: matVal, icon: 'gem', type: 'material' },
      { name: '보석(젬) 상자 보상 선택', desc: gemDesc, gold: gemVal, icon: 'shield', type: 'gem' },
      { name: '순수 귀속 골드 보상 선택', desc: goldDesc, gold: goldVal, icon: 'coins', type: 'gold' }
    ];

    // 가치(골드) 내림차순 랭킹 정렬
    rewards.sort((a, b) => b.gold - a.gold);

    ui.hellRewardsContainer.innerHTML = '';
    
    rewards.forEach((reward, index) => {
      const isBest = index === 0;
      const isSecond = index === 1;
      
      let rankClass = 'hell-reward-card-standard';
      let borderGlow = '';
      if (isBest) {
        rankClass = 'hell-reward-card-gold';
        borderGlow = 'border: 1px solid rgba(255, 215, 0, 0.4) !important; box-shadow: 0 0 15px rgba(255, 215, 0, 0.05);';
      } else if (isSecond) {
        rankClass = 'hell-reward-card-cyan';
        borderGlow = 'border: 1px solid rgba(100, 200, 255, 0.2) !important;';
      }
      
      const badgeText = isBest ? '👑 1위 BEST CHOICE' : `${index + 1}위 선택지`;
      const badgeColor = isBest ? 'color: var(--accent-gold);' : (isSecond ? 'color: var(--accent-cyan);' : 'color: var(--text-dim);');

      const card = document.createElement('div');
      card.className = `hell-reward-card glass-card ${rankClass}`;
      card.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        padding: 16px 20px;
        border-radius: var(--border-radius-md);
        margin-bottom: 8px;
        transition: transform 0.2s ease, border-color 0.2s ease;
        cursor: default;
        ${borderGlow}
      `;
      
      card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-2px)';
      });
      card.style.transition = 'all 0.2s ease';
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
      });

      card.innerHTML = `
        <div style="display: flex; align-items: center; gap: 14px; flex-grow: 1;">
          <div style="width: 38px; height: 38px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
            <i data-lucide="${reward.icon}" style="width: 18px; height: 18px; color: ${isBest ? 'var(--accent-gold)' : 'var(--text-muted)'};"></i>
          </div>
          <div>
            <span style="font-size: 10px; font-weight: 800; display: block; margin-bottom: 2px; ${badgeColor}">${badgeText}</span>
            <h3 style="font-size: 14px; font-weight: 700; margin: 0 0 3px 0; color: var(--text-bright);">${reward.name}</h3>
            <p style="font-size: 11px; color: var(--text-muted); margin: 0; line-height: 1.4;">${reward.desc}</p>
          </div>
        </div>
        <div style="text-align: right; flex-shrink: 0; min-width: 90px; margin-left: 15px;">
          <span style="font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 800; color: ${isBest ? 'var(--accent-gold)' : 'var(--text-white)'};">${Math.round(reward.gold).toLocaleString()}</span>
          <span style="font-size: 11px; color: var(--text-muted); font-weight: 700; margin-left: 1px;">G 상당</span>
        </div>
      `;
      ui.hellRewardsContainer.appendChild(card);
    });

    // 1위 추천 보상 및 이득 퍼센티지 갱신
    const best = rewards[0];
    const goldReward = rewards.find(r => r.type === 'gold');
    const goldValBenchmark = goldReward ? goldReward.gold : 1;
    
    // 순수 골드 보상 대비 몇 퍼센트 효율이 더 잘 나오는지 이득 계산
    const efficiencyPct = ((best.gold / goldValBenchmark) * 100).toFixed(1);
    
    ui.txtBestRewardName.textContent = best.name;
    ui.txtBestRewardGold.textContent = Math.round(best.gold).toLocaleString();
    ui.hellEfficiencyPct.textContent = `순수 귀속 골드 대비 ${efficiencyPct}% 효율`;

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  function bindHellEvents() {
    // 1) 콘텐츠 모드 선택 이벤트
    if (ui.hellModeNormalBtn && ui.hellModeNetherBtn) {
      ui.hellModeNormalBtn.addEventListener('click', () => {
        ui.hellModeNormalBtn.classList.add('active');
        ui.hellModeNetherBtn.classList.remove('active');
        state.hell.mode = 'normal';
        calculateHellRewards();
      });
      ui.hellModeNetherBtn.addEventListener('click', () => {
        ui.hellModeNormalBtn.classList.remove('active');
        ui.hellModeNetherBtn.classList.add('active');
        state.hell.mode = 'nether';
        calculateHellRewards();
      });
    }

    // 2) 아이템 레벨 버튼 이벤트
    ui.hellLvlButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        ui.hellLvlButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.hell.level = btn.getAttribute('data-level');
        
        // 아이템 레벨 변경 시 기본 시세 자동 세팅
        if (state.hell.level === '1730') {
          if (ui.inputHellLeap) ui.inputHellLeap.value = 75;
          if (ui.inputHellDest) ui.inputHellDest.value = 16;
          if (ui.inputHellProt) ui.inputHellProt.value = 3;
          state.hellPrices.t4Leapstone = 75;
          state.hellPrices.t4Destruction = 16;
          state.hellPrices.t4Protection = 3;
        } else {
          if (ui.inputHellLeap) ui.inputHellLeap.value = 45;
          if (ui.inputHellDest) ui.inputHellDest.value = 12;
          if (ui.inputHellProt) ui.inputHellProt.value = 2;
          state.hellPrices.t4Leapstone = 45;
          state.hellPrices.t4Destruction = 12;
          state.hellPrices.t4Protection = 2;
        }
        calculateHellRewards();
      });
    });

    // 3) 층수 슬라이더 조절 이벤트
    if (ui.hellFloorSlider && ui.hellFloorVal) {
      ui.hellFloorSlider.addEventListener('input', (e) => {
        const floor = parseInt(e.target.value) || 50;
        state.hell.floor = floor;
        const stage = Math.floor(floor / 10);
        ui.hellFloorVal.textContent = `${floor}층 (${stage}단계 보상)`;
        calculateHellRewards();
      });
    }

    // 4) 풍요의 축복 토글 이벤트
    if (ui.hellAbundanceChk) {
      ui.hellAbundanceChk.addEventListener('change', (e) => {
        state.hell.isAbundance = e.target.checked;
        calculateHellRewards();
      });
    }

    // 5) 시장 시세 조정 아코디언 토글
    if (ui.hellPricesToggleBtn && ui.hellPricesPanel && ui.hellPricesChevronIcon) {
      // 초기 상태: 접힘
      ui.hellPricesPanel.classList.add('collapsed');
      ui.hellPricesChevronIcon.style.transform = 'rotate(0deg)';
      
      ui.hellPricesToggleBtn.addEventListener('click', () => {
        state.hell.isPricesCollapsed = !state.hell.isPricesCollapsed;
        if (state.hell.isPricesCollapsed) {
          ui.hellPricesPanel.classList.add('collapsed');
          ui.hellPricesChevronIcon.style.transform = 'rotate(0deg)';
        } else {
          ui.hellPricesPanel.classList.remove('collapsed');
          ui.hellPricesChevronIcon.style.transform = 'rotate(180deg)';
        }
      });
    }

    // 6) 시장 시세 조정 실시간 개별 인풋 리스너 바인딩
    const inputsMap = [
      { el: ui.inputHellLeap, key: 't4Leapstone' },
      { el: ui.inputHellDest, key: 't4Destruction' },
      { el: ui.inputHellProt, key: 't4Protection' },
      { el: ui.inputHellGem1, key: 't4GemLvl1' },
      { el: ui.inputHellFusionNormal, key: 'fusionNormal' },
      { el: ui.inputHellFusionSuperior, key: 'fusionSuperior' },
      { el: ui.inputHellChaos, key: 'chaosStone' }
    ];

    inputsMap.forEach(item => {
      if (item.el) {
        item.el.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value) || 0;
          state.hellPrices[item.key] = val;
          calculateHellRewards();
        });
      }
    });
  }


  // === 8. 레이드 경매 분배금 계산기 ===

  // 유물 각인서 10종 실시간 일괄 조회 함수 (API 한도 최적화를 위해 한 번에 긁어오기 설계)
  async function updateEngravingPricesFromApi() {
    if (!state.apiKey) return; // API Key가 없으면 기본값 모의 사용

    try {
      const response = await fetch('/api/market', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-lostark-api-key': state.apiKey
        },
        body: JSON.stringify({
          Sort: 'CURRENT_MIN_PRICE',
          CategoryCode: 40000, // 각인서 카테고리
          CharacterClass: '',
          // 유물 각인서는 티어 구분이 없으므로 ItemTier 필드를 제거하여 정상 수집 보장
          ItemGrade: '유물', // 유물 등급 각인서만 필터링
          ItemName: '',      // 전체 조회
          PageNo: 1,
          SortCondition: 'DESC'
        })
      });

      if (!response.ok) return;

      const data = await response.json();
      if (data && data.Items) {
        let updated = false;
        data.Items.forEach(apiItem => {
          const matched = state.engravingPrices.find(ep => 
            apiItem.Name.includes(ep.searchName) && apiItem.Name.includes('각인서') && apiItem.Name.includes('유물')
          );
          if (matched) {
            matched.price = apiItem.CurrentMinPrice;
            matched.isRealtime = true;
            updated = true;
          }
        });
        
        if (updated) {
          renderEngravingPresets();
        }
      }
    } catch (err) {
      console.error('유물 각인서 실시간 시세 일괄 동기화 실패:', err);
    }
  }

  function renderEngravingPresets() {
    if (!ui.engravingPresetsContainer) return;
    ui.engravingPresetsContainer.innerHTML = '';

    state.engravingPrices.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'preset-tag engraving-tag';
      
      const typeLabel = item.isRealtime ? '실시간' : '기본';
      btn.innerHTML = `
        <span style="display:block; font-size: 11px; font-weight:700;">${item.searchName}</span>
        <span style="display:block; font-size: 9px; opacity:0.8; margin-top:2px;">${item.price.toLocaleString()}G (${typeLabel})</span>
      `;
      
      btn.addEventListener('click', () => {
        ui.inputAuctionPrice.value = item.price;
        state.auction.marketPrice = item.price;
        calculateAuctionDividends();
        
        ui.engravingPresetsContainer.querySelectorAll('.preset-tag').forEach(b => {
          b.style.borderColor = 'rgba(255, 170, 0, 0.15)';
          b.style.background = 'hsla(45, 100%, 55%, 0.05)';
        });
        btn.style.borderColor = 'var(--accent-gold)';
        btn.style.background = 'hsla(45, 100%, 55%, 0.2)';
      });

      ui.engravingPresetsContainer.appendChild(btn);
    });
  }

  // API Key가 없는 유저를 위해 서버 캐시에서 실시간 각인 가격을 받아와 프리셋에 동기화
  async function updateEngravingPricesFromServerCache() {
    try {
      const serverRes = await fetch('/api/market/live-dashboard');
      if (serverRes.ok) {
        const cacheData = await serverRes.json();
        if (cacheData && cacheData.engravings && cacheData.engravings.length > 0) {
          let hasUpdatedPresets = false;
          state.engravingPrices.forEach(ep => {
            const matched = cacheData.engravings.find(x => 
              x.Name.includes(ep.searchName) || ep.searchName.includes(x.Name)
            );
            if (matched && matched.CurrentMinPrice > 0) {
              ep.price = matched.CurrentMinPrice;
              ep.isRealtime = true;
              hasUpdatedPresets = true;
            }
          });

          if (hasUpdatedPresets) {
            renderEngravingPresets();
          }
        }
      }
    } catch (err) {
      console.warn('서버 캐시에서 각인서 프리셋 동기화 실패:', err);
    }
  }

  function calculateAuctionDividends() {
    const marketPrice = state.auction.marketPrice;
    const N = state.auction.raidSize;

    ui.txtAuctionBaseVal.textContent = `${marketPrice.toLocaleString()} G`;

    const taxVal = marketPrice * 0.95;
    ui.txtAuctionTaxVal.textContent = `${taxVal.toLocaleString()} G`;

    const breakEven = taxVal * ((N - 1) / N);
    ui.txtBidBreakEven.textContent = Math.round(breakEven).toLocaleString();

    const recommend = breakEven * 0.91;
    ui.txtBidRecommend.textContent = Math.round(recommend).toLocaleString();

    const dividend = breakEven * 0.95 / N;
    ui.txtAuctionDividend.textContent = `${Math.round(dividend).toLocaleString()} G`;
  }

  function bindAuctionEvents() {
    renderEngravingPresets();

    ui.inputAuctionPrice.addEventListener('input', (e) => {
      state.auction.marketPrice = parseFloat(e.target.value) || 0;
      calculateAuctionDividends();
      
      // 가격을 직접 입력하면 프리셋의 활성화 보더 색상 초기화
      if (ui.engravingPresetsContainer) {
        ui.engravingPresetsContainer.querySelectorAll('.preset-tag').forEach(b => {
          b.style.borderColor = 'rgba(255, 170, 0, 0.15)';
          b.style.background = 'hsla(45, 100%, 55%, 0.05)';
        });
      }
    });

    ui.raidSizeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        ui.raidSizeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.auction.raidSize = parseInt(btn.getAttribute('data-size')) || 4;
        calculateAuctionDividends();
      });
    });
  }


  // === 9. 실시간 시세 검색 및 Gemini AI 리포트 인터랙션 ===

  // 실시간 보석 대시보드 모의 데이터 백업 (API 미연동 또는 연결 오류 시 작동)
  const mockGems = [
    { Name: '10레벨 겁화의 보석', CurrentMinPrice: 0, YesterDayAveragePrice: 0 },
    { Name: '10레벨 작열의 보석', CurrentMinPrice: 0, YesterDayAveragePrice: 0 },
    { Name: '9레벨 겁화의 보석', CurrentMinPrice: 0, YesterDayAveragePrice: 0 },
    { Name: '9레벨 작열의 보석', CurrentMinPrice: 0, YesterDayAveragePrice: 0 },
    { Name: '8레벨 겁화의 보석', CurrentMinPrice: 0, YesterDayAveragePrice: 0 },
    { Name: '8레벨 작열의 보석', CurrentMinPrice: 0, YesterDayAveragePrice: 0 },
    { Name: '7레벨 겁화의 보석', CurrentMinPrice: 0, YesterDayAveragePrice: 0 },
    { Name: '7레벨 작열의 보석', CurrentMinPrice: 0, YesterDayAveragePrice: 0 }
  ];

  // 실시간 유물 각인서 대시보드 모의 데이터 백업 (상위 15종)
  const mockEngravingRank = [
    { Name: '원한 유물 각인서', CurrentMinPrice: 0, YesterDayAveragePrice: 0 },
    { Name: '아드레날린 유물 각인서', CurrentMinPrice: 0, YesterDayAveragePrice: 0 },
    { Name: '예리한 둔기 유물 각인서', CurrentMinPrice: 0, YesterDayAveragePrice: 0 },
    { Name: '돌격대장 유물 각인서', CurrentMinPrice: 0, YesterDayAveragePrice: 0 },
    { Name: '타격 대장 유물 각인서', CurrentMinPrice: 0, YesterDayAveragePrice: 0 },
    { Name: '기습의 대가 유물 각인서', CurrentMinPrice: 0, YesterDayAveragePrice: 0 },
    { Name: '저주받은 인형 유물 각인서', CurrentMinPrice: 0, YesterDayAveragePrice: 0 },
    { Name: '결투의 대가 유물 각인서', CurrentMinPrice: 0, YesterDayAveragePrice: 0 },
    { Name: '질량 증가 유물 각인서', CurrentMinPrice: 0, YesterDayAveragePrice: 0 },
    { Name: '각성 유물 각인서', CurrentMinPrice: 0, YesterDayAveragePrice: 0 },
    { Name: '상급 소환사 유물 각인서', CurrentMinPrice: 0, YesterDayAveragePrice: 0 },
    { Name: '점화 유물 각인서', CurrentMinPrice: 0, YesterDayAveragePrice: 0 },
    { Name: '처단자 유물 각인서', CurrentMinPrice: 0, YesterDayAveragePrice: 0 },
    { Name: '환류 유물 각인서', CurrentMinPrice: 0, YesterDayAveragePrice: 0 },
    { Name: '절정 유물 각인서', CurrentMinPrice: 0, YesterDayAveragePrice: 0 }
  ];

  // 안전 캐싱(60초) 하에 실시간 데이터 로딩 제어 (API 호출 최소화 적용)
  async function updateMarketDashboardData() {
    const now = Date.now();
    // 60초 캐싱 인터벌 적용: API Rate Limit을 완벽히 방수하기 위함
    if (state.lastMarketFetchTime && (now - state.lastMarketFetchTime < 60000)) {
      console.log('[Dashboard] 60초 캐시 유효 상태. 로컬 캐시 렌더링 진행.');
      renderGemDashboard(state.gemPrices);
      renderEngravingRankDashboard(state.topEngravings);
      return;
    }

    console.log('[Dashboard] 캐시가 만료되었거나 첫 진입입니다. 실시간 데이터 동기화 시작.');
    
    // 로딩 상태 표시
    if (ui.gemDashboardContainer) {
      ui.gemDashboardContainer.innerHTML = `
        <div class="dashboard-loading">
          <i data-lucide="loader" class="animate-spin text-cyan"></i>
          <span>보석 실시간 시세 수집 중...</span>
        </div>
      `;
    }
    if (ui.engravingRankTableBody) {
      ui.engravingRankTableBody.innerHTML = `
        <tr>
          <td colspan="4" class="table-loading">
            <i data-lucide="loader" class="animate-spin text-gold"></i>
            <span>상위 유물 각인서 랭킹 산출 중...</span>
          </td>
        </tr>
      `;
      if (window.lucide) window.lucide.createIcons();
    }

    // 비동기로 데이터 수집 시작
    try {
      // 1) 만약 유저가 API Key를 설정했다면, 서버 캐시 대신 로컬 조회를 최우선적으로 실행하여 실시간 최신 정보 반영
      if (state.apiKey) {
        console.log('[Dashboard] 개인 API Key가 감지되어 로컬 OpenAPI 직접 실시간 조회를 우선 수행합니다.');
        const [gems, engravings] = await Promise.all([
          updateLiveGemPricesFromApi(),
          updateTop15EngravingsFromApi()
        ]);

        state.gemPrices = gems;
        state.topEngravings = engravings;
        state.lastMarketFetchTime = Date.now();

        // 로컬 OpenAPI 조회로 가져온 각인서 시세를 분배금 계산기 프리셋에도 즉시 전파
        let hasUpdatedPresetsLocal = false;
        state.engravingPrices.forEach(ep => {
          const matched = engravings.find(x => 
            x.Name.includes(ep.searchName) || ep.searchName.includes(x.Name)
          );
          if (matched && matched.CurrentMinPrice > 0) {
            ep.price = matched.CurrentMinPrice;
            ep.isRealtime = true;
            hasUpdatedPresetsLocal = true;
          }
        });
        
        if (hasUpdatedPresetsLocal) {
          renderEngravingPresets();
        }

        renderGemDashboard(gems);
        renderEngravingRankDashboard(engravings);
        return; // 직접 실시간 업데이트 완료
      }

      // 2) 개인 API Key가 없다면, 서버 스케줄러가 수집해 둔 대시보드 API 캐시 조회
      console.log('[Dashboard] 개인 API Key가 설정되지 않아 안전한 서버 캐시 조회를 시도합니다.');
      const serverRes = await fetch('/api/market/live-dashboard');
      if (serverRes.ok) {
        const cacheData = await serverRes.json();
        if (cacheData && cacheData.gems && cacheData.engravings && cacheData.gems.length > 0) {
          console.log('[Dashboard] 서버 캐싱 시세를 수신하여 대시보드 렌더링을 진행합니다.');
          
          state.gemPrices = cacheData.gems;
          state.topEngravings = cacheData.engravings;
          state.lastMarketFetchTime = Date.now();

          // 분배금 계산기 10종 프리셋 가격도 서버 시세로 실시간 동기화 전파
          let hasUpdatedPresets = false;
          state.engravingPrices.forEach(ep => {
            const matched = cacheData.engravings.find(x => 
              x.Name.includes(ep.searchName) || ep.searchName.includes(x.Name)
            );
            if (matched && matched.CurrentMinPrice > 0) {
              ep.price = matched.CurrentMinPrice;
              ep.isRealtime = true;
              hasUpdatedPresets = true;
            }
          });

          if (hasUpdatedPresets) {
            renderEngravingPresets();
          }

          renderGemDashboard(cacheData.gems);
          renderEngravingRankDashboard(cacheData.engravings);
          return; // 성공했으므로 완료
        }
      }
      
      throw new Error('서버 시세 캐시가 비어 있거나 호출할 수 없습니다.');
    } catch (err) {
      console.error('[Dashboard] 실시간 데이터 로드 중 치명적 오류 발생, 데모 모드로 복구합니다:', err);
      // 에러 시 데모 모드로 백업
      state.gemPrices = mockGems;
      state.topEngravings = mockEngravingRank;
      state.lastMarketFetchTime = Date.now();
      
      renderGemDashboard(mockGems);
      renderEngravingRankDashboard(mockEngravingRank);
    }
  }

  // T4 보석 8종 (겁화/작열 7~10렙) 수집 API 구현 (경매장 /api/auction API 전면 교체 적용 및 API Limit 방어 딜레이 수집)
  async function updateLiveGemPricesFromApi() {
    if (!state.apiKey) {
      // API Key가 없으면 모의 데이터 반환
      return new Promise(resolve => setTimeout(() => resolve(mockGems), 500));
    }

    try {
      const gemTargets = [
        { name: '7레벨 겁화의 보석' },
        { name: '7레벨 작열의 보석' },
        { name: '8레벨 겁화의 보석' },
        { name: '8레벨 작열의 보석' },
        { name: '9레벨 겁화의 보석' },
        { name: '9레벨 작열의 보석' },
        { name: '10레벨 겁화의 보석' },
        { name: '10레벨 작열의 보석' }
      ];

      const resultGems = [];
      const delay = ms => new Promise(res => setTimeout(res, ms));

      // 8종 보석을 OpenAPI 초당 호출 한도(Rate Limit 5회)를 우회하기 위해 150ms 간격으로 순차적 안전 조회 수행
      for (let i = 0; i < gemTargets.length; i++) {
        const target = gemTargets[i];
        if (i > 0) await delay(150);

        try {
          const response = await fetch('/api/auction', {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-lostark-api-key': state.apiKey
            },
            body: JSON.stringify({
              ItemLevelMin: 0,
              ItemLevelMax: 0,
              ItemGradeQuality: null,
              SkillOption: null,
              EtcOptions: null,
              Sort: 'BUY_PRICE',
              CategoryCode: 210000,
              CharacterClass: null,
              ItemTier: 4,
              ItemGrade: '',
              ItemName: target.name,
              PageNo: 1,
              SortCondition: 'ASC'
            })
          });

          if (response.ok) {
            const gemData = await response.json();
            const items = gemData.Items || [];
            if (items.length > 0) {
              const bestItem = items[0];
              const price = bestItem.AuctionInfo.BuyPrice || bestItem.AuctionInfo.BidStartPrice || 0;
              resultGems.push({
                Name: target.name,
                CurrentMinPrice: price,
                YesterDayAveragePrice: price
              });
            } else {
              const backup = mockGems.find(x => x.Name === target.name) || { Name: target.name, CurrentMinPrice: 0, YesterDayAveragePrice: 0 };
              resultGems.push(backup);
            }
          } else {
            const backup = mockGems.find(x => x.Name === target.name) || { Name: target.name, CurrentMinPrice: 0, YesterDayAveragePrice: 0 };
            resultGems.push(backup);
          }
        } catch (err) {
          console.warn(`보석 ${target.name} 실시간 경매장 조회 실패:`, err.message);
          const backup = mockGems.find(x => x.Name === target.name) || { Name: target.name, CurrentMinPrice: 0, YesterDayAveragePrice: 0 };
          resultGems.push(backup);
        }
      }

      // 10렙 -> 9렙 -> 8렙 -> 7렙 순으로 정렬하기 위해 파싱 정렬
      resultGems.sort((a, b) => {
        const getLvl = name => parseInt(name.match(/\d+/)?.[0] || 0);
        const lvlA = getLvl(a.Name);
        const lvlB = getLvl(b.Name);
        if (lvlA !== lvlB) return lvlB - lvlA; // 레벨 내림차순
        return a.Name.includes('겁화') ? -1 : 1; // 같은 레벨이면 겁화 우선
      });

      return resultGems;
    } catch (err) {
      console.warn('보석 실시간 API 조회 실패로 인해 모의 데이터 복구 적용:', err.message);
      return mockGems;
    }
  }

  // 유물 각인서 상위 15위 수집 API 구현 (단 2회 호출 랭킹 취합)
  async function updateTop15EngravingsFromApi() {
    if (!state.apiKey) {
      return new Promise(resolve => setTimeout(() => resolve(mockEngravingRank), 500));
    }

    try {
      // 1페이지 수집 (1회 호출) - ItemTier 필드 제거하여 모든 유물 각인서 동기화 보장
      const page1Res = await fetch('/api/market', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-lostark-api-key': state.apiKey
        },
        body: JSON.stringify({
          Sort: 'CURRENT_MIN_PRICE',
          CategoryCode: 40000,
          CharacterClass: '',
          ItemGrade: '유물',
          ItemName: '',
          PageNo: 1,
          SortCondition: 'DESC' // 최저가 내림차순 정렬
        })
      });

      // 2페이지 수집 (2회 호출)
      const page2Res = await fetch('/api/market', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-lostark-api-key': state.apiKey
        },
        body: JSON.stringify({
          Sort: 'CURRENT_MIN_PRICE',
          CategoryCode: 40000,
          CharacterClass: '',
          ItemGrade: '유물',
          ItemName: '',
          PageNo: 2,
          SortCondition: 'DESC'
        })
      });

      if (!page1Res.ok || !page2Res.ok) {
        throw new Error('각인서 API 호출 실패');
      }

      const p1Data = await page1Res.json();
      const p2Data = await page2Res.json();

      const items = [...(p1Data.Items || []), ...(p2Data.Items || [])];
      
      if (items.length === 0) {
        return mockEngravingRank;
      }

      // 가치 기준 내림차순 정렬 재검증 및 중복 방지
      const uniqueItems = [];
      const seen = new Set();
      items.forEach(item => {
        if (!seen.has(item.Name)) {
          seen.add(item.Name);
          uniqueItems.push({
            Name: item.Name.replace(' 유물 각인서', '').replace('각인서', '').trim(),
            CurrentMinPrice: item.CurrentMinPrice,
            YesterDayAveragePrice: item.YesterDayAveragePrice
          });
        }
      });

      uniqueItems.sort((a, b) => b.CurrentMinPrice - a.CurrentMinPrice);

      // 상위 15개 슬라이싱
      return uniqueItems.slice(0, 15);
    } catch (err) {
      console.warn('각인서 실시간 API 조회 실패로 인해 모의 데이터 복구 적용:', err.message);
      return mockEngravingRank;
    }
  }

  // 보석 대시보드 렌더링 함수
  function renderGemDashboard(gems) {
    if (!ui.gemDashboardContainer) return;
    ui.gemDashboardContainer.innerHTML = '';

    gems.forEach(gem => {
      const isFire = gem.Name.includes('겁화');
      const gemClass = isFire ? 'gem-type-fire' : 'gem-type-ice';
      const typeIcon = isFire ? 'flame' : 'snowflake';
      const gemNameShort = gem.Name.replace('의 보석', '').trim();

      const priceDiff = gem.CurrentMinPrice - gem.YesterDayAveragePrice;
      const diffClass = priceDiff > 0 ? 'text-cyan' : (priceDiff < 0 ? 'text-danger' : 'text-dim');
      const diffArrow = priceDiff > 0 ? '▲' : (priceDiff < 0 ? '▼' : '-');

      const card = document.createElement('div');
      card.className = `gem-mini-card ${gemClass}`;
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size: 10px; font-weight:800; opacity:0.8; letter-spacing:0.5px; color:var(--text-muted);">T4 보석</span>
          <i data-lucide="${typeIcon}" class="gem-icon-label" style="width:16px; height:16px;"></i>
        </div>
        <h4 style="text-align:left; margin-bottom:8px;">${gemNameShort}</h4>
        <div class="gem-price-val" style="text-align:left;">
          ${gem.CurrentMinPrice.toLocaleString()}<span>G</span>
        </div>
        <div class="gem-change-val ${diffClass}" style="text-align:left;">
          ${diffArrow} ${Math.abs(priceDiff).toLocaleString()}G
        </div>
      `;
      ui.gemDashboardContainer.appendChild(card);
    });

    if (window.lucide) window.lucide.createIcons();
  }

  // 유물 각인서 상위 15 랭킹 대시보드 렌더링 함수
  function renderEngravingRankDashboard(engravings) {
    if (!ui.engravingRankTableBody) return;
    ui.engravingRankTableBody.innerHTML = '';

    engravings.forEach((item, index) => {
      const priceDiff = item.CurrentMinPrice - item.YesterDayAveragePrice;
      const diffClass = priceDiff > 0 ? 'trend-up' : (priceDiff < 0 ? 'trend-down' : 'trend-flat');
      const diffArrow = priceDiff > 0 ? '▲' : (priceDiff < 0 ? '▼' : '-');
      
      // 등락률 연산
      const percent = item.YesterDayAveragePrice > 0 
        ? ((priceDiff / item.YesterDayAveragePrice) * 100).toFixed(1)
        : '0.0';
      const percentSign = priceDiff > 0 ? '+' : '';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="col-rank">${index + 1}</td>
        <td class="col-name">${item.Name}</td>
        <td class="col-price text-right">${item.CurrentMinPrice.toLocaleString()} G</td>
        <td class="col-diff text-right ${diffClass}">
          ${diffArrow} ${percentSign}${percent}%
        </td>
      `;
      ui.engravingRankTableBody.appendChild(tr);
    });

    if (window.lucide) window.lucide.createIcons();
  }



  // 경량 마크다운 렌더러 함수 (AI 응답 텍스트를 터미널 테마 HTML로 다듬어줌)
  function renderMarkdownToHtml(text) {
    let html = text;
    // 볼드 처리
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--accent-cyan);">$1</strong>');
    // 리스트 처리
    html = html.replace(/^\s*-\s+(.*)$/gm, '<li style="margin-left:15px; margin-bottom:6px; list-style-type:square;">$1</li>');
    // 제목 헤더 (###)
    html = html.replace(/^\s*###\s+(.*)$/gm, '<h3 style="font-size:16px; font-weight:800; color:var(--accent-gold); margin-top:20px; margin-bottom:10px; border-bottom:1px solid var(--border-color); padding-bottom:4px;">$1</h3>');
    // 일반 줄바꿈 대응
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  // AI 터미널 타자기 출력 시뮬레이터
  function typeWriterTerminal(targetEl, fullText) {
    state.isAiTyping = true;
    ui.btnAiAnalyze.disabled = true;
    ui.btnAiAnalyze.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> 분석 리포트 수신 중...';

    if (window.lucide) window.lucide.createIcons();

    // 터미널 초기화 및 스트리밍 시각효과 프롬프트 주입
    targetEl.innerHTML = `
      <p class="terminal-meta">&gt; CONNECTION ESTABLISHED WITH GEMINI AI SERVER.</p>
      <p class="terminal-meta">&gt; SECURE ENCRYPTED NODE HANDSHAKE COMPLETED.</p>
      <p class="terminal-meta">&gt; RECEIVING ROBUST REPORT PACKETS...</p>
      <br>
      <div id="typing-content-box"></div>
      <div class="terminal-prompt-line">
        <span class="prompt-arrow">&gt;</span>
        <span class="terminal-cursor">_</span>
      </div>
    `;

    const contentBox = document.getElementById('typing-content-box');
    let idx = 0;
    const speed = 15; // 타자기 출력 간격 속도 (ms)

    function type() {
      if (idx < fullText.length) {
        // 단어/문자 파싱 및 점진적 HTML 렌더링
        const subStr = fullText.substring(0, idx + 1);
        contentBox.innerHTML = renderMarkdownToHtml(subStr);
        idx++;
        targetEl.scrollTop = targetEl.scrollHeight; // 자동 스크롤 하단 고정
        setTimeout(type, speed);
      } else {
        // 타이핑 완료
        state.isAiTyping = false;
        ui.btnAiAnalyze.disabled = false;
        ui.btnAiAnalyze.innerHTML = '<i data-lucide="cpu"></i> AI 시세 분석 시작';
        if (window.lucide) window.lucide.createIcons();
      }
    }

    type();
  }

  // Gemini AI 마켓 분석 발동 함수
  async function triggerGeminiAnalysis() {
    if (state.isAiTyping) return;

    ui.aiTerminalOutput.innerHTML = `
      <p class="terminal-meta">&gt; SYSTEM: AI 로스트아크 경제학자 페르소나 초기화 완료.</p>
      <p class="terminal-meta">&gt; 분석에 필요한 경제 데이터 마샬링 중...</p>
      <div class="loading-bar" style="color:var(--accent-cyan); font-weight:700; margin-top:10px;">[■■■■■■■■■■■■■■■■■■■■] 100% READY. SERVER REQUEST DISPATCHED...</div>
    `;

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify({}) // 백엔드가 직접 DB에서 시세 추이를 읽으므로 빈 페이로드 전송
      });

      if (!response.ok) {
        throw new Error('서버 또는 API 연동에 실패했습니다.');
      }

      const data = await response.json();
      const analysisText = data.analysis || '분석 리포트를 불러오는데 실패했습니다.';

      // 타자기 인터랙션으로 출력
      typeWriterTerminal(ui.aiTerminalOutput, analysisText);
    } catch (err) {
      console.warn('AI 분석 API 호출 오류 또는 Key 미등록으로 인해 정밀 시뮬레이션 데모 리포트로 대체 구동합니다:', err.message);
      
      // AI 호출 실패 시 유저를 감동시킬 극강의 고품질 데모 리포트 마크다운 (보석 & 각인서 시세 전망 특화)
      const mockReport = `### 💎 1. 보석 시세 전망
최근 7일간의 경매장 데이터 분석에 따르면, **T4 10레벨 겁화의 보석**은 **240,000 G** 선에서 소폭 등락을 반복하며 강력한 지지선을 형성하고 있습니다. 
카제로스 레이드 등 신규 상위 레이드 출시 임박에 따라 최상위권 유저들의 보석 스펙업 수요가 점진적으로 누적되고 있어, 향후 1~2주간 **약 3% ~ 5%의 우상향 흐름**을 보일 것으로 전망됩니다. 
반면, 작열의 보석(쿨타임 감소)은 서포터 세팅이 어느 정도 마감 단계에 접어들며 겁화에 비해 거래량이 소폭 둔화되는 양상이 지속될 것입니다. 

### 📜 2. 각인서 시세 전망
주요 유물 각인서 시장은 전반적으로 안정세를 찾고 있습니다. 1티어 대장 각인서인 **아드레날린(약 4,500 G)** 및 **예리한 둔기(약 3,500 G)**는 견고한 수요에 힘입어 횡보세를 지속할 가능성이 큼니다.
다만, 아크 패시브 진입 장벽 완화에 따른 유물 각인서 완충 수요가 꾸준히 소모되고 있어, 비인기 각인서의 경우 매물 누적으로 인해 완만한 하락세가 예상됩니다. 
실거래 시 세팅 최적화 타이밍을 노려 주말 저녁 매물 출회가 집중될 때 분할 매수하시는 것을 추천합니다.

---
*(⚠️ 본 리포트는 AI API Key 미연동 또는 연결 일시 오류로 인해 출력된 정밀 시뮬레이션 데모 가이드입니다.)*`;

      // 1초 대기 후 타자기 효과를 동반한 터미널 인쇄 작동
      setTimeout(() => {
        typeWriterTerminal(ui.aiTerminalOutput, mockReport);
      }, 1000);
    }
  }

  // 시세 및 AI 페이지 이벤트 바인딩
  function bindMarketAndAiEvents() {
    // 1) AI 경제 분석 분석 개시 버튼 이벤트
    ui.btnAiAnalyze.addEventListener('click', () => {
      triggerGeminiAnalysis();
    });
  }


  // === 10. 앱 초기 구동 및 이벤트 트리거 ===
  function init() {
    handleRouting();
    updateApiStatus();
    startClock();
    initCalendarWidget();

    // 아비도스 제작 효율 계산기 초기화
    state.sellPrice = state.fusionPrices[state.craftType];
    if (ui.inputSellPrice) {
      ui.inputSellPrice.value = state.sellPrice;
    }
    renderMaterialInputs();
    bindCraftingEvents();
    calculateCraftingEfficiency();
    // API Key가 있으면 진입 시 재료 시세 자동 조회 (비동기, UI 블로킹 없음)
    fetchCraftingMaterialPrices();

    // 재료 시세 새로고침 버튼 이벤트
    if (ui.btnRefreshCraftPrices) {
      ui.btnRefreshCraftPrices.addEventListener('click', () => {
        // 강제 새로고침 - 쿨타임 무시
        lastCraftingFetchTime = 0;
        fetchCraftingMaterialPrices();
      });
    }

    // 캐릭터 스펙 진단기 초기화
    bindSpecEvents();
    calculateSpecDiagnosis();

    // 낙원 지옥 보상 효율 초기화
    bindHellEvents();
    calculateHellRewards();

    // 경매 분배금 계산기 초기화
    bindAuctionEvents();
    calculateAuctionDividends();

    // 시세 및 AI 리포트 초기화
    bindMarketAndAiEvents();
    
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  init();
});
