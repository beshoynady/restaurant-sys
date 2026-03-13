import express from "express";
const router = express.Router();
import {
    createPurchaseInvoice,
    getAllPurchaseInvoices,
    getPurchaseInvoiceById,
    updatePurchaseInvoiceById,
    deletePurchaseInvoiceById
} from "../controllers/purchase.controller.js";

import {authenticateToken} from "../../middlewares/authenticate.js";
import checkSubscription from "../../middlewares/checkSubscription.js";

// Routes for purchase management
router.route('/')
    .post(authenticateToken,createPurchaseInvoice)
    .get(authenticateToken,getAllPurchaseInvoices);

router.route('/:id')
    .get(authenticateToken,getPurchaseInvoiceById)
    .put(authenticateToken,updatePurchaseInvoiceById)
    .delete(authenticateToken,deletePurchaseInvoiceById);

export default router;
