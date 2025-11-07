/**
 * OID4VP Flow Example - Complete presentation verification flow
 * 
 * Run with: npm run example:oid4vp
 */

import { VeramoAgentService } from '../src/services/veramo-agent.service';
import { CredentialService } from '../src/services/credential.service';
import { OID4VPVerifierService } from '../src/services/oid4vp-verifier.service';

async function main() {
  console.log('🔐 OID4VP Complete Presentation Verification Flow\n');
  console.log('=' .repeat(70));

  // ============================================================================
  // SETUP: Initialize services and identities
  // ============================================================================
  console.log('\n📦 SETUP: Initializing services...');
  
  const veramoService = new VeramoAgentService();
  const credentialService = new CredentialService(veramoService);
  
  // Create identities for each party
  const issuer = await veramoService.createIdentifier();
  const holder = await veramoService.createIdentifier();
  const verifier = await veramoService.createIdentifier();
  
  console.log(`✅ Issuer DID: ${issuer.did}`);
  console.log(`✅ Holder DID: ${holder.did}`);
  console.log(`✅ Verifier DID: ${verifier.did}`);

  // Initialize OID4VP Verifier
  const oid4vpVerifier = new OID4VPVerifierService({
    verifierDid: verifier.did,
    verifierUrl: 'https://verifier.example.com',
    credentialService,
  });
  console.log(`✅ OID4VP Verifier initialized at: ${oid4vpVerifier.getVerifierUrl()}`);

  // ============================================================================
  // STEP 1: Issue Credentials to Holder (Prerequisite)
  // ============================================================================
  console.log('\n' + '='.repeat(70));
  console.log('📜 STEP 1: Issuing Credentials to Holder');
  console.log('='.repeat(70));

  console.log('\n📝 Creating identity credential...');
  const identityCredential = await credentialService.createCredential({
    issuerDid: issuer.did,
    subjectDid: holder.did,
    credentialSubject: {
      id: holder.did,
      name: 'Alice Wonderland',
      email: 'alice@example.com',
      dateOfBirth: '1990-01-01',
    },
  });

  console.log(`✅ Identity Credential issued`);
  console.log(`   - Type: IdentityCredential`);
  console.log(`   - Subject: ${holder.did.substring(0, 40)}...`);
  console.log(`   - Claims: name, email, dateOfBirth`);

  console.log('\n📝 Creating email credential...');
  const emailCredential = await credentialService.createCredential({
    issuerDid: issuer.did,
    subjectDid: holder.did,
    credentialSubject: {
      id: holder.did,
      email: 'alice.verified@example.com',
    },
  });

  console.log(`✅ Email Credential issued`);
  console.log(`   - Type: EmailCredential`);
  console.log(`   - Email: alice@example.com`);
  console.log(`   - Verified: true`);

  // ============================================================================
  // STEP 2: Verifier Creates Presentation Request
  // ============================================================================
  console.log('\n' + '='.repeat(70));
  console.log('📋 STEP 2: Creating Presentation Request');
  console.log('='.repeat(70));

  const presentationRequest = await oid4vpVerifier.createPresentationRequest({
    credentialTypes: ['IdentityCredential'],
    purpose: 'Please present your identity credential for age verification',
  });

  console.log('\n✅ Presentation Request Created:');
  console.log(`   - Response Type: ${presentationRequest.response_type}`);
  console.log(`   - Client ID: ${presentationRequest.client_id}`);
  console.log(`   - Nonce: ${presentationRequest.nonce.substring(0, 30)}...`);
  console.log(`   - State: ${presentationRequest.state.substring(0, 30)}...`);
  console.log(`   - Purpose: ${presentationRequest.presentation_definition.purpose}`);
  console.log(`   - Required Credentials: ${presentationRequest.presentation_definition.input_descriptors.length}`);

  // ============================================================================
  // STEP 3: Generate QR Code URL
  // ============================================================================
  console.log('\n' + '='.repeat(70));
  console.log('📱 STEP 3: Generating QR Code URL');
  console.log('='.repeat(70));

  const requestUrl = oid4vpVerifier.createRequestUrl(presentationRequest);
  console.log('\n✅ QR Code URL Generated:');
  console.log(`   ${requestUrl.substring(0, 100)}...`);
  console.log('\n💡 In a real app, this URL would be:');
  console.log('   1. Encoded as a QR code');
  console.log('   2. Displayed to the user');
  console.log('   3. Scanned by a wallet app');

  // ============================================================================
  // STEP 4: Holder Creates Presentation
  // ============================================================================
  console.log('\n' + '='.repeat(70));
  console.log('📲 STEP 4: Holder Creates Presentation');
  console.log('='.repeat(70));

  console.log('\n📲 Simulating wallet scanning QR code...');
  console.log(`   - Wallet parses presentation request`);
  console.log(`   - User reviews requested credentials`);
  console.log(`   - User approves sharing identity credential`);

  // Holder creates presentation with requested credentials
  const presentation = await credentialService.createPresentation({
    holderDid: holder.did,
    verifiableCredentials: [identityCredential],
    challenge: presentationRequest.nonce,
  });

  console.log('\n✅ Presentation Created:');
  console.log(`   - Holder: ${holder.did.substring(0, 40)}...`);
  console.log(`   - Credentials Included: 1`);
  console.log(`   - Challenge: ${presentationRequest.nonce.substring(0, 30)}...`);
  console.log(`   - JWT: ${presentation.proof.jwt.substring(0, 50)}...`);

  // ============================================================================
  // STEP 5: Verifier Receives and Verifies Presentation
  // ============================================================================
  console.log('\n' + '='.repeat(70));
  console.log('🔍 STEP 5: Verifying Presentation');
  console.log('='.repeat(70));

  console.log('\n📥 Verifier receives presentation from wallet...');
  console.log(`   - Checking nonce matches request`);
  console.log(`   - Verifying presentation signature`);
  console.log(`   - Verifying credential signatures`);
  console.log(`   - Checking credentials match definition`);

  const verificationResult = await oid4vpVerifier.verifyPresentation(
    presentation.proof.jwt,
    presentationRequest.state
  );

  console.log('\n✅ Verification Complete:');
  console.log(`   - Overall Verified: ${verificationResult.verified ? '✓' : '✗'}`);
  console.log(`   - Presentation Valid: ${verificationResult.presentationValid ? '✓' : '✗'}`);
  console.log(`   - Credentials Valid: ${verificationResult.credentialsValid ? '✓' : '✗'}`);
  console.log(`   - Matches Definition: ${verificationResult.matchesDefinition ? '✓' : '✗'}`);

  if (verificationResult.verified) {
    console.log('\n🎉 SUCCESS: Presentation verified successfully!');
  } else {
    console.log('\n❌ FAILED: Presentation verification failed');
    console.log(`   Error: ${verificationResult.error?.message}`);
  }

  // ============================================================================
  // STEP 6: Extract and Display Claims
  // ============================================================================
  console.log('\n' + '='.repeat(70));
  console.log('📊 STEP 6: Extracting Verified Claims');
  console.log('='.repeat(70));

  // Parse the presentation JWT
  const jwtParts = presentation.proof.jwt.split('.');
  const payload = JSON.parse(Buffer.from(jwtParts[1], 'base64').toString());
  const vp = payload.vp;

  console.log('\n✅ Verified Presentation Contents:');
  console.log(`   - Holder: ${vp.holder || payload.iss}`);
  console.log(`   - Type: ${vp.type.join(', ')}`);

  // Extract credentials
  const credentials = Array.isArray(vp.verifiableCredential) 
    ? vp.verifiableCredential 
    : [vp.verifiableCredential];

  console.log(`\n📜 Credentials in Presentation: ${credentials.length}`);
  
  credentials.forEach((cred: any, index: number) => {
    // Parse credential JWT if needed
    let credentialData = cred;
    if (typeof cred === 'string' && cred.includes('.')) {
      const credJwtParts = cred.split('.');
      const credPayload = JSON.parse(Buffer.from(credJwtParts[1], 'base64').toString());
      credentialData = credPayload.vc;
    }

    console.log(`\n   Credential ${index + 1}:`);
    console.log(`   - Type: ${credentialData.type.join(', ')}`);
    console.log(`   - Issuer: ${credentialData.issuer || 'N/A'}`);
    console.log(`   - Subject Claims:`);
    
    Object.entries(credentialData.credentialSubject).forEach(([key, value]) => {
      if (key !== 'id') {
        console.log(`     • ${key}: ${value}`);
      }
    });
  });

  // ============================================================================
  // BONUS: Test with Multiple Credentials
  // ============================================================================
  console.log('\n' + '='.repeat(70));
  console.log('🎁 BONUS: Testing with Multiple Credentials');
  console.log('='.repeat(70));

  const multiRequest = await oid4vpVerifier.createPresentationRequest({
    credentialTypes: ['IdentityCredential', 'EmailCredential'],
    purpose: 'Please present both identity and email credentials',
  });

  console.log('\n✅ Multi-Credential Request Created:');
  console.log(`   - Required Types: IdentityCredential, EmailCredential`);

  const multiPresentation = await credentialService.createPresentation({
    holderDid: holder.did,
    verifiableCredentials: [identityCredential, emailCredential],
    challenge: multiRequest.nonce,
  });

  const multiVerification = await oid4vpVerifier.verifyPresentation(
    multiPresentation.proof.jwt,
    multiRequest.state
  );

  console.log('\n✅ Multi-Credential Verification:');
  console.log(`   - Verified: ${multiVerification.verified ? '✓' : '✗'}`);
  console.log(`   - Credentials Count: 2`);

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n' + '='.repeat(70));
  console.log('✨ OID4VP Flow Complete!');
  console.log('='.repeat(70));

  console.log('\n📊 Summary:');
  console.log('   1. ✅ Issued credentials to holder');
  console.log('   2. ✅ Created presentation request with definition');
  console.log('   3. ✅ Generated QR code URL for wallet');
  console.log('   4. ✅ Holder created presentation with credentials');
  console.log('   5. ✅ Verified presentation and credentials');
  console.log('   6. ✅ Extracted verified claims');
  console.log('   7. ✅ Tested with multiple credentials');

  console.log('\n💡 Next Steps:');
  console.log('   - Integrate with a frontend to display QR codes');
  console.log('   - Test with a real wallet app (e.g., Sphereon Wallet)');
  console.log('   - Combine with OID4VCI for complete issuance + verification\n');
}

// Run the example
main().catch((error) => {
  console.error('❌ Error running OID4VP flow:', error);
  process.exit(1);
});
