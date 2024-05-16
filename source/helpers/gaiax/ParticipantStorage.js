const fs = require('fs');
const path = require('path');
const Utils = require("../../Utils");

class ParticipantStorage {

    /**
     * Stores a file to a dedicated directory for a Gaia-X participant in the public directory
     *
     * @param {string} participantSlug
     * @param {string} relativePath relative path in participant's dir
     * @param {string | NodeJS.ArrayBufferView} data
     */
    static async storeFile(participantSlug, relativePath, data){
        // create dir if it doesn't exists
        let absolutePath = this.getAbsolutePath(participantSlug, relativePath);
        let dirPath = path.dirname(absolutePath);
        if(! fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, {recursive: true});
        }

        fs.writeFileSync(absolutePath, data);
    }

    /**
     * Reads a file from the dedicated Gaia-X participant directory
     *
     * @param {string} participantSlug
     * @param {string} relativePath
     * @returns {Promise<string>}
     */
    static async readFile(participantSlug, relativePath) {
        return fs.readFileSync(this.getAbsolutePath(participantSlug, relativePath), "utf8");
    }

    /**
     * Check whether a file exists on a path
     *
     * @param participantSlug
     * @param relativePath
     * @returns {Promise<boolean>}
     */
    static async fileExists(participantSlug, relativePath) {
        return fs.existsSync(this.getAbsolutePath(participantSlug, relativePath));
    }

    /**
     * Return absolute path to the participant's public directory, optionally including relative path
     *
     * @param {string} participantSlug
     * @param {string|null} relativePath
     * @returns {string}
     */
    static getAbsolutePath(participantSlug, relativePath = null) {
        let dirPath = Utils.getPublicPath("gaia-x/" + participantSlug);
        if(relativePath === null){
            return dirPath;
        }

        return path.join(dirPath, relativePath);
    }
}

module.exports = ParticipantStorage;
