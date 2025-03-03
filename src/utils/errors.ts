enum httpStatusCodes {
    OK = 200,
    CREATED = 201,
    NO_CONTENT = 204,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    FORBIDDEN = 403,
    NOT_FOUND = 404,
    UNPROCESSABLE_ENTITY = 422,
    INTERNAL_SERVER = 500,
}





export class BaseError extends Error {
  status: any;
  constructor(message: string, name: string, status: any, ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = name;
    this.status = status;
    Error.captureStackTrace(this);
  }
}

export class ApiNotFoundError extends BaseError {
  constructor(
    message = 'Resource Not found',
    name = 'NotFound',
    statusCode = httpStatusCodes.NOT_FOUND,
    
  ) {
    super(message ,name, statusCode );
  }
}

export class ApiUnauthorizedError extends BaseError {
  constructor(
    message = 'Unauthorized access of requested resource',
    name = 'Unauthorized',
    statusCode = httpStatusCodes.UNAUTHORIZED,
  ) {
    super(message ,name, statusCode );
  }
}

export class ApiInternalServerError extends BaseError {
  constructor(
    message= 'Something went wrong',
    name = 'InternalServerError',
    statusCode = httpStatusCodes.INTERNAL_SERVER
  ) {
    super(message ,name, statusCode );
  }
}

export class ApiBadRequestError extends BaseError {
  constructor(
    message = 'Bad request',
    name = 'BadRequest',
    statusCode = httpStatusCodes.BAD_REQUEST,
    
  ) {
    super(message ,name, statusCode );
  }
}

export class ApiUnprocessableEntity extends BaseError {
  constructor(
    message = 'Unprocessable Entity',
    name = 'UnprocessableEntity',
    statusCode = httpStatusCodes.UNPROCESSABLE_ENTITY,
    
  ) {
    super(message ,name, statusCode );
  }
}

function getErrorByStatusCode(statusCode: number){
  switch (statusCode) {
    case 404:
      return ApiNotFoundError
    case 400:
      return ApiBadRequestError
    case 401:
      return ApiUnauthorizedError
    case 422:
      return ApiUnprocessableEntity
    case 500:
    default:
      return ApiInternalServerError
  }
}

export const ApiInternalErrorHandling = (err: any) => {
  return {
    type: 'UnknownError',
    data: {
      message: err.message
    },
    statusCode: 500
  }
}