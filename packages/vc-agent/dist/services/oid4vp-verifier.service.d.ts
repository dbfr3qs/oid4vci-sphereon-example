import { CredentialService } from './credential.service';
import { AuthorizationRequest, CreatePresentationRequestOptions, PresentationRequestMetadata, PresentationVerificationResult } from '../types/oid4vp';
/**
 * Configuration for OID4VP Verifier
 */
export interface OID4VPVerifierConfig {
    verifierDid: string;
    verifierUrl: string;
    credentialService: CredentialService;
    defaultExpiresIn?: number;
}
export declare class OID4VPVerifierService {
    private config;
    private requestStore;
    constructor(config: OID4VPVerifierConfig);
    /**
     * Create a presentation request
     */
    createPresentationRequest(options: CreatePresentationRequestOptions): Promise<AuthorizationRequest>;
    /**
     * Create a request URL for QR codes
     */
    createRequestUrl(request: AuthorizationRequest): string;
    /**
     * Get request metadata by state
     */
    getRequestMetadata(state: string): Promise<PresentationRequestMetadata | null>;
    /**
     * Verify a presentation
     */
    verifyPresentation(vpToken: string, state: string): Promise<PresentationVerificationResult>;
    /**
     * Generate a secure nonce
     */
    private generateNonce;
    /**
     * Generate a secure state
     */
    private generateState;
    /**
     * Expire a request (for testing)
     */
    private expireRequest;
    /**
     * Get verifier DID
     */
    getVerifierDid(): string;
    /**
     * Get verifier URL
     */
    getVerifierUrl(): string;
}
