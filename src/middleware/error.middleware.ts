import { Request, Response, NextFunction } from 'express';
import { BaseError } from '../utils/errors';

export const errorHandlingMiddleware =  (error: Error, req: Request, res: Response, next: NextFunction) => {
  console.log("I ran")
    if (error instanceof BaseError) {
      console.log(error.message)
      res.status(error.status)
        .send({
          status: 'error',
          data: {
            message: error.message,
            code: error.status,
            stack:
          process.env.NODE_ENV === 'development'
            ? error.stack
            : {},
          },
        });
        return
    }

    console.log(error.message)

    res.status(500)
    .send({
      status: 'error',
      data: {
        message: error.message || 'Something went wrong',
        code: 500,
        stack:
          process.env.NODE_ENV === 'development'
            ? error.stack
            : {},
      },
    });
};