/**
 * LOSTVIBE - 프론트엔드 메인 컨트롤러 (app.js)
 * SPA 라우팅, API Key 설정, 실시간 캘린더, 아비도스 제작 계산기 및 영지 타이머 연동
 */

document.addEventListener('DOMContentLoaded', () => {
  // === 1. DOM 요소 및 상태 정의 ===
  const state = {
    apiKey: localStorage.getItem('lostark-api-key') || '',
    currentPage: 'home',
    calendarData: null,
    timerIntervalId: null,

    // 제작 효율 계산기 상태값
    craftType: 'normal', // 'normal' (일반) 또는 'superior' (상급)
    selectedSkill: 'archaeology', // 'archaeology', 'fishing', 'hunting'
    sellPrice: 280, // 융화재료 30개 기준 시세
    greatSuccessRate: 5, // 대성공 확률 (%)
    goldDiscount: 0, // 골드 비용 할인 (%)
    
    // 유저 입력 생활 시세 저장 객체 (100개 기준)
    materialPrices: {
      archaeology: {
        abidos: 65,    // 아비도스 유물
        oreha: 18,     // 오레하 유물
        rare: 10,      // 희귀한 유물
        ancient: 0.15  // 고대 유물
      },
      fishing: {
        abidos: 60,    // 아비도스 대검
        oreha: 16,     // 오레하 낚시 부산물
        rare: 9,       // 두툼한 생선
        ancient: 0.12  // 자연산 생선
      },
      hunting: {
        abidos: 58,    // 아비도스 대검
        oreha: 15,     // 오레하 수렵 부산물
        rare: 8.5,     // 다듬은 고기
        ancient: 0.11  // 생고기
      }
    },

    // 기본 시세 (리셋용)
    defaultPrices: {
      archaeology: { abidos: 65, oreha: 18, rare: 10, ancient: 0.15 },
      fishing: { abidos: 60, oreha: 16, rare: 9, ancient: 0.12 },
      hunting: { abidos: 58, oreha: 15, rare: 8.5, ancient: 0.11 }
    },

    // 레시피 정보 (1회 제작=30개 기준 소모량)
    recipes: {
      normal: {
        baseGold: 300,
        energy: 288,
        req: { abidos: 16, oreha: 64, rare: 80, ancient: 80 }
      },
      superior: {
        baseGold: 350,
        energy: 360,
        req: { abidos: 24, oreha: 96, rare: 100, ancient: 100 }
      }
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
    btnResetPrices: document.getElementById('btn-reset-prices'),

    // 계산기 결과창
    profitBadge: document.getElementById('txt-profit-badge'),
    calcTitle: document.getElementById('txt-calc-title'),
    netProfit: document.getElementById('txt-net-profit'),
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
    txtEnergyFillTime: document.getElementById('txt-energy-fill-time')
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

  // 1) 생활 재료 입력 폼 동적 렌더링
  function renderMaterialInputs() {
    const currentPrices = state.materialPrices[state.selectedSkill];
    ui.matInputsContainer.innerHTML = '';

    const labelMap = {
      archaeology: {
        abidos: '아비도스 유물',
        oreha: '오레하 유물',
        rare: '희귀한 유물',
        ancient: '고대 유물'
      },
      fishing: {
        abidos: '아비도스 대검',
        oreha: '오레하 낚시 부산물',
        rare: '두툼한 생선',
        ancient: '자연산 생선'
      },
      hunting: {
        abidos: '아비도스 대검',
        oreha: '오레하 수렵 부산물',
        rare: '다듬은 고기',
        ancient: '생고기'
      }
    };

    const keys = ['abidos', 'oreha', 'rare', 'ancient'];
    const currentLabels = labelMap[state.selectedSkill];

    keys.forEach(key => {
      const price = currentPrices[key];
      const label = currentLabels[key];

      const row = document.createElement('div');
      row.className = 'input-row';
      row.innerHTML = `
        <label for="mat-input-${key}">${label} 시세 (100개당)</label>
        <input type="number" id="mat-input-${key}" data-key="${key}" value="${price}" step="0.01" min="0">
      `;

      // 실시간 입력값 상태 동기화 및 즉시 재연산
      const input = row.querySelector('input');
      input.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) || 0;
        state.materialPrices[state.selectedSkill][key] = val;
        calculateCraftingEfficiency();
      });

      ui.matInputsContainer.appendChild(row);
    });
  }

  // 2) 아비도스 제작 효율 정밀 연산 및 UI 갱신
  function calculateCraftingEfficiency() {
    const recipe = state.recipes[state.craftType];
    const prices = state.materialPrices[state.selectedSkill];

    // 원료비 계산 (100개당 시세 기준 수량 반영)
    const matCost = (
      (recipe.req.abidos / 100) * prices.abidos +
      (recipe.req.oreha / 100) * prices.oreha +
      (recipe.req.rare / 100) * prices.rare +
      (recipe.req.ancient / 100) * prices.ancient
    );

    // 영지 제작 골드 수수료 (할인율 반영)
    const discountedGoldCost = recipe.baseGold * (1 - state.goldDiscount / 100);
    const totalCost = matCost + discountedGoldCost;

    // 기대 판매 매출 계산 (거래소 5% 수수료 공제)
    const baseRevenue = state.sellPrice * 0.95;
    // 대성공 기대 보너스 수익 (대성공 시 기본 생산물 100% 추가 획득)
    const bonusRevenue = baseRevenue * (state.greatSuccessRate / 100);
    const totalRevenue = baseRevenue + bonusRevenue;

    // 기대 순이익
    const netProfit = totalRevenue - totalCost;

    // UI 출력 갱신
    ui.detailMatCost.textContent = `${matCost.toFixed(1)} G`;
    ui.detailGoldCost.textContent = `${discountedGoldCost.toFixed(0)} G`;
    ui.detailTotalCost.textContent = `${totalCost.toFixed(1)} G`;
    ui.detailRevenue.textContent = `${baseRevenue.toFixed(1)} G`;
    ui.detailBonus.textContent = `+${bonusRevenue.toFixed(1)} G`;

    // 메인 순이익 뱃지 갱신
    const netProfitStr = (netProfit >= 0 ? '+' : '') + netProfit.toFixed(1);
    ui.netProfit.textContent = netProfitStr;

    const skillLabel = state.selectedSkill === 'archaeology' ? '고고학' : (state.selectedSkill === 'fishing' ? '낚시' : '수렵');
    const typeLabel = state.craftType === 'normal' ? '일반' : '상급';
    ui.calcTitle.textContent = `${skillLabel} 기반 ${typeLabel} 아비도스 효율`;

    // 흑자/적자에 따른 비주얼 테마 동적 전환
    if (netProfit >= 0) {
      ui.netProfit.className = 'text-green';
      ui.profitBadge.textContent = '수익 흑자';
      ui.profitBadge.style.background = 'hsla(145, 90%, 45%, 0.15)';
      ui.profitBadge.style.color = 'var(--success-green)';
      ui.profitBadge.style.borderColor = 'var(--success-green-glow)';
    } else {
      ui.netProfit.className = 'text-danger';
      ui.profitBadge.textContent = '수익 적자';
      ui.profitBadge.style.background = 'hsla(355, 90%, 52%, 0.15)';
      ui.profitBadge.style.color = 'var(--danger-red)';
      ui.profitBadge.style.borderColor = 'var(--danger-red-glow)';
    }

    // 영지 타이머 상태값 연산도 함께 호출
    calculateStrongholdTimer();
  }

  // 3) 영지 활동력 및 충전 타이머 연산
  function calculateStrongholdTimer() {
    const currentEnergy = parseInt(ui.inputCurrentEnergy.value) || 0;
    const maxEnergy = parseInt(ui.inputMaxEnergy.value) || 15000;
    const craftCount = parseInt(ui.inputCraftCount.value) || 1;

    const recipe = state.recipes[state.craftType];

    // 소모 총 활동력
    const totalRequiredEnergy = recipe.energy * craftCount;
    ui.txtRequiredEnergy.textContent = totalRequiredEnergy.toLocaleString();

    // 완료 총 소요시간 (1회당 1시간)
    ui.txtRequiredTime.textContent = `${craftCount}시간 00분`;

    // 활동력 완충 타이머 (10분당 150회복, 즉 분당 15회복)
    if (currentEnergy >= maxEnergy) {
      ui.txtEnergyFillTime.textContent = '이미 완전히 충전되었습니다.';
      ui.txtEnergyFillTime.className = 'value text-green';
    } else {
      const neededEnergy = maxEnergy - currentEnergy;
      const totalMinutes = neededEnergy / 15;
      const hours = Math.floor(totalMinutes / 60);
      const minutes = Math.round(totalMinutes % 60);

      ui.txtEnergyFillTime.textContent = `${hours}시간 ${minutes}분 남음`;
      ui.txtEnergyFillTime.className = 'value text-cyan';
    }
  }

  // 4) 제작 계산기 이벤트 바인딩
  function bindCraftingEvents() {
    // 일반 / 상급 전환 토글
    ui.btnCraftNormal.addEventListener('click', () => {
      state.craftType = 'normal';
      ui.btnCraftNormal.classList.add('active');
      ui.btnCraftSuperior.classList.remove('active');
      calculateCraftingEfficiency();
    });

    ui.btnCraftSuperior.addEventListener('click', () => {
      state.craftType = 'superior';
      ui.btnCraftSuperior.classList.add('active');
      ui.btnCraftNormal.classList.remove('active');
      calculateCraftingEfficiency();
    });

    // 판매가 변경
    ui.inputSellPrice.addEventListener('input', (e) => {
      state.sellPrice = parseFloat(e.target.value) || 0;
      calculateCraftingEfficiency();
    });

    // 대성공 슬라이더
    ui.sliderGreatSuccess.addEventListener('input', (e) => {
      const val = parseInt(e.target.value) || 0;
      state.greatSuccessRate = val;
      ui.valGreatSuccess.textContent = `${val}%`;
      calculateCraftingEfficiency();
    });

    // 제작 수수료 할인 슬라이더
    ui.sliderGoldDiscount.addEventListener('input', (e) => {
      const val = parseInt(e.target.value) || 0;
      state.goldDiscount = val;
      ui.valGoldDiscount.textContent = `${val}%`;
      calculateCraftingEfficiency();
    });

    // 생활 분야 탭 전환
    ui.skillTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        ui.skillTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.selectedSkill = tab.getAttribute('data-skill');
        renderMaterialInputs();
        calculateCraftingEfficiency();
      });
    });

    // 시세 리셋 버튼
    ui.btnResetPrices.addEventListener('click', () => {
      if (confirm('모든 생활 재료 시세를 기본값으로 리셋하시겠습니까?')) {
        // 깊은 복사로 리셋
        state.materialPrices = JSON.parse(JSON.stringify(state.defaultPrices));
        renderMaterialInputs();
        calculateCraftingEfficiency();
      }
    });

    // 영지 타이머 실시간 인풋 감지
    [ui.inputCurrentEnergy, ui.inputMaxEnergy, ui.inputCraftCount].forEach(input => {
      input.addEventListener('input', calculateStrongholdTimer);
    });
  }


  // === 6. 앱 초기 구동 및 이벤트 트리거 ===
  function init() {
    handleRouting();
    updateApiStatus();
    startClock();
    initCalendarWidget();

    // 아비도스 제작 효율 계산기 초기화
    renderMaterialInputs();
    bindCraftingEvents();
    calculateCraftingEfficiency();
    
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  init();
});
