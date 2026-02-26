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
    .post(authenticateToken, checkSubscription, createPurchaseReturnInvoice)
    .get(authenticateToken, checkSubscription, getAllPurchaseReturnInvoices);

router.route('/:id')
    .get(authenticateToken, checkSubscription, getPurchaseReturnInvoiceById)
    .put(authenticateToken, checkSubscription, updatePurchaseReturnInvoiceById)
    .delete(authenticateToken, checkSubscription, deletePurchaseReturnInvoiceById);

module.exports = router;
