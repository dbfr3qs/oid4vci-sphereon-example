/**
 * Credential type definitions
 */

/**
 * Simple identity credential subject
 */
export interface IdentityCredentialSubject {
  id?: string; // DID of the subject
  name?: string;
  email?: string;
  dateOfBirth?: string;
}

/**
 * Credential types supported by the agent
 */
export const CREDENTIAL_TYPES = {
  IDENTITY: 'IdentityCredential',
  VERIFIABLE_CREDENTIAL: 'VerifiableCredential',
} as const;

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
