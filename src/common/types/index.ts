import { Request } from 'express';

export interface JwtUser {
  userId: string;
}

export interface AuthenticatedRequest extends Request {
  user: JwtUser;
}
