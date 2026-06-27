import { User } from './index.js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        role: 'owner' | 'cashier';
      };
    }
  }
}
