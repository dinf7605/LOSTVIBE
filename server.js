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


// Start Server
app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`🔮 LOSTVIBE Full-Stack Server is running!`);
  console.log(`   - Local URL:   http://localhost:${PORT}`);
  console.log(`   - Environment: development`);
  console.log(`==================================================`);
});
