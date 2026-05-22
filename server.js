import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

// Load environmental variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase 클라우드 데이터베이스 초기화
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabase = null;

if (supabaseUrl && supabaseKey && supabaseUrl !== 'your_supabase_url_here') {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('🔌 [Supabase] 클라우드 PostgreSQL 데이터베이스 커넥션 구축 성공!');
  } catch (err) {
    console.error('🔌 [Supabase] 연결 실패:', err.message);
  }
} else {
  console.warn('⚠️ [Supabase] URL/Key 설정이 누락되어 로컬 파일 DB 모드로 동작합니다.');
}

// --- 데일리 시세 기록용 로컬 파일 DB 설정 ---
const HISTORY_FILE_PATH = path.join(__dirname, 'market_history.json');

// 시세 히스토리 DB 파일 초기화 및 과거 7일 시뮬레이션 웜업 데이터 주입 (최초 구동 시)
const initMarketHistoryDb = async () => {
  try {
    if (existsSync(HISTORY_FILE_PATH)) {
      return;
    }
    console.log('📦 [DB] market_history.json 파일이 존재하지 않아 신규 생성을 시도합니다.');
    
    const historyWarmup = {};
    const today = new Date();
    
    // 현실감 넘치는 트렌드 변화율을 띤 7일간의 기초 시세 세팅
    const gemPricesBase = {
      '10레벨 겁화의 보석': 240000,
      '10레벨 작열의 보석': 160000,
      '9레벨 겁화의 보석': 80000,
      '9레벨 작열의 보석': 53000,
      '8레벨 겁화의 보석': 26000,
      '8레벨 작열의 보석': 17500,
      '7레벨 겁화의 보석': 8800,
      '7레벨 작열의 보석': 5800
    };

    const engravingPricesBase = {
      '아드레날린': 4500,
      '예리한 둔기': 3500,
      '돌격대장': 2800,
      '타격 대장': 2200,
      '기습의 대가': 1800,
      '저주받은 인형': 1600,
      '결투의 대가': 1500,
      '질량 증가': 800
    };

    for (let i = 7; i >= 1; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      const factor = 1 + (Math.sin(i) * 0.02) + (i * -0.003); // 생생한 시세 굴곡 부여
      
      const gems = Object.entries(gemPricesBase).map(([Name, price]) => ({
        Name,
        CurrentMinPrice: Math.round(price * factor)
      }));

      const engravings = Object.entries(engravingPricesBase).map(([Name, price]) => ({
        Name,
        CurrentMinPrice: Math.round(price * (factor + 0.01))
      }));

      historyWarmup[dateString] = { gems, engravings };
    }

    await fs.writeFile(HISTORY_FILE_PATH, JSON.stringify(historyWarmup, null, 2), 'utf-8');
    console.log('📦 [DB] market_history.json 과거 7일 시뮬레이션 데이터 구축 완료.');
  } catch (err) {
    console.error('📦 [DB] market_history.json 초기화 에러:', err.message);
  }
};

// 당일 DB 동기화 완료 여부를 추적하여 불필요한 중복 쓰기 I/O를 완벽 방어하는 인메모리 플래그
let lastSavedDate = null;

