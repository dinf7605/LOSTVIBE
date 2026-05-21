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
    sellPrice: 280,
    greatSuccessRate: 5,
    goldDiscount: 0,
    
    // 유저 입력 생활 시세 저장 객체 (100개 기준)
    materialPrices: {
      archaeology: { abidos: 65, oreha: 18, rare: 10, ancient: 0.15 },
      fishing: { abidos: 60, oreha: 16, rare: 9, ancient: 0.12 },
      hunting: { abidos: 58, oreha: 15, rare: 8.5, ancient: 0.11 }
    },

    // 기본 시세 (리셋용)
    defaultPrices: {
      archaeology: { abidos: 65, oreha: 18, rare: 10, ancient: 0.15 },
      fishing: { abidos: 60, oreha: 16, rare: 9, ancient: 0.12 },
      hunting: { abidos: 58, oreha: 15, rare: 8.5, ancient: 0.11 }
    },

    // 레시피 정보 (1회 제작=30개 기준 소모량)
    recipes: {
      normal: { baseGold: 300, energy: 288, req: { abidos: 16, oreha: 64, rare: 80, ancient: 80 } },
      superior: { baseGold: 350, energy: 360, req: { abidos: 24, oreha: 96, rare: 100, ancient: 100 } }
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

    // 낙원 지옥 보상 단계
    hellLevel: '1640',
    
    // 낙원 아이템 가격 참조 데이터 (실시간 시세 연동 및 환산용)
    hellPrices: {
      restorationLow: 1200,
      restorationMid: 2500,
      restorationHigh: 5500,
      resonanceLow: 400,
      resonanceMid: 800,
      resonanceHigh: 1800,
      gemLvl4: 3500,
      gemLvl5: 10500,
      gemLvl6: 31500
    },

    // 경매 분배금 계산기 상태값
    auction: {
      marketPrice: 10000,
      raidSize: 4
    },

    // AI 분석 타자기 상태
    isAiTyping: false
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
    txtEnergyFillTime: document.getElementById('txt-energy-fill-time'),

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

    // 낙원 지옥 보상 UI
    hellLevelButtons: document.querySelectorAll('#page-hell .tab-toggle button'),
    hellRewardsContainer: document.getElementById('hell-rewards-container'),
    txtBestRewardName: document.getElementById('txt-best-reward-name'),
    txtBestRewardGold: document.getElementById('txt-best-reward-gold'),

    // 경매 분배금 계산기 UI
    inputAuctionPrice: document.getElementById('input-auction-price'),
    raidSizeButtons: document.querySelectorAll('.size-btn'),
    txtBidBreakEven: document.getElementById('txt-bid-break-even'),
    txtBidRecommend: document.getElementById('txt-bid-recommend'),
    txtAuctionBaseVal: document.getElementById('txt-auction-base-val'),
    txtAuctionTaxVal: document.getElementById('txt-auction-tax-val'),
    txtAuctionDividend: document.getElementById('txt-auction-dividend'),

    // 시세 검색 & AI 분석 UI
    inputMarketSearch: document.getElementById('input-market-search'),
    btnMarketSearch: document.getElementById('btn-market-search'),
    presetTags: document.querySelectorAll('.preset-tag'),
    marketSearchResults: document.getElementById('market-search-results'),
    btnAiAnalyze: document.getElementById('btn-ai-analyze'),
    aiTerminalOutput: document.getElementById('ai-terminal-output')
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

  function renderMaterialInputs() {
    const currentPrices = state.materialPrices[state.selectedSkill];
    ui.matInputsContainer.innerHTML = '';

    const labelMap = {
      archaeology: { abidos: '아비도스 유물', oreha: '오레하 유물', rare: '희귀한 유물', ancient: '고대 유물' },
      fishing: { abidos: '아비도스 대검', oreha: '오레하 낚시 부산물', rare: '두툼한 생선', ancient: '자연산 생선' },
      hunting: { abidos: '아비도스 대검', oreha: '오레하 수렵 부산물', rare: '다듬은 고기', ancient: '생고기' }
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
    const recipe = state.recipes[state.craftType];
    const prices = state.materialPrices[state.selectedSkill];

    const matCost = (
      (recipe.req.abidos / 100) * prices.abidos +
      (recipe.req.oreha / 100) * prices.oreha +
      (recipe.req.rare / 100) * prices.rare +
      (recipe.req.ancient / 100) * prices.ancient
    );

    const discountedGoldCost = recipe.baseGold * (1 - state.goldDiscount / 100);
    const totalCost = matCost + discountedGoldCost;

    const baseRevenue = state.sellPrice * 0.95;
    const bonusRevenue = baseRevenue * (state.greatSuccessRate / 100);
    const totalRevenue = baseRevenue + bonusRevenue;
    const netProfit = totalRevenue - totalCost;

    ui.detailMatCost.textContent = `${matCost.toFixed(1)} G`;
    ui.detailGoldCost.textContent = `${discountedGoldCost.toFixed(0)} G`;
    ui.detailTotalCost.textContent = `${totalCost.toFixed(1)} G`;
    ui.detailRevenue.textContent = `${baseRevenue.toFixed(1)} G`;
    ui.detailBonus.textContent = `+${bonusRevenue.toFixed(1)} G`;

    const netProfitStr = (netProfit >= 0 ? '+' : '') + netProfit.toFixed(1);
    ui.netProfit.textContent = netProfitStr;

    const skillLabel = state.selectedSkill === 'archaeology' ? '고고학' : (state.selectedSkill === 'fishing' ? '낚시' : '수렵');
    const typeLabel = state.craftType === 'normal' ? '일반' : '상급';
    ui.calcTitle.textContent = `${skillLabel} 기반 ${typeLabel} 아비도스 효율`;

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

    calculateStrongholdTimer();
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
    } else {
      const neededEnergy = maxEnergy - currentEnergy;
      const totalMinutes = neededEnergy / 15;
      const hours = Math.floor(totalMinutes / 60);
      const minutes = Math.round(totalMinutes % 60);

      ui.txtEnergyFillTime.textContent = `${hours}시간 ${minutes}분 남음`;
      ui.txtEnergyFillTime.className = 'value text-cyan';
    }
  }

  function bindCraftingEvents() {
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

    ui.inputSellPrice.addEventListener('input', (e) => {
      state.sellPrice = parseFloat(e.target.value) || 0;
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
        renderMaterialInputs();
        calculateCraftingEfficiency();
      });
    });

    ui.btnResetPrices.addEventListener('click', () => {
      if (confirm('모든 생활 재료 시세를 기본값으로 리셋하시겠습니까?')) {
        state.materialPrices = JSON.parse(JSON.stringify(state.defaultPrices));
        renderMaterialInputs();
        calculateCraftingEfficiency();
      }
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

  function calculateHellRewards() {
    const prices = state.hellPrices;
    const level = state.hellLevel;
    let rewards = [];

    if (level === '1640') {
      const valA = (prices.restorationLow * 5) + (prices.resonanceLow * 15);
      const valB = prices.gemLvl4;
      const valC = 15000;

      rewards = [
        { name: '재련 보조재 패키지 (하급)', desc: `하급 복원석 5개 + 하급 공명석 15개`, gold: valA, icon: 'gem', type: 'material' },
        { name: '4티어 보석 보상', desc: `4티어 4레벨 청화/홍염 보석 1개`, gold: valB, icon: 'shield', type: 'gem' },
        { name: '순수 귀속 골드', desc: `즉시 획득 가능한 귀속 골드`, gold: valC, icon: 'coins', type: 'gold' }
      ];
    } else if (level === '1700') {
      const valA = (prices.restorationMid * 5) + (prices.resonanceMid * 15);
      const valB = prices.gemLvl5;
      const valC = 25000;

      rewards = [
        { name: '재련 보조재 패키지 (중급)', desc: `중급 복원석 5개 + 중급 공명석 15개`, gold: valA, icon: 'gem', type: 'material' },
        { name: '4티어 보석 보상', desc: `4티어 5레벨 청화/홍염 보석 1개`, gold: valB, icon: 'shield', type: 'gem' },
        { name: '순수 귀속 골드', desc: `즉시 획득 가능한 귀속 골드`, gold: valC, icon: 'coins', type: 'gold' }
      ];
    } else {
      const valA = (prices.restorationHigh * 5) + (prices.resonanceHigh * 15);
      const valB = prices.gemLvl6;
      const valC = 40000;

      rewards = [
        { name: '재련 보조재 패키지 (상급)', desc: `상급 복원석 5개 + 상급 공명석 15개`, gold: valA, icon: 'gem', type: 'material' },
        { name: '4티어 보석 보상', desc: `4티어 6레벨 청화/홍염 보석 1개`, gold: valB, icon: 'shield', type: 'gem' },
        { name: '순수 귀속 골드', desc: `즉시 획득 가능한 귀속 골드`, gold: valC, icon: 'coins', type: 'gold' }
      ];
    }

    rewards.sort((a, b) => b.gold - a.gold);

    ui.hellRewardsContainer.innerHTML = '';
    rewards.forEach((reward, index) => {
      const rankClass = index === 0 ? 'border-gold' : (index === 1 ? 'border-cyan' : '');
      const badgeText = index === 0 ? '👑 1위 BEST' : `${index + 1}위`;
      const badgeClass = index === 0 ? 'text-gold' : 'text-cyan';

      const card = document.createElement('div');
      card.className = `hell-reward-card ${rankClass}`;
      card.innerHTML = `
        <div class="card-inner-layout" style="display: flex; justify-content: space-between; align-items: center; width: 100%; padding: 20px; background: var(--bg-card); border-radius: var(--border-radius-md); border: 1px solid var(--border-color); margin-bottom: 15px;">
          <div>
            <span class="rank-badge ${badgeClass}" style="font-size: 11px; font-weight: 800; display: block; margin-bottom: 6px;">${badgeText}</span>
            <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 4px;">${reward.name}</h3>
            <p style="font-size: 12px; color: var(--text-muted);">${reward.desc}</p>
          </div>
          <div style="text-align: right;">
            <span style="font-family: 'Outfit', sans-serif; font-size: 18px; font-weight: 800; color: var(--text-white);">${reward.gold.toLocaleString()}</span>
            <span style="font-size: 12px; color: var(--accent-gold); font-weight: 700; margin-left: 2px;">G 상당</span>
          </div>
        </div>
      `;
      ui.hellRewardsContainer.appendChild(card);
    });

    const best = rewards[0];
    ui.txtBestRewardName.textContent = best.name;
    ui.txtBestRewardGold.textContent = best.gold.toLocaleString();
  }

  function bindHellEvents() {
    ui.hellLevelButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        ui.hellLevelButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.hellLevel = btn.getAttribute('data-level');
        calculateHellRewards();
      });
    });
  }


  // === 8. 레이드 경매 분배금 계산기 ===

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
    ui.inputAuctionPrice.addEventListener('input', (e) => {
      state.auction.marketPrice = parseFloat(e.target.value) || 0;
      calculateAuctionDividends();
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

  // 모의 거래소 시세 데이터베이스 (API 연동 실패 혹은 키가 없는 유저의 백업)
  const mockMarketDb = [
    { Name: '10레벨 겁화의 보석', CurrentMinPrice: 345000, YesterDayAveragePrice: 348000, Grade: '유물' },
    { Name: '10레벨 작열의 보석', CurrentMinPrice: 162000, YesterDayAveragePrice: 165000, Grade: '유물' },
    { Name: '9레벨 겁화의 보석', CurrentMinPrice: 115000, YesterDayAveragePrice: 114000, Grade: '유물' },
    { Name: '9레벨 작열의 보석', CurrentMinPrice: 54000, YesterDayAveragePrice: 54500, Grade: '유물' },
    { Name: '전설 각인서 선택 가방', CurrentMinPrice: 2400, YesterDayAveragePrice: 2380, Grade: '전설' },
    { Name: '아비도스 유물', CurrentMinPrice: 65, YesterDayAveragePrice: 66, Grade: '영웅' },
    { Name: '오레하 유물', CurrentMinPrice: 18, YesterDayAveragePrice: 18, Grade: '희귀' },
    { Name: '희귀한 유물', CurrentMinPrice: 10, YesterDayAveragePrice: 11, Grade: '일반' },
    { Name: '원한 전설 각인서', CurrentMinPrice: 3200, YesterDayAveragePrice: 3100, Grade: '전설' },
    { Name: '아드레날린 전설 각인서', CurrentMinPrice: 2900, YesterDayAveragePrice: 3000, Grade: '전설' }
  ];

  // 거래소 검색 렌더링 함수
  async function searchMarketItems(query) {
    ui.marketSearchResults.innerHTML = '<div class="loading-bar" style="text-align:center; padding:20px; color:var(--accent-cyan); font-weight:700;">거래소 데이터를 동기화 중...</div>';

    if (!state.apiKey) {
      // 로컬 모의 시세 검색 작동
      setTimeout(() => {
        const filtered = mockMarketDb.filter(x => x.Name.toLowerCase().includes(query.toLowerCase()));
        renderMarketResults(filtered);
      }, 500);
      return;
    }

    try {
      const response = await fetch('/api/market', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-lostark-api-key': state.apiKey
        },
        body: JSON.stringify({
          Sort: 'CURRENT_MIN_PRICE',
          CategoryCode: 0,
          CharacterClass: '',
          ItemTier: 4,
          ItemGrade: '',
          ItemName: query,
          PageNo: 1,
          SortCondition: 'ASC'
        })
      });

      if (!response.ok) {
        throw new Error('API Key가 만료되었거나 검색 오류 발생.');
      }

      const data = await response.json();
      const items = data.Items || [];
      renderMarketResults(items);
    } catch (err) {
      console.warn('API 검색 오류로 인해 모의 데이터 백업 구동:', err.message);
      const filtered = mockMarketDb.filter(x => x.Name.toLowerCase().includes(query.toLowerCase()));
      renderMarketResults(filtered);
    }
  }

  // 검색 결과 목록 UI 바인딩
  function renderMarketResults(items) {
    ui.marketSearchResults.innerHTML = '';

    if (items.length === 0) {
      ui.marketSearchResults.innerHTML = '<div class="no-results">검색어와 부합하는 시즌 3 핵심 거래소 아이템이 없습니다.</div>';
      return;
    }

    items.forEach(item => {
      const priceDiff = item.CurrentMinPrice - item.YesterDayAveragePrice;
      const diffClass = priceDiff > 0 ? 'text-cyan' : (priceDiff < 0 ? 'text-danger' : 'text-dim');
      const diffArrow = priceDiff > 0 ? '▲' : (priceDiff < 0 ? '▼' : '-');

      const card = document.createElement('div');
      card.className = 'market-item-card';
      card.style.cssText = 'display:flex; justify-content:space-between; align-items:center; background:hsla(224, 25%, 5%, 0.3); border:1px solid var(--border-color); border-radius:var(--border-radius-md); padding:16px; margin-bottom:12px;';
      card.innerHTML = `
        <div>
          <h4 style="font-size:14px; font-weight:700; color:var(--text-white);">${item.Name}</h4>
          <span style="font-size:11px; color:var(--text-muted);">전일 평균가: ${item.YesterDayAveragePrice.toLocaleString()} G</span>
        </div>
        <div style="text-align:right;">
          <div style="font-family:\'Outfit\', sans-serif; font-size:16px; font-weight:800; color:var(--text-white);">${item.CurrentMinPrice.toLocaleString()}<span style="font-size:11px; color:var(--accent-gold); font-weight:700; margin-left:3px;">G</span></div>
          <span class="${diffClass}" style="font-size:11px; font-weight:700;">${diffArrow} ${Math.abs(priceDiff).toLocaleString()} G</span>
        </div>
      `;
      ui.marketSearchResults.appendChild(card);
    });
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

    // 현재 계산 완료된 캐릭터 전투 스탯 기댓값 변수 매핑
    const critFromStat = state.spec.crit * 0.0357;
    const calculatedCrit = critFromStat + state.spec.adr + state.spec.synergy + state.spec.bracelet + state.spec.manualCrit;
    
    const speedFromSwift = state.spec.swift * 0.01717;
    const finalAtk = 100 + speedFromSwift + state.spec.yearning + (state.spec.feast ? 5 : 0) + (state.spec.massIncrease ? -10 : 0) + state.spec.manualSpeed;
    const finalMove = 100 + speedFromSwift + state.spec.yearning + (state.spec.feast ? 5 : 0) + state.spec.manualSpeed;

    const payload = {
      marketData: {
        selectedSkill: state.selectedSkill,
        craftType: state.craftType,
        sellPrice: state.sellPrice,
        materialPrices: state.materialPrices[state.selectedSkill]
      },
      specData: {
        crit: state.spec.crit,
        swift: state.spec.swift,
        calculatedCrit: calculatedCrit,
        calculatedAtkSpeed: finalAtk,
        calculatedMoveSpeed: finalMove,
        mungaLevel: state.spec.mungaLevel
      }
    };

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('서버 또는 API 연동에 실패했습니다.');
      }

      const data = await response.json();
      const analysisText = data.analysis || '분석 리포트를 불러오는데 실패했습니다.';

      // 타자기 인터랙션으로 출력
      typeWriterTerminal(ui.aiTerminalOutput, analysisText);
    } catch (err) {
      console.error(err);
      ui.aiTerminalOutput.innerHTML = `
        <p class="terminal-meta" style="color:var(--danger-red);">&gt; ERROR: AI 서버 연동에 실패했습니다.</p>
        <p class="terminal-meta" style="color:var(--danger-red);">&gt; 원인: ${err.message}</p>
        <p class="terminal-meta">&gt; 대책: 백엔드 서버의 .env에 GEMINI_API_KEY가 올바르게 세팅되었는지 확인하세요.</p>
      `;
    }
  }

  // 시세 및 AI 페이지 이벤트 바인딩
  function bindMarketAndAiEvents() {
    // 1) 시세 검색 이벤트
    ui.btnMarketSearch.addEventListener('click', () => {
      const query = ui.inputMarketSearch.value.trim();
      if (query) {
        searchMarketItems(query);
      }
    });

    ui.inputMarketSearch.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const query = ui.inputMarketSearch.value.trim();
        if (query) {
          searchMarketItems(query);
        }
      }
    });

    // 2) 프리셋 퀵 태그 버튼 이벤트
    ui.presetTags.forEach(tag => {
      tag.addEventListener('click', () => {
        const query = tag.getAttribute('data-query');
        ui.inputMarketSearch.value = query;
        searchMarketItems(query);
      });
    });

    // 3) AI 경제 분석 분석 개시 버튼 이벤트
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
    renderMaterialInputs();
    bindCraftingEvents();
    calculateCraftingEfficiency();

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
