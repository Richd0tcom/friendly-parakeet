import { Router } from 'express';
import {  } from '../controller/bid.controller';

const router = Router();

// Flash Sale routes
router.post('/flash-sales', FlashSaleController.createFlashSale);
router.post('/flash-sales/:id/start', FlashSaleController.startFlashSale);
router.get('/flash-sales/:id', FlashSaleController.getFlashSaleStatus);
router.get('/flash-sales/:id/leaderboard', FlashSaleController.getLeaderboard);

// Purchase route
router.post('/purchase', FlashSaleController.purchase);

export default router;