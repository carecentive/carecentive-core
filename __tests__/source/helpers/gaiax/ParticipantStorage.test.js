const fs = require('fs');
const path = require('path');
const Utils = require('../../../../source/Utils');
const ParticipantStorage = require('../../../../source/helpers/gaiax/ParticipantStorage');

const VALUE_TEST_PARTICIPANT_SLUG = 'test-participant';
const VALUE_TEST_DATA = 'file contents...';
const VALUE_RELATIVE_PATH = 'credentials/service-offering.json';

// mock dependencies
jest.mock('fs');
jest.mock('path');
jest.mock('../../../../source/Utils');

describe('ParticipantStorage', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('cleanupParticipant', () => {
        it('should remove the participant directory', async () => {
            const mockPath = `/public/gaia-x/${VALUE_TEST_PARTICIPANT_SLUG}`;

            // mock return absolute path return value
            jest.spyOn(ParticipantStorage, 'getAbsolutePath').mockReturnValue(mockPath);

            // call tested function
            await ParticipantStorage.cleanupParticipant(VALUE_TEST_PARTICIPANT_SLUG);

            // assert correct fs.rmSync call
            expect(fs.rmSync).toHaveBeenCalledWith(mockPath, { recursive: true, force: true });
        });
    });

    describe('storeFile', () => {
        it('should store a file in the participant directory', async () => {
            const mockDirPath = `/public/gaia-x/${VALUE_TEST_PARTICIPANT_SLUG}/documents`;
            const mockAbsolutePath = `${mockDirPath}/test.txt`;

            // mock return values
            jest.spyOn(ParticipantStorage, 'getAbsolutePath').mockReturnValue(mockAbsolutePath);
            path.dirname.mockReturnValue(mockDirPath);
            fs.existsSync.mockReturnValue(false);

            // call tested function
            await ParticipantStorage.storeFile(VALUE_TEST_PARTICIPANT_SLUG, VALUE_RELATIVE_PATH, VALUE_TEST_DATA);

            // assert correct calls
            expect(fs.mkdirSync).toHaveBeenCalledWith(mockDirPath, { recursive: true });
            expect(fs.writeFileSync).toHaveBeenCalledWith(mockAbsolutePath, VALUE_TEST_DATA);
        });

        it('should not create directory if already exists', async () => {
            const mockDirPath = `/public/gaia-x/${VALUE_TEST_PARTICIPANT_SLUG}/documents`;
            const mockAbsolutePath = `${mockDirPath}/test.txt`;

            // mock return values
            jest.spyOn(ParticipantStorage, 'getAbsolutePath').mockReturnValue(mockAbsolutePath);
            path.dirname.mockReturnValue(mockDirPath);
            fs.existsSync.mockReturnValue(true);

            // call tested function
            await ParticipantStorage.storeFile(VALUE_TEST_PARTICIPANT_SLUG, VALUE_RELATIVE_PATH, VALUE_TEST_DATA);

            // assert correct calls
            expect(fs.mkdirSync).not.toHaveBeenCalled();
            expect(fs.writeFileSync).toHaveBeenCalledWith(mockAbsolutePath, VALUE_TEST_DATA);
        });
    });

    describe('readFile', () => {
        it('should read a file from the participant directory', async () => {
            const mockAbsolutePath = `/public/gaia-x/${VALUE_TEST_PARTICIPANT_SLUG}/${VALUE_RELATIVE_PATH}`;

            // mock return values
            jest.spyOn(ParticipantStorage, 'getAbsolutePath').mockReturnValue(mockAbsolutePath);
            fs.readFileSync.mockReturnValue(VALUE_TEST_DATA);

            // call tested function
            const result = await ParticipantStorage.readFile(VALUE_TEST_PARTICIPANT_SLUG, VALUE_RELATIVE_PATH);

            // assert correct fs.readFileSync call
            expect(fs.readFileSync).toHaveBeenCalledWith(mockAbsolutePath, 'utf8');

            // assert returned value
            expect(result).toBe(VALUE_TEST_DATA);
        });
    });

    describe('fileExists', () => {
        it('should return true if the file exists', async () => {
            const mockAbsolutePath = `/public/gaia-x/${VALUE_TEST_PARTICIPANT_SLUG}/${VALUE_RELATIVE_PATH}`;

            // mock return values
            jest.spyOn(ParticipantStorage, 'getAbsolutePath').mockReturnValue(mockAbsolutePath);
            fs.existsSync.mockReturnValue(true);

            // call tested function
            const result = await ParticipantStorage.fileExists(VALUE_TEST_PARTICIPANT_SLUG, VALUE_RELATIVE_PATH);

            // assert correct fs.existsSync call
            expect(fs.existsSync).toHaveBeenCalledWith(mockAbsolutePath);

            // assert returned value
            expect(result).toBe(true);
        });

        it('should return false if the file does not exist', async () => {
            const mockAbsolutePath = `/public/gaia-x/${VALUE_TEST_PARTICIPANT_SLUG}/${VALUE_RELATIVE_PATH}`;

            // mock return values
            jest.spyOn(ParticipantStorage, 'getAbsolutePath').mockReturnValue(mockAbsolutePath);
            fs.existsSync.mockReturnValue(false);

            // call tested function
            const result = await ParticipantStorage.fileExists(VALUE_TEST_PARTICIPANT_SLUG, VALUE_RELATIVE_PATH);

            // assert correct fs.existsSync call
            expect(fs.existsSync).toHaveBeenCalledWith(mockAbsolutePath);

            // assert returned value
            expect(result).toBe(false);
        });
    });

    describe('getAbsolutePath', () => {
        it('should return the correct absolute path without relativePath', () => {
            const mockPublicPath = `/public/gaia-x/${VALUE_TEST_PARTICIPANT_SLUG}`;

            // mock Utils.getPublicPath return value
            Utils.getPublicPath.mockReturnValue(mockPublicPath);

            // call tested function
            const result = ParticipantStorage.getAbsolutePath(VALUE_TEST_PARTICIPANT_SLUG);

            // assert correct Utils.getPublicPath call
            expect(Utils.getPublicPath).toHaveBeenCalledWith(`gaia-x/${VALUE_TEST_PARTICIPANT_SLUG}`);

            // assert returned value
            expect(result).toBe(mockPublicPath);
        });

        it('should return the correct absolute path with relativePath', () => {
            const mockPublicPath = `/public/gaia-x/${VALUE_TEST_PARTICIPANT_SLUG}`;
            const expectedPath = `${mockPublicPath}/${VALUE_RELATIVE_PATH}`;

            // mock return values
            Utils.getPublicPath.mockReturnValue(mockPublicPath);
            path.join.mockReturnValue(expectedPath);

            // call tested function
            const result = ParticipantStorage.getAbsolutePath(VALUE_TEST_PARTICIPANT_SLUG, VALUE_RELATIVE_PATH);

            // assert correct calls
            expect(Utils.getPublicPath).toHaveBeenCalledWith(`gaia-x/${VALUE_TEST_PARTICIPANT_SLUG}`);
            expect(path.join).toHaveBeenCalledWith(mockPublicPath, VALUE_RELATIVE_PATH);

            // assert returned value
            expect(result).toBe(expectedPath);
        });
    });
});
