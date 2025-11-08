import { VeramoAgentService } from './veramo-agent.service';
import { CreateCredentialOptions, CreatePresentationOptions } from '../types/credentials';
import { VerifiableCredential, VerifiablePresentation } from '@veramo/core';
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
export declare class CredentialService {
    private veramoService;
    constructor(veramoService: VeramoAgentService);
    /**
     * Create a Verifiable Credential
     */
    createCredential(options: CreateCredentialOptions): Promise<VerifiableCredential>;
    /**
     * Verify a Verifiable Credential
     */
    verifyCredential(credential: VerifiableCredential): Promise<VerificationResult>;
    /**
     * Create a Verifiable Presentation
     */
    createPresentation(options: CreatePresentationOptions): Promise<VerifiablePresentation>;
    /**
     * Verify a Verifiable Presentation
     */
    verifyPresentation(presentation: VerifiablePresentation): Promise<VerificationResult>;
    /**
     * Verify a VP JWT with audience and nonce validation
     */
    verifyPresentationJWT(vpJwt: string, options?: {
        audience?: string;
        nonce?: string;
        domain?: string;
    }): Promise<VerificationResult & {
        payload?: any;
    }>;
}
