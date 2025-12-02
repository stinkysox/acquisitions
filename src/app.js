// src/app.js
import express from 'express';
import logger from '#config/logger.js';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import authRoutes from '#routes/auth.routes.js';
import userRoutes from '#routes/users.route.js';
import securityMiddleware from '#middleware/security.middleware.js';
const app = express();

/* ------------------ Security Middlewares ------------------ */

// Helmet → sets secure HTTP headers
app.use(helmet());

// CORS → configure allowed origins if needed later
app.use(cors());

/* ------------------ Body Parsing & Cookies ------------------ */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* ------------------ Rate Limiting Middleware ------------------ */
// ⚠️ Usually place AFTER logging, BEFORE routes
app.use(securityMiddleware);

/* ------------------ HTTP Logging (Morgan → Winston) ------------------ */
app.use(
  morgan('combined', {
    stream: { write: msg => logger.info(msg.trim()) },
  })
);

/* ------------------ Base Routes ------------------ */

app.get('/', (req, res) => {
  logger.info('Hello from acquisitions server');
  res.status(200).send('Hello from acquisitions server!');
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/api', (req, res) => {
  res.status(200).json({
    message: 'Welcome to the Acquisitions API',
    version: '1.0.0',
  });
});

/* ------------------ API Routes ------------------ */
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes); // Placeholder for user routes

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
  });
});

export default app;
