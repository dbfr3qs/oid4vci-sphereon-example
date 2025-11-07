"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CredentialService = void 0;
const credentials_1 = require("../types/credentials");
/**
 * Service for creating and verifying Verifiable Credentials and Presentations
 */
class CredentialService {
    constructor(veramoService) {
        this.veramoService = veramoService;
    }
    /**
     * Create a Verifiable Credential
     */
    async createCredential(options) {
        const { issuerDid, subjectDid, credentialSubject, expirationDate, additionalTypes } = options;
        const types = [
            credentials_1.CREDENTIAL_TYPES.VERIFIABLE_CREDENTIAL,
            credentials_1.CREDENTIAL_TYPES.IDENTITY,
            ...(additionalTypes || []),
        ];
        const credential = {
            '@context': ['https://www.w3.org/2018/credentials/v1'],
            type: types,
            issuer: { id: issuerDid },
            issuanceDate: new Date().toISOString(),
            credentialSubject: {
                ...credentialSubject,
                id: subjectDid,
            },
        };
        if (expirationDate) {
            credential.expirationDate = expirationDate;
        }
        const agent = this.veramoService.getAgent();
        const verifiableCredential = await agent.createVerifiableCredential({
            credential,
            proofFormat: 'jwt',
            save: false,
        });
        return verifiableCredential;
    }
    /**
     * Verify a Verifiable Credential
     */
    async verifyCredential(credential) {
        try {
            const agent = this.veramoService.getAgent();
            const result = await agent.verifyCredential({
                credential,
            });
            return {
                verified: result.verified,
                error: result.error
                    ? {
                        message: result.error.message || 'Verification failed',
                        errorCode: result.error.errorCode,
                    }
                    : undefined,
            };
        }
        catch (error) {
            return {
                verified: false,
                error: {
                    message: error.message || 'Verification failed',
                },
            };
        }
    }
    /**
     * Create a Verifiable Presentation
     */
    async createPresentation(options) {
        const { holderDid, verifiableCredentials, challenge, domain } = options;
        const presentation = {
            '@context': ['https://www.w3.org/2018/credentials/v1'],
            type: ['VerifiablePresentation'],
            holder: holderDid,
            verifiableCredential: verifiableCredentials,
        };
        const agent = this.veramoService.getAgent();
        const verifiablePresentation = await agent.createVerifiablePresentation({
            presentation,
            proofFormat: 'jwt',
            challenge,
            domain,
            save: false,
        });
        return verifiablePresentation;
    }
    /**
     * Verify a Verifiable Presentation
     */
    async verifyPresentation(presentation) {
        try {
            const agent = this.veramoService.getAgent();
            const result = await agent.verifyPresentation({
                presentation,
            });
            return {
                verified: result.verified,
                error: result.error
                    ? {
                        message: result.error.message || 'Verification failed',
                        errorCode: result.error.errorCode,
                    }
                    : undefined,
            };
        }
        catch (error) {
            return {
                verified: false,
                error: {
                    message: error.message || 'Verification failed',
                },
            };
        }
    }
}
exports.CredentialService = CredentialService;
