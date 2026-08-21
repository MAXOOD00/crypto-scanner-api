const express = require('express');
const fetch = require('node-fetch');
const app = express();

const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "ADAUSDT", "AVAXUSDT", "DOGEUSDT", "DOTUSDT"];

app.get('/', async (req, res) => {
  let signals = [];

  for (let symbol of SYMBOLS) {
    try {
      // استفاده از هدرهای کامل مرورگر برای دور کردن محدودیت بایننس
      const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=4h&limit=40`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.binance.com/'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length >= 30) {
          let closes = data.map(c => parseFloat(c[4]));
          let highs = data.map(c => parseFloat(c[2]));
          let lows = data.map(c => parseFloat(c[3]));
          let currentPrice = closes[closes.length - 1];

          let result = evaluateConfluence(highs, lows, closes);

          signals.push({
            symbol: symbol,
            tf: "4H",
            price: currentPrice > 10 ? currentPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : currentPrice.toFixed(4),
            score: result.score,
            type: result.type
          });
        }
      }
    } catch (err) {
      // رد شدن از خطای احتمالی
    }
  }

  res.json(signals);
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

  let buyScore = 0;
  let sellScore = 0;

  if (f <= 25 && f > fPrev) buyScore += 2;
  else if (f >= 75 && f < fPrev) sellScore += 2;
  else if (f < 50) buyScore += 1;
  else sellScore += 1;

  let total = buyScore + sellScore;
  let buyPct = total === 0 ? 50 : Math.round((buyScore / total) * 100);
  let sellPct = total === 0 ? 50 : Math.round((sellScore / total) * 100);

  if (buyPct >= sellPct) {
    return { type: "BUY", score: (buyPct < 50 ? 65 : buyPct) + "%" };
  } else {
    return { type: "SELL", score: (sellPct < 50 ? 65 : sellPct) + "%" };
  }
}

module.exports = app;
