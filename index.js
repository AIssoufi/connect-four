// Dependencies
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');

// Init
const app = express();
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Connect 4 - API',
      version: '1.0.0',
    },
  },
  apis: ['./routes/index.js'],
  basePath: '/game',
};
const swaggerSpec = swaggerJSDoc(swaggerOptions);

// Routes
const routes = require('./routes');

// MiddleWare
app.use('/', express.static(`${__dirname}/public`));
app.use('/game', routes);
app.use('/api/v1', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.listen(3000, () => {
  // eslint-disable-next-line no-console
  console.log('http://localhost:3000');
});
