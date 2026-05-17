const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const compression = require('compression');
const rateLimit  = require('express-rate-limit');
const { clientOrigin } = require('./config/env');
const errorHandler = require('./middleware/errorHandler');

const authRoutes     = require('./routes/auth.routes');
const classRoutes    = require('./routes/class.routes');
const documentRoutes = require('./routes/document.routes');
const adminRoutes    = require('./routes/admin.routes');

const app = express();

// Railway (and most cloud platforms) sit behind a reverse proxy
app.set('trust proxy', 1);

app.use(helmet());
app.use(cors({
  origin:      clientOrigin,
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '1mb' }));

// Rate limiting — generous for 400-600 users, tight on auth
const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
const authLimiter   = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, message: { error: 'Too many requests' } });

app.use(globalLimiter);
app.use('/auth', authLimiter, authRoutes);
app.use('/classes',   classRoutes);
app.use('/documents', documentRoutes);
app.use('/admin',     adminRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use(errorHandler);

module.exports = app;
