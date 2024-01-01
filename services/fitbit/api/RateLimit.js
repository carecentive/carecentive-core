class RateLimit {
    static totalQuota;
    static numberOfRequestProcessed = 0;
    static remainingSecondsUntilRefill;
    static processedUsers = {};
    static isAlreadySet = false;

    static set(totalLimit, refillSeconds, padding) {
        totalLimit = Number(totalLimit)
        refillSeconds = Number(refillSeconds);
        padding = Number(padding);

        if(!RateLimit.isAlreadySet) {
            if(totalLimit && refillSeconds) {
                this.totalQuota = Math.ceil(totalLimit - (totalLimit * (padding / 100)));
                this.remainingSecondsUntilRefill = Math.ceil(refillSeconds +
                    (refillSeconds * (padding / 100)));
                RateLimit.isAlreadySet = true;
            }
        }
    }

    static isLimitExceeded() {
        if (this.numberOfRequestProcessed >= this.totalQuota) {
            return true;
        }
        return false;
    }

    static resetRequestProcessed() {
        this.numberOfRequestProcessed = 0;
    }

    static requestProcessed() {
        ++RateLimit.numberOfRequestProcessed;
    }
    
    static initProcessedUsers(users){
        for(const user of users) {
            this.processedUsers[user.user_id] = { processed: true };
        }
    }

    static setProcessedStatus(userId, processed) {
        if (this.processedUsers[userId]) {
            this.processedUsers[userId].processed = processed;
        }
    }

    static isAllDataProcessed() {
        for(const user of Object.values(this.processedUsers)) {
            if(!user.processed) {
                return false;
            }
        }

        return true;
    }
}

module.exports = RateLimit;