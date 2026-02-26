const express = require("express");
const router = express.Router();



const {
  async
} = require("../../controllers/inventory/inventory-setting.controller");

const { authenticateToken } = require("../../middlewares/authenticate");




module.exports = router;