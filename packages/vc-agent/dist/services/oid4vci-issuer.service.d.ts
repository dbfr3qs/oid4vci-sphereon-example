import { CredentialService } from './credential.service';
import { CredentialOffer, CreateOfferOptions, OfferMetadata, TokenRequest, TokenResponse, CredentialRequest, CredentialResponse } from '../types/oid4vci';
/**
 * Configuration for OID4VCI Issuer
 */
export interface OID4VCIssuerConfig {
    issuerDid: string;
    issuerUrl: string;
    credentialService: CredentialService;
    defaultExpiresIn?: number;
}
export declare class OID4VCIssuerService {
    private config;
    private offerStore;
    private tokenStore;
    constructor(config: OID4VCIssuerConfig);
    /**
     * Create a credential offer with pre-authorized code
     */
    createCredentialOffer(options: CreateOfferOptions): Promise<CredentialOffer>;
    /**
     * Create an OID4VCI offer URL (for QR codes)
     */
    createOfferUrl(offer: CredentialOffer): string;
    /**
     * Get offer metadata by pre-authorized code
     */
    getOfferMetadata(preAuthorizedCode: string): Promise<OfferMetadata | null>;
    /**
     * Mark an offer as used
     */
    markOfferAsUsed(preAuthorizedCode: string): Promise<void>;
    /**
     * Generate a secure pre-authorized code
     */
    private generatePreAuthorizedCode;
    /**
     * Generate a user PIN
     */
    private generateUserPin;
    /**
     * Get issuer DID
     */
    getIssuerDid(): string;
    /**
     * Get issuer URL
     */
    getIssuerUrl(): string;
    /**
     * Exchange pre-authorized code for access token
     */
    exchangePreAuthorizedCode(request: TokenRequest): Promise<TokenResponse>;
    /**
     * Issue credential with access token
     */
    issueCredential(request: CredentialRequest, accessToken: string, holderDid?: string, credentialStatus?: any): Promise<CredentialResponse>;
    /**
     * Generate a secure access token
     */
    private generateAccessToken;
    /**
     * Expire a token (for testing)
     */
    private expireToken;
}
