/**
 * OID4VCI (OpenID for Verifiable Credential Issuance) type definitions
 */
/**
 * Credential offer with pre-authorized code
 */
export interface CredentialOffer {
    credential_issuer: string;
    credentials: string[];
    grants: {
        'urn:ietf:params:oauth:grant-type:pre-authorized_code': {
            'pre-authorized_code': string;
            user_pin_required?: boolean;
        };
    };
}
/**
 * Options for creating a credential offer
 */
export interface CreateOfferOptions {
    credentialType: string;
    credentialSubject: Record<string, any>;
    subjectDid: string;
    userPinRequired?: boolean;
    expiresIn?: number;
}
/**
 * Stored offer metadata
 */
export interface OfferMetadata {
    offerId: string;
    preAuthorizedCode: string;
    credentialType: string;
    credentialSubject: Record<string, any>;
    subjectDid: string;
    userPin?: string;
    expiresAt: Date;
    used: boolean;
}
/**
 * Token request
 */
export interface TokenRequest {
    grant_type: 'urn:ietf:params:oauth:grant-type:pre-authorized_code';
    'pre-authorized_code': string;
    user_pin?: string;
}
/**
 * Token response
 */
export interface TokenResponse {
    access_token: string;
    token_type: 'bearer';
    expires_in: number;
    c_nonce?: string;
    c_nonce_expires_in?: number;
}
/**
 * Credential request
 */
export interface CredentialRequest {
    format: 'jwt_vc_json';
    types: string[];
    proof?: {
        proof_type: 'jwt';
        jwt: string;
    };
}
/**
 * Credential response
 */
export interface CredentialResponse {
    format: 'jwt_vc_json';
    credential: string;
    c_nonce?: string;
    c_nonce_expires_in?: number;
}
