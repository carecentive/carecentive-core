class WithingsApiError extends Error {
  constructor(message) {
    super(message);
    this.name = "WithingsApiError";
    Error.captureStackTrace(this, WithingsApiError);
  }
}

class FitbitApiError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FitbitApiError';
    Error.captureStackTrace(this, FitbitApiError);
  }
}

class UserTokenNotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = "UserTokenNotFoundError";
    Error.captureStackTrace(this, UserTokenNotFoundError);
  }
}

class HttpError extends Error {
  constructor(message) {
    super(message);
    this.name = "HttpError";
    Error.captureStackTrace(this, HttpError);
  }
}

class AuthenticationMissingError extends Error {
  constructor(message) {
    super(message);
    this.name = "AuthenticationMissingError";
    Error.captureStackTrace(this, AuthenticationMissingError);
  }
}

class AuthenticationError extends Error {
  constructor(message) {
    super(message);
    this.name = "AuthenticationError";
    Error.captureStackTrace(this, AuthenticationError);
  }
}

class AuthorizationError extends Error {
  constructor(message) {
    super(message);
    this.name = "AuthorizationError";
    Error.captureStackTrace(this, AuthorizationError);
  }
}

class SchedulerError extends Error {
  constructor(message) {
    super(message);
    this.name = 'SchedulerError';
    Error.captureStackTrace(this, SchedulerError);
  }
}

class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
    Error.captureStackTrace(this, ConflictError);
  }
}

class GXRemoteServiceError extends Error {
  constructor(message, responseStatus, responseBody) {
    super(message);
    this.name = 'GXRemoteServiceError';
    this.responseStatus = responseStatus;
    this.responseBody = responseBody;
    Error.captureStackTrace(this, GXRemoteServiceError);
  }
}

class MissingParamError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MissingParamError';
    Error.captureStackTrace(this, MissingParamError);
  }
}

module.exports = {
  WithingsApiError,
  FitbitApiError,
  UserTokenNotFoundError,
  HttpError,
  AuthenticationMissingError,
  AuthenticationError,
  AuthorizationError,
  SchedulerError,
  ConflictError,
  GXRemoteServiceError,
  MissingParamError,
};
