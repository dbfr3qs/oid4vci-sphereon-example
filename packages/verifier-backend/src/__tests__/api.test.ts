import request from 'supertest';
import { initializeApp } from '../app';
import { Express } from 'express';

describe('Verifier Backend API', () => {
  let app: Express;

  beforeAll(async () => {
    app = await initializeApp();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('service', 'verifier');
      expect(response.body).toHaveProperty('verifierDid');
      expect(response.body.verifierDid).toMatch(/^did:key:zQ3/);
    });
  });

  describe('POST /api/presentation-requests', () => {
    it('should create a presentation request', async () => {
      const response = await request(app)
        .post('/api/presentation-requests')
        .send({
          credentialTypes: ['IdentityCredential'],
          purpose: 'Test login',
          requiredFields: ['name', 'email']
        })
        .expect(200);

      expect(response.body).toHaveProperty('authRequest');
      expect(response.body).toHaveProperty('requestUrl');
      expect(response.body).toHaveProperty('state');

      const { authRequest } = response.body;
      expect(authRequest.response_type).toBe('vp_token');
      expect(authRequest).toHaveProperty('nonce');
      expect(authRequest).toHaveProperty('state');
      expect(authRequest).toHaveProperty('presentation_definition');

      const { presentation_definition } = authRequest;
      expect(presentation_definition).toHaveProperty('id');
      expect(presentation_definition.purpose).toBe('Test login');
      expect(presentation_definition.input_descriptors).toHaveLength(1);
      expect(presentation_definition.input_descriptors[0].id).toBe('IdentityCredential_0');
    });

    it('should return 400 if credentialTypes is missing', async () => {
      const response = await request(app)
        .post('/api/presentation-requests')
        .send({
          purpose: 'Test login'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('credentialTypes');
    });

    it('should return 400 if credentialTypes is empty', async () => {
      const response = await request(app)
        .post('/api/presentation-requests')
        .send({
          credentialTypes: [],
          purpose: 'Test login'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should use default purpose if not provided', async () => {
      const response = await request(app)
        .post('/api/presentation-requests')
        .send({
          credentialTypes: ['IdentityCredential']
        })
        .expect(200);

      expect(response.body.authRequest.presentation_definition.purpose).toBe('Login verification');
    });
  });

  describe('GET /api/presentation-requests/:state', () => {
    let testState: string;

    beforeAll(async () => {
      const response = await request(app)
        .post('/api/presentation-requests')
        .send({
          credentialTypes: ['IdentityCredential']
        });
      testState = response.body.state;
    });

    it('should return request status', async () => {
      const response = await request(app)
        .get(`/api/presentation-requests/${testState}`)
        .expect(200);

      expect(response.body).toHaveProperty('state', testState);
      expect(response.body).toHaveProperty('verified', false);
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('expiresAt');
    });

    it('should return 404 for non-existent state', async () => {
      const response = await request(app)
        .get('/api/presentation-requests/invalid_state')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/presentations/verify', () => {
    it('should return 400 if vp_token is missing', async () => {
      const response = await request(app)
        .post('/api/presentations/verify')
        .send({
          state: 'some_state'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('vp_token');
    });

    it('should return 400 if state is missing', async () => {
      const response = await request(app)
        .post('/api/presentations/verify')
        .send({
          vp_token: 'some_token'
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('state');
    });

    it('should return error for invalid state', async () => {
      const response = await request(app)
        .post('/api/presentations/verify')
        .send({
          vp_token: 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJ2cCI6e30sIm5vbmNlIjoidGVzdCJ9.test',
          state: 'invalid_state'
        })
        .expect(500);

      expect(response.body).toHaveProperty('verified', false);
      expect(response.body).toHaveProperty('error');
    });
  });
});
