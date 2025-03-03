import { Router } from 'express';
import * as FlashSaleController from '../controller/sale.controller';
import * as AuthController from '../controller/auth.controller';
import * as ProductController from '../controller/prod.controller';

const router = Router();

// Flash Sale routes
router.post('/flash-sales', FlashSaleController.createSale);
router.post('/flash-sales/:id/start', FlashSaleController.startSale);
router.get('/flash-sales/:id', FlashSaleController.fetchSale);
// router.get('/flash-sales/:id/leaderboard', FlashSaleController.getLeaderboard);

// Purchase route
router.post('/purchase', FlashSaleController.buyStock);

//user auth routes
router.post('/auth/register', AuthController.signup);
router.post('/auth/login', AuthController.login);

//prod and inventory routes
router.post('/prod/create', ProductController.createProduct)
router.post('/prod/inventory', ProductController.createInventory)

export default router;