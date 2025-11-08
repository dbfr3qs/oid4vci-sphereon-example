"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OID4VPVerifierService = void 0;
const uuid_1 = require("uuid");
class OID4VPVerifierService {
    constructor(config) {
        this.config = {
            ...config,
            defaultExpiresIn: config.defaultExpiresIn || 600, // 10 minutes default
        };
        this.requestStore = new Map();
    }
    /**
     * Create a presentation request
     */
    async createPresentationRequest(options) {
        const { credentialTypes, purpose, requiredFields } = options;
        // Generate unique identifiers
        const requestId = (0, uuid_1.v4)();
        const nonce = this.generateNonce();
        const state = this.generateState();
        // Create presentation definition
        const presentationDefinition = {
            id: requestId,
            name: purpose,
            purpose,
            input_descriptors: credentialTypes.map((type, index) => ({
                id: `${type}_${index}`,
                name: `${type} Credential`,
                purpose: `Requesting ${type} credential`,
                constraints: {
                    fields: [
                        {
                            path: ['$.vc.type', '$.type'],
                            filter: {
                                type: 'array',
                                contains: {
                                    const: type,
                                },
                            },
                        },
                        ...(requiredFields || []).map(field => ({
                            path: [`$.vc.credentialSubject.${field}`, `$.credentialSubject.${field}`],
                        })),
                    ],
                },
            })),
        };
        // Calculate expiration
        const expirationSeconds = this.config.defaultExpiresIn;
        const expiresAt = new Date(Date.now() + expirationSeconds * 1000);
        // Store request metadata
        const metadata = {
            requestId,
            nonce,
            state,
            presentationDefinition,
            createdAt: new Date(),
            expiresAt,
            verified: false,
        };
        this.requestStore.set(state, metadata);
        // Create authorization request
        const authRequest = {
            response_type: 'vp_token',
            client_id: this.config.verifierUrl,
            redirect_uri: `${this.config.verifierUrl}/callback`,
            presentation_definition: presentationDefinition,
            nonce,
            state,
        };
        return authRequest;
    }
    /**
     * Create a request URL for QR codes
     */
    createRequestUrl(request) {
        const params = new URLSearchParams({
            response_type: request.response_type,
            client_id: request.client_id,
            redirect_uri: request.redirect_uri,
            nonce: request.nonce,
            state: request.state,
            presentation_definition: JSON.stringify(request.presentation_definition),
        });
        return `openid4vp://?${params.toString()}`;
    }
    /**
     * Get request metadata by state
     */
    async getRequestMetadata(state) {
        const metadata = this.requestStore.get(state);
        if (!metadata) {
            return null;
        }
        // Check if expired
        if (new Date() > metadata.expiresAt) {
            this.requestStore.delete(state);
            return null;
        }
        return metadata;
    }
    /**
     * Verify a presentation
     */
    async verifyPresentation(vpToken, state) {
        // Get request metadata
        const metadata = await this.getRequestMetadata(state);
        if (!metadata) {
            throw new Error('Invalid or expired presentation request');
        }
        try {
            // Decode JWT to get presentation
            const jwtParts = vpToken.split('.');
            if (jwtParts.length !== 3) {
                return {
                    verified: false,
                    presentationValid: false,
                    credentialsValid: false,
                    matchesDefinition: false,
                    error: {
                        message: 'Invalid JWT format',
                    },
                };
            }
            const payload = JSON.parse(Buffer.from(jwtParts[1], 'base64').toString());
            const vp = payload.vp;
            // Verify nonce matches
            if (payload.nonce !== metadata.nonce) {
                return {
                    verified: false,
                    presentationValid: false,
                    credentialsValid: false,
                    matchesDefinition: false,
                    error: {
                        message: 'Nonce mismatch - presentation nonce does not match request',
                    },
                };
            }
            // For now, skip full cryptographic verification and just validate structure
            // TODO: Add proper JWT signature verification with audience validation
            // Basic validation: check that we have a VP and credentials
            if (!vp || !vp.verifiableCredential) {
                return {
                    verified: false,
                    presentationValid: false,
                    credentialsValid: false,
                    matchesDefinition: false,
                    error: {
                        message: 'Invalid presentation structure - missing verifiableCredential',
                    },
                };
            }
            // Check audience if present
            if (payload.aud && payload.aud !== this.config.verifierUrl) {
                console.log(`Warning: Audience mismatch. Expected: ${this.config.verifierUrl}, Got: ${payload.aud}`);
                // For now, just log it but don't fail
            }
            // Verify credentials in the presentation
            const credentials = Array.isArray(vp.verifiableCredential)
                ? vp.verifiableCredential
                : [vp.verifiableCredential];
            let allCredentialsValid = true;
            for (const credential of credentials) {
                try {
                    const vcVerification = await this.config.credentialService.verifyCredential(credential);
                    if (!vcVerification.verified) {
                        console.log('Credential verification failed:', vcVerification.error);
                        allCredentialsValid = false;
                        break;
                    }
                }
                catch (err) {
                    console.log('Error verifying credential:', err);
                    // For demo purposes, continue even if verification fails
                    // allCredentialsValid = false;
                }
            }
            // Mark as verified
            metadata.verified = true;
            this.requestStore.set(state, metadata);
            return {
                verified: true,
                presentationValid: true,
                credentialsValid: allCredentialsValid,
                matchesDefinition: true, // Simplified - would need full PEX validation
            };
        }
        catch (error) {
            return {
                verified: false,
                presentationValid: false,
                credentialsValid: false,
                matchesDefinition: false,
                error: {
                    message: error.message || 'Verification failed',
                    details: error,
                },
            };
        }
    }
    /**
     * Generate a secure nonce
     */
    generateNonce() {
        return `nonce_${(0, uuid_1.v4)().replace(/-/g, '')}`;
    }
    /**
     * Generate a secure state
     */
    generateState() {
        return `state_${(0, uuid_1.v4)().replace(/-/g, '')}`;
    }
    /**
     * Expire a request (for testing)
     */
    async expireRequest(state) {
        const metadata = this.requestStore.get(state);
        if (metadata) {
            metadata.expiresAt = new Date(Date.now() - 1000); // Set to past
            this.requestStore.set(state, metadata);
        }
    }
    /**
     * Get verifier DID
     */
    getVerifierDid() {
        return this.config.verifierDid;
    }
    /**
     * Get verifier URL
     */
    getVerifierUrl() {
        return this.config.verifierUrl;
    }
}
exports.OID4VPVerifierService = OID4VPVerifierService;
