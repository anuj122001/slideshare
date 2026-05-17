const pino = require('pino');

const logger = pino(
  process.env.NODE_ENV === 'development'
    ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
    : {}
);

module.exports = logger;
