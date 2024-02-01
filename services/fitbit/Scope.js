const DBManager = require("./db/DBManager");
const Logger = require("../../source/Loggers");

class Scope {
    static scopes = {};

    static async isGranted(userId, resource) {
        let status = await this.isGrantedByUser(userId, resource);
        if (this.isEnabled(resource) && status) {
            return true;
        }
        return false;
    }

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

    static isEnabled(resource) {
        if (!resource.enabled) {
            Logger.debug(resource.requestType + " resource is disabled by the developer!");
        }
        return resource.enabled;
    }
}

module.exports = Scope;