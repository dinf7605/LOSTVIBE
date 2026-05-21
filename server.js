import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environmental variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      
      // 1) 겁화 보석 리스트 수집 (DESC 내림차순 정렬)
      const fireRes = await fetch('https://developer-lostark.game.onstove.com/markets/items', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'authorization': `bearer ${apiKey}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          Sort: 'CURRENT_MIN_PRICE',
          CategoryCode: 210000,
          CharacterClass: '',
          ItemTier: 4,
          ItemGrade: '',
          ItemName: '겁화',
          PageNo: 1,
          SortCondition: 'DESC'
        })
      });

      // 2) 작열 보석 리스트 수집 (DESC 내림차순 정렬)
      const iceRes = await fetch('https://developer-lostark.game.onstove.com/markets/items', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'authorization': `bearer ${apiKey}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          Sort: 'CURRENT_MIN_PRICE',
          CategoryCode: 210000,
          CharacterClass: '',
          ItemTier: 4,
          ItemGrade: '',
          ItemName: '작열',
          PageNo: 1,
          SortCondition: 'DESC'
        })
      });

      // 3) 유물 각인서 Page 1 수집 (티어 제한 제거로 누락 없는 수집)
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

      // 4) 유물 각인서 Page 2 수집
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

      if (!fireRes.ok || !iceRes.ok || !page1Res.ok || !page2Res.ok) {
        throw new Error(`OpenAPI 응답 에러 (보석: ${fireRes.status}/${iceRes.status}, 각인서: ${page1Res.status}/${page2Res.status})`);
      }

      const fireData = await fireRes.json();
      const iceData = await iceRes.json();
      const p1Data = await page1Res.json();
      const p2Data = await page2Res.json();

      const fireItems = fireData.Items || [];
      const iceItems = iceData.Items || [];
      const engravingItems = [...(p1Data.Items || []), ...(p2Data.Items || [])];

      // --- 보석 가공 (7~10레벨 겁화/작열 8종) ---
      const targetLevels = ['7레벨', '8레벨', '9레벨', '10레벨'];
      const processedGems = [];

      targetLevels.forEach(lvl => {
        // 겁화 필터링
        const fItem = fireItems.find(x => x.Name.includes(lvl));
        if (fItem) {
          processedGems.push({
            Name: fItem.Name,
            CurrentMinPrice: fItem.CurrentMinPrice,
            YesterDayAveragePrice: fItem.YesterDayAveragePrice
          });
        }
        // 작열 필터링
        const iItem = iceItems.find(x => x.Name.includes(lvl));
        if (iItem) {
          processedGems.push({
            Name: iItem.Name,
            CurrentMinPrice: iItem.CurrentMinPrice,
            YesterDayAveragePrice: iItem.YesterDayAveragePrice
          });
        }
      });

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

      // 캐시 갱신
      liveMarketCache.gems = processedGems;
      liveMarketCache.engravings = top15Engravings;
      liveMarketCache.lastUpdated = Date.now();
      liveMarketCache.error = null;

      console.log(`[Scheduler] 실시간 시세 수집 완료 및 캐시 갱신 성공! (보석 ${processedGems.length}종, 각인서 ${top15Engravings.length}종)`);
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

// 2. 거래소/경매장 시세 검색 프록시 API
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

// 3. Gemini AI 시세 및 스펙 종합 분석 API
app.post('/api/analyze', async (req, res) => {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey || geminiApiKey === 'your_gemini_api_key_here') {
    return res.status(500).json({
      error: '백엔드 서버에 GEMINI_API_KEY가 설정되어 있지 않습니다.',
      message: '서버의 .env 파일에 올바른 GEMINI_API_KEY를 입력해 주세요.'
    });
  }

  const { marketData, specData } = req.body;

  // AI 분석을 위한 맞춤 프롬프트 생성
  const prompt = `
당신은 로스트아크 시즌 3 최고의 전문 경제 분석가이자 초고수 프로게이머인 '페이몬의 경제학자'입니다.
제공된 실시간 거래소 데이터 및 캐릭터 스펙 데이터를 바탕으로, 유저에게 현재 골드 획득 효율 극대화 및 스펙 세팅 최적화를 위한 행동 강령(Actionable Insights)을 제시하세요.

[분석할 실시간 데이터]
1. 아비도스 제작 효율 데이터:
${JSON.stringify(marketData, null, 2)}

2. 캐릭터 스펙 및 진화 노드 데이터:
${JSON.stringify(specData, null, 2)}

[요구사항]
- 친절하면서도 극도로 전문적이고 정중한 한국어로 작성하세요.
- 불필요한 서론(예: "데이터를 분석해 드리겠습니다")은 배제하고, 곧바로 분석 리포트로 진입하세요.
- 마크다운(Markdown) 포맷을 완벽하게 사용하여 시각적 가독성을 극대화하세요. (### 제목, - 리스트, **중요 단어** 등 적극 활용)
- 보고서의 구성은 반드시 다음 3가지 핵심 단락으로 나누어 서술하세요:
  1. 💰 **실시간 경제 분석 및 최적의 골드 파밍 수익 루트 추천**: 아비도스 제작 이득 여부와 고고학/낚시/수렵의 효율 차이를 비교하여 지금 즉시 해야 할 경제적 액션 추천.
  2. ⚡ **아크 패시브 진화 노드(음속 돌파 & 뭉툭한 가시) 최적화 피드백**: 현재 치적/공이속 스펙을 기반으로 뭉툭한 가시 및 음속 돌파 효율이 낭비되는 구간이 있는지 진단하고 보완 스탯/시너지 제시.
  3. 🔮 **종합 행동 강령 3가지**: 유저가 지금 즉시 실행해야 할 행동 요령 3가지를 명확하게 핵심 요약.
`;

  let apiSuccess = false;
  let aiResponseText = '';
  let errorDetails = null;

  // 유저가 제시한 분당/일일 사용 한도(RPD/RPM) 및 수학적/논리적 추론 효율 순위에 기초하여 
  // 최적의 성능을 안정적으로 뿜어낼 수 있도록 AI 폴백 엔진의 우선순위를 정교하게 재배치합니다.
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
      console.log(`[Gemini AI] ${modelName} 모델로 분석 생성을 시도 중...`);
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
          console.log(`[Gemini AI] 성공: ${modelName} 모델 호출에 완벽히 성공했습니다.`);
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
});


// 4. 실시간 시세 대시보드 서버 캐싱 조회 API (GET 호출로 프론트엔드가 Rate Limit 걱정 없이 고속 서빙받음)
app.get('/api/market/live-dashboard', (req, res) => {
  res.json({
    gems: liveMarketCache.gems,
    engravings: liveMarketCache.engravings,
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
