import { CredentialService } from '../../src/services/credential.service';
import { VeramoAgentService } from '../../src/services/veramo-agent.service';
import { IIdentifier } from '@veramo/core';
import { CREDENTIAL_TYPES } from '../../src/types/credentials';

describe('CredentialService', () => {
  let credentialService: CredentialService;
  let veramoService: VeramoAgentService;
  let issuerIdentifier: IIdentifier;
  let subjectIdentifier: IIdentifier;

  beforeAll(async () => {
    veramoService = new VeramoAgentService();
    credentialService = new CredentialService(veramoService);

    // Create issuer and subject identities
    issuerIdentifier = await veramoService.createIdentifier();
    subjectIdentifier = await veramoService.createIdentifier();
  });

  describe('VC creation', () => {
    it('should create a JWT VC with simple claims', async () => {
      const credential = await credentialService.createCredential({
        issuerDid: issuerIdentifier.did,
        subjectDid: subjectIdentifier.did,
        credentialSubject: {
          id: subjectIdentifier.did,
          name: 'Alice Smith',
          email: 'alice@example.com',
        },
      });

      expect(credential).toBeDefined();
      expect(credential.proof).toBeDefined();
      expect(credential.proof.jwt).toBeDefined();
      expect(typeof credential.proof.jwt).toBe('string');
    });

    it('should create VC with valid structure', async () => {
      const credential = await credentialService.createCredential({
        issuerDid: issuerIdentifier.did,
        subjectDid: subjectIdentifier.did,
        credentialSubject: {
          id: subjectIdentifier.did,
          name: 'Bob Jones',
          email: 'bob@example.com',
        },
      });

      expect(credential.issuer).toBeDefined();
      const issuer = typeof credential.issuer === 'string' ? credential.issuer : credential.issuer.id;
      expect(issuer).toBe(issuerIdentifier.did);
      expect(credential.credentialSubject).toBeDefined();
      expect(credential.credentialSubject.id).toBe(subjectIdentifier.did);
      expect(credential.credentialSubject.name).toBe('Bob Jones');
      expect(credential.type).toContain(CREDENTIAL_TYPES.VERIFIABLE_CREDENTIAL);
      expect(credential.type).toContain(CREDENTIAL_TYPES.IDENTITY);
    });

    it('should create VC with expiration date when provided', async () => {
      const expirationDate = new Date();
      expirationDate.setFullYear(expirationDate.getFullYear() + 1);

      const credential = await credentialService.createCredential({
        issuerDid: issuerIdentifier.did,
        subjectDid: subjectIdentifier.did,
        credentialSubject: {
          id: subjectIdentifier.did,
          name: 'Charlie Brown',
        },
        expirationDate: expirationDate.toISOString(),
      });

      expect(credential.expirationDate).toBeDefined();
      // Check date matches (allow for millisecond precision differences)
      const receivedDate = new Date(credential.expirationDate!);
      expect(Math.abs(receivedDate.getTime() - expirationDate.getTime())).toBeLessThan(1000);
    });
  });

  describe('VC verification', () => {
    it('should verify a valid VC signature', async () => {
      const credential = await credentialService.createCredential({
        issuerDid: issuerIdentifier.did,
        subjectDid: subjectIdentifier.did,
        credentialSubject: {
          id: subjectIdentifier.did,
          name: 'David Lee',
        },
      });

      const result = await credentialService.verifyCredential(credential);

      expect(result.verified).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should fail verification for tampered VC', async () => {
      const credential = await credentialService.createCredential({
        issuerDid: issuerIdentifier.did,
        subjectDid: subjectIdentifier.did,
        credentialSubject: {
          id: subjectIdentifier.did,
          name: 'Eve Wilson',
        },
      });

      // Tamper with the credential
      credential.credentialSubject.name = 'Tampered Name';

      const result = await credentialService.verifyCredential(credential);

      expect(result.verified).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('VP creation', () => {
    it('should create a VP containing VCs', async () => {
      const credential1 = await credentialService.createCredential({
        issuerDid: issuerIdentifier.did,
        subjectDid: subjectIdentifier.did,
        credentialSubject: {
          id: subjectIdentifier.did,
          name: 'Frank Miller',
        },
      });

      const credential2 = await credentialService.createCredential({
        issuerDid: issuerIdentifier.did,
        subjectDid: subjectIdentifier.did,
        credentialSubject: {
          id: subjectIdentifier.did,
          email: 'frank@example.com',
        },
      });

      const presentation = await credentialService.createPresentation({
        holderDid: subjectIdentifier.did,
        verifiableCredentials: [credential1, credential2],
      });

      expect(presentation).toBeDefined();
      expect(presentation.holder).toBe(subjectIdentifier.did);
      expect(presentation.verifiableCredential).toBeDefined();
      expect(Array.isArray(presentation.verifiableCredential)).toBe(true);
      expect((presentation.verifiableCredential as any[]).length).toBe(2);
      expect(presentation.proof).toBeDefined();
      expect(presentation.proof.jwt).toBeDefined();
    });

    it('should create VP with challenge and domain', async () => {
      const credential = await credentialService.createCredential({
        issuerDid: issuerIdentifier.did,
        subjectDid: subjectIdentifier.did,
        credentialSubject: {
          id: subjectIdentifier.did,
          name: 'Grace Hopper',
        },
      });

      const challenge = 'test-challenge-123';
      const domain = 'example.com';

      const presentation = await credentialService.createPresentation({
        holderDid: subjectIdentifier.did,
        verifiableCredentials: [credential],
        challenge,
        domain,
      });

      expect(presentation).toBeDefined();
      expect(presentation.proof).toBeDefined();
      // Challenge and domain are encoded in the JWT
      expect(presentation.proof.jwt).toBeDefined();
    });
  });

  describe('VP verification', () => {
    it('should verify a valid VP', async () => {
      const credential = await credentialService.createCredential({
        issuerDid: issuerIdentifier.did,
        subjectDid: subjectIdentifier.did,
        credentialSubject: {
          id: subjectIdentifier.did,
          name: 'Henry Ford',
        },
      });

      const presentation = await credentialService.createPresentation({
        holderDid: subjectIdentifier.did,
        verifiableCredentials: [credential],
      });

      const result = await credentialService.verifyPresentation(presentation);

      expect(result.verified).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });
});
