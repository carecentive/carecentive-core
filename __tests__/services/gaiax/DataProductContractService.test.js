const DataProductContractService = require('../../../services/gaiax/DataProductContractService');
const DataProductContract = require('../../../models/DataProductContract');
const GaiaXService = require('../../../services/gaiax/GaiaXService');
const Utils = require("../../../source/Utils");
const fs = require('fs');
const Errors = require('../../../source/Errors');

// Mock dependencies
jest.mock('../../../models/DataProductContract');
jest.mock('../../../services/gaiax/GaiaXService');
jest.mock("../../../source/helpers/gaiax/ParticipantStorage");
jest.mock('../../../services/ThirdPartyTokenService');
jest.mock("../../../source/Utils");
jest.mock('axios');
jest.mock('crypto');
jest.mock('uuid');
jest.mock('fs');
jest.mock('os');
jest.mock('../../../services/gaiax/DidService', () => ({
    getDidDocument: jest.fn(),
    getParticipant: jest.fn(),
}));


Utils.getProjectPath.mockReturnValue('/mock/project/path');
Utils.getBaseUrl.mockReturnValue('https://example.com');

describe('DataProductContractService', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('verifyContractSignatureAndStore', () => {

        it('should throw an error if the contract has been tampered with', async () => {
            const contractCredential = { proof: [{ verificationMethod: 'did:web:example.com#JWK2020-RSA', jws: 'signature-jws' }] };
            const dataProductContract = { id: 'contract-uuid', proposal_fingerprint: 'fingerprint' };

            // mock return value for GaiaXService.computeCredentialHash
            GaiaXService.computeCredentialHash.mockResolvedValue('different-fingerprint');

            // call tested function and assert an exception
            await expect(DataProductContractService.verifyContractSignatureAndStore(contractCredential, dataProductContract)).rejects.toThrow(Errors.ClientError);
        });
    });

    describe('signContract', () => {
        it('should sign the contract with the data producer key', async () => {
            const dataProductContract = { id: 'contract-uuid', data_product: { participant: { slug: 'participant-slug' } } };
            const privateKey = 'private-key';
            const mockCredential = { proof: [] };
            const mockSignedCredential = JSON.stringify({ proof: { jws: 'producer-signature' } });

            // mock return values
            fs.readFileSync.mockReturnValue(JSON.stringify(mockCredential));
            GaiaXService.signCredential.mockResolvedValue(mockSignedCredential);
            DataProductContract.query.mockReturnValue({
                patchAndFetchById: jest.fn().mockResolvedValue({ id: 'contract-uuid', state: 'ready-to-be-claimed' }),
            });

            // call tested function
            const updatedContract = await DataProductContractService.signContract(dataProductContract, privateKey);

            // assert returned value
            expect(updatedContract).toEqual({ id: 'contract-uuid', state: 'ready-to-be-claimed' });

            // assert correct calls
            expect(GaiaXService.signCredential).toHaveBeenCalledWith('participant-slug', expect.any(String), privateKey);
            expect(DataProductContract.query().patchAndFetchById).toHaveBeenCalledWith('contract-uuid', {
                state: DataProductContract.STATE_READY_TO_BE_CLAIMED,
                updated_at: expect.any(Date),
            });
        });
    });

    describe('issueAccessToken', () => {

        it('should throw an error if the contract is not finalized', async () => {
            const contractCredential = { proof: [{ verificationMethod: 'did:web:example.com#JWK2020-RSA' }] };
            const dataContract = {
                id: 'contract-uuid',
                state: 'some-other-state',
                proposal_fingerprint: 'fingerprint',
                consumer_did: 'did:web:example.com',
                data_product: { route: '/data-product', participant: { slug: 'participant-slug' } },
            };

            // mock return values
            GaiaXService.computeCredentialHash.mockResolvedValue('fingerprint');
            DataProductContract.query.mockReturnValue({
                where: jest.fn().mockReturnThis(),
                withGraphFetched: jest.fn().mockReturnThis(),
                first: jest.fn().mockReturnThis(),
                throwIfNotFound: jest.fn().mockResolvedValue(dataContract),
            });

            // call tested function and assert exception is thrown
            await expect(DataProductContractService.issueAccessToken(contractCredential)).rejects.toThrow(Errors.ClientError);
        });
    });
});
