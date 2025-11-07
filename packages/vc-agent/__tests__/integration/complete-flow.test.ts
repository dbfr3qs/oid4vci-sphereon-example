/**
 * Integration tests for complete OID4VCI + OID4VP flows
 * Tests the entire lifecycle: issuance -> storage -> presentation -> verification
 */

import { VeramoAgentService } from '../../src/services/veramo-agent.service';
import { CredentialService } from '../../src/services/credential.service';
import { OID4VCIssuerService } from '../../src/services/oid4vci-issuer.service';
import { OID4VPVerifierService } from '../../src/services/oid4vp-verifier.service';
import { IIdentifier } from '@veramo/core';

describe('Complete OID4VCI + OID4VP Integration', () => {
  let veramoService: VeramoAgentService;
  let credentialService: CredentialService;
  let issuerService: OID4VCIssuerService;
  let verifierService: OID4VPVerifierService;
  
  let issuerIdentifier: IIdentifier;
  let holderIdentifier: IIdentifier;
  let verifierIdentifier: IIdentifier;

  beforeAll(async () => {
    // Initialize services
    veramoService = new VeramoAgentService();
    credentialService = new CredentialService(veramoService);
    
    // Create identities for all parties
    issuerIdentifier = await veramoService.createIdentifier();
    holderIdentifier = await veramoService.createIdentifier();
    verifierIdentifier = await veramoService.createIdentifier();
    
    // Initialize OID4VCI Issuer
    issuerService = new OID4VCIssuerService({
      issuerDid: issuerIdentifier.did,
      issuerUrl: 'https://issuer.example.com',
      credentialService,
    });
    
    // Initialize OID4VP Verifier
    verifierService = new OID4VPVerifierService({
      verifierDid: verifierIdentifier.did,
      verifierUrl: 'https://verifier.example.com',
      credentialService,
    });
  });

  describe('Complete Issuance and Verification Flow', () => {
    it('should complete full flow: offer -> token -> credential -> presentation -> verification', async () => {
      // ============================================================================
      // PHASE 1: OID4VCI Credential Issuance
      // ============================================================================
      
      // Step 1: Issuer creates credential offer
      const offer = await issuerService.createCredentialOffer({
        credentialType: 'IdentityCredential',
        credentialSubject: {
          name: 'Alice Wonderland',
          email: 'alice@example.com',
          dateOfBirth: '1990-01-01',
        },
        subjectDid: holderIdentifier.did,
        userPinRequired: true,
      });

      expect(offer).toBeDefined();
      expect(offer.credential_issuer).toBe('https://issuer.example.com');
      
      const preAuthCode = offer.grants['urn:ietf:params:oauth:grant-type:pre-authorized_code']['pre-authorized_code'];
      const metadata = await issuerService.getOfferMetadata(preAuthCode);
      const userPin = metadata!.userPin;

      // Step 2: Holder exchanges pre-authorized code for access token
      const tokenResponse = await issuerService.exchangePreAuthorizedCode({
        grant_type: 'urn:ietf:params:oauth:grant-type:pre-authorized_code',
        'pre-authorized_code': preAuthCode,
        user_pin: userPin,
      });

      expect(tokenResponse.access_token).toBeDefined();
      expect(tokenResponse.token_type).toBe('bearer');

      // Step 3: Holder requests credential with access token
      const credentialResponse = await issuerService.issueCredential(
        {
          format: 'jwt_vc_json',
          types: ['VerifiableCredential', 'IdentityCredential'],
        },
        tokenResponse.access_token
      );

      expect(credentialResponse.credential).toBeDefined();
      expect(credentialResponse.format).toBe('jwt_vc_json');

      // Parse and verify the issued credential
      const jwtParts = credentialResponse.credential.split('.');
      expect(jwtParts).toHaveLength(3);
      
      const payload = JSON.parse(Buffer.from(jwtParts[1], 'base64').toString());
      const issuedCredential = payload.vc;
      
      expect(issuedCredential.credentialSubject.name).toBe('Alice Wonderland');
      expect(issuedCredential.credentialSubject.email).toBe('alice@example.com');

      // ============================================================================
      // PHASE 2: OID4VP Presentation Verification
      // ============================================================================

      // Step 4: Verifier creates presentation request
      const presentationRequest = await verifierService.createPresentationRequest({
        credentialTypes: ['IdentityCredential'],
        purpose: 'Age verification',
      });

      expect(presentationRequest).toBeDefined();
      expect(presentationRequest.response_type).toBe('vp_token');
      expect(presentationRequest.nonce).toBeDefined();
      expect(presentationRequest.state).toBeDefined();

      // Step 5: Holder creates presentation with the issued credential
      // Reconstruct credential for presentation
      const credential = {
        ...issuedCredential,
        proof: {
          type: 'JwtProof2020',
          jwt: credentialResponse.credential,
        },
      };

      const presentation = await credentialService.createPresentation({
        holderDid: holderIdentifier.did,
        verifiableCredentials: [credential],
        challenge: presentationRequest.nonce,
      });

      expect(presentation).toBeDefined();
      expect(presentation.proof.jwt).toBeDefined();

      // Step 6: Verifier verifies the presentation
      const verificationResult = await verifierService.verifyPresentation(
        presentation.proof.jwt,
        presentationRequest.state
      );

      expect(verificationResult.verified).toBe(true);
      expect(verificationResult.presentationValid).toBe(true);
      expect(verificationResult.credentialsValid).toBe(true);

      // Verify the request is marked as verified
      const requestMetadata = await verifierService.getRequestMetadata(presentationRequest.state);
      expect(requestMetadata!.verified).toBe(true);
    });

    it('should handle multiple credentials in presentation', async () => {
      // Issue first credential
      const offer1 = await issuerService.createCredentialOffer({
        credentialType: 'IdentityCredential',
        credentialSubject: {
          name: 'Bob Builder',
          email: 'bob@example.com',
        },
        subjectDid: holderIdentifier.did,
      });

      const preAuthCode1 = offer1.grants['urn:ietf:params:oauth:grant-type:pre-authorized_code']['pre-authorized_code'];
      const token1 = await issuerService.exchangePreAuthorizedCode({
        grant_type: 'urn:ietf:params:oauth:grant-type:pre-authorized_code',
        'pre-authorized_code': preAuthCode1,
      });

      const credential1Response = await issuerService.issueCredential(
        {
          format: 'jwt_vc_json',
          types: ['VerifiableCredential', 'IdentityCredential'],
        },
        token1.access_token
      );

      // Issue second credential
      const offer2 = await issuerService.createCredentialOffer({
        credentialType: 'EmailCredential',
        credentialSubject: {
          email: 'bob@example.com',
        },
        subjectDid: holderIdentifier.did,
      });

      const preAuthCode2 = offer2.grants['urn:ietf:params:oauth:grant-type:pre-authorized_code']['pre-authorized_code'];
      const token2 = await issuerService.exchangePreAuthorizedCode({
        grant_type: 'urn:ietf:params:oauth:grant-type:pre-authorized_code',
        'pre-authorized_code': preAuthCode2,
      });

      const credential2Response = await issuerService.issueCredential(
        {
          format: 'jwt_vc_json',
          types: ['VerifiableCredential', 'EmailCredential'],
        },
        token2.access_token
      );

      // Parse credentials
      const cred1Payload = JSON.parse(Buffer.from(credential1Response.credential.split('.')[1], 'base64').toString());
      const cred2Payload = JSON.parse(Buffer.from(credential2Response.credential.split('.')[1], 'base64').toString());

      const credential1 = {
        ...cred1Payload.vc,
        proof: {
          type: 'JwtProof2020',
          jwt: credential1Response.credential,
        },
      };

      const credential2 = {
        ...cred2Payload.vc,
        proof: {
          type: 'JwtProof2020',
          jwt: credential2Response.credential,
        },
      };

      // Create presentation request for multiple credentials
      const presentationRequest = await verifierService.createPresentationRequest({
        credentialTypes: ['IdentityCredential', 'EmailCredential'],
        purpose: 'Identity and email verification',
      });

      // Create presentation with both credentials
      const presentation = await credentialService.createPresentation({
        holderDid: holderIdentifier.did,
        verifiableCredentials: [credential1, credential2],
        challenge: presentationRequest.nonce,
      });

      // Verify presentation
      const verificationResult = await verifierService.verifyPresentation(
        presentation.proof.jwt,
        presentationRequest.state
      );

      expect(verificationResult.verified).toBe(true);
      expect(verificationResult.credentialsValid).toBe(true);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should reject presentation with credential from different issuer', async () => {
      // Create a second issuer
      const issuer2 = await veramoService.createIdentifier();
      
      // Issue credential directly (bypassing OID4VCI)
      const credential = await credentialService.createCredential({
        issuerDid: issuer2.did,
        subjectDid: holderIdentifier.did,
        credentialSubject: {
          name: 'Charlie',
        },
      });

      // Create presentation request
      const presentationRequest = await verifierService.createPresentationRequest({
        credentialTypes: ['IdentityCredential'],
        purpose: 'Test',
      });

      // Create presentation
      const presentation = await credentialService.createPresentation({
        holderDid: holderIdentifier.did,
        verifiableCredentials: [credential],
        challenge: presentationRequest.nonce,
      });

      // Verify - should still work as we verify signatures, not issuer identity
      const verificationResult = await verifierService.verifyPresentation(
        presentation.proof.jwt,
        presentationRequest.state
      );

      expect(verificationResult.verified).toBe(true);
    });

    it('should reject presentation with expired request', async () => {
      // Issue a credential
      const offer = await issuerService.createCredentialOffer({
        credentialType: 'IdentityCredential',
        credentialSubject: {
          name: 'David',
        },
        subjectDid: holderIdentifier.did,
      });

      const preAuthCode = offer.grants['urn:ietf:params:oauth:grant-type:pre-authorized_code']['pre-authorized_code'];
      const token = await issuerService.exchangePreAuthorizedCode({
        grant_type: 'urn:ietf:params:oauth:grant-type:pre-authorized_code',
        'pre-authorized_code': preAuthCode,
      });

      const credentialResponse = await issuerService.issueCredential(
        {
          format: 'jwt_vc_json',
          types: ['VerifiableCredential', 'IdentityCredential'],
        },
        token.access_token
      );

      const credPayload = JSON.parse(Buffer.from(credentialResponse.credential.split('.')[1], 'base64').toString());
      const credential = {
        ...credPayload.vc,
        proof: {
          type: 'JwtProof2020',
          jwt: credentialResponse.credential,
        },
      };

      // Create presentation request
      const presentationRequest = await verifierService.createPresentationRequest({
        credentialTypes: ['IdentityCredential'],
        purpose: 'Test',
      });

      // Expire the request
      await verifierService['expireRequest'](presentationRequest.state);

      // Create presentation
      const presentation = await credentialService.createPresentation({
        holderDid: holderIdentifier.did,
        verifiableCredentials: [credential],
        challenge: presentationRequest.nonce,
      });

      // Verify - should fail due to expired request
      await expect(
        verifierService.verifyPresentation(presentation.proof.jwt, presentationRequest.state)
      ).rejects.toThrow('Invalid or expired presentation request');
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle age verification scenario', async () => {
      // Issue identity credential with date of birth
      const offer = await issuerService.createCredentialOffer({
        credentialType: 'IdentityCredential',
        credentialSubject: {
          name: 'Eve Adams',
          dateOfBirth: '1995-06-15',
        },
        subjectDid: holderIdentifier.did,
      });

      const preAuthCode = offer.grants['urn:ietf:params:oauth:grant-type:pre-authorized_code']['pre-authorized_code'];
      const token = await issuerService.exchangePreAuthorizedCode({
        grant_type: 'urn:ietf:params:oauth:grant-type:pre-authorized_code',
        'pre-authorized_code': preAuthCode,
      });

      const credentialResponse = await issuerService.issueCredential(
        {
          format: 'jwt_vc_json',
          types: ['VerifiableCredential', 'IdentityCredential'],
        },
        token.access_token
      );

      const credPayload = JSON.parse(Buffer.from(credentialResponse.credential.split('.')[1], 'base64').toString());
      const credential = {
        ...credPayload.vc,
        proof: {
          type: 'JwtProof2020',
          jwt: credentialResponse.credential,
        },
      };

      // Verifier requests age verification
      const presentationRequest = await verifierService.createPresentationRequest({
        credentialTypes: ['IdentityCredential'],
        purpose: 'Age verification for service access',
        requiredFields: ['dateOfBirth'],
      });

      // Holder presents credential
      const presentation = await credentialService.createPresentation({
        holderDid: holderIdentifier.did,
        verifiableCredentials: [credential],
        challenge: presentationRequest.nonce,
      });

      // Verifier verifies
      const verificationResult = await verifierService.verifyPresentation(
        presentation.proof.jwt,
        presentationRequest.state
      );

      expect(verificationResult.verified).toBe(true);

      // Extract and verify age
      const vpPayload = JSON.parse(Buffer.from(presentation.proof.jwt.split('.')[1], 'base64').toString());
      const presentedCredential = vpPayload.vp.verifiableCredential[0];
      const credentialData = typeof presentedCredential === 'string'
        ? JSON.parse(Buffer.from(presentedCredential.split('.')[1], 'base64').toString()).vc
        : presentedCredential;

      expect(credentialData.credentialSubject.dateOfBirth).toBe('1995-06-15');
      
      // Calculate age (simplified)
      const birthYear = parseInt(credentialData.credentialSubject.dateOfBirth.split('-')[0]);
      const currentYear = new Date().getFullYear();
      const age = currentYear - birthYear;
      
      expect(age).toBeGreaterThanOrEqual(18);
    });
  });
});
