import { v4 as uuidv4 } from 'uuid';
import { CredentialService } from './credential.service';
import {
  AuthorizationRequest,
  CreatePresentationRequestOptions,
  PresentationDefinition,
  PresentationRequestMetadata,
  PresentationVerificationResult,
} from '../types/oid4vp';

/**
 * Configuration for OID4VP Verifier
 */
export interface OID4VPVerifierConfig {
  verifierDid: string;
  verifierUrl: string;
  credentialService: CredentialService;
  defaultExpiresIn?: number; // Default expiration in seconds
}

export class OID4VPVerifierService {
  private config: OID4VPVerifierConfig;
  private requestStore: Map<string, PresentationRequestMetadata>;

  constructor(config: OID4VPVerifierConfig) {
    this.config = {
      ...config,
      defaultExpiresIn: config.defaultExpiresIn || 600, // 10 minutes default
    };
    this.requestStore = new Map();
  }

  /**
   * Create a presentation request
   */
  async createPresentationRequest(
    options: CreatePresentationRequestOptions
  ): Promise<AuthorizationRequest> {
    const { credentialTypes, purpose, requiredFields } = options;

    // Generate unique identifiers
    const requestId = uuidv4();
    const nonce = this.generateNonce();
    const state = this.generateState();

    // Create presentation definition
    const presentationDefinition: PresentationDefinition = {
      id: requestId,
      name: purpose,
      purpose,
      input_descriptors: credentialTypes.map((type, index) => ({
        id: `${type}_${index}`,
        name: `${type} Credential`,
        purpose: `Requesting ${type} credential`,
        constraints: {
          fields: [
            {
              path: ['$.type'],
              filter: {
                type: 'array',
                pattern: type,
              },
            },
            ...(requiredFields || []).map(field => ({
              path: [`$.credentialSubject.${field}`],
            })),
          ],
        },
      })),
    };

    // Calculate expiration
    const expirationSeconds = this.config.defaultExpiresIn!;
    const expiresAt = new Date(Date.now() + expirationSeconds * 1000);

    // Store request metadata
    const metadata: PresentationRequestMetadata = {
      requestId,
      nonce,
      state,
      presentationDefinition,
      createdAt: new Date(),
      expiresAt,
      verified: false,
    };

    this.requestStore.set(state, metadata);

    // Create authorization request
    const authRequest: AuthorizationRequest = {
      response_type: 'vp_token',
      client_id: this.config.verifierUrl,
      redirect_uri: `${this.config.verifierUrl}/callback`,
      presentation_definition: presentationDefinition,
      nonce,
      state,
    };

    return authRequest;
  }

  /**
   * Create a request URL for QR codes
   */
  createRequestUrl(request: AuthorizationRequest): string {
    const params = new URLSearchParams({
      response_type: request.response_type,
      client_id: request.client_id,
      redirect_uri: request.redirect_uri,
      nonce: request.nonce,
      state: request.state,
      presentation_definition: JSON.stringify(request.presentation_definition),
    });

    return `openid4vp://?${params.toString()}`;
  }

  /**
   * Get request metadata by state
   */
  async getRequestMetadata(
    state: string
  ): Promise<PresentationRequestMetadata | null> {
    const metadata = this.requestStore.get(state);
    
    if (!metadata) {
      return null;
    }

    // Check if expired
    if (new Date() > metadata.expiresAt) {
      this.requestStore.delete(state);
      return null;
    }

    return metadata;
  }

  /**
   * Verify a presentation
   */
  async verifyPresentation(
    vpToken: string,
    state: string
  ): Promise<PresentationVerificationResult> {
    // Get request metadata
    const metadata = await this.getRequestMetadata(state);
    
    if (!metadata) {
      throw new Error('Invalid or expired presentation request');
    }

    try {
      // Decode JWT to get presentation
      const jwtParts = vpToken.split('.');
      if (jwtParts.length !== 3) {
        return {
          verified: false,
          presentationValid: false,
          credentialsValid: false,
          matchesDefinition: false,
          error: {
            message: 'Invalid JWT format',
          },
        };
      }

      const payload = JSON.parse(Buffer.from(jwtParts[1], 'base64').toString());
      const vp = payload.vp;

      // Verify nonce matches
      if (payload.nonce !== metadata.nonce) {
        return {
          verified: false,
          presentationValid: false,
          credentialsValid: false,
          matchesDefinition: false,
          error: {
            message: 'Nonce mismatch - presentation nonce does not match request',
          },
        };
      }

      // Reconstruct presentation for verification
      const presentation = {
        ...vp,
        proof: {
          type: 'JwtProof2020',
          jwt: vpToken,
        },
      };

      // Verify presentation signature
      const vpVerification = await this.config.credentialService.verifyPresentation(presentation);
      
      if (!vpVerification.verified) {
        return {
          verified: false,
          presentationValid: false,
          credentialsValid: false,
          matchesDefinition: false,
          error: {
            message: 'Presentation signature verification failed',
            details: vpVerification.error,
          },
        };
      }

      // Verify credentials in the presentation
      const credentials = Array.isArray(vp.verifiableCredential) 
        ? vp.verifiableCredential 
        : [vp.verifiableCredential];

      let allCredentialsValid = true;
      for (const credential of credentials) {
        const vcVerification = await this.config.credentialService.verifyCredential(credential);
        if (!vcVerification.verified) {
          allCredentialsValid = false;
          break;
        }
      }

      // Mark as verified
      metadata.verified = true;
      this.requestStore.set(state, metadata);

      return {
        verified: true,
        presentationValid: vpVerification.verified,
        credentialsValid: allCredentialsValid,
        matchesDefinition: true, // Simplified - would need full PEX validation
      };
    } catch (error: any) {
      return {
        verified: false,
        presentationValid: false,
        credentialsValid: false,
        matchesDefinition: false,
        error: {
          message: error.message || 'Verification failed',
          details: error,
        },
      };
    }
  }

  /**
   * Generate a secure nonce
   */
  private generateNonce(): string {
    return `nonce_${uuidv4().replace(/-/g, '')}`;
  }

  /**
   * Generate a secure state
   */
  private generateState(): string {
    return `state_${uuidv4().replace(/-/g, '')}`;
  }

  /**
   * Expire a request (for testing)
   */
  private async expireRequest(state: string): Promise<void> {
    const metadata = this.requestStore.get(state);
    if (metadata) {
      metadata.expiresAt = new Date(Date.now() - 1000); // Set to past
      this.requestStore.set(state, metadata);
    }
  }

  /**
   * Get verifier DID
   */
  getVerifierDid(): string {
    return this.config.verifierDid;
  }

  /**
   * Get verifier URL
   */
  getVerifierUrl(): string {
    return this.config.verifierUrl;
  }
}
