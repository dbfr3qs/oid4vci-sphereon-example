import request from 'supertest';
import { initializeApp } from '../app';
import type { Express } from 'express';

describe('OID4VCI Issuer API', () => {
  let app: Express;

  beforeAll(async () => {
    app = await initializeApp();
  });
  describe('POST /api/offers', () => {
    it('should create a credential offer', async () => {
      const response = await request(app)
        .post('/api/offers')
        .send({
          credentialType: 'IdentityCredential',
          credentialSubject: {
            name: 'Alice Wonderland',
            email: 'alice@example.com',
            dateOfBirth: '1990-01-01',
          },
          userPinRequired: true,
        })
        .expect(201);

      expect(response.body).toHaveProperty('offer');
      expect(response.body).toHaveProperty('qrCodeUrl');
      expect(response.body).toHaveProperty('userPin');
      expect(response.body.offer).toHaveProperty('credential_issuer');
      expect(response.body.offer).toHaveProperty('credentials');
      expect(response.body.offer).toHaveProperty('grants');
    });

    it('should create offer without PIN when not required', async () => {
      const response = await request(app)
        .post('/api/offers')
        .send({
          credentialType: 'IdentityCredential',
          credentialSubject: {
            name: 'Bob Builder',
          },
          userPinRequired: false,
        })
        .expect(201);

      expect(response.body).toHaveProperty('offer');
      expect(response.body).toHaveProperty('qrCodeUrl');
      expect(response.body.userPin).toBeUndefined();
    });

    it('should return 400 for invalid request', async () => {
      await request(app)
        .post('/api/offers')
        .send({})
        .expect(400);
    });
  });

  describe('POST /api/token', () => {
    it('should exchange pre-authorized code for access token', async () => {
      // First create an offer
      const offerResponse = await request(app)
        .post('/api/offers')
        .send({
          credentialType: 'IdentityCredential',
          credentialSubject: { name: 'Charlie' },
          userPinRequired: true,
        });

      const preAuthCode = offerResponse.body.offer.grants[
        'urn:ietf:params:oauth:grant-type:pre-authorized_code'
      ]['pre-authorized_code'];
      const userPin = offerResponse.body.userPin;

      // Exchange code for token
      const response = await request(app)
        .post('/api/token')
        .send({
          grant_type: 'urn:ietf:params:oauth:grant-type:pre-authorized_code',
          'pre-authorized_code': preAuthCode,
          user_pin: userPin,
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('token_type', 'bearer');
      expect(response.body).toHaveProperty('expires_in');
    });

    it('should reject invalid pre-authorized code', async () => {
      await request(app)
        .post('/api/token')
        .send({
          grant_type: 'urn:ietf:params:oauth:grant-type:pre-authorized_code',
          'pre-authorized_code': 'invalid-code',
        })
        .expect(400);
    });
  });

  describe('POST /api/credential', () => {
    it('should issue credential with valid access token', async () => {
      // Create offer
      const offerResponse = await request(app)
        .post('/api/offers')
        .send({
          credentialType: 'IdentityCredential',
          credentialSubject: {
            name: 'David',
            email: 'david@example.com',
          },
          userPinRequired: false,
        });

      const preAuthCode = offerResponse.body.offer.grants[
        'urn:ietf:params:oauth:grant-type:pre-authorized_code'
      ]['pre-authorized_code'];

      // Exchange for token
      const tokenResponse = await request(app)
        .post('/api/token')
        .send({
          grant_type: 'urn:ietf:params:oauth:grant-type:pre-authorized_code',
          'pre-authorized_code': preAuthCode,
        });

      const accessToken = tokenResponse.body.access_token;

      // Request credential
      const response = await request(app)
        .post('/api/credential')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          format: 'jwt_vc_json',
          types: ['VerifiableCredential', 'IdentityCredential'],
        })
        .expect(200);

      expect(response.body).toHaveProperty('credential');
      expect(response.body).toHaveProperty('format', 'jwt_vc_json');
      expect(typeof response.body.credential).toBe('string');
      expect(response.body.credential.split('.')).toHaveLength(3); // JWT format
    });

    it('should reject request without authorization', async () => {
      await request(app)
        .post('/api/credential')
        .send({
          format: 'jwt_vc_json',
          types: ['VerifiableCredential'],
        })
        .expect(401);
    });

    it('should reject request with invalid token', async () => {
      await request(app)
        .post('/api/credential')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          format: 'jwt_vc_json',
          types: ['VerifiableCredential'],
        })
        .expect(401);
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('service', 'oid4vci-issuer');
    });
  });
});
