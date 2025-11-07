# VC Agent Examples

## Running the Examples

### Basic Usage Example

Demonstrates core functionality: DID creation, VC issuance, VP creation, and verification.

```bash
npm run example
```

### OID4VCI Flow Example

Demonstrates the complete OpenID4VCI credential issuance protocol flow.

```bash
npm run example:oid4vci
```

### OID4VP Flow Example

Demonstrates the complete OpenID4VP presentation verification protocol flow.

```bash
npm run example:oid4vp
```

## What the Examples Show

### Basic Usage (`npm run example`)

**✅ Working Features:**

1. **DID Management**
   - Creates `did:key` identities
   - Lists all managed DIDs
   - Resolves DID documents

2. **Verifiable Credential Creation**
   - Issues JWT-based VCs
   - Includes custom claims (name, email, DOB)
   - Signs with issuer's private key

3. **Credential Verification**
   - Verifies VC signatures
   - Validates credential structure
   - Detects tampered credentials ✓

4. **Verifiable Presentation Creation**
   - Creates VPs containing multiple VCs
   - Signs with holder's private key

### OID4VCI Flow (`npm run example:oid4vci`)

**Complete credential issuance protocol:**

1. **Create Credential Offer**
   - Generates offer with pre-authorized code
   - Optionally requires user PIN
   - Sets expiration time

2. **Generate QR Code URL**
   - Creates `openid-credential-offer://` URL
   - Ready to be encoded as QR code
   - Contains all offer details

3. **Token Exchange**
   - Simulates wallet scanning QR code
   - Exchanges pre-authorized code + PIN for access token
   - Validates code and PIN

4. **Credential Issuance**
   - Wallet requests credential with access token
   - Issuer creates and signs JWT VC
   - Returns credential to wallet

5. **Verification**
   - Parses JWT structure
   - Displays credential contents
   - Shows issuer, subject, and claims

**Example Output:**
```
🔐 OID4VCI Complete Issuance Flow Example
✅ Issuer DID: did:key:z6Mk...
✅ Pre-Authorized Code: pac_3dcb80e0...
🔑 User PIN: 833845
✅ Access Token: at_0cec4d4c...
✅ Credential Issued (JWT)
```

### OID4VP Flow (`npm run example:oid4vp`)

**Complete presentation verification protocol:**

1. **Issue Credentials**
   - Creates issuer, holder, and verifier identities
   - Issues credentials to holder
   - Demonstrates multi-credential scenarios

2. **Create Presentation Request**
   - Generates authorization request
   - Creates presentation definition
   - Specifies required credential types

3. **Generate QR Code URL**
   - Creates `openid4vp://` URL
   - Ready to be encoded as QR code
   - Contains presentation definition

4. **Holder Creates Presentation**
   - Simulates wallet scanning QR
   - Selects requested credentials
   - Creates signed VP with challenge

5. **Verify Presentation**
   - Validates nonce matches request
   - Verifies presentation signature
   - Verifies all credential signatures
   - Checks credentials match definition

6. **Extract Claims**
   - Parses verified presentation
   - Displays credential contents
   - Shows verified claims

**Example Output:**
```
🔐 OID4VP Complete Presentation Verification Flow
✅ Issuer DID: did:key:z6Mk...
✅ Holder DID: did:key:z6Mk...
✅ Verifier DID: did:key:z6Mk...
✅ Presentation Request Created
✅ Verification Complete: ✓
📊 Verified Claims: name, email, dateOfBirth
```

## Next Steps

- **Frontend Integration**: Use these services in a web app to display QR codes
- **Wallet Testing**: Test with real wallet apps (e.g., Sphereon Wallet)
- **End-to-End**: Combine OID4VCI + OID4VP for complete flows

All operations are performed in-memory with no external dependencies.