// 매일 수집된 시세를 로컬 파일 DB에 누적 기록 (최대 30일 보존) 및 Supabase에 영구 적재 (하이브리드)
const saveDailyMarketHistory = async (gems, engravings) => {
  if (!gems || !engravings || gems.length === 0 || engravings.length === 0) return;
  
  const todayStr = new Date().toISOString().split('T')[0];

  // 1) [하루 1회 최적화 필터] 오늘 이미 저장이 완료되었는지 1차 인메모리 체크
  if (lastSavedDate === todayStr) {
    console.log(`ℹ️ [DB 최적화] 오늘자(${todayStr}) 시세 DB 적재가 이미 완료되어 추가 쓰기를 건너뜁니다. (하루 1회 제한 정책)`);
    return;
  }

  // 2) [서버 재부팅 대비 필터] 서버가 중간에 켜진 경우, 로컬 파일 DB를 조회하여 오늘 데이터가 이미 있는지 검증
  try {
    const fileExists = existsSync(HISTORY_FILE_PATH);
    if (fileExists) {
      const fileData = await fs.readFile(HISTORY_FILE_PATH, 'utf-8');
      const history = JSON.parse(fileData);
      if (history[todayStr]) {
        lastSavedDate = todayStr; // 플래그 갱신
        console.log(`ℹ️ [DB 최적화] 파일 DB 조회 결과 오늘자(${todayStr}) 시세가 이미 저장되어 있으므로 추가 적재를 중단합니다.`);
        return;
      }
    }
  } catch (fileCheckErr) {
    console.warn('⚠️ [DB 최적화] 중복 기적재 체크 중 오류 발생 (계속 진행):', fileCheckErr.message);
  }

  // 3) Supabase PostgreSQL 연동 적재 진행 (하루에 딱 한 번만 도달)
  if (supabase) {
    try {
      const gemPayloads = gems.map(g => ({
        collected_date: todayStr,
        item_name: g.Name,
        min_price: g.CurrentMinPrice
      }));

      const engravingPayloads = engravings.map(e => ({
        collected_date: todayStr,
        item_name: e.Name,
        min_price: e.CurrentMinPrice
      }));

      const [gemRes, engravingRes] = await Promise.all([
        supabase.from('gem_prices_history').upsert(gemPayloads, { onConflict: 'collected_date,item_name' }),
        supabase.from('engraving_prices_history').upsert(engravingPayloads, { onConflict: 'collected_date,item_name' })
      ]);

      if (gemRes.error) {
        console.error('🔌 [Supabase] 보석 시세 저장 실패:', gemRes.error.message);
      } else {
        console.log(`🔌 [Supabase] 보석 시세 ${gemPayloads.length}건 클라우드 DB upsert 성공.`);
      }

      if (engravingRes.error) {
        console.error('🔌 [Supabase] 각인서 시세 저장 실패:', engravingRes.error.message);
      } else {
        console.log(`🔌 [Supabase] 각인서 시세 ${engravingPayloads.length}건 클라우드 DB upsert 성공.`);
      }
    } catch (dbErr) {
      console.error('🔌 [Supabase] 데이터베이스 적재 예외 발생:', dbErr.message);
    }
  }

  // 4) 로컬 파일 DB 백업 보관 처리 (하루에 딱 한 번만 도달)
  try {
    await initMarketHistoryDb();
    
    const fileData = await fs.readFile(HISTORY_FILE_PATH, 'utf-8').catch(() => '{}');
    const history = JSON.parse(fileData);
    
    // 구조화하여 저장
    history[todayStr] = {
      gems: gems.map(g => ({ Name: g.Name, CurrentMinPrice: g.CurrentMinPrice })),
      engravings: engravings.map(e => ({ Name: e.Name, CurrentMinPrice: e.CurrentMinPrice }))
    };
    
    // 최대 30일 보존 정책 적용 (불필요한 무제한 데이터 팽창 방지)
    const keys = Object.keys(history).sort();
    if (keys.length > 30) {
      const deleteCount = keys.length - 30;
      for (let i = 0; i < deleteCount; i++) {
        delete history[keys[i]];
      }
    }
    
    await fs.writeFile(HISTORY_FILE_PATH, JSON.stringify(history, null, 2), 'utf-8');
    lastSavedDate = todayStr; // 💡 오늘자 DB/파일 쓰기 완료 상태를 메모리에 기록하여 추가 I/O를 완벽 차단!
    console.log(`💾 [DB] 오늘의 시세 데이터가 market_history.json 로컬 백업 완료! (${todayStr})`);
  } catch (err) {
    console.error('💾 [DB] 시세 로컬 파일 DB 백업 실패:', err.message);
  }
};

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));

