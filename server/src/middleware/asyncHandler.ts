import type { NextFunction, Request, RequestHandler, Response } from 'express';

type AsyncRoute = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

// Express 4 does not automatically forward rejected route promises to error
// middleware. Keep every async endpoint on the same observable JSON error path.
export function asyncHandler(route: AsyncRoute): RequestHandler {
  return (req, res, next) => {
    void Promise.resolve(route(req, res, next)).catch(next);
  };
}
