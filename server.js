const express = require('express');
const fetch = require('node-fetch');
const app = express();

app.get('/', async (req, res) => {
  try {
    // استفاده از یک API عمومی دیگر برای تست اتصال شبکه در ورسل
    const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
    const data = await response.json();
    
    res.json({
      status: "connected",
      test_data: data
    });
  } catch (err) {
    res.json({
      status: "error",
      message: err.message
    });
  }
});

module.exports = app;
