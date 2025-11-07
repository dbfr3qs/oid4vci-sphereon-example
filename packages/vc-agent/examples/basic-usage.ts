/**
 * Basic usage example demonstrating the VC Agent capabilities
 * 
 * Run with: npm run example
 */

import { VeramoAgentService } from '../src/services/veramo-agent.service';
import { CredentialService } from '../src/services/credential.service';

async function main() {
  console.log('🚀 VC Agent - Basic Usage Example\n');
  console.log('=' .repeat(60));

  // Step 1: Initialize services
  console.log('\n📦 Step 1: Initializing Veramo Agent...');
  const veramoService = new VeramoAgentService();
  const credentialService = new CredentialService(veramoService);
  console.log('✅ Agent initialized');

  // Step 2: Create DIDs
  console.log('\n🔑 Step 2: Creating DID identities...');
  const issuer = await veramoService.createIdentifier();
  console.log(`✅ Issuer DID created: ${issuer.did}`);
  
  const holder = await veramoService.createIdentifier();
  console.log(`✅ Holder DID created: ${holder.did}`);

  // Step 3: Create a Verifiable Credential
  console.log('\n📜 Step 3: Creating Verifiable Credential...');
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
  
  console.log('✅ Credential created:');
  const types = Array.isArray(credential.type) ? credential.type.join(', ') : credential.type;
  console.log(`   - Type: ${types}`);
  console.log(`   - Issuer: ${typeof credential.issuer === 'string' ? credential.issuer : credential.issuer.id}`);
  console.log(`   - Subject: ${credential.credentialSubject.id}`);
  console.log(`   - Subject Name: ${credential.credentialSubject.name}`);
  console.log(`   - Issued: ${credential.issuanceDate}`);
  console.log(`   - JWT: ${credential.proof.jwt.substring(0, 50)}...`);

  // Step 4: Verify the Credential
  console.log('\n🔍 Step 4: Verifying Credential...');
  const vcVerification = await credentialService.verifyCredential(credential);
  console.log(`✅ Verification result: ${vcVerification.verified ? '✓ VALID' : '✗ INVALID'}`);
  if (vcVerification.error) {
    console.log(`   Error: ${vcVerification.error.message}`);
  }

  // Step 5: Create a Verifiable Presentation
  console.log('\n📋 Step 5: Creating Verifiable Presentation...');
  const presentation = await credentialService.createPresentation({
    holderDid: holder.did,
    verifiableCredentials: [credential],
    challenge: 'test-challenge-12345',
    domain: 'example.com',
  });

  console.log('✅ Presentation created:');
  console.log(`   - Holder: ${presentation.holder}`);
  console.log(`   - Credentials: ${Array.isArray(presentation.verifiableCredential) ? (presentation.verifiableCredential as any[]).length : 1}`);
  console.log(`   - JWT: ${presentation.proof.jwt.substring(0, 50)}...`);

  // Step 6: Verify the Presentation
  console.log('\n🔍 Step 6: Verifying Presentation...');
  const vpVerification = await credentialService.verifyPresentation(presentation);
  console.log(`✅ Verification result: ${vpVerification.verified ? '✓ VALID' : '✗ INVALID'}`);
  if (vpVerification.error) {
    console.log(`   Error: ${vpVerification.error.message}`);
  }

  // Step 7: List all managed DIDs
  console.log('\n👥 Step 7: Listing all managed DIDs...');
  const allDids = await veramoService.listIdentifiers();
  console.log(`✅ Total DIDs managed: ${allDids.length}`);
  allDids.forEach((did, index) => {
    console.log(`   ${index + 1}. ${did.did}`);
  });

  // Step 8: Demonstrate tampered credential detection
  console.log('\n⚠️  Step 8: Testing tampered credential detection...');
  const tamperedCredential = { ...credential };
  tamperedCredential.credentialSubject = {
    ...tamperedCredential.credentialSubject,
    name: 'Tampered Name',
  };
  
  const tamperedVerification = await credentialService.verifyCredential(tamperedCredential);
  console.log(`✅ Tampered credential detected: ${!tamperedVerification.verified ? '✓ CORRECTLY REJECTED' : '✗ FAILED TO DETECT'}`);
  if (tamperedVerification.error) {
    console.log(`   Error: ${tamperedVerification.error.message}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✨ Example completed successfully!\n');
}

// Run the example
main().catch((error) => {
  console.error('❌ Error running example:', error);
  process.exit(1);
});
