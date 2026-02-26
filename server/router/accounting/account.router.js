const express = require("express");
const router = express.Router();



const {
  async
} = require("../../controllers/accounting/account.controller");

const { authenticateToken } = require("../../middlewares/authenticate");




module.exports = router;