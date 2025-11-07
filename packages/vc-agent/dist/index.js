"use strict";
/**
 * VC Agent - Verifiable Credentials with OID4VCI and OID4VP support
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CREDENTIAL_TYPES = exports.OID4VPVerifierService = exports.OID4VCIssuerService = exports.CredentialService = exports.VeramoAgentService = void 0;
// Core services
var veramo_agent_service_1 = require("./services/veramo-agent.service");
Object.defineProperty(exports, "VeramoAgentService", { enumerable: true, get: function () { return veramo_agent_service_1.VeramoAgentService; } });
var credential_service_1 = require("./services/credential.service");
Object.defineProperty(exports, "CredentialService", { enumerable: true, get: function () { return credential_service_1.CredentialService; } });
var oid4vci_issuer_service_1 = require("./services/oid4vci-issuer.service");
Object.defineProperty(exports, "OID4VCIssuerService", { enumerable: true, get: function () { return oid4vci_issuer_service_1.OID4VCIssuerService; } });
var oid4vp_verifier_service_1 = require("./services/oid4vp-verifier.service");
Object.defineProperty(exports, "OID4VPVerifierService", { enumerable: true, get: function () { return oid4vp_verifier_service_1.OID4VPVerifierService; } });
// Types
var credentials_1 = require("./types/credentials");
Object.defineProperty(exports, "CREDENTIAL_TYPES", { enumerable: true, get: function () { return credentials_1.CREDENTIAL_TYPES; } });
