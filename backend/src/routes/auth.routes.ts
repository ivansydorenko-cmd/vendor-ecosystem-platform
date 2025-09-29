import { Router, Request, Response } from 'express';
import { body } from 'express-validator';

const router = Router();

router.post('/login', [
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
], (req: Request, res: Response) => {
  res.json({ message: 'Auth login endpoint' });
});

export default router;
