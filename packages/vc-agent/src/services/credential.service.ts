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

    const types = [
      CREDENTIAL_TYPES.VERIFIABLE_CREDENTIAL,
      CREDENTIAL_TYPES.IDENTITY,
      ...(additionalTypes || []),
    ];

    const credential: any = {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      type: types,
      issuer: { id: issuerDid },
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        ...credentialSubject,
        id: subjectDid,
      },
    };

    if (expirationDate) {
      credential.expirationDate = expirationDate;
    }

    const agent = this.veramoService.getAgent();
    const verifiableCredential = await agent.createVerifiableCredential({
      credential,
      proofFormat: 'jwt',
      save: false,
    });

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
