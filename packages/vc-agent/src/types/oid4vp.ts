/**
 * OID4VP (OpenID for Verifiable Presentations) type definitions
 */

/**
 * Presentation definition using Presentation Exchange
 */
export interface PresentationDefinition {
  id: string;
  input_descriptors: InputDescriptor[];
  name?: string;
  purpose?: string;
}

/**
 * Input descriptor specifying credential requirements
 */
export interface InputDescriptor {
  id: string;
  name?: string;
  purpose?: string;
  constraints: Constraints;
}

/**
 * Constraints on credential fields
 */
export interface Constraints {
  fields?: Field[];
}

/**
 * Field constraint
 */
export interface Field {
  path: string[];
  filter?: {
    type: string;
    pattern?: string;
    const?: string;
  };
}

/**
 * Authorization request for presentation
 */
export interface AuthorizationRequest {
  response_type: 'vp_token';
  client_id: string;
  redirect_uri: string;
  presentation_definition: PresentationDefinition;
  nonce: string;
  state: string;
}

/**
 * Options for creating a presentation request
 */
export interface CreatePresentationRequestOptions {
  credentialTypes: string[];
  purpose?: string;
  requiredFields?: string[];
}

/**
 * Presentation request metadata
 */
export interface PresentationRequestMetadata {
  requestId: string;
  nonce: string;
  state: string;
  presentationDefinition: PresentationDefinition;
  createdAt: Date;
  expiresAt: Date;
  verified: boolean;
}

/**
 * Authorization response from wallet
 */
export interface AuthorizationResponse {
  vp_token: string; // JWT VP
  presentation_submission: PresentationSubmission;
  state: string;
}

/**
 * Presentation submission mapping
 */
export interface PresentationSubmission {
  id: string;
  definition_id: string;
  descriptor_map: DescriptorMap[];
}

/**
 * Descriptor map entry
 */
export interface DescriptorMap {
  id: string;
  format: string;
  path: string;
}

/**
 * Verification result for presentation
 */
export interface PresentationVerificationResult {
  verified: boolean;
  presentationValid: boolean;
  credentialsValid: boolean;
  matchesDefinition: boolean;
  error?: {
    message: string;
    details?: any;
  };
}
