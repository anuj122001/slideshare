require('./config/env');
const app    = require('./app');
const logger = require('./utils/logger');
const { port } = require('./config/env');

app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});
