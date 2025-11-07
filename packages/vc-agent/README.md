# VC Agent

Verifiable Credentials agent with OID4VCI (issuance) and OID4VP (verification) support.

## Architecture

- **Veramo**: Core DID, key management, and VC/VP operations
- **Sphereon SSI-SDK**: OID4VCI and OID4VP protocol implementations

## Features

### ✅ Implemented

- **DID Management** - Create and manage `did:key` identities
- **Verifiable Credentials** - Issue and verify JWT-based VCs

```bash
npm install
```

## Quick Start

### Basic Credential Issuance

```typescript
import { VeramoAgentService, CredentialService } from '@oid4vci-example/vc-agent';

// Initialize services
const veramoService = new VeramoAgentService();
const credentialService = new CredentialService(veramoService);

// Create DIDs
const issuer = await veramoService.createIdentifier();
const holder = await veramoService.createIdentifier();

// Issue a credential
const credential = await credentialService.createCredential({
  issuerDid: issuer.did,
  subjectDid: holder.did,
  credentialSubject: {
    id: holder.did,
    name: 'Alice Wonderland',
    email: 'alice@example.com',
    dateOfBirth: '1990-01-01',
  },
});

// Verify the credential
const result = await credentialService.verifyCredential(credential);
console.log('Verified:', result.verified); // true
```

### OID4VCI Credential Issuance

```typescript
import { OID4VCIssuerService } from '@oid4vci-example/vc-agent';

// Initialize issuer
const issuerService = new OID4VCIssuerService({
  issuerDid: issuer.did,
  issuerUrl: 'https://issuer.example.com',
  credentialService,
});

// 1. Create credential offer
const offer = await issuerService.createCredentialOffer({
  credentialType: 'IdentityCredential',
  credentialSubject: {
    name: 'Alice Wonderland',
    email: 'alice@example.com',
  },
  subjectDid: holder.did,
  userPinRequired: true,
});

// 2. Generate QR code URL
const qrUrl = issuerService.createOfferUrl(offer);
// Display QR code to user

// 3. Wallet exchanges code for token
const preAuthCode = offer.grants['urn:ietf:params:oauth:grant-type:pre-authorized_code']['pre-authorized_code'];
const metadata = await issuerService.getOfferMetadata(preAuthCode);

const tokenResponse = await issuerService.exchangePreAuthorizedCode({
  grant_type: 'urn:ietf:params:oauth:grant-type:pre-authorized_code',
  'pre-authorized_code': preAuthCode,
  user_pin: metadata.userPin,
});

// 4. Wallet requests credential
const credentialResponse = await issuerService.issueCredential(
  {
    format: 'jwt_vc_json',
    types: ['VerifiableCredential', 'IdentityCredential'],
  },
  tokenResponse.access_token
);

console.log('Issued credential:', credentialResponse.credential);
```

### OID4VP Presentation Verification

```typescript
import { OID4VPVerifierService } from '@oid4vci-example/vc-agent';

// Initialize verifier
const verifierService = new OID4VPVerifierService({
  verifierDid: verifier.did,
  verifierUrl: 'https://verifier.example.com',
  credentialService,
});

// 1. Create presentation request
const request = await verifierService.createPresentationRequest({
  credentialTypes: ['IdentityCredential'],
  purpose: 'Age verification',
  requiredFields: ['dateOfBirth'],
});

// 2. Generate QR code URL
const requestUrl = verifierService.createRequestUrl(request);
// Display QR code to user

// 3. Holder creates presentation
const presentation = await credentialService.createPresentation({
  holderDid: holder.did,
  verifiableCredentials: [credential],
  challenge: request.nonce,
});

// 4. Verify presentation
const verificationResult = await verifierService.verifyPresentation(
  presentation.proof.jwt,
  request.state
);

console.log('Verified:', verificationResult.verified); // true
console.log('Credentials valid:', verificationResult.credentialsValid); // true
```

## Running Tests

```bash
# Run all tests (46 tests)
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Running Examples

```bash
# Basic VC/VP operations
npm run example

# Complete OID4VCI issuance flow
npm run example:oid4vci

# Complete OID4VP verification flow
npm run example:oid4vp
```

## Project Structure

```
vc-agent/
├── src/
│   ├── services/
│   │   ├── veramo-agent.service.ts       # Core Veramo agent
│   │   ├── credential.service.ts          # VC/VP operations
│   │   ├── oid4vci-issuer.service.ts     # OID4VCI issuer
│   │   └── oid4vp-verifier.service.ts    # OID4VP verifier
│   ├── types/
│   │   ├── credentials.ts                 # VC/VP types
│   │   ├── oid4vci.ts                     # OID4VCI types
│   │   └── oid4vp.ts                      # OID4VP types
│   └── index.ts                           # Public API exports
├── __tests__/
│   ├── unit/                              # Unit tests (41 tests)
│   └── integration/                       # Integration tests (5 tests)
└── examples/
    ├── basic-usage.ts                     # Basic VC/VP example
    ├── oid4vci-flow.ts                    # OID4VCI example
    ├── oid4vp-flow.ts                     # OID4VP example
    └── README.md                          # Examples documentation
```

## API Documentation

### VeramoAgentService

Core service for DID and key management using `did:key` method.

```typescript
const service = new VeramoAgentService();

// Create a new DID
const identifier = await service.createIdentifier();
// Returns: { did: 'did:key:z6Mk...', ... }

// Resolve a DID document
const didDoc = await service.resolveDid(identifier.did);

