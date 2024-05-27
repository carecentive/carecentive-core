/**
 * Utility class for managing rate limits for API requests.
 * Keeps track of the total quota, number of requests processed, remaining time until refill,
 * processed users, and provides methods for setting rate limit values and checking if the limit is exceeded.
 */
class RateLimit {
    // Static properties to store rate limit information
    static totalQuota;
    static numberOfRequestProcessed = 0;
    static remainingSecondsUntilRefill;
    static processedUsers = {};
    static isAlreadySet = false;

     /**
     * Sets rate limit values based on the provided total limit, refill time, and padding.
     * @param {*} totalLimit - The total limit per user in each refillseconds.
     * @param {*} refillSeconds - The time in seconds until the rate limit refills.
     * @param {*} padding - The padding percentage to adjust the rate limit values.
     */
    static set(totalLimit, refillSeconds, padding) {
        // Convert parameters to numbers
        totalLimit = Number(totalLimit)
        refillSeconds = Number(refillSeconds);
        padding = Number(padding);

        // Set rate limit values if not already set
        if(!RateLimit.isAlreadySet) {
            if(totalLimit && refillSeconds) {
                // Calculate adjusted quota and refill time with padding
                this.totalQuota = Math.ceil(totalLimit - (totalLimit * (padding / 100)));
                this.remainingSecondsUntilRefill = Math.ceil(refillSeconds +
                    (refillSeconds * (padding / 100)));
                RateLimit.isAlreadySet = true;
            }
        }
    }

    /**
     * Checks if the rate limit has been exceeded.
     * @returns {*} True if the limit is exceeded, otherwise false.
     */
    static isLimitExceeded() {
        if (this.numberOfRequestProcessed >= this.totalQuota) {
            return true;
        }
        return false;
    }

    /**
     * Resets the count of requests processed.
     */
    static resetRequestProcessed() {
        this.numberOfRequestProcessed = 0;
    }

    /**
     * Increments the count of requests processed.
     */
    static requestProcessed() {
        ++RateLimit.numberOfRequestProcessed;
    }
    
    /**
     * Initializes processed status for the given users.
     * @param {Array<Object>} users - An array of user objects.
     */
    static initProcessedUsers(users){
        for(const user of users) {
            this.processedUsers[user.user_id] = { processed: true };
        }
    }

    /**
     * Sets processed status for the specified user.
     * @param {*} userId - The ID of the user.
     * @param {*} processed - The processed status to set.
     */
    static setProcessedStatus(userId, processed) {
        if (this.processedUsers[userId]) {
            this.processedUsers[userId].processed = processed;
        }
    }

    /**
     * Checks if all data for the users has been processed.
     * @returns {*} True if all data is processed, otherwise false.
     */
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