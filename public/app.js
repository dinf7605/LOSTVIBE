/**
 * LOSTVIBE - 프론트엔드 메인 컨트롤러 (app.js)
 * SPA 라우팅, API Key 설정, 실시간 캘린더, 아비도스 제작 계산기, 영지 타이머, 스펙 효율 진단기 연동
 */

document.addEventListener('DOMContentLoaded', () => {
  // === 1. DOM 요소 및 상태 정의 ===
  const state = {
    apiKey: localStorage.getItem('lostark-api-key') || '',
    currentPage: 'home',
    calendarData: null,
    timerIntervalId: null,

    // 아비도스 제작 효율 계산기 상태값
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
      adr: 15,           // 아드레날린 각인 치적 %
      synergy: 10,       // 시너지 치적 %
      bracelet: 3,       // 팔찌 치적 %
      manualCrit: 0,     // 수동 추가 치적 %
      yearning: 12,      // 갈망 버프 속도 %
      feast: true,       // 만찬 속도 5% 적용 여부
      massIncrease: false, // 질증 속도 -10% 적용 여부
      manualSpeed: 0,    // 수동 추가 공이속 %
      critDamage: 200,   // 기본 치명타 피해량 %
      mungaLevel: 2      // 뭉툭한 가시 노드 레벨
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
    txtSonicDesc: document.getElementById('txt-sonic-desc')
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

    // 1) 치명타 적중률 (치적) 정밀 계산
    // 치명 스탯 환산 (시즌 3 공식: 1 치명 ≈ 0.0357%)
    const critFromStat = spec.crit * 0.0357;
    // 종합 치적 합산
    const calcCrit = critFromStat + spec.adr + spec.synergy + spec.bracelet + spec.manualCrit;
    ui.txtCalcCrit.textContent = `${calcCrit.toFixed(2)}%`;

    // 뭉가 미채용 시/채용 시 최종 치적 (뭉가는 실질 치적을 100%로 캡핑)
    const finalCrit = Math.min(100, calcCrit);
    ui.txtFinalCrit.textContent = `${finalCrit.toFixed(2)}%`;


    // 2) 뭉툭한 가시 (Blunt Thorn) 진단
    const excessCrit = Math.max(0, calcCrit - 100); // 100%를 초과한 치적
    let mungaConvertRate = 0;
    let maxMungaLimit = 75.0; // 2레벨 기준 상한

    if (spec.mungaLevel === 1) {
      mungaConvertRate = excessCrit * 1.25;
      maxMungaLimit = 52.5;
    } else {
      mungaConvertRate = excessCrit * 1.5;
      maxMungaLimit = 75.0;
    }

    // 상한 캡 적용
    const finalMungaDamage = Math.min(maxMungaLimit, mungaConvertRate);

    // 게이지 바 충전율 반영
    const mungaFillPercent = Math.min(100, (finalMungaDamage / maxMungaLimit) * 100);
    ui.barMungaFill.style.width = `${mungaFillPercent}%`;
    ui.txtMungaConvertRate.textContent = `${finalMungaDamage.toFixed(2)}% / ${maxMungaLimit.toFixed(1)}%`;

    // 일반 딜 기댓값 비교 공식 연산
    // E_normal = 1 + C_normal * (치피 - 1)
    const critDmgMultiplier = (spec.critDamage / 100) - 1;
    const E_normal = 1 + (finalCrit / 100) * critDmgMultiplier;
    // E_munga = E_normal * (1 + 진피증/100)
    const E_munga = E_normal * (1 + finalMungaDamage / 100);
    const mungaEfficiency = (E_munga / E_normal - 1) * 100;

    ui.txtMungaEfficiency.textContent = `+${mungaEfficiency.toFixed(2)}%`;

    // 뭉툭한 가시 진단 피드백 갱신
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


    // 3) 음속 돌파 (Sonic Breakthrough) 진단
    // 신속 스탯 환산 (시즌 3 공식: 1 신속 ≈ 0.01717%)
    const speedFromSwift = spec.swift * 0.01717;

    // 만찬, 갈망, 질증 디버프 여부 종합
    const feastBuff = spec.feast ? 5.0 : 0.0;
    const massPenalty = spec.massIncrease ? -10.0 : 0.0;

    // 최종 공속 및 이속 합산 (기본 속도 100% 시작)
    const finalAtkSpeed = 100 + speedFromSwift + spec.yearning + feastBuff + massPenalty + spec.manualSpeed;
    const finalMoveSpeed = 100 + speedFromSwift + spec.yearning + feastBuff + spec.manualSpeed;

    // 화면 표시
    ui.txtFinalAtkSpeed.textContent = `${finalAtkSpeed.toFixed(2)}%`;
    ui.txtFinalMoveSpeed.textContent = `${finalMoveSpeed.toFixed(2)}%`;

    // 140% 상한 초과분 계산
    const excessAtk = Math.max(0, finalAtkSpeed - 140);
    const excessMove = Math.max(0, finalMoveSpeed - 140);
    const excessSum = excessAtk + excessMove;

    // 음속 돌파 진피증 획득량 = 초과분 합산 * 0.3
    const sonicDamage = excessSum * 0.3;
    ui.txtSonicDamage.textContent = `+${sonicDamage.toFixed(2)}%`;

    // 게이지바 타겟은 풀 효율 기준 속도 합산 (상한인 140% 기준 풀초과 306.67% 목표)
    const actualSum = finalAtkSpeed + finalMoveSpeed;
    const maxTargetSum = 306.67;
    ui.txtSonicSum.textContent = `${actualSum.toFixed(1)}% / ${maxTargetSum.toFixed(1)}%`;
    const sonicFillPercent = Math.min(100, (actualSum / maxTargetSum) * 100);
    ui.barSonicFill.style.width = `${sonicFillPercent}%`;

    // 음속 돌파 피드백 업데이트
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
        ui.txtSonicDesc.innerHTML = `140% 상 상한 초과분 속도가 유기적으로 환산되어 <strong class="text-cyan">진화 피해 증가 +${sonicDamage.toFixed(2)}%</strong>를 안전하게 확보하고 있습니다. 신속 딜러로서 매우 훌륭한 속도 최적화 수준입니다.`;
      }
    }
  }

  // 캐릭터 스펙 관련 실시간 이벤트 바인딩
  function bindSpecEvents() {
    // 특성 스탯 인풋 이벤트
    ui.inputCritStat.addEventListener('input', (e) => {
      state.spec.crit = parseInt(e.target.value) || 0;
      calculateSpecDiagnosis();
    });

    ui.inputSwiftStat.addEventListener('input', (e) => {
      state.spec.swift = parseInt(e.target.value) || 0;
      calculateSpecDiagnosis();
    });

    // 치적 보조 설정 이벤트
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

    // 공이속 보조 설정 이벤트
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

    // 뭉가 상세 연산 설정 이벤트
    ui.inputCritDamage.addEventListener('input', (e) => {
      state.spec.critDamage = parseFloat(e.target.value) || 200;
      calculateSpecDiagnosis();
    });

    ui.selectMungaLevel.addEventListener('change', (e) => {
      state.spec.mungaLevel = parseInt(e.target.value) || 2;
      calculateSpecDiagnosis();
    });
  }


  // === 7. 앱 초기 구동 및 이벤트 트리거 ===
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
    
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  init();
});
