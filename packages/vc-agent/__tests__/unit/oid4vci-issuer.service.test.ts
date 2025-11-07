import { OID4VCIssuerService } from '../../src/services/oid4vci-issuer.service';
import { VeramoAgentService } from '../../src/services/veramo-agent.service';
import { CredentialService } from '../../src/services/credential.service';
import { IIdentifier } from '@veramo/core';

describe('OID4VCIssuerService', () => {
  let issuerService: OID4VCIssuerService;
  let veramoService: VeramoAgentService;
  let credentialService: CredentialService;
  let issuerIdentifier: IIdentifier;

  beforeAll(async () => {
    veramoService = new VeramoAgentService();
    credentialService = new CredentialService(veramoService);
    issuerIdentifier = await veramoService.createIdentifier();
    
    issuerService = new OID4VCIssuerService({
      issuerDid: issuerIdentifier.did,
      issuerUrl: 'https://issuer.example.com',
      credentialService,
    });
  });

  describe('Credential Offer Generation', () => {
    it('should generate credential offer with pre-authorized code', async () => {
      const offer = await issuerService.createCredentialOffer({
        credentialType: 'IdentityCredential',
        credentialSubject: {
          name: 'Alice Smith',
          email: 'alice@example.com',
        },
        subjectDid: 'did:key:z6MkTest123',
      });

      expect(offer).toBeDefined();
      expect(offer.credential_issuer).toBe('https://issuer.example.com');
      expect(offer.credentials).toContain('IdentityCredential');
      expect(offer.grants).toBeDefined();
      expect(offer.grants['urn:ietf:params:oauth:grant-type:pre-authorized_code']).toBeDefined();
      expect(offer.grants['urn:ietf:params:oauth:grant-type:pre-authorized_code']['pre-authorized_code']).toBeDefined();
    });

    it('should generate unique pre-authorized codes', async () => {
      const offer1 = await issuerService.createCredentialOffer({
        credentialType: 'IdentityCredential',
        credentialSubject: { name: 'User 1' },
        subjectDid: 'did:key:z6MkTest1',
      });

      const offer2 = await issuerService.createCredentialOffer({
        credentialType: 'IdentityCredential',
        credentialSubject: { name: 'User 2' },
        subjectDid: 'did:key:z6MkTest2',
      });

      const code1 = offer1.grants['urn:ietf:params:oauth:grant-type:pre-authorized_code']['pre-authorized_code'];
      const code2 = offer2.grants['urn:ietf:params:oauth:grant-type:pre-authorized_code']['pre-authorized_code'];

      expect(code1).not.toBe(code2);
    });

    it('should create offer URL with correct format', async () => {
      const offer = await issuerService.createCredentialOffer({
        credentialType: 'IdentityCredential',
        credentialSubject: { name: 'Bob' },
        subjectDid: 'did:key:z6MkTest456',
      });

      const offerUrl = issuerService.createOfferUrl(offer);

      expect(offerUrl).toBeDefined();
      expect(offerUrl).toContain('openid-credential-offer://');
      expect(offerUrl).toContain('credential_offer=');
    });

    it('should support user PIN requirement', async () => {
      const offer = await issuerService.createCredentialOffer({
        credentialType: 'IdentityCredential',
        credentialSubject: { name: 'Charlie' },
        subjectDid: 'did:key:z6MkTest789',
        userPinRequired: true,
      });

      expect(offer.grants['urn:ietf:params:oauth:grant-type:pre-authorized_code'].user_pin_required).toBe(true);
    });

    it('should retrieve offer metadata by pre-authorized code', async () => {
      const offer = await issuerService.createCredentialOffer({
        credentialType: 'IdentityCredential',
        credentialSubject: { name: 'David' },
        subjectDid: 'did:key:z6MkTestABC',
      });

      const code = offer.grants['urn:ietf:params:oauth:grant-type:pre-authorized_code']['pre-authorized_code'];
      const metadata = await issuerService.getOfferMetadata(code);

      expect(metadata).toBeDefined();
      expect(metadata).not.toBeNull();
      expect(metadata!.preAuthorizedCode).toBe(code);
      expect(metadata!.credentialType).toBe('IdentityCredential');
      expect(metadata!.credentialSubject.name).toBe('David');
      expect(metadata!.used).toBe(false);
    });

    it('should return null for non-existent pre-authorized code', async () => {
      const metadata = await issuerService.getOfferMetadata('invalid-code-123');
      expect(metadata).toBeNull();
    });

    it('should set expiration time for offers', async () => {
      const offer = await issuerService.createCredentialOffer({
        credentialType: 'IdentityCredential',
        credentialSubject: { name: 'Eve' },
        subjectDid: 'did:key:z6MkTestDEF',
        expiresIn: 3600, // 1 hour
      });

      const code = offer.grants['urn:ietf:params:oauth:grant-type:pre-authorized_code']['pre-authorized_code'];
      const metadata = await issuerService.getOfferMetadata(code);

      expect(metadata).toBeDefined();
      expect(metadata!.expiresAt).toBeInstanceOf(Date);
      
      const now = new Date();
      const expiresAt = metadata!.expiresAt;
      const diffSeconds = (expiresAt.getTime() - now.getTime()) / 1000;
      
      // Should expire in approximately 1 hour (allow 10 second variance)
      expect(diffSeconds).toBeGreaterThan(3590);
      expect(diffSeconds).toBeLessThan(3610);
    });
  });

  describe('Token Exchange', () => {
    it('should exchange pre-authorized code for access token', async () => {
      // Create an offer first
      const offer = await issuerService.createCredentialOffer({
        credentialType: 'IdentityCredential',
        credentialSubject: { name: 'Frank' },
        subjectDid: 'did:key:z6MkTestGHI',
      });

      const preAuthCode = offer.grants['urn:ietf:params:oauth:grant-type:pre-authorized_code']['pre-authorized_code'];

      // Exchange for token
      const tokenResponse = await issuerService.exchangePreAuthorizedCode({
        grant_type: 'urn:ietf:params:oauth:grant-type:pre-authorized_code',
        'pre-authorized_code': preAuthCode,
      });

      expect(tokenResponse).toBeDefined();
      expect(tokenResponse.access_token).toBeDefined();
      expect(tokenResponse.token_type).toBe('bearer');
      expect(tokenResponse.expires_in).toBeGreaterThan(0);
    });

    it('should reject invalid pre-authorized code', async () => {
      await expect(
        issuerService.exchangePreAuthorizedCode({
          grant_type: 'urn:ietf:params:oauth:grant-type:pre-authorized_code',
          'pre-authorized_code': 'invalid-code',
        })
      ).rejects.toThrow('Invalid pre-authorized code');
    });

    it('should reject expired pre-authorized code', async () => {
      // Create offer with 1 second expiration
      const offer = await issuerService.createCredentialOffer({
        credentialType: 'IdentityCredential',
        credentialSubject: { name: 'Grace' },
        subjectDid: 'did:key:z6MkTestJKL',
        expiresIn: 1, // Expires in 1 second
      });

      const preAuthCode = offer.grants['urn:ietf:params:oauth:grant-type:pre-authorized_code']['pre-authorized_code'];

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      await expect(
        issuerService.exchangePreAuthorizedCode({
          grant_type: 'urn:ietf:params:oauth:grant-type:pre-authorized_code',
          'pre-authorized_code': preAuthCode,
        })
      ).rejects.toThrow('Invalid pre-authorized code');
    });

    it('should reject already used pre-authorized code', async () => {
      const offer = await issuerService.createCredentialOffer({
        credentialType: 'IdentityCredential',
        credentialSubject: { name: 'Henry' },
        subjectDid: 'did:key:z6MkTestMNO',
      });

      const preAuthCode = offer.grants['urn:ietf:params:oauth:grant-type:pre-authorized_code']['pre-authorized_code'];

      // First exchange should succeed
      await issuerService.exchangePreAuthorizedCode({
        grant_type: 'urn:ietf:params:oauth:grant-type:pre-authorized_code',
        'pre-authorized_code': preAuthCode,
      });

      // Second exchange should fail
      await expect(
        issuerService.exchangePreAuthorizedCode({
          grant_type: 'urn:ietf:params:oauth:grant-type:pre-authorized_code',
          'pre-authorized_code': preAuthCode,
        })
      ).rejects.toThrow('Pre-authorized code already used');
    });

    it('should validate user PIN when required', async () => {
      const offer = await issuerService.createCredentialOffer({
        credentialType: 'IdentityCredential',
        credentialSubject: { name: 'Iris' },
        subjectDid: 'did:key:z6MkTestPQR',
        userPinRequired: true,
      });

      const preAuthCode = offer.grants['urn:ietf:params:oauth:grant-type:pre-authorized_code']['pre-authorized_code'];
      const metadata = await issuerService.getOfferMetadata(preAuthCode);

      // Should fail without PIN
      await expect(
        issuerService.exchangePreAuthorizedCode({
          grant_type: 'urn:ietf:params:oauth:grant-type:pre-authorized_code',
          'pre-authorized_code': preAuthCode,
        })
      ).rejects.toThrow('User PIN required');

      // Should fail with wrong PIN
      await expect(
        issuerService.exchangePreAuthorizedCode({
          grant_type: 'urn:ietf:params:oauth:grant-type:pre-authorized_code',
          'pre-authorized_code': preAuthCode,
          user_pin: '000000',
        })
      ).rejects.toThrow('Invalid user PIN');

      // Should succeed with correct PIN
      const tokenResponse = await issuerService.exchangePreAuthorizedCode({
        grant_type: 'urn:ietf:params:oauth:grant-type:pre-authorized_code',
        'pre-authorized_code': preAuthCode,
        user_pin: metadata!.userPin,
      });

      expect(tokenResponse).toBeDefined();
      expect(tokenResponse.access_token).toBeDefined();
    });
  });

  describe('Credential Issuance', () => {
    it('should issue credential with valid access token', async () => {
      // Create offer and get token
      const offer = await issuerService.createCredentialOffer({
        credentialType: 'IdentityCredential',
        credentialSubject: { 
          name: 'Jack',
          email: 'jack@example.com',
        },
        subjectDid: 'did:key:z6MkTestSTU',
      });

      const preAuthCode = offer.grants['urn:ietf:params:oauth:grant-type:pre-authorized_code']['pre-authorized_code'];
      const tokenResponse = await issuerService.exchangePreAuthorizedCode({
        grant_type: 'urn:ietf:params:oauth:grant-type:pre-authorized_code',
        'pre-authorized_code': preAuthCode,
      });

      // Issue credential
      const credentialResponse = await issuerService.issueCredential({
        format: 'jwt_vc_json',
        types: ['VerifiableCredential', 'IdentityCredential'],
      }, tokenResponse.access_token);

      expect(credentialResponse).toBeDefined();
      expect(credentialResponse.format).toBe('jwt_vc_json');
      expect(credentialResponse.credential).toBeDefined();
      expect(typeof credentialResponse.credential).toBe('string');
      // JWT should have 3 parts separated by dots
      expect(credentialResponse.credential.split('.').length).toBe(3);
    });

    it('should reject credential request with invalid token', async () => {
      await expect(
        issuerService.issueCredential({
          format: 'jwt_vc_json',
          types: ['VerifiableCredential', 'IdentityCredential'],
        }, 'invalid-token')
      ).rejects.toThrow('Invalid access token');
    });

    it('should reject credential request with expired token', async () => {
      // Create offer and get token
      const offer = await issuerService.createCredentialOffer({
        credentialType: 'IdentityCredential',
        credentialSubject: { name: 'Kate' },
        subjectDid: 'did:key:z6MkTestVWX',
      });

      const preAuthCode = offer.grants['urn:ietf:params:oauth:grant-type:pre-authorized_code']['pre-authorized_code'];
      
      // Exchange with very short expiration
      const tokenResponse = await issuerService.exchangePreAuthorizedCode({
        grant_type: 'urn:ietf:params:oauth:grant-type:pre-authorized_code',
        'pre-authorized_code': preAuthCode,
      });

      // Manually expire the token
      await issuerService['expireToken'](tokenResponse.access_token);

      await expect(
        issuerService.issueCredential({
          format: 'jwt_vc_json',
          types: ['VerifiableCredential', 'IdentityCredential'],
        }, tokenResponse.access_token)
      ).rejects.toThrow('Invalid access token');
    });

    it('should only allow token to be used once', async () => {
      const offer = await issuerService.createCredentialOffer({
        credentialType: 'IdentityCredential',
        credentialSubject: { name: 'Leo' },
        subjectDid: 'did:key:z6MkTestYZA',
      });

      const preAuthCode = offer.grants['urn:ietf:params:oauth:grant-type:pre-authorized_code']['pre-authorized_code'];
      const tokenResponse = await issuerService.exchangePreAuthorizedCode({
        grant_type: 'urn:ietf:params:oauth:grant-type:pre-authorized_code',
        'pre-authorized_code': preAuthCode,
      });

      // First issuance should succeed
      await issuerService.issueCredential({
        format: 'jwt_vc_json',
        types: ['VerifiableCredential', 'IdentityCredential'],
      }, tokenResponse.access_token);

      // Second issuance should fail
      await expect(
        issuerService.issueCredential({
          format: 'jwt_vc_json',
          types: ['VerifiableCredential', 'IdentityCredential'],
        }, tokenResponse.access_token)
      ).rejects.toThrow('Invalid access token');
    });
  });
});
