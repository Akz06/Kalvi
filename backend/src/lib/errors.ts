export class AppError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
    this.name = "AppError";
  }
}

export const NotFound = (msg = "Resource not found") => new AppError(404, msg);
export const BadRequest = (msg = "Bad request", details?: unknown) =>
  new AppError(400, msg, details);
export const Unauthorized = (msg = "Unauthorized") => new AppError(401, msg);
export const Forbidden = (msg = "Forbidden") => new AppError(403, msg);
export const Conflict = (msg = "Conflict") => new AppError(409, msg);
