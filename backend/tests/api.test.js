const request = require('supertest');
const app = require('../src/app');

// NOTE: These tests require a running PostgreSQL database.
// Set TEST_DATABASE_URL in your environment or use a test DB.
// Run: npm test

describe('Auth API', () => {
  const testUser = {
    name: 'Test User',
    email: `test_${Date.now()}@example.com`,
    password: 'Test@Password1',
  };
  let accessToken, refreshToken;

  describe('POST /api/v1/auth/register', () => {
    it('registers a new user successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();

      accessToken  = res.body.data.accessToken;
      refreshToken = res.body.data.refreshToken;
    });

    it('rejects duplicate email', async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(409);
    });

    it('validates required fields', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'bad-email' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('enforces password strength', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'Test', email: 'x@y.com', password: 'weak' })
        .expect(400);

      expect(res.body.errors.some(e => e.field === 'password')).toBe(true);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('logs in with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      expect(res.body.data.accessToken).toBeDefined();
      accessToken  = res.body.data.accessToken;
      refreshToken = res.body.data.refreshToken;
    });

    it('rejects wrong password', async () => {
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: 'WrongPass@1' })
        .expect(401);
    });

    it('rejects unknown email', async () => {
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@example.com', password: 'Test@123' })
        .expect(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('returns profile with valid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.user.email).toBe(testUser.email);
    });

    it('returns 401 without token', async () => {
      await request(app).get('/api/v1/auth/me').expect(401);
    });

    it('returns 401 with invalid token', async () => {
      await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('returns new token pair with valid refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      // Update tokens for subsequent tests
      accessToken  = res.body.data.accessToken;
      refreshToken = res.body.data.refreshToken;
    });

    it('rejects invalid refresh token', async () => {
      await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid.refresh.token' })
        .expect(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('logs out successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });
});

describe('Tasks API', () => {
  let accessToken, taskId;

  const testUser = {
    name: 'Task Tester',
    email: `tasks_${Date.now()}@example.com`,
    password: 'Test@Password1',
  };

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);
    accessToken = res.body.data.accessToken;
  });

  const auth = () => ({ Authorization: `Bearer ${accessToken}` });

  describe('POST /api/v1/tasks', () => {
    it('creates a task', async () => {
      const res = await request(app)
        .post('/api/v1/tasks')
        .set(auth())
        .send({ title: 'Test Task', priority: 'high', status: 'todo' })
        .expect(201);

      expect(res.body.data.task.title).toBe('Test Task');
      taskId = res.body.data.task.id;
    });

    it('validates required title', async () => {
      await request(app)
        .post('/api/v1/tasks')
        .set(auth())
        .send({ description: 'no title' })
        .expect(400);
    });
  });

  describe('GET /api/v1/tasks', () => {
    it('returns paginated task list', async () => {
      const res = await request(app)
        .get('/api/v1/tasks?page=1&limit=5')
        .set(auth())
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toBeDefined();
    });

    it('filters by status', async () => {
      const res = await request(app)
        .get('/api/v1/tasks?status=todo')
        .set(auth())
        .expect(200);

      res.body.data.forEach(t => expect(t.status).toBe('todo'));
    });
  });

  describe('GET /api/v1/tasks/:id', () => {
    it('returns a single task', async () => {
      const res = await request(app)
        .get(`/api/v1/tasks/${taskId}`)
        .set(auth())
        .expect(200);

      expect(res.body.data.task.id).toBe(taskId);
    });

    it('returns 404 for unknown task', async () => {
      await request(app)
        .get('/api/v1/tasks/00000000-0000-0000-0000-000000000000')
        .set(auth())
        .expect(404);
    });
  });

  describe('PATCH /api/v1/tasks/:id', () => {
    it('updates a task', async () => {
      const res = await request(app)
        .patch(`/api/v1/tasks/${taskId}`)
        .set(auth())
        .send({ status: 'in_progress', priority: 'medium' })
        .expect(200);

      expect(res.body.data.task.status).toBe('in_progress');
    });
  });

  describe('DELETE /api/v1/tasks/:id', () => {
    it('deletes a task', async () => {
      await request(app)
        .delete(`/api/v1/tasks/${taskId}`)
        .set(auth())
        .expect(200);
    });

    it('returns 404 after deletion', async () => {
      await request(app)
        .get(`/api/v1/tasks/${taskId}`)
        .set(auth())
        .expect(404);
    });
  });
});

describe('Health endpoint', () => {
  it('returns health status', async () => {
    const res = await request(app)
      .get('/api/v1/health')
      .expect((r) => expect([200, 503]).toContain(r.status));

    expect(res.body.status).toBeDefined();
    expect(res.body.version).toBe('1.0.0');
  });
});
