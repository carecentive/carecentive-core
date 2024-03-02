const DBManager = require("./db/DBManager");
const Logger = require("../../source/Loggers");

/**
 * Utility class for managing scopes granted by users and enabled by developers.
 * Provides methods to check if a specific scope is granted by a user and enabled by a developer.
 * Also includes a method for checking if all required scopes are present.
 */
class Scope {
    // Static property to store scopes
    static scopes = {};

    /**
     * Checks if a specific scope is granted by the user and enabled by the developer.
     * @param {*} userId - The ID of the user.
     * @param {*} resource - The resource containing information about the scope and its status.
     * @returns {*} True if the scope is granted and enabled, otherwise false.
     */
    static async isGranted(userId, resource) {
        let status = await this.isGrantedByUser(userId, resource);
        if (this.isEnabled(resource) && status) {
            return true;
        }
        return false;
    }

     /**
     * Checks if a specific scope is granted by the user.
     * @param {*} userId - The ID of the user.
     * @param {*} resource - The resource containing information about the scope.
     * @returns {*} True if the scope is granted by the user, otherwise false.
     */
    static async isGrantedByUser(userId, resource) {
        if (!this.scopes[userId]) {
            let user = await DBManager.getUser(userId);
            if(!user) return false;
            
            Logger.debug("user: "+ user)
            this.scopes[userId] = user.scope;
        }
        
        if (this.areAllScopesPresent(this.scopes[userId], resource.scope)) {
            return true;
        } else {
            if(!resource.scope) {
                Logger.debug("Scope for the resource " + resource.requestType + " is not defined!")
            }else {
                Logger.debug(resource.scope + " scope is invalid or not granted by the user " + userId + "!");
            }
            return false;
        }
    }

    /**
     * Checks if all required scopes are present.
     * @param {*} scopesGranted - The scopes granted by the user.
     * @param {*} scopeUsed - The scopes used by the developer.
     * @returns {*} True if all required scopes are present, otherwise false.
     */
    static areAllScopesPresent(scopesGranted, scopeUsed) {
        if (scopeUsed.length == 0) return false;
        const scopesToCheck = scopeUsed.split(/\s+/);
        
        for (const scope of scopesToCheck) {
            const regex = new RegExp("\\b" + scope + "\\b");
            if (!regex.test(scopesGranted)) {
                return false;
              }
        }
        return true;
    }

    /**
     * Checks if the resource is enabled by the developer.
     * @param {*} resource - The resource containing information about its status.
     * @returns {*} True if the resource is enabled, otherwise false.
     */
    static isEnabled(resource) {
        if (!resource.enabled) {
            Logger.debug(resource.requestType + " resource is disabled by the developer!");
        }
        return resource.enabled;
    }
}

module.exports = Scope;