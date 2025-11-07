/**
 * OID4VCI Flow Example - Complete credential issuance flow
 * 
 * Run with: npm run example:oid4vci
 */

import { VeramoAgentService } from '../src/services/veramo-agent.service';
import { CredentialService } from '../src/services/credential.service';
import { OID4VCIssuerService } from '../src/services/oid4vci-issuer.service';

async function main() {
  console.log('🔐 OID4VCI Complete Issuance Flow Example\n');
  console.log('=' .repeat(70));

  // ============================================================================
  // SETUP: Initialize services
  // ============================================================================
  console.log('\n📦 SETUP: Initializing services...');
  
  const veramoService = new VeramoAgentService();
  const credentialService = new CredentialService(veramoService);
  
  // Create issuer identity
  const issuer = await veramoService.createIdentifier();
  console.log(`✅ Issuer DID: ${issuer.did}`);

  // Initialize OID4VCI Issuer
  const oid4vciIssuer = new OID4VCIssuerService({
    issuerDid: issuer.did,
    issuerUrl: 'https://issuer.example.com',
    credentialService,
  });
  console.log(`✅ OID4VCI Issuer initialized at: ${oid4vciIssuer.getIssuerUrl()}`);

  // ============================================================================
  // STEP 1: Create Credential Offer
  // ============================================================================
  console.log('\n' + '='.repeat(70));
  console.log('📋 STEP 1: Creating Credential Offer');
  console.log('='.repeat(70));

  const offer = await oid4vciIssuer.createCredentialOffer({
    credentialType: 'IdentityCredential',
    credentialSubject: {
      name: 'Alice Wonderland',
      email: 'alice@example.com',
      dateOfBirth: '1990-01-01',
    },
    subjectDid: 'did:key:z6MkWalletHolder123', // In real scenario, this would be the wallet's DID
    userPinRequired: true, // Require PIN for extra security
  });

  console.log('\n✅ Credential Offer Created:');
  console.log(`   - Credential Issuer: ${offer.credential_issuer}`);
  console.log(`   - Credential Types: ${offer.credentials.join(', ')}`);
  console.log(`   - Grant Type: Pre-Authorized Code`);
  
  const preAuthCode = offer.grants['urn:ietf:params:oauth:grant-type:pre-authorized_code']['pre-authorized_code'];
  console.log(`   - Pre-Authorized Code: ${preAuthCode.substring(0, 20)}...`);
  console.log(`   - PIN Required: ${offer.grants['urn:ietf:params:oauth:grant-type:pre-authorized_code'].user_pin_required || false}`);

  // ============================================================================
  // STEP 2: Generate QR Code URL
  // ============================================================================
  console.log('\n' + '='.repeat(70));
  console.log('📱 STEP 2: Generating QR Code URL');
  console.log('='.repeat(70));

  const offerUrl = oid4vciIssuer.createOfferUrl(offer);
  console.log('\n✅ QR Code URL Generated:');
  console.log(`   ${offerUrl.substring(0, 100)}...`);
  console.log('\n💡 In a real app, this URL would be:');
  console.log('   1. Encoded as a QR code');
  console.log('   2. Displayed to the user');
  console.log('   3. Scanned by a wallet app');

  // Get the PIN for this offer (in real scenario, shown to user separately)
  const offerMetadata = await oid4vciIssuer.getOfferMetadata(preAuthCode);
  const userPin = offerMetadata?.userPin;
  console.log(`\n🔑 User PIN (shown separately to user): ${userPin}`);

  // ============================================================================
  // STEP 3: Wallet Exchanges Pre-Authorized Code for Token
  // ============================================================================
  console.log('\n' + '='.repeat(70));
  console.log('🔄 STEP 3: Wallet Exchanges Code for Access Token');
  console.log('='.repeat(70));

  console.log('\n📲 Simulating wallet scanning QR code and requesting token...');
  
  // Wallet would parse the offer and extract the pre-authorized code
  console.log(`   - Wallet extracts pre-authorized code from offer`);
  console.log(`   - User enters PIN: ${userPin}`);
  console.log(`   - Wallet sends token request to issuer`);

  const tokenResponse = await oid4vciIssuer.exchangePreAuthorizedCode({
    grant_type: 'urn:ietf:params:oauth:grant-type:pre-authorized_code',
    'pre-authorized_code': preAuthCode,
    user_pin: userPin,
  });

  console.log('\n✅ Access Token Received:');
  console.log(`   - Token: ${tokenResponse.access_token.substring(0, 30)}...`);
  console.log(`   - Type: ${tokenResponse.token_type}`);
  console.log(`   - Expires In: ${tokenResponse.expires_in} seconds`);

  // ============================================================================
  // STEP 4: Wallet Requests Credential
  // ============================================================================
  console.log('\n' + '='.repeat(70));
  console.log('📜 STEP 4: Wallet Requests Credential');
  console.log('='.repeat(70));

  console.log('\n📲 Wallet sends credential request with access token...');

  const credentialResponse = await oid4vciIssuer.issueCredential({
    format: 'jwt_vc_json',
    types: ['VerifiableCredential', 'IdentityCredential'],
  }, tokenResponse.access_token);

  console.log('\n✅ Credential Issued:');
  console.log(`   - Format: ${credentialResponse.format}`);
  console.log(`   - JWT: ${credentialResponse.credential.substring(0, 50)}...`);

  // ============================================================================
  // STEP 5: Verify the Issued Credential
  // ============================================================================
  console.log('\n' + '='.repeat(70));
  console.log('🔍 STEP 5: Verifying Issued Credential');
  console.log('='.repeat(70));

  // Decode and verify the JWT credential
  const jwtParts = credentialResponse.credential.split('.');
  console.log(`\n📊 JWT Structure:`);
  console.log(`   - Header: ${jwtParts[0].substring(0, 30)}...`);
  console.log(`   - Payload: ${jwtParts[1].substring(0, 30)}...`);
  console.log(`   - Signature: ${jwtParts[2].substring(0, 30)}...`);

  // Parse the JWT to extract the credential
  const payload = JSON.parse(Buffer.from(jwtParts[1], 'base64').toString());
  const vc = payload.vc;

  console.log(`\n✅ Credential Contents:`);
  const issuerDid = vc.issuer ? (typeof vc.issuer === 'string' ? vc.issuer : vc.issuer.id) : payload.iss;
  console.log(`   - Issuer: ${issuerDid}`);
  console.log(`   - Subject: ${vc.credentialSubject.id}`);
  console.log(`   - Subject Name: ${vc.credentialSubject.name}`);
  console.log(`   - Subject Email: ${vc.credentialSubject.email}`);
  console.log(`   - Subject DOB: ${vc.credentialSubject.dateOfBirth}`);
  console.log(`   - Issued: ${vc.issuanceDate}`);
  console.log(`   - Types: ${vc.type.join(', ')}`);

  // Verify the credential using Veramo
  console.log(`\n🔐 Verifying credential signature...`);
  
  // Reconstruct the credential object for verification
  const credentialToVerify = {
    ...vc,
    proof: {
      type: 'JwtProof2020',
      jwt: credentialResponse.credential,
    },
  };

  const verificationResult = await credentialService.verifyCredential(credentialToVerify);
  
  if (verificationResult.verified) {
    console.log(`✅ Credential signature is VALID ✓`);
  } else {
    console.log(`❌ Credential signature is INVALID`);
    console.log(`   Error: ${verificationResult.error?.message}`);
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n' + '='.repeat(70));
  console.log('✨ OID4VCI Flow Complete!');
  console.log('='.repeat(70));

  console.log('\n📊 Summary:');
  console.log('   1. ✅ Created credential offer with pre-authorized code');
  console.log('   2. ✅ Generated QR code URL for wallet');
  console.log('   3. ✅ Exchanged code + PIN for access token');
  console.log('   4. ✅ Issued signed JWT credential');
  console.log('   5. ✅ Verified credential signature');

  console.log('\n💡 Next Steps:');
  console.log('   - Integrate with a frontend to display QR codes');
  console.log('   - Test with a real wallet app (e.g., Sphereon Wallet)');
  console.log('   - Implement OID4VP for credential presentation\n');
}

// Run the example
main().catch((error) => {
  console.error('❌ Error running OID4VCI flow:', error);
  process.exit(1);
});
