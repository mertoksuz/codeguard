import { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler";

/**
 * Auth middleware for the Express API.
 * 
 * In production, Next.js (Vercel) forwards requests to this API with
 * an `x-team-id` header set by the authenticated session.
 * 
 * For direct API calls, we accept a Bearer token that should be
 * the NEXTAUTH_SECRET shared between web and api for internal calls,
 * or we trust the headers set by our own web app proxy.
 */

export interface AuthenticatedRequest extends Request {
  teamId?: string;
  userId?: string;
  teamPlan?: string;
}

/**
 * Middleware that extracts team context from request headers.
 * The web app sets these headers when proxying requests to the API.
 */
export function requireTeam(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const teamId = req.headers["x-team-id"] as string | undefined;

  if (!teamId) {
    throw new AppError(401, "Missing team context. Please log in.", "AUTH_REQUIRED");
  }

  req.teamId = teamId;
  req.userId = req.headers["x-user-id"] as string | undefined;
  req.teamPlan = req.headers["x-team-plan"] as string | undefined;

  next();
}

/**
 * Middleware that verifies internal API calls between services.
 * Uses a shared secret (API_SECRET) to authenticate service-to-service calls.
 */
export function requireInternalAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const apiSecret = process.env.API_SECRET;

  // If no API_SECRET configured, allow all (backwards compat with single-tenant)
  if (!apiSecret) {
    return next();
  }

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError(401, "Missing authorization header", "AUTH_REQUIRED");
  }

  const token = authHeader.slice(7);
  if (token !== apiSecret) {
    throw new AppError(403, "Invalid API credentials", "AUTH_INVALID");
  }

  next();
}

/**
 * Optional team context - extracts if present but doesn't require it.
 * Useful for routes that work for both authenticated and unauthenticated requests.
 */
export function optionalTeam(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  req.teamId = req.headers["x-team-id"] as string | undefined;
  req.userId = req.headers["x-user-id"] as string | undefined;
  req.teamPlan = req.headers["x-team-plan"] as string | undefined;
  next();
}
