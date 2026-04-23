// services/customers/online-customer.service.js

import AdvancedService from "../../../utils/AdvancedService.js";
import OnlineCustomerModel from "./online-customer.model.js";
import bcrypt from "bcryptjs";
import throwError from "../../../utils/throwError.js";

/**
 * OnlineCustomerService
 * -------------------------------------------------------
 * Handles:
 * - CRUD via AdvancedService
 * - Authentication logic
 * - Password security
 * - Login attempts / locking
 * - Address management
 * - Loyalty system
 */
class OnlineCustomerService extends AdvancedService {
  constructor() {
    super(OnlineCustomerModel, {
      brandScoped: true,
      softDelete: true,
      defaultPopulate: ["brand", "verifiedBy", "deletedBy", "favorites"],
      searchFields: ["name", "phone", "email"],
      defaultSort: { createdAt: -1 },
    });
  }

  // =====================================================
  // 🔐 CREATE CUSTOMER (HASH PASSWORD)
  // =====================================================
  async createCustomer(data) {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    return this.create({
      data: {
        ...data,
        password: hashedPassword,
      },
    });
  }

  // =====================================================
  // 🔐 HANDLE FAILED LOGIN
  // =====================================================
  async handleFailedLogin(customerId) {
    const customer = await this.findById({ id: customerId });

    customer.loginAttempts += 1;

    if (customer.loginAttempts >= 5) {
      customer.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 min
    }

    return customer.save();
  }

  // =====================================================
  // 🔓 RESET LOGIN STATE
  // =====================================================
  async resetLoginState(customerId) {
    return this.update({
      id: customerId,
      data: {
        loginAttempts: 0,
        lockUntil: null,
      },
    });
  }

  // =====================================================
  // 📍 SET DEFAULT ADDRESS
  // =====================================================
  async setDefaultAddress(customerId, addressId) {
    const customer = await this.findById({ id: customerId });

    customer.addresses.forEach((addr) => {
      addr.isDefault = addr._id.toString() === addressId;
    });

    return customer.save();
  }

  // =====================================================
  // ⭐ LOYALTY: ADD POINTS
  // =====================================================
  async addPoints(customerId, points) {
    return this.model.findByIdAndUpdate(
      customerId,
      { $inc: { "loyalty.points": points } },
      { new: true }
    );
  }

  // =====================================================
  // ⭐ RECALCULATE TIER
  // =====================================================
  async recalculateTier(customerId) {
    const customer = await this.findById({ id: customerId });

    let tier = "regular";

    if (customer.loyalty.points >= 5000) tier = "vip";
    else if (customer.loyalty.points >= 2000) tier = "gold";
    else if (customer.loyalty.points >= 500) tier = "silver";

    return this.update({
      id: customerId,
      data: {
        "loyalty.tier": tier,
      },
    });
  }

  // =====================================================
  // 🔒 CHECK IF LOCKED
  // =====================================================
  isLocked(customer) {
    return customer.lockUntil && customer.lockUntil > new Date();
  }

  // =====================================================
  // 🔍 GET BY PHONE (LOGIN HELP)
  // =====================================================
  async getByPhone(phone, brandId) {
    return this.model.findOne({
      phone,
      brand: brandId,
      isDeleted: false,
    });
  }
}

export default new OnlineCustomerService();