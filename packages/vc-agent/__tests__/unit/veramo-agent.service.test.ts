import { VeramoAgentService } from '../../src/services/veramo-agent.service';
import { IIdentifier } from '@veramo/core';

describe('VeramoAgentService', () => {
  let service: VeramoAgentService;

  beforeEach(() => {
    service = new VeramoAgentService();
  });

  describe('initialization', () => {
    it('should initialize successfully', () => {
      expect(service).toBeDefined();
      expect(service.getAgent()).toBeDefined();
    });
  });

  describe('DID management', () => {
    it('should create a new did:key identity', async () => {
      const identifier = await service.createIdentifier();

      expect(identifier).toBeDefined();
      expect(identifier.did).toMatch(/^did:key:/);
      expect(identifier.keys).toBeDefined();
      expect(identifier.keys.length).toBeGreaterThan(0);
    });

    it('should resolve a did:key DID', async () => {
      // First create an identifier
      const identifier = await service.createIdentifier();

      // Then resolve it
      const didDocument = await service.resolveDid(identifier.did);

      expect(didDocument).toBeDefined();
      expect(didDocument.didDocument).toBeDefined();
      expect(didDocument.didDocument?.id).toBe(identifier.did);
    });

    it('should list managed DIDs', async () => {
      // Create two identifiers
      const id1 = await service.createIdentifier();
      const id2 = await service.createIdentifier();

      // List all identifiers
      const identifiers = await service.listIdentifiers();

      expect(identifiers).toBeDefined();
      expect(identifiers.length).toBeGreaterThanOrEqual(2);
      
      const dids = identifiers.map((id: IIdentifier) => id.did);
      expect(dids).toContain(id1.did);
      expect(dids).toContain(id2.did);
    });

    it('should get an identifier by DID', async () => {
      const created = await service.createIdentifier();

      const retrieved = await service.getIdentifier(created.did);

      expect(retrieved).toBeDefined();
      expect(retrieved.did).toBe(created.did);
      expect(retrieved.keys).toEqual(created.keys);
    });
  });
});
