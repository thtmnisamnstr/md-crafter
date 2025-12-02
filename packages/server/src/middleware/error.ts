import { Request, Response, NextFunction } from 'express';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Error:', err);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  
  res.status(statusCode).json({
    error: message,
    code: err.code,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

export function createError(message: string, statusCode: number = 500, code?: string): ApiError {
  const error: ApiError = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

export function notFound(message: string = 'Not found'): ApiError {
  return createError(message, 404, 'NOT_FOUND');
}

export function badRequest(message: string = 'Bad request'): ApiError {
  return createError(message, 400, 'BAD_REQUEST');
}

export function unauthorized(message: string = 'Unauthorized'): ApiError {
  return createError(message, 401, 'UNAUTHORIZED');
}

export function forbidden(message: string = 'Forbidden'): ApiError {
  return createError(message, 403, 'FORBIDDEN');
}

export function conflict(message: string = 'Conflict'): ApiError {
  return createError(message, 409, 'CONFLICT');
}

