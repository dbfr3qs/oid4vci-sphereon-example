import { VeramoAgentService } from './veramo-agent.service';
import {
  CreateCredentialOptions,
  CreatePresentationOptions,
  CREDENTIAL_TYPES,
} from '../types/credentials';
import {
  VerifiableCredential,
  VerifiablePresentation,
  W3CVerifiableCredential,
  W3CVerifiablePresentation,
} from '@veramo/core';

/**
 * Verification result for credentials and presentations
 */
export interface VerificationResult {
  verified: boolean;
  error?: {
    message: string;
    errorCode?: string;
  };
}

/**
 * Service for creating and verifying Verifiable Credentials and Presentations
 */
export class CredentialService {
  private veramoService: VeramoAgentService;

  constructor(veramoService: VeramoAgentService) {
    this.veramoService = veramoService;
  }

  /**
   * Create a Verifiable Credential
   */
  async createCredential(
    options: CreateCredentialOptions
  ): Promise<VerifiableCredential> {
    const { issuerDid, subjectDid, credentialSubject, expirationDate, additionalTypes } = options;

    console.log('[CredentialService] Creating credential with:');
    console.log('  issuerDid:', issuerDid);
    console.log('  subjectDid:', subjectDid);
    console.log('  credentialSubject:', JSON.stringify(credentialSubject));

    const types = [
      CREDENTIAL_TYPES.VERIFIABLE_CREDENTIAL,
      CREDENTIAL_TYPES.IDENTITY,
      ...(additionalTypes || []),
    ];

    // Veramo expects credentialSubject WITHOUT the id field
    // It will add the id from the credential.credentialSubject object
    const credentialSubjectWithoutId = { ...credentialSubject };
    
    const credential: any = {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: types,
      issuer: { id: issuerDid },
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: subjectDid,  // Veramo WILL use this
        ...credentialSubjectWithoutId,
      },
    };
    
    console.log('[CredentialService] Final credential object:', JSON.stringify(credential, null, 2));

    if (expirationDate) {
      credential.expirationDate = expirationDate;
    }

    const agent = this.veramoService.getAgent();
    const verifiableCredential = await agent.createVerifiableCredential({
      credential,
      proofFormat: 'jwt',
      save: false,
    });

    // Debug: decode the JWT to see what Veramo actually created
    if (verifiableCredential.proof && typeof verifiableCredential.proof.jwt === 'string') {
      const parts = verifiableCredential.proof.jwt.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        console.log('[CredentialService] JWT payload from Veramo:', JSON.stringify(payload, null, 2));
      }
    }

    return verifiableCredential;
  }

  /**
   * Verify a Verifiable Credential
   */
  async verifyCredential(
    credential: VerifiableCredential
  ): Promise<VerificationResult> {
    try {
      const agent = this.veramoService.getAgent();
      const result = await agent.verifyCredential({
        credential,
      });

      return {
        verified: result.verified,
        error: result.error
          ? {
              message: result.error.message || 'Verification failed',
              errorCode: result.error.errorCode,
            }
          : undefined,
      };
    } catch (error: any) {
      return {
        verified: false,
        error: {
          message: error.message || 'Verification failed',
        },
      };
    }
  }

  /**
   * Create a Verifiable Presentation
   */
  async createPresentation(
    options: CreatePresentationOptions
  ): Promise<VerifiablePresentation> {
    const { holderDid, verifiableCredentials, challenge, domain } = options;

    const presentation: any = {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: ['VerifiablePresentation'],
      holder: holderDid,
      verifiableCredential: verifiableCredentials,
    };

    const agent = this.veramoService.getAgent();
    const verifiablePresentation = await agent.createVerifiablePresentation({
      presentation,
      proofFormat: 'jwt',
      challenge,
      domain,
      save: false,
    });

    return verifiablePresentation;
  }

  /**
   * Verify a Verifiable Presentation
   */
  async verifyPresentation(
    presentation: VerifiablePresentation
  ): Promise<VerificationResult> {
    try {
      const agent = this.veramoService.getAgent();
      const result = await agent.verifyPresentation({
        presentation,
      });

      return {
        verified: result.verified,
        error: result.error
          ? {
              message: result.error.message || 'Verification failed',
              errorCode: result.error.errorCode,
            }
          : undefined,
      };
    } catch (error: any) {
      return {
        verified: false,
        error: {
          message: error.message || 'Verification failed',
        },
      };
    }
  }
}
