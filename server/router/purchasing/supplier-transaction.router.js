const express = require('express');
const router = express.Router();
const {
    createSupplierTransaction,
    getAllSupplierTransactions,
    getSupplierTransactionById,
    updateSupplierTransaction,
    deleteSupplierTransaction,
} = require('../controllers/supplier-transaction.controller');

const {authenticateToken} = require("../../middlewares/authenticate");
const checkSubscription = require('../../middlewares/checkSubscription')

router.route('/')
    .post(authenticateToken, checkSubscription, createSupplierTransaction)
    .get(authenticateToken, checkSubscription, getAllSupplierTransactions);

router.route('/:id')
    .get(authenticateToken, checkSubscription, getSupplierTransactionById)
    .put(authenticateToken, checkSubscription, updateSupplierTransaction)
    .delete(authenticateToken, checkSubscription, deleteSupplierTransaction);

    
module.exports = router;
