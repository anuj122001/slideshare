require('dotenv').config();

const required = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_REGION',
  'AWS_BUCKET_NAME',
];

for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing env var: ${key}`);
}

module.exports = {
  port:               process.env.PORT || 4000,
  clientOrigin:       process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  jwtSecret:          process.env.JWT_SECRET,
  jwtRefreshSecret:   process.env.JWT_REFRESH_SECRET,
  jwtAccessExpires:   process.env.JWT_ACCESS_EXPIRES  || '15m',
  jwtRefreshExpires:  process.env.JWT_REFRESH_EXPIRES || '7d',
  aws: {
    accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region:          process.env.AWS_REGION,
    bucket:          process.env.AWS_BUCKET_NAME,
  },
};
