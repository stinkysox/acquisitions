import app from '#src/app.js';
import request from 'supertest';

describe('API ENDPOINTS', () => {
  describe('GET /health', () => {
    it('should return the health status', async () => {
      const response = await request(app).get('/health').expect(200);
      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('GET /api', () => {
    it('should return welcome response', async () => {
      const response = await request(app).get('/api').expect(200);
      expect(response.body).toHaveProperty(
        'message',
        'Welcome to the Acquisitions API'
      );
    });
  });

  describe('GET /nonexistent', () => {
    it('should return 404 for unknown route', async () => {
      const response = await request(app).get('/nonexistent').expect(404);
      expect(response.body).toHaveProperty('error', 'Not Found');
    });
  });
});
