/**
 * VC Agent - Verifiable Credentials with OID4VCI and OID4VP support
 */

// Core services
export { VeramoAgentService, ConfiguredAgent } from './services/veramo-agent.service';
export { CredentialService, VerificationResult } from './services/credential.service';
export { OID4VCIssuerService, OID4VCIssuerConfig } from './services/oid4vci-issuer.service';
export { OID4VPVerifierService, OID4VPVerifierConfig } from './services/oid4vp-verifier.service';
export { StatusListService, StatusListConfig, StatusListEntry } from './services/status-list.service';

// Types
export {
  IdentityCredentialSubject,
  CREDENTIAL_TYPES,
  CreateCredentialOptions,
  CreatePresentationOptions,
} from './types/credentials';

export {
  CredentialOffer,
  CreateOfferOptions,
  OfferMetadata,
  TokenRequest,
  TokenResponse,
  CredentialRequest,
  CredentialResponse,
} from './types/oid4vci';

export {
  PresentationDefinition,
  AuthorizationRequest,
  CreatePresentationRequestOptions,
  PresentationRequestMetadata,
  AuthorizationResponse,
  PresentationVerificationResult,
} from './types/oid4vp';
