class WithingsApiError extends Error {
  constructor(message) {
    super(message);
    this.name = "WithingsApiError";
    Error.captureStackTrace(this, WithingsApiError);
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

class FitnessError extends Error {
  constructor(message) {
    super(message);
    this.name = "FitnessError";
    Error.captureStackTrace(this, FitnessError);
  }
}

module.exports = {
  WithingsApiError,
  HttpError,
  UserTokenNotFoundError,
  AuthenticationMissingError,
  FitnessError,
};
