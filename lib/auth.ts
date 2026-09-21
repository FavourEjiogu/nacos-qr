import { NextRequest } from 'next/server';

export function isAuthenticated(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return false;
  
  const token = authHeader.replace('Bearer ', '');
  return token === process.env.ADMIN_PASSWORD;
}
