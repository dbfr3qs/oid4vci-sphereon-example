import { OID4VPVerifierService } from '../../src/services/oid4vp-verifier.service';
import { VeramoAgentService } from '../../src/services/veramo-agent.service';
import { CredentialService } from '../../src/services/credential.service';
import { IIdentifier } from '@veramo/core';

describe('OID4VPVerifierService', () => {
  let verifierService: OID4VPVerifierService;
  let veramoService: VeramoAgentService;
  let credentialService: CredentialService;
  let verifierIdentifier: IIdentifier;
  let issuerIdentifier: IIdentifier;
  let holderIdentifier: IIdentifier;

  beforeAll(async () => {
    veramoService = new VeramoAgentService();
    credentialService = new CredentialService(veramoService);
    
    verifierIdentifier = await veramoService.createIdentifier();
    issuerIdentifier = await veramoService.createIdentifier();
    holderIdentifier = await veramoService.createIdentifier();
    
    verifierService = new OID4VPVerifierService({
      verifierDid: verifierIdentifier.did,
      verifierUrl: 'https://verifier.example.com',
      credentialService,
    });
  });

  describe('Presentation Request Generation', () => {
    it('should create presentation request with definition', async () => {
      const request = await verifierService.createPresentationRequest({
        credentialTypes: ['IdentityCredential'],
        purpose: 'Verify your identity',
      });

      expect(request).toBeDefined();
      expect(request.response_type).toBe('vp_token');
      expect(request.client_id).toBe('https://verifier.example.com');
      expect(request.redirect_uri).toBeDefined();
      expect(request.nonce).toBeDefined();
      expect(request.state).toBeDefined();
      expect(request.presentation_definition).toBeDefined();
      expect(request.presentation_definition.input_descriptors).toHaveLength(1);
    });

    it('should generate unique nonces and states', async () => {
      const request1 = await verifierService.createPresentationRequest({
        credentialTypes: ['IdentityCredential'],
      });

      const request2 = await verifierService.createPresentationRequest({
        credentialTypes: ['IdentityCredential'],
      });

      expect(request1.nonce).not.toBe(request2.nonce);
      expect(request1.state).not.toBe(request2.state);
    });

    it('should create request URL for QR code', async () => {
      const request = await verifierService.createPresentationRequest({
        credentialTypes: ['IdentityCredential'],
      });

      const requestUrl = verifierService.createRequestUrl(request);

      expect(requestUrl).toBeDefined();
      expect(requestUrl).toContain('openid4vp://');
      expect(requestUrl).toContain('response_type=vp_token');
      expect(requestUrl).toContain('client_id=');
      expect(requestUrl).toContain('nonce=');
    });

    it('should support multiple credential types', async () => {
      const request = await verifierService.createPresentationRequest({
        credentialTypes: ['IdentityCredential', 'EmailCredential'],
      });

      expect(request.presentation_definition.input_descriptors).toHaveLength(2);
      expect(request.presentation_definition.input_descriptors[0].id).toContain('IdentityCredential');
      expect(request.presentation_definition.input_descriptors[1].id).toContain('EmailCredential');
    });

    it('should retrieve request metadata by state', async () => {
      const request = await verifierService.createPresentationRequest({
        credentialTypes: ['IdentityCredential'],
        purpose: 'Test verification',
      });

      const metadata = await verifierService.getRequestMetadata(request.state);

      expect(metadata).toBeDefined();
      expect(metadata!.state).toBe(request.state);
      expect(metadata!.nonce).toBe(request.nonce);
      expect(metadata!.presentationDefinition).toEqual(request.presentation_definition);
      expect(metadata!.verified).toBe(false);
    });

    it('should return null for non-existent state', async () => {
      const metadata = await verifierService.getRequestMetadata('invalid-state');
      expect(metadata).toBeNull();
    });

    it('should set expiration time for requests', async () => {
      const request = await verifierService.createPresentationRequest({
        credentialTypes: ['IdentityCredential'],
      });

      const metadata = await verifierService.getRequestMetadata(request.state);

      expect(metadata).toBeDefined();
      expect(metadata!.expiresAt).toBeInstanceOf(Date);
      
      const now = new Date();
      const expiresAt = metadata!.expiresAt;
      const diffSeconds = (expiresAt.getTime() - now.getTime()) / 1000;
      
      // Should expire in approximately 10 minutes (allow 10 second variance)
      expect(diffSeconds).toBeGreaterThan(590);
      expect(diffSeconds).toBeLessThan(610);
    });
  });

  describe('Presentation Verification', () => {
    it('should verify valid presentation with matching credentials', async () => {
      // Create presentation request
      const request = await verifierService.createPresentationRequest({
        credentialTypes: ['IdentityCredential'],
      });

      // Create a credential
      const credential = await credentialService.createCredential({
        issuerDid: issuerIdentifier.did,
        subjectDid: holderIdentifier.did,
        credentialSubject: {
          id: holderIdentifier.did,
          name: 'Alice',
          email: 'alice@example.com',
        },
      });

      // Create presentation without domain (Veramo limitation with challenge+domain)
      const presentation = await credentialService.createPresentation({
        holderDid: holderIdentifier.did,
        verifiableCredentials: [credential],
        challenge: request.nonce,
      });

      // Verify presentation
      const result = await verifierService.verifyPresentation(
        presentation.proof.jwt,
        request.state
      );

      expect(result.verified).toBe(true);
      expect(result.presentationValid).toBe(true);
      expect(result.credentialsValid).toBe(true);
    });

    it('should reject presentation with invalid state', async () => {
      const presentation = await credentialService.createPresentation({
        holderDid: holderIdentifier.did,
        verifiableCredentials: [],
      });

      await expect(
        verifierService.verifyPresentation(presentation.proof.jwt, 'invalid-state')
      ).rejects.toThrow('Invalid or expired presentation request');
    });

    it('should reject presentation with wrong nonce', async () => {
      const request = await verifierService.createPresentationRequest({
        credentialTypes: ['IdentityCredential'],
      });

      const credential = await credentialService.createCredential({
        issuerDid: issuerIdentifier.did,
        subjectDid: holderIdentifier.did,
        credentialSubject: {
          id: holderIdentifier.did,
          name: 'Bob',
        },
      });

      // Create presentation with wrong challenge
      const presentation = await credentialService.createPresentation({
        holderDid: holderIdentifier.did,
        verifiableCredentials: [credential],
        challenge: 'wrong-nonce',
        domain: 'https://verifier.example.com',
      });

      const result = await verifierService.verifyPresentation(
        presentation.proof.jwt,
        request.state
      );

      expect(result.verified).toBe(false);
      expect(result.error?.message).toContain('nonce');
    });

    it('should reject expired presentation request', async () => {
      const request = await verifierService.createPresentationRequest({
        credentialTypes: ['IdentityCredential'],
      });

      // Manually expire the request
      await verifierService['expireRequest'](request.state);

      const credential = await credentialService.createCredential({
        issuerDid: issuerIdentifier.did,
        subjectDid: holderIdentifier.did,
        credentialSubject: {
          id: holderIdentifier.did,
          name: 'Charlie',
        },
      });

      const presentation = await credentialService.createPresentation({
        holderDid: holderIdentifier.did,
        verifiableCredentials: [credential],
        challenge: request.nonce,
        domain: 'https://verifier.example.com',
      });

      await expect(
        verifierService.verifyPresentation(presentation.proof.jwt, request.state)
      ).rejects.toThrow('Invalid or expired presentation request');
    });

    it('should mark request as verified after successful verification', async () => {
      const request = await verifierService.createPresentationRequest({
        credentialTypes: ['IdentityCredential'],
      });

      const credential = await credentialService.createCredential({
        issuerDid: issuerIdentifier.did,
        subjectDid: holderIdentifier.did,
        credentialSubject: {
          id: holderIdentifier.did,
          name: 'David',
        },
      });

      const presentation = await credentialService.createPresentation({
        holderDid: holderIdentifier.did,
        verifiableCredentials: [credential],
        challenge: request.nonce,
      });

      await verifierService.verifyPresentation(presentation.proof.jwt, request.state);

      const metadata = await verifierService.getRequestMetadata(request.state);
      expect(metadata!.verified).toBe(true);
    });
  });
});
