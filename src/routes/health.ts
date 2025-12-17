import { Router, Request, Response } from 'express';
import { ApiResponse } from '../types/api';

export function createHealthRouter(): Router {
  const router = Router();

  // GET /health - Health check
  router.get('/', (req: Request, res: Response) => {
    const response: ApiResponse<{ status: string; timestamp: string }> = {
      success: true,
      data: {
        status: 'ok',
        timestamp: new Date().toISOString()
      }
    };
    return res.json(response);
  });

  return router;
}

