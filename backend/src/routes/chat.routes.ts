import { Router } from 'express';
import { handleChat, getSessionMessages } from '../controllers/chat.controller';

const router = Router();

router.post('/', handleChat);
router.get('/:id/messages', getSessionMessages);

export default router;
