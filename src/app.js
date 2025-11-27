// src/app.js
import express from 'express';
import logger from '#config/logger.js';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import authRoutes from '#routes/auth.routes.js';

const app = express();

// Security headers
app.use(helmet());
app.use(cors());

// Parse JSON + URL-encoded + Cookies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// HTTP Request Logging (Morgan → Winston)
app.use(
  morgan('combined', {
    stream: {
      write: message => logger.info(message.trim()),
    },
  })
);

// Test route
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
// Routes
app.use('/api/auth', authRoutes);

export default app;
