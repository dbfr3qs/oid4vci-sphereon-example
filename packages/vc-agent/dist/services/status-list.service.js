"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusListService = void 0;
const vc_status_list_1 = require("@digitalbazaar/vc-status-list");
const axios_1 = __importDefault(require("axios"));
/**
 * Service for managing credential status lists (revocation)
 * Implements W3C Status List 2021 specification
 */
class StatusListService {
    constructor(config) {
        this.nextIndex = 0;
        this.indexMap = new Map(); // credentialId -> index
        this.config = config;
    }
    /**
     * Initialize the status list
     */
    async initialize() {
        console.log('[StatusListService] Initializing status list...');
        // Create a new status list with 100,000 entries (default size)
        // Each entry is 1 bit (0 = valid, 1 = revoked)
        this.statusList = await (0, vc_status_list_1.createList)({ length: 100000 });
        console.log('[StatusListService] ✓ Status list initialized');
    }
    /**
     * Get the next available index in the status list
     */
    getNextIndex() {
        return this.nextIndex++;
    }
    /**
     * Create a status list entry for a new credential
     */
    createStatusEntry(credentialId) {
        const index = this.getNextIndex();
        this.indexMap.set(credentialId, index);
        console.log(`[StatusListService] Created status entry for credential ${credentialId} at index ${index}`);
        return {
            id: `${this.config.statusListUrl}#${index}`,
            type: 'StatusList2021Entry',
            statusPurpose: 'revocation',
            statusListIndex: index.toString(),
            statusListCredential: this.config.statusListUrl,
        };
    }
    /**
     * Revoke a credential by setting its bit to 1
     */
    async revokeCredential(credentialId) {
        const index = this.indexMap.get(credentialId);
        if (index === undefined) {
            console.log(`[StatusListService] ✗ Credential ${credentialId} not found in status list`);
            return false;
        }
        // Set the bit at this index to 1 (revoked)
        this.statusList.setStatus(index, true);
        console.log(`[StatusListService] ✓ Revoked credential ${credentialId} at index ${index}`);
        return true;
    }
    /**
     * Check if a credential is revoked
     */
    async isRevoked(credentialId) {
        const index = this.indexMap.get(credentialId);
        if (index === undefined) {
            console.log(`[StatusListService] Credential ${credentialId} not found in status list`);
            return false;
        }
        const status = this.statusList.getStatus(index);
        return status === true;
    }
    /**
     * Check revocation status by index
     */
    async isRevokedByIndex(index) {
        if (index < 0 || index >= this.nextIndex) {
            return false;
        }
        const status = this.statusList.getStatus(index);
        return status === true;
    }
    /**
     * Generate the Status List 2021 Credential
     * This is a special VC that contains the compressed bitstring
     */
    async generateStatusListCredential() {
        const encodedList = await this.statusList.encode();
        const statusListCredential = {
            '@context': [
                'https://www.w3.org/2018/credentials/v1',
                'https://w3id.org/vc/status-list/2021/v1',
            ],
            id: this.config.statusListUrl,
            type: ['VerifiableCredential', 'StatusList2021Credential'],
            issuer: this.config.issuerDid,
            issuanceDate: new Date().toISOString(),
            credentialSubject: {
                id: `${this.config.statusListUrl}#list`,
                type: 'StatusList2021',
                statusPurpose: 'revocation',
                encodedList,
            },
        };
        // Sign the status list credential
        const agent = this.config.veramoService.getAgent();
        const signedCredential = await agent.createVerifiableCredential({
            credential: statusListCredential,
            proofFormat: 'jwt',
            save: false,
        });
        console.log('[StatusListService] ✓ Generated signed status list credential');
        return signedCredential;
    }
    /**
     * Verify a credential's revocation status from a status list credential
     */
    static async checkRevocationStatus(statusListCredential, statusListIndex) {
        try {
            // Decode the JWT if needed
            let credential = statusListCredential;
            if (typeof statusListCredential === 'string') {
                const parts = statusListCredential.split('.');
                const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
                credential = payload.vc || payload;
            }
            // Get the encoded list from the credential
            const encodedList = credential.credentialSubject.encodedList;
            // Decode the status list
            const list = await (0, vc_status_list_1.decodeList)({ encodedList });
            // Check the status at the given index
            const isRevoked = list.getStatus(statusListIndex);
            return isRevoked === true;
        }
        catch (error) {
            console.error('[StatusListService] Error checking revocation status:', error);
            return false;
        }
    }
    /**
     * Get statistics about the status list
     */
    getStats() {
        let revokedCount = 0;
        for (let i = 0; i < this.nextIndex; i++) {
            if (this.statusList.getStatus(i) === true) {
                revokedCount++;
            }
        }
        return {
            total: 100000,
            issued: this.nextIndex,
            revoked: revokedCount,
        };
    }
    /**
     * Check if a credential is revoked by fetching its status list
     * This is used by verifiers to check credentials from external issuers
     */
    static async checkCredentialRevocationStatus(credential) {
        try {
            // Extract credential from JWT if needed
            let vc = credential;
            if (typeof credential === 'string') {
                const parts = credential.split('.');
                if (parts.length === 3) {
                    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
                    vc = payload.vc || payload;
                }
            }
            // Check if credential has a credentialStatus field
            if (!vc.credentialStatus) {
                console.log('[StatusListService] Credential has no credentialStatus field');
                return {
                    revoked: false,
                    checked: false,
                    error: 'No credentialStatus field',
                };
            }
            const { type, statusPurpose, statusListIndex, statusListCredential } = vc.credentialStatus;
            // Verify it's a StatusList2021Entry
            if (type !== 'StatusList2021Entry') {
                console.log('[StatusListService] Unknown status type:', type);
                return {
                    revoked: false,
                    checked: false,
                    error: `Unknown status type: ${type}`,
                };
            }
            // Verify it's for revocation
            if (statusPurpose !== 'revocation') {
                console.log('[StatusListService] Status purpose is not revocation:', statusPurpose);
                return {
                    revoked: false,
                    checked: false,
                    error: `Status purpose is not revocation: ${statusPurpose}`,
                };
            }
            console.log(`[StatusListService] Fetching status list from: ${statusListCredential}`);
            // Fetch the status list credential
            const response = await axios_1.default.get(statusListCredential);
            const statusListVC = response.data.credential;
            // Check the revocation status
            const index = parseInt(statusListIndex, 10);
            const isRevoked = await StatusListService.checkRevocationStatus(statusListVC, index);
            console.log(`[StatusListService] Credential at index ${index} is ${isRevoked ? 'REVOKED' : 'VALID'}`);
            return {
                revoked: isRevoked,
                checked: true,
            };
        }
        catch (error) {
            console.error('[StatusListService] Error checking revocation status:', error.message);
            return {
                revoked: false,
                checked: false,
                error: error.message,
            };
        }
    }
}
exports.StatusListService = StatusListService;
