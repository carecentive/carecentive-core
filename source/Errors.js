class WithingsApiError extends Error {
  constructor(message) {
    super(message)
    this.name = 'WithingsApiError'
    Error.captureStackTrace(this, WithingsApiError)
  }
}

class FitbitApiError extends Error {
  constructor(message) {
    super(message)
    this.name = 'FitbitApiError'
    Error.captureStackTrace(this, FitbitApiError)
  }
}

class UserTokenNotFoundError extends Error {
  constructor(message) {
    super(message)
    this.name = 'UserTokenNotFoundError'
    Error.captureStackTrace(this, UserTokenNotFoundError)
  }
}


class HttpError extends Error {
  constructor(message) {
    super(message)
    this.name = 'HttpError'
    Error.captureStackTrace(this, HttpError)
  }
}

class AuthenticationMissingError extends Error {
  constructor(message) {
    super(message)
    this.name = 'AuthenticationMissingError'
    Error.captureStackTrace(this, AuthenticationMissingError)
  }
}

class SchedulerError extends Error {
  constructor(message) {
    super(message)
    this.name = 'SchedulerError'
    Error.captureStackTrace(this, SchedulerError)
  }
}

  
  

module.exports = {WithingsApiError, FitbitApiError, HttpError, UserTokenNotFoundError, AuthenticationMissingError, SchedulerError};