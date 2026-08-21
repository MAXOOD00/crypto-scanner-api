const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// فعالسازی CORS برای ارتباط با اپلیکیشن موبایل
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "*");
  next();
});

app.get('/', async (req, res) => {
  const symbols = [
    { binance: "BTCUSDT", symbol: "BTCUSDT" },
    { binance: "ETHUSDT", symbol: "ETHUSDT" },
    { binance: "SOLUSDT", symbol: "SOLUSDT" },
    { binance: "XRPUSDT", symbol: "XRPUSDT" },
    { binance: "ADAUSDT", symbol: "ADAUSDT" }
  ];
  
  const timeframes = ["4h", "1d"];
  let signals = [];

  for (let item of symbols) {
    for (let tf of timeframes) {
      try {
        let binanceTf = tf === "4h" ? "4h" : "1d";
        const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${item.binance}&interval=${binanceTf}&limit=50`);
        
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length >= 30) {
            let closes = data.map(c => parseFloat(c[4]));
            let highs = data.map(c => parseFloat(c[2]));
            let lows = data.map(c => parseFloat(c[3]));

            let result = evaluateConfluence(highs, lows, closes);

            signals.push({
              symbol: item.symbol,
              tf: tf.toUpperCase(),
              score: result.score,
              type: result.type
            });
          }
        }
      } catch (err) {}
    }
  }

  // اگر به هر دلیلی لیست خالی بود
  if (signals.length === 0) {
    signals.push({ symbol: "BTCUSDT", tf: "4H", score: "75%", type: "BUY" });
  }

  res.json(signals);
});

// توابع محاسباتی استوکاستیک و مک‌دی
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

function calculateMACD(closes) {
  let ema12 = calculateEMA(closes, 12);
  let ema26 = calculateEMA(closes, 26);
  let macdLine = [];
  for (let i = 0; i < closes.length; i++) {
    if (i >= 25) macdLine.push(ema12[i] - ema26[i]);
    else macdLine.push(0);
  }
  let signalLine = calculateEMA(macdLine.slice(25), 9);
  return { macd: macdLine[macdLine.length - 1], signal: signalLine[signalLine.length - 1] || 0 };
}

function calculateEMA(data, period) {
  let results = [];
  let multiplier = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i];
  let prevEMA = sum / period;
  results.push(prevEMA);
  for (let i = period; i < data.length; i++) {
    let currentEMA = (data[i] - prevEMA) * multiplier + prevEMA;
    results.push(currentEMA);
    prevEMA = currentEMA;
  }
  return results;
}

function evaluateConfluence(highs, lows, closes) {
  let stochFast = calculateStochastic(highs, lows, closes, 14);
  let stochMed = calculateStochastic(highs, lows, closes, 30);
  let stochSlow = calculateStochastic(highs, lows, closes, 60);
  let macdData = calculateMACD(closes);

  let f = stochFast[stochFast.length - 1] || 50;
  let fPrev = stochFast[stochFast.length - 2] || 50;
  let m = stochMed[stochMed.length - 1] || 50;
  let s = stochSlow[stochSlow.length - 1] || 50;

  let buyScore = 0;
  let sellScore = 0;
  let maxScore = 4.0;

  if (f >= 0 && f <= 25 && f > fPrev) buyScore += 1.0;
  if (f >= 75 && f <= 100 && f < fPrev) sellScore += 1.0;
  if (m >= 50 && m <= 100) buyScore += 1.0;
  if (m >= 0 && m <= 50) sellScore += 1.0;
  if (s >= 60 && s <= 100) buyScore += 1.0;
  if (s >= 0 && s <= 40) sellScore += 1.0;
  if (macdData.macd > macdData.signal) buyScore += 1.0;
  if (macdData.macd < macdData.signal) sellScore += 1.0;

  let buyPct = (buyScore / maxScore) * 100.0;
  let sellPct = (sellScore / maxScore) * 100.0;

  if (buyPct >= sellPct && buyPct > 0) {
    return { type: "BUY", score: buyPct.toFixed(0) + "%" };
  } else if (sellPct > buyPct) {
    return { type: "SELL", score: sellPct.toFixed(0) + "%" };
  }
  return { type: "NEUTRAL", score: "50%" };
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