// Health Check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'LOSTVIBE backend server is running successfully.',
    timestamp: new Date().toISOString()
  });
});

// 로스트아크 실시간 시세 서버 캐시 객체
let liveMarketCache = {
  gems: null,
  engravings: null,
  craftingMaterials: null,
  lastUpdated: null,
  error: null
};

// 실시간 시세 백그라운드 수집 스케줄러 구현 (API Key가 정의되었을 때만 작동)
const startLiveMarketScheduler = () => {
  const apiKey = process.env.LOSTARK_API_KEY;
  if (!apiKey || apiKey === 'your_lostark_api_key_here') {
    console.warn('⚠️ [Scheduler] LOSTARK_API_KEY가 설정되지 않아 실시간 시세 스케줄러를 작동하지 않습니다.');
    return;
  }

  console.log('🚀 [Scheduler] 실시간 시세 수집 백그라운드 스케줄러를 작동합니다.');

  // 주기적 실행 함수 (5분 = 300,000ms 간격, OpenAPI Rate Limit 완벽 방어)
  const fetchIntervalMs = 300000;

  const runSync = async () => {
    try {
      console.log(`[Scheduler] 실시간 시세 수집 시작... (${new Date().toLocaleTimeString()})`);
      
      // 1) 보석 8종 경매장 조회 리스트 (7~10렙 겁화/작열)
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

      const processedGems = [];

      // 8종 보석을 경매장 API(최저 즉시구매가 순)로 병렬 안전 수집
      await Promise.all(gemTargets.map(async (target) => {
        try {
          const gemRes = await fetch('https://developer-lostark.game.onstove.com/auctions/items', {
            method: 'POST',
            headers: {
              'accept': 'application/json',
              'authorization': `bearer ${apiKey}`,
              'content-type': 'application/json'
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

          if (gemRes.ok) {
            const gemData = await gemRes.json();
            const items = gemData.Items || [];
            if (items.length > 0) {
              const bestItem = items[0];
              processedGems.push({
                Name: target.name,
                CurrentMinPrice: bestItem.AuctionInfo.BuyPrice || bestItem.AuctionInfo.BidStartPrice || 0,
                YesterDayAveragePrice: bestItem.AuctionInfo.BuyPrice || bestItem.AuctionInfo.BidStartPrice || 0
              });
            } else {
              processedGems.push({ Name: target.name, CurrentMinPrice: 0, YesterDayAveragePrice: 0 });
            }
          } else {
            processedGems.push({ Name: target.name, CurrentMinPrice: 0, YesterDayAveragePrice: 0 });
          }
        } catch (e) {
          console.warn(`[Scheduler] 보석 ${target.name} 조회 실패:`, e.message);
          processedGems.push({ Name: target.name, CurrentMinPrice: 0, YesterDayAveragePrice: 0 });
        }
      }));

      // 2) 유물 각인서 Page 1 수집 (티어 제한 제거로 누락 없는 수집)
      const page1Res = await fetch('https://developer-lostark.game.onstove.com/markets/items', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'authorization': `bearer ${apiKey}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          Sort: 'CURRENT_MIN_PRICE',
          CategoryCode: 40000,
          CharacterClass: '',
          ItemGrade: '유물',
          ItemName: '',
          PageNo: 1,
          SortCondition: 'DESC'
        })
      });

      // 3) 유물 각인서 Page 2 수집
      const page2Res = await fetch('https://developer-lostark.game.onstove.com/markets/items', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'authorization': `bearer ${apiKey}`,
          'content-type': 'application/json'
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
        throw new Error(`OpenAPI 응답 에러 (각인서: ${page1Res.status}/${page2Res.status})`);
      }

      const p1Data = await page1Res.json();
      const p2Data = await page2Res.json();

      const engravingItems = [...(p1Data.Items || []), ...(p2Data.Items || [])];

      // 레벨 내림차순 정렬 (10렙 -> 9렙 -> 8렙 -> 7렙 순)
      processedGems.sort((a, b) => {
        const getLvl = name => parseInt(name.match(/\d+/)?.[0] || 0);
        const lvlA = getLvl(a.Name);
        const lvlB = getLvl(b.Name);
        if (lvlA !== lvlB) return lvlB - lvlA;
        return a.Name.includes('겁화') ? -1 : 1;
      });

      // --- 각인서 가공 (중복 제거 및 상위 15종 정렬) ---
      const uniqueEngravings = [];
      const seen = new Set();
      engravingItems.forEach(item => {
        if (!seen.has(item.Name)) {
          seen.add(item.Name);
          uniqueEngravings.push({
            Name: item.Name.replace(' 유물 각인서', '').replace('각인서', '').trim(),
            FullName: item.Name, // 10종 프리셋 매칭용 원본 이름 보존
            CurrentMinPrice: item.CurrentMinPrice,
            YesterDayAveragePrice: item.YesterDayAveragePrice
          });
        }
      });

      uniqueEngravings.sort((a, b) => b.CurrentMinPrice - a.CurrentMinPrice);
      const top15Engravings = uniqueEngravings.slice(0, 15);

      // 보석/각인서 수집 완료 후 Rate Limit 방어를 위한 2초 쿨다운
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 3) 생활 재료 24종 거래소 시세 수집 (6개 생활 스킬, CategoryCode: 90000)
      const craftingMaterialTargets = [
        // 고고학
        { key: 'archaeology', subKey: 'abidos', name: '아비도스 유물' },
        { key: 'archaeology', subKey: 'oreha', name: '오레하 유물' },
        { key: 'archaeology', subKey: 'rare', name: '희귀한 유물' },
        { key: 'archaeology', subKey: 'ancient', name: '고대 유물' },
        // 낚시 (거래소 실제 등록명 기준)
        { key: 'fishing', subKey: 'abidos', name: '아비도스 태양 잉어' },
        { key: 'fishing', subKey: 'oreha', name: '오레하 태양 잉어' },
        { key: 'fishing', subKey: 'rare', name: '붉은 살 생선' },
        { key: 'fishing', subKey: 'ancient', name: '생선' },
        // 수렵 (거래소 실제 등록명 기준)
        { key: 'hunting', subKey: 'abidos', name: '아비도스 두툼한 생고기' },
        { key: 'hunting', subKey: 'oreha', name: '오레하 두툼한 생고기' },
        { key: 'hunting', subKey: 'rare', name: '두툼한 생고기' },
        { key: 'hunting', subKey: 'ancient', name: '다듬은 생고기' },
        // 벌목 (거래소 실제 등록명 기준)
        { key: 'logging', subKey: 'abidos', name: '아비도스 목재' },
        { key: 'logging', subKey: 'oreha', name: '튼튼한 목재' },
        { key: 'logging', subKey: 'rare', name: '부드러운 목재' },
        { key: 'logging', subKey: 'ancient', name: '목재' },
        // 채광 (거래소 실제 등록명 기준)
        { key: 'mining', subKey: 'abidos', name: '아비도스 철광석' },
        { key: 'mining', subKey: 'oreha', name: '단단한 철광석' },
        { key: 'mining', subKey: 'rare', name: '묵직한 철광석' },
        { key: 'mining', subKey: 'ancient', name: '철광석' },
        // 채집 (거래소 실제 등록명 기준)
        { key: 'foraging', subKey: 'abidos', name: '아비도스 들꽃' },
        { key: 'foraging', subKey: 'oreha', name: '화사한 들꽃' },
        { key: 'foraging', subKey: 'rare', name: '수줍은 들꽃' },
        { key: 'foraging', subKey: 'ancient', name: '들꽃' }
      ];

      const craftingMaterials = {
        archaeology: { abidos: 0, oreha: 0, rare: 0, ancient: 0 },
        fishing: { abidos: 0, oreha: 0, rare: 0, ancient: 0 },
        hunting: { abidos: 0, oreha: 0, rare: 0, ancient: 0 },
        logging: { abidos: 0, oreha: 0, rare: 0, ancient: 0 },
        mining: { abidos: 0, oreha: 0, rare: 0, ancient: 0 },
        foraging: { abidos: 0, oreha: 0, rare: 0, ancient: 0 }
      };

      for (const target of craftingMaterialTargets) {
        try {
          const matRes = await fetch('https://developer-lostark.game.onstove.com/markets/items', {
            method: 'POST',
            headers: {
              'accept': 'application/json',
              'authorization': `bearer ${apiKey}`,
              'content-type': 'application/json'
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

          if (matRes.ok) {
            const matData = await matRes.json();
            const items = matData.Items || [];
            if (items.length > 0) {
              // 이름이 정확히 일치하는 아이템 우선, 없으면 첫 번째 결과 사용
              const matched = items.find(i => i.Name === target.name) || items[0];
              craftingMaterials[target.key][target.subKey] = matched.CurrentMinPrice || 0;
            }
          } else {
            console.warn(`[Scheduler] 생활재료 ${target.name} 조회 실패 (HTTP ${matRes.status})`);
          }
        } catch (e) {
          console.warn(`[Scheduler] 생활재료 ${target.name} 조회 예외:`, e.message);
        }
        // Rate Limit 방어를 위한 300ms 딜레이
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // 캐시 갱신
      liveMarketCache.gems = processedGems;
      liveMarketCache.engravings = top15Engravings;
      liveMarketCache.craftingMaterials = craftingMaterials;
      liveMarketCache.lastUpdated = Date.now();
      liveMarketCache.error = null;

      console.log(`[Scheduler] 실시간 시세 수집 완료 및 캐시 갱신 성공! (보석 ${processedGems.length}종, 각인서 ${top15Engravings.length}종, 생활재료 24종)`);
      
      // 매일 수집된 보석/각인서 가격 데이터를 영구 로컬 파일 DB에 누적 기록
      await saveDailyMarketHistory(processedGems, top15Engravings);
    } catch (err) {
      console.error('[Scheduler] 실시간 시세 수집 중 오류 발생:', err.message);
      liveMarketCache.error = err.message;
    }
  };

  // 1) 즉시 최초 수집 실행 (서버 구동 시 초기 딜레이 방지)
  runSync();

  // 2) 5분 주기로 동작
  setInterval(runSync, fetchIntervalMs);
};

// 로스트아크 API 공통 헤더 검증 미들웨어
const verifyLostArkKey = (req, res, next) => {
  const apiKey = req.headers['x-lostark-api-key'];
  if (!apiKey) {
    return res.status(400).json({
      error: '로스트아크 API Key가 누락되었습니다. 설정에서 API Key를 입력하세요.'
    });
  }
  req.lostArkKey = apiKey;
  next();
};

// 1. 오늘의 일정 (Game Contents Calendar) 프록시 API
app.get('/api/calendar', verifyLostArkKey, async (req, res) => {
  try {
    const response = await fetch('https://developer-lostark.game.onstove.com/gamecontents/calendar', {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'authorization': `bearer ${req.lostArkKey}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: '로스트아크 API 서버 호출 실패',
        details: errorData
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: '백엔드 서버 프록시 오류',
      message: error.message
    });
  }
});

// 2. 거래소 시세 검색 프록시 API
app.post('/api/market', verifyLostArkKey, async (req, res) => {
  try {
    const response = await fetch('https://developer-lostark.game.onstove.com/markets/items', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'authorization': `bearer ${req.lostArkKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: '로스트아크 API 서버 호출 실패',
        details: errorData
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: '백엔드 서버 프록시 오류',
      message: error.message
    });
  }
});

// 2.1. 경매장 시세 검색 프록시 API (보석 등 개별 옵션 아이템용)
app.post('/api/auction', verifyLostArkKey, async (req, res) => {
  try {
    const response = await fetch('https://developer-lostark.game.onstove.com/auctions/items', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'authorization': `bearer ${req.lostArkKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: '로스트아크 경매장 API 서버 호출 실패',
        details: errorData
      });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: '백엔드 서버 경매장 프록시 오류',
      message: error.message
    });
  }
});