// List all managed DIDs
const dids = await service.listIdentifiers();

// Get specific identifier
const id = await service.getIdentifier(identifier.did);
```

### CredentialService

Service for creating and verifying credentials and presentations.

```typescript
const service = new CredentialService(veramoService);

// Create a verifiable credential
const vc = await service.createCredential({
  issuerDid: 'did:key:...',
  subjectDid: 'did:key:...',
  credentialSubject: {
    id: 'did:key:...',
    name: 'Alice',
    email: 'alice@example.com',
  },
  expirationDate: new Date('2025-12-31'),
});

// Verify a credential
const result = await service.verifyCredential(vc);
// Returns: { verified: true/false, error?: {...} }

// Create a verifiable presentation
const vp = await service.createPresentation({
  holderDid: 'did:key:...',
  verifiableCredentials: [vc],
  challenge: 'nonce-123',
  domain: 'https://verifier.example.com',
});

// Verify a presentation
const vpResult = await service.verifyPresentation(vp);
```

### OID4VCIssuerService

Service for OpenID4VCI credential issuance protocol.

```typescript
const service = new OID4VCIssuerService({
  issuerDid: 'did:key:...',
  issuerUrl: 'https://issuer.example.com',
  credentialService,
  defaultExpiresIn: 600, // Optional: default 600 seconds
});

// Create a credential offer with pre-authorized code
const offer = await service.createCredentialOffer({
  credentialType: 'IdentityCredential',
  credentialSubject: {
    name: 'Alice',
    email: 'alice@example.com',
  },
  subjectDid: 'did:key:...',
  userPinRequired: true,  // Optional
  expiresIn: 600,         // Optional: seconds
});

// Generate QR code URL
const qrUrl = service.createOfferUrl(offer);
// Returns: 'openid-credential-offer://...'

// Get offer metadata
const metadata = await service.getOfferMetadata(preAuthCode);
// Returns: { userPin, expiresAt, ... }

// Exchange pre-authorized code for access token
const tokenResponse = await service.exchangePreAuthorizedCode({
  grant_type: 'urn:ietf:params:oauth:grant-type:pre-authorized_code',
  'pre-authorized_code': preAuthCode,
  user_pin: userPin, // If required
});

// Issue credential with access token
const credentialResponse = await service.issueCredential(
  {
    format: 'jwt_vc_json',
    types: ['VerifiableCredential', 'IdentityCredential'],
  },
  tokenResponse.access_token
);
```

### OID4VPVerifierService

Service for OpenID4VP presentation verification protocol.

```typescript
const service = new OID4VPVerifierService({
  verifierDid: 'did:key:...',
  verifierUrl: 'https://verifier.example.com',
  credentialService,
  defaultExpiresIn: 600, // Optional: default 600 seconds
});

// Create a presentation request
const request = await service.createPresentationRequest({
  credentialTypes: ['IdentityCredential', 'EmailCredential'],
  purpose: 'Identity verification',
  requiredFields: ['name', 'email'], // Optional
});

// Generate QR code URL
const requestUrl = service.createRequestUrl(request);
// Returns: 'openid4vp://...'

// Get request metadata
const metadata = await service.getRequestMetadata(request.state);
// Returns: { nonce, presentationDefinition, ... }

// Verify a presentation
const result = await service.verifyPresentation(
  vpToken,  // JWT VP from wallet
  request.state
);
// Returns: {
//   verified: true/false,
//   presentationValid: true/false,
//   credentialsValid: true/false,
//   matchesDefinition: true/false,
//   error?: {...}
// }
```

## Test Coverage

- **Unit Tests**: 41 tests covering all services
  - Veramo Agent: 5 tests
  - Credential Service: 8 tests
  - OID4VCI Issuer: 16 tests
  - OID4VP Verifier: 12 tests

- **Integration Tests**: 5 tests covering end-to-end flows
  - Complete issuance and verification flow
  - Multiple credentials in presentations
  - Error handling and edge cases
  - Real-world scenarios (age verification)

**Total: 46/46 tests passing ✓**

## Architecture

The library follows a layered architecture:

1. **Core Layer**: Veramo agent with DID and key management
2. **Credential Layer**: VC/VP creation and verification
3. **Protocol Layer**: OID4VCI and OID4VP implementations
4. **Storage Layer**: In-memory stores for offers, tokens, and requests

All components are designed to be:
- **Modular**: Use only what you need
- **Testable**: Comprehensive test coverage
- **Type-safe**: Full TypeScript support
- **Standards-compliant**: Follows W3C and OpenID specs

## Use Cases

- **Digital Identity**: Issue and verify identity credentials
- **Access Control**: Verify credentials for service access
- **Age Verification**: Selective disclosure of age information
- **Email Verification**: Prove email ownership
- **Educational Credentials**: Issue diplomas and certificates
- **Professional Licenses**: Verify professional qualifications

## Frontend Integration

This library is designed to be used in backend services. For frontend integration:

1. **Issuer Backend**: Use `OID4VCIssuerService` to create offers and issue credentials
2. **Verifier Backend**: Use `OID4VPVerifierService` to request and verify presentations
3. **Frontend**: Display QR codes and handle wallet interactions
4. **Wallet**: Use compatible wallet apps (e.g., Sphereon Wallet)

## Next Steps

- Deploy issuer and verifier services
- Integrate with frontend applications
- Add persistent storage (database)
- Implement additional credential types
- Add support for more DID methods
- Implement revocation mechanisms

## License

MIT
