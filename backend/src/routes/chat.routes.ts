import { Router } from 'express';
import { handleChat, getSessionMessages, getSessions, deleteSession } from '../controllers/chat.controller';

const router = Router();

router.post('/', handleChat);
router.get('/sessions', getSessions);
router.get('/sessions/:id/messages', getSessionMessages);
router.delete('/sessions/:id', deleteSession);

export default router;
