const express = require('express');
const fetch = require('node-fetch');
const app = express();

const SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT"]; // برای تست فعلاً فقط ۴ تا بگذارید

app.get('/', async (req, res) => {
  console.log("Request received"); // این در لاگ‌های Vercel ظاهر می‌شود
  
  const results = [];
  for (let symbol of SYMBOLS) {
    try {
      // اضافه کردن Headers برای جلوگیری از مسدود شدن توسط بایننس
      const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=4h&limit=40`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        results.push({ symbol: symbol, dataLength: data.length }); // فقط برای تست ساختار
      }
    } catch (err) {
      console.log("Error for " + symbol, err.message);
    }
  }
  
  res.json({ debug: "test", count: results.length, details: results });
});

module.exports = app;
