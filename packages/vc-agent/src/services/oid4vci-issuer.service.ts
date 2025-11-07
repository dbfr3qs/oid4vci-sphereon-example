import { v4 as uuidv4 } from 'uuid';
import { CredentialService } from './credential.service';
import {
  CredentialOffer,
  CreateOfferOptions,
  OfferMetadata,
  TokenRequest,
  TokenResponse,
  CredentialRequest,
  CredentialResponse,
} from '../types/oid4vci';

/**
 * Configuration for OID4VCI Issuer
 */
export interface OID4VCIssuerConfig {
  issuerDid: string;
  issuerUrl: string;
  credentialService: CredentialService;
  defaultExpiresIn?: number; // Default expiration in seconds
}

/**
 * Service for handling OID4VCI credential issuance protocol
 */
/**
 * Access token metadata
 */
interface TokenMetadata {
  accessToken: string;
  preAuthorizedCode: string;
  expiresAt: Date;
  used: boolean;
}

export class OID4VCIssuerService {
  private config: OID4VCIssuerConfig;
  private offerStore: Map<string, OfferMetadata>;
  private tokenStore: Map<string, TokenMetadata>;

  constructor(config: OID4VCIssuerConfig) {
    this.config = {
      ...config,
      defaultExpiresIn: config.defaultExpiresIn || 3600, // 1 hour default
    };
    this.offerStore = new Map();
    this.tokenStore = new Map();
  }

  /**
   * Create a credential offer with pre-authorized code
   */
  async createCredentialOffer(
    options: CreateOfferOptions
  ): Promise<CredentialOffer> {
    const {
      credentialType,
      credentialSubject,
      subjectDid,
      userPinRequired = false,
      expiresIn,
    } = options;

    // Generate unique IDs
    const offerId = uuidv4();
    const preAuthorizedCode = this.generatePreAuthorizedCode();
    const userPin = userPinRequired ? this.generateUserPin() : undefined;

    // Calculate expiration
    const expirationSeconds = expiresIn || this.config.defaultExpiresIn!;
    const expiresAt = new Date(Date.now() + expirationSeconds * 1000);

    // Store offer metadata
    const metadata: OfferMetadata = {
      offerId,
      preAuthorizedCode,
      credentialType,
      credentialSubject,
      subjectDid,
      userPin,
      expiresAt,
      used: false,
    };

    this.offerStore.set(preAuthorizedCode, metadata);

    // Create OID4VCI credential offer
    const offer: CredentialOffer = {
      credential_issuer: this.config.issuerUrl,
      credentials: [credentialType],
      grants: {
        'urn:ietf:params:oauth:grant-type:pre-authorized_code': {
          'pre-authorized_code': preAuthorizedCode,
          ...(userPinRequired && { user_pin_required: true }),
        },
      },
    };

    return offer;
  }

  /**
   * Create an OID4VCI offer URL (for QR codes)
   */
  createOfferUrl(offer: CredentialOffer): string {
    const offerJson = JSON.stringify(offer);
    const encodedOffer = encodeURIComponent(offerJson);
    return `openid-credential-offer://?credential_offer=${encodedOffer}`;
  }

  /**
   * Get offer metadata by pre-authorized code
   */
  async getOfferMetadata(
    preAuthorizedCode: string
  ): Promise<OfferMetadata | null> {
    const metadata = this.offerStore.get(preAuthorizedCode);
    
    if (!metadata) {
      return null;
    }

    // Check if expired
    if (new Date() > metadata.expiresAt) {
      this.offerStore.delete(preAuthorizedCode);
      return null;
    }

    return metadata;
  }

  /**
   * Mark an offer as used
   */
  async markOfferAsUsed(preAuthorizedCode: string): Promise<void> {
    const metadata = this.offerStore.get(preAuthorizedCode);
    if (metadata) {
      metadata.used = true;
      this.offerStore.set(preAuthorizedCode, metadata);
    }
  }

  /**
   * Generate a secure pre-authorized code
   */
  private generatePreAuthorizedCode(): string {
    // Generate a random code (in production, use crypto.randomBytes)
    return `pac_${uuidv4().replace(/-/g, '')}`;
  }

  /**
   * Generate a user PIN
   */
  private generateUserPin(): string {
    // Generate a 6-digit PIN
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Get issuer DID
   */
  getIssuerDid(): string {
    return this.config.issuerDid;
  }

  /**
   * Get issuer URL
   */
  getIssuerUrl(): string {
    return this.config.issuerUrl;
  }

  /**
   * Exchange pre-authorized code for access token
   */
  async exchangePreAuthorizedCode(
    request: TokenRequest
  ): Promise<TokenResponse> {
    const { 'pre-authorized_code': preAuthCode, user_pin: userPin } = request;

    // Get offer metadata
    const metadata = await this.getOfferMetadata(preAuthCode);
    
    if (!metadata) {
      throw new Error('Invalid pre-authorized code');
    }

    // Check if already used
    if (metadata.used) {
      throw new Error('Pre-authorized code already used');
    }

    // Validate user PIN if required
    if (metadata.userPin) {
      if (!userPin) {
        throw new Error('User PIN required');
      }
      if (userPin !== metadata.userPin) {
        throw new Error('Invalid user PIN');
      }
    }

    // Mark offer as used
    await this.markOfferAsUsed(preAuthCode);

    // Generate access token
    const accessToken = this.generateAccessToken();
    const expiresIn = 3600; // 1 hour
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Store token metadata
    const tokenMetadata: TokenMetadata = {
      accessToken,
      preAuthorizedCode: preAuthCode,
      expiresAt,
      used: false,
    };
    this.tokenStore.set(accessToken, tokenMetadata);

    return {
      access_token: accessToken,
      token_type: 'bearer',
      expires_in: expiresIn,
    };
  }

  /**
   * Issue credential with access token
   */
  async issueCredential(
    request: CredentialRequest,
    accessToken: string
  ): Promise<CredentialResponse> {
    // Validate access token
    const tokenMetadata = this.tokenStore.get(accessToken);
    
    if (!tokenMetadata) {
      throw new Error('Invalid access token');
    }

    // Check if expired
    if (new Date() > tokenMetadata.expiresAt) {
      this.tokenStore.delete(accessToken);
      throw new Error('Invalid access token');
    }

    // Check if already used
    if (tokenMetadata.used) {
      throw new Error('Invalid access token');
    }

    // Get original offer metadata
    const offerMetadata = this.offerStore.get(tokenMetadata.preAuthorizedCode);
    if (!offerMetadata) {
      throw new Error('Invalid access token');
    }

    // Create the credential using CredentialService
    const credential = await this.config.credentialService.createCredential({
      issuerDid: this.config.issuerDid,
      subjectDid: offerMetadata.subjectDid,
      credentialSubject: offerMetadata.credentialSubject,
    });

    // Mark token as used
    tokenMetadata.used = true;
    this.tokenStore.set(accessToken, tokenMetadata);

    // Return JWT credential
    return {
      format: 'jwt_vc_json',
      credential: credential.proof.jwt,
    };
  }

  /**
   * Generate a secure access token
   */
  private generateAccessToken(): string {
    return `at_${uuidv4().replace(/-/g, '')}`;
  }

  /**
   * Expire a token (for testing)
   */
  private async expireToken(accessToken: string): Promise<void> {
    const tokenMetadata = this.tokenStore.get(accessToken);
    if (tokenMetadata) {
      tokenMetadata.expiresAt = new Date(Date.now() - 1000); // Set to past
      this.tokenStore.set(accessToken, tokenMetadata);
    }
  }
}
