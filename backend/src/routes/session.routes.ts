import { Router } from 'express';
import { createComparisonSession, getSession, extractSessionData } from '../controllers/session.controller';

const router = Router();

router.post('/compare', createComparisonSession);
router.get('/:id', getSession);
router.post('/:id/extract', extractSessionData);

export default router;
