const express = require('express');
const fetch = require('node-fetch');
const app = express();

app.get('/', async (req, res) => {
  // برای تست، فقط 3 ارز اصلی را می زنیم که سریع تر جواب دهد
  const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];
  
  // استفاده از Promise.all برای اجرای همزمان (Parallel)
  const signalPromises = SYMBOLS.map(async (symbol) => {
    try {
      const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=4h&limit=20`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const data = await response.json();
      
      if (!Array.isArray(data) || data.length < 15) return null;

      let closes = data.map(c => parseFloat(c[4]));
      let highs = data.map(c => parseFloat(c[2]));
      let lows = data.map(c => parseFloat(c[3]));
      
      // منطق ساده شده برای تست
      let f = 30; // فرض
      return { symbol: symbol, type: "BUY", score: "70%" }; 
    } catch (e) {
      return null;
    }
  });

  const results = await Promise.all(signalPromises);
  res.json(results.filter(r => r !== null));
});

module.exports = app;
