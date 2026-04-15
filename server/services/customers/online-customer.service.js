import OnlineCustomerModel from "../../models/customers/online-customer.model.js";
import AdvancedService from "../../utils/AdvancedService.js";
import bcrypt from "bcryptjs";

/**
 * =====================================================
 * Online Customer Service
 * -----------------------------------------------------
 * Handles:
 * - CRUD (via AdvancedService)
 * - Authentication logic
 * - Security (lock/login attempts)
 * - Address management
 * - Loyalty system
 * =====================================================
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

  /* =====================================================
     🔐 CREATE CUSTOMER (secure password hashing)
  ===================================================== */
  async createCustomer(data) {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    return this.create({
      ...data,
      password: hashedPassword,
    });
  }

  /* =====================================================
     🔐 LOGIN FAILURE HANDLER
  ===================================================== */
  async handleFailedLogin(customerId) {
    const customer = await this.findById(customerId);

    customer.loginAttempts += 1;

    if (customer.loginAttempts >= 5) {
      customer.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 min lock
    }

    return customer.save();
  }

  /* =====================================================
     🔓 RESET LOGIN STATE (on success login)
  ===================================================== */
  async resetLoginState(customerId) {
    return this.updateById(customerId, {
      loginAttempts: 0,
      lockUntil: null,
    });
  }

  /* =====================================================
     📍 SET DEFAULT ADDRESS
  ===================================================== */
  async setDefaultAddress(customerId, addressId) {
    const customer = await this.findById(customerId);

    customer.addresses.forEach(addr => {
      addr.isDefault = addr._id.toString() === addressId;
    });

    return customer.save();
  }

  /* =====================================================
     ⭐ LOYALTY SYSTEM
  ===================================================== */
  async addPoints(customerId, points) {
    return this.updateById(customerId, {
      $inc: { "loyalty.points": points },
    });
  }

  async recalculateTier(customerId) {
    const customer = await this.findById(customerId);

    let tier = "regular";

    if (customer.loyalty.points >= 5000) tier = "vip";
    else if (customer.loyalty.points >= 2000) tier = "gold";
    else if (customer.loyalty.points >= 500) tier = "silver";

    return this.updateById(customerId, {
      "loyalty.tier": tier,
    });
  }

  /* =====================================================
     🔍 SECURITY CHECK
  ===================================================== */
  isLocked(customer) {
    if (!customer.lockUntil) return false;
    return customer.lockUntil > new Date();
  }
}

export default new OnlineCustomerService();