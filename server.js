const express = require('express');
const fetch = require('node-fetch');
const app = express();

app.use(express.json());

const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "ADAUSDT", "AVAXUSDT", "DOGEUSDT", "DOTUSDT", "MATICUSDT", "LINKUSDT"];

app.get('/', async (req, res) => {
  // اجرای همزمان همه درخواست‌ها برای جلوگیری از Timeout
  const promises = SYMBOLS.map(async (symbol) => {
    try {
      const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=4h&limit=40`);
      if (!response.ok) return null;
      const data = await response.json();
      
      if (Array.isArray(data) && data.length >= 30) {
        let closes = data.map(c => parseFloat(c[4]));
        let highs = data.map(c => parseFloat(c[2]));
        let lows = data.map(c => parseFloat(c[3]));
        let currentPrice = closes[closes.length - 1];
        let result = evaluateConfluence(highs, lows, closes);

        return {
          symbol: symbol,
          tf: "4H",
          price: currentPrice.toFixed(4),
          score: result.score,
          type: result.type
        };
      }
    } catch (err) {
      return null;
    }
    return null;
  });

  const results = await Promise.all(promises);
  // حذف مقادیر null (درخواست‌های ناموفق)
  res.json(results.filter(item => item !== null));
});

function calculateStochastic(highs, lows, closes, period) {
  let kValues = [];
  for (let i = period - 1; i < closes.length; i++) {
    let sliceHighs = highs.slice(i - period + 1, i + 1);
    let sliceLows = lows.slice(i - period + 1, i + 1);
    let highestHigh = Math.max(...sliceHighs);
    let lowestLow = Math.min(...sliceLows);
    let currentClose = closes[i];
    let k = highestHigh === lowestLow ? 50 : ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    kValues.push(k);
  }
  return kValues;
}

function evaluateConfluence(highs, lows, closes) {
  let stochFast = calculateStochastic(highs, lows, closes, 14);
  let f = stochFast[stochFast.length - 1] || 50;
  let fPrev = stochFast[stochFast.length - 2] || 50;
  let buyScore = (f <= 25 && f > fPrev) ? 2 : (f < 50 ? 1 : 0);
  let sellScore = (f >= 75 && f < fPrev) ? 2 : (f > 50 ? 1 : 0);
  let total = buyScore + sellScore;
  let buyPct = total === 0 ? 50 : Math.round((buyScore / total) * 100);
  let sellPct = total === 0 ? 50 : Math.round((sellScore / total) * 100);
  return buyPct >= sellPct ? { type: "BUY", score: (buyPct < 50 ? 65 : buyPct) + "%" } : { type: "SELL", score: (sellPct < 50 ? 65 : sellPct) + "%" };
}

module.exports = app;
