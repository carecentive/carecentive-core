const ThirdPartyTokenService = require('../../services/ThirdPartyTokenService');
const ThirdPartyToken = require('../../models/ThirdPartyToken');

const VALUE_TEST_TOKEN = 'abcdef0123456789';

// mock dependencies
jest.mock('../../models/ThirdPartyToken');

describe('ThirdPartyTokenService', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('store', () => {
        it('should create and store a new API access token', async () => {
            const inputData = {
                active: true,
                validTill: new Date('2025-01-01'),
                route: '/api/questionnaire'
            };

            // mock method return value
            ThirdPartyToken.query.mockReturnValue({
                insert: jest.fn().mockResolvedValue({
                    id: 1,
                    active: inputData.active,
                    valid_till: inputData.validTill,
                    route: inputData.route,
                    access_token: VALUE_TEST_TOKEN
                })
            });

            jest.spyOn(ThirdPartyTokenService, 'generateRandomString').mockReturnValue(VALUE_TEST_TOKEN);

            // call tested function
            const result = await ThirdPartyTokenService.store(inputData);

            expect(ThirdPartyToken.query().insert).toHaveBeenCalledWith({
                active: inputData.active,
                valid_till: inputData.validTill,
                route: inputData.route,
                access_token: VALUE_TEST_TOKEN
            });

            // assert correct returned value
            expect(result).toEqual({
                id: 1,
                active: inputData.active,
                valid_till: inputData.validTill,
                route: inputData.route,
                access_token: VALUE_TEST_TOKEN
            });
        });
    });

    describe('generateRandomString', () => {
        it('should generate a random string of the specified length', () => {
            const length = 80;
            const randomString = ThirdPartyTokenService.generateRandomString(length);

            expect(randomString).toHaveLength(length);
            expect(randomString).toMatch(/^[a-f0-9]+$/); // Ensure the string contains only hex characters
        });

        it('should handle even and odd lengths correctly', () => {
            const evenLength = 10;
            const oddLength = 11;

            const evenRandomString = ThirdPartyTokenService.generateRandomString(evenLength);
            const oddRandomString = ThirdPartyTokenService.generateRandomString(oddLength);

            expect(evenRandomString).toHaveLength(evenLength);
            expect(oddRandomString).toHaveLength(oddLength);
        });
    });
});
