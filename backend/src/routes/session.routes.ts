import { Router } from 'express';
import { createComparisonSession } from '../controllers/session.controller';

const router = Router();

router.post('/compare', createComparisonSession);

export default router;
