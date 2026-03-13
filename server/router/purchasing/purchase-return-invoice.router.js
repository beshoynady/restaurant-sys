const express = require('express');
const router = express.Router();
const {
    createPurchaseReturnInvoice,
    getAllPurchaseReturnInvoices,
    getPurchaseReturnInvoiceById,
    updatePurchaseReturnInvoiceById,
    deletePurchaseReturnInvoiceById
} = require('../controllers/purchase-return.controller');

const {authenticateToken} = require("../../middlewares/authenticate");
const checkSubscription = require('../../middlewares/checkSubscription')

// Routes for purchase return management
router.route('/')
    .post(authenticateToken,createPurchaseReturnInvoice)
    .get(authenticateToken,getAllPurchaseReturnInvoices);

router.route('/:id')
    .get(authenticateToken,getPurchaseReturnInvoiceById)
    .put(authenticateToken,updatePurchaseReturnInvoiceById)
    .delete(authenticateToken,deletePurchaseReturnInvoiceById);

module.exports = router;
