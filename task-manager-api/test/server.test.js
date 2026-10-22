const request = require('supertest');
const app = require('../server');

describe('Task Manager API', () => {
  test('GET / returns API information and available task routes', async () => {
    const response = await request(app).get('/');

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe('Task Manager API');
    expect(response.body.routes.tasks).toBe('/tasks');
  });

  test('GET /missing returns a descriptive 404 response', async () => {
    const response = await request(app).get('/missing');

    expect(response.statusCode).toBe(404);
    expect(response.body).toMatchObject({
      error: 'Route not found',
      method: 'GET',
      path: '/missing',
    });
  });
});