// 3. Gemini AI 시세 및 전망 분석 API
app.post('/api/analyze', async (req, res) => {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey || geminiApiKey === 'your_gemini_api_key_here') {
    return res.status(500).json({
      error: '백엔드 서버에 GEMINI_API_KEY가 설정되어 있지 않습니다.',
      message: '서버의 .env 파일에 올바른 GEMINI_API_KEY를 입력해 주세요.'
    });
  }

  try {
    let history = {};
    let dbSource = '로컬 백업 파일 DB (market_history.json)';

    // 1) Supabase 데이터베이스가 초기화되어 있다면 클라우드 PostgreSQL에서 최근 30일치 시세 데이터를 쿼리합니다.
    if (supabase) {
      try {
        const today = new Date();
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        const startDateStr = thirtyDaysAgo.toISOString().split('T')[0];

        console.log(`🔌 [Supabase] 분석용 과거 30일 시세 조회 개시 (${startDateStr} 이후)`);
        const [gemQuery, engravingQuery] = await Promise.all([
          supabase
            .from('gem_prices_history')
            .select('collected_date, item_name, min_price')
            .gte('collected_date', startDateStr)
            .order('collected_date', { ascending: true }),
          supabase
            .from('engraving_prices_history')
            .select('collected_date, item_name, min_price')
            .gte('collected_date', startDateStr)
            .order('collected_date', { ascending: true })
        ]);

        if (gemQuery.error) throw gemQuery.error;
        if (engravingQuery.error) throw engravingQuery.error;

        const gemData = gemQuery.data || [];
        const engravingData = engravingQuery.data || [];

        if (gemData.length > 0 || engravingData.length > 0) {
          // 데이터 마샬링 (날짜별 키로 보석/각인서 매핑)
          gemData.forEach(row => {
            const date = row.collected_date;
            if (!history[date]) history[date] = { gems: [], engravings: [] };
            history[date].gems.push({ Name: row.item_name, CurrentMinPrice: row.min_price });
          });

          engravingData.forEach(row => {
            const date = row.collected_date;
            if (!history[date]) history[date] = { gems: [], engravings: [] };
            history[date].engravings.push({ Name: row.item_name, CurrentMinPrice: row.min_price });
          });

          dbSource = 'Supabase Cloud PostgreSQL DB';
          console.log(`🔌 [Supabase] 최근 ${Object.keys(history).length}일치 시세 취합 성공!`);
        }
      } catch (dbErr) {
        console.error('🔌 [Supabase] 클라우드 DB 쿼리 실패, 로컬 폴백을 개시합니다:', dbErr.message);
      }
    }

    // 2) Supabase에 수집 데이터가 아직 없거나 연결 에러인 경우 로컬 파일 DB 폴백 작동
    if (Object.keys(history).length === 0) {
      await initMarketHistoryDb();
      const historyData = await fs.readFile(HISTORY_FILE_PATH, 'utf-8').catch(() => '{}');
      history = JSON.parse(historyData);
      dbSource = '로컬 백업 파일 DB (market_history.json)';
    }

    console.log(`💡 [AI Analyst] 분석용 데이터 공급 완료 (소스: ${dbSource})`);

    // AI 분석을 위한 맞춤 프롬프트 생성 (오직 보석/각인서 시세 전망 2가지만 도출하도록 극도로 구체화)
    const prompt = `
당신은 로스트아크 시즌 3 최고의 전문 경제 분석가인 '페이몬의 경제학자'입니다.
제공된 보석과 각인서의 누적 일별 시세 데이터(DB 기록)를 철저히 정량적으로 분석하여, 향후 시장의 흐름과 가격 시세 전망을 예측하세요.

[분석할 누적 일별 시세 데이터 (JSON)]
${JSON.stringify(history, null, 2)}

[요구사항]
- 친절하면서도 극도로 전문적이고 정중한 한국어로 작성하세요.
- 불필요한 서론(예: "제공된 데이터를 바탕으로 분석해 드리겠습니다")은 배제하고, 곧바로 분석 리포트로 진입하세요.
- 마크다운(Markdown) 포맷을 완벽하게 사용하여 시각적 가독성을 극대화하세요. (### 제목, - 리스트, **중요 단어** 등 적극 활용)
- 보고서의 구성은 반드시 다음 2가지 핵심 단락으로만 나누어 서술하세요. 다른 군더더기나 캐릭터 스펙, 아비도스 제작 분석은 절대 포함하지 마십시오:
  1. 💎 **보석 시세 전망**: 최근 일별 겁화/작열 7~10레벨 보석들의 시세 추이를 요약하고, 단기 및 중기 시세 전망을 경제적 관점에서 설득력 있게 예측.
  2. 📜 **각인서 시세 전망**: 주요 유물 각인서들의 가격 변동 추세를 진단하고, 향후 상승/하락 가능성 및 구매/판매 적정 타이밍을 예측.
`;

    let apiSuccess = false;
    let aiResponseText = '';
    let errorDetails = null;

    const modelsToTry = [
      'gemma-4-31b',
      'gemma-4-26b',
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash',
      'gemini-3-flash',
      'gemini-2.5-flash'
    ];

    for (const modelName of modelsToTry) {
      try {
        console.log(`[Gemini AI] ${modelName} 모델로 시세 전망 분석 생성을 시도 중...`);
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey}`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt
                  }
                ]
              }
            ]
          })
        });

        if (response.ok) {
          const result = await response.json();
          aiResponseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
          if (aiResponseText) {
            apiSuccess = true;
            console.log(`[Gemini AI] 성공: ${modelName} 모델 시세 분석 호출에 완벽히 성공했습니다.`);
            break;
          }
        } else {
          errorDetails = await response.json().catch(() => ({}));
          console.warn(`[Gemini AI] 경고: ${modelName} 모델 응답 실패. 상세 정보:`, errorDetails);
        }
      } catch (err) {
        console.warn(`[Gemini AI] 경고: ${modelName} 호출 중 예외 발생:`, err.message);
        errorDetails = { message: err.message };
      }
    }

    if (apiSuccess) {
      res.json({ analysis: aiResponseText });
    } else {
      res.status(500).json({
        error: 'Gemini AI API 모든 최신 모델 호출 실패',
        details: errorDetails
      });
    }
  } catch (dbErr) {
    console.error('[Analyze API] DB 시세 데이터 로드 실패:', dbErr.message);
    res.status(500).json({
      error: '백엔드 데이터베이스 시세 히스토리 조회 실패',
      message: dbErr.message
    });
  }
});


// 4. 실시간 시세 대시보드 서버 캐싱 조회 API (GET 호출로 프론트엔드가 Rate Limit 걱정 없이 고속 서빙받음)
app.get('/api/market/live-dashboard', (req, res) => {
  res.json({
    gems: liveMarketCache.gems,
    engravings: liveMarketCache.engravings,
    craftingMaterials: liveMarketCache.craftingMaterials,
    lastUpdated: liveMarketCache.lastUpdated,
    error: liveMarketCache.error
  });
});




// Start Server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🔮 LOSTVIBE Full-Stack Server is running!`);
  console.log(`   - Local URL:   http://localhost:${PORT}`);
  console.log(`   - Environment: development`);
  console.log(`==================================================`);
  
  // 백그라운드 실시간 시세 스케줄러 기동
  startLiveMarketScheduler();
});
