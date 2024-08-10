const logger = require("winston");
const {ValidationError} = require("joi");
const {NotFoundError} = require("objection");
const Errors = require("../source/Errors");

/**
 * A wrapper which accepts a function to be executed
 * Listens to errors and handles them accordingly - returning appropriate status code and message
 *
 * Intended usage is in route files:
 * @example
 * withErrorHandler(async function(req, res, next) {...})
 *
 * @param fn function to be executed
 * @returns {(function(*, *, *): Promise<*|undefined>)|*}
 */
function withErrorHandler(fn) {
    return async function (req, res, next) {
        try {
            return await fn(req, res, next);
        } catch (e) {

            if (e instanceof Errors.MissingParamError) {
                return res.status(400).json({
                    type: e.name,
                    message: e.message,
                });
            }

            if (
                e instanceof Errors.AuthenticationError
                || e instanceof Errors.AuthenticationMissingError
                || e instanceof Errors.UserTokenNotFoundError
            ) {
                return res.status(401).json({
                    type: e.name,
                    message: e.message,
                });
            }

            if (e instanceof Errors.AuthorizationError) {
                return res.status(403).json({
                    type: e.name,
                    message: e.message,
                });
            }

            if (e instanceof NotFoundError) {
                return res.status(404).json({
                    type: "NotFoundError",
                    message: "The model instance was not found",
                });
            }

            if (e instanceof Errors.ConflictError) {
                logger.error(e);
                return res.status(409).json({
                    type: e.name,
                    message: e.message,
                });
            }

            if (e instanceof ValidationError) {
                let details = {};
                for(let detail of e.details) {
                    details[detail.path.join('.')] = detail.message;
                }
                return res.status(422).json({
                    type: "ValidationError",
                    message: "Request's body contains invalid data",
                    details: details
                });
            }

            if (e instanceof Errors.FitbitApiError || e instanceof Errors.WithingsApiError) {
                logger.error(e);
                return res.status(502).json({
                    type: e.name,
                    message: e.message,
                });
            }

            if(e instanceof Errors.GXRemoteServiceError) {
                logger.error(e);
                let payload = {
                    type: e.name,
                    message: e.message,
                };

                if(e.responseStatus) {
                    payload["responseStatus"] = e.responseStatus;
                }

                if(e.responseBody) {
                    payload["responseBody"] = e.responseBody;
                }

                return res.status(502).json(payload);
            }

            // log the error
            logger.error(JSON.stringify({ error: e, request: req, location: fn.name }, getCircularReplacer()));

            // respond with a generic 500 Internal Server Error
            return res.status(500).json({ message: "Internal Server Error" });
        }
    };
}

/**
 * Returns an anonymous function for removing circular references when converting an object to JSON
 * This is to avoid TypeError raised when encountering circular dependencies
 */
function getCircularReplacer() {
    const seen = new WeakSet();
    return (key, value) => {
        if (typeof value === "object" && value !== null) {
            if (seen.has(value)) {
                return;
            }
            seen.add(value);
        }
        return value;
    };
}

module.exports = withErrorHandler;
