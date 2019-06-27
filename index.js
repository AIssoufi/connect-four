// Dependencies
const express = require('express');
const Engine = require('./engine');
const app = express();

app.get('/', (req, res) => {
  res.send(`It's work !`);
});

app.get('/status', (req, res) => {
  const status = Engine.getStatus();

  res.status(200).json(status);
});

app.get('/play', (req, res) => {
  const {
    query: {
      playerid,
      column
    } = {}
  } = req;

  const queryIsValid = Boolean(playerid && column)
  if (!queryIsValid) {
    res.status(400).json({
      message: 'Your query is wrong!'
    });
  }

  try {
    Engine.play(playerid, Number.parseInt(column, 10));
  } catch (error) {
    const { message = 'Unknow error' } = error;
    console.error({ message })
    res.status(400).json({ message });
  }

  const status = Engine.getStatus();

  console.log({ status });

  res.status(200).json(status);
})

app.listen(3000, () => {
  console.log('http://localhost:3000');
});
