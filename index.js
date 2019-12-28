// Dependencies
const express = require('express');

// Engine
const Engine = require('./engine');

// App
const app = express();

// frontend
app.use('/', express.static(`${__dirname}/public`));

// API
app.get('/api/status', (req, res) => {
  const status = Engine.getStatus();

  res.status(200).json(status);
});

app.get('/api/play', (req, res) => {
  const {
    query: {
      playerid,
      column,
    } = {},
  } = req;

  const queryIsValid = Boolean(playerid && column)
  if (!queryIsValid) {
    res.status(400).json({
      message: 'Your query is wrong!',
    });
  }

  try {
    Engine.play(playerid, Number.parseInt(column, 10));
  } catch (error) {
    const { message = 'Unknow error' } = error;
    res.status(400).json({ message });
  }

  const status = Engine.getStatus();

  res.status(200).json(status);
});

app.listen(3000, () => {
  // eslint-disable-next-line no-console
  console.log('http://localhost:3000');
});
