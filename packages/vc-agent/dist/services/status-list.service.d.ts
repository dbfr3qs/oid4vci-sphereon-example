import { VeramoAgentService } from './veramo-agent.service';
export interface StatusListConfig {
    issuerDid: string;
    statusListId: string;
    statusListUrl: string;
    veramoService: VeramoAgentService;
}
export interface StatusListEntry {
    id: string;
    type: string;
    statusPurpose: string;
    statusListIndex: string;
    statusListCredential: string;
}
/**
 * Service for managing credential status lists (revocation)
 * Implements W3C Status List 2021 specification
 */
export declare class StatusListService {
    private config;
    private statusList;
    private nextIndex;
    private indexMap;
    constructor(config: StatusListConfig);
    /**
     * Initialize the status list
     */
    initialize(): Promise<void>;
    /**
     * Get the next available index in the status list
     */
    private getNextIndex;
    /**
     * Create a status list entry for a new credential
     */
    createStatusEntry(credentialId: string): StatusListEntry;
    /**
     * Revoke a credential by setting its bit to 1
     */
    revokeCredential(credentialId: string): Promise<boolean>;
    /**
     * Check if a credential is revoked
     */
    isRevoked(credentialId: string): Promise<boolean>;
    /**
     * Check revocation status by index
     */
    isRevokedByIndex(index: number): Promise<boolean>;
    /**
     * Generate the Status List 2021 Credential
     * This is a special VC that contains the compressed bitstring
     */
    generateStatusListCredential(): Promise<any>;
    /**
     * Verify a credential's revocation status from a status list credential
     */
    static checkRevocationStatus(statusListCredential: any, statusListIndex: number): Promise<boolean>;
    /**
     * Get statistics about the status list
     */
    getStats(): {
        total: number;
        issued: number;
        revoked: number;
    };
    /**
     * Check if a credential is revoked by fetching its status list
     * This is used by verifiers to check credentials from external issuers
     */
    static checkCredentialRevocationStatus(credential: any): Promise<{
        revoked: boolean;
        checked: boolean;
        error?: string;
    }>;
}
