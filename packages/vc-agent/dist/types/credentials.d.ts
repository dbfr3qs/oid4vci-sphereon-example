/**
 * Credential type definitions
 */
/**
 * Simple identity credential subject
 */
export interface IdentityCredentialSubject {
    id?: string;
    name?: string;
    email?: string;
    dateOfBirth?: string;
}
/**
 * Credential types supported by the agent
 */
export declare const CREDENTIAL_TYPES: {
    readonly IDENTITY: "IdentityCredential";
    readonly VERIFIABLE_CREDENTIAL: "VerifiableCredential";
};
/**
 * Options for creating a credential
 */
export interface CreateCredentialOptions {
    issuerDid: string;
    subjectDid: string;
    credentialSubject: IdentityCredentialSubject;
    expirationDate?: string;
    additionalTypes?: string[];
    credentialStatus?: {
        id: string;
        type: string;
        statusPurpose: string;
        statusListIndex: string;
        statusListCredential: string;
    };
}
/**
 * Options for creating a presentation
 */
export interface CreatePresentationOptions {
    holderDid: string;
    verifiableCredentials: any[];
    challenge?: string;
    domain?: string;
}
