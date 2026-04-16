import LoyaltyTransactionModel from "../../models/loyalty/loyalty-transaction.model.js";
import AdvancedService from "../../utils/AdvancedService.js";
import customerLoyaltyService from "./customer-loyalty.service.js";

class LoyaltyTransactionService extends AdvancedService {
  constructor() {
    super(LoyaltyTransactionModel, {
      brandScoped: true,
      softDelete: true,
      defaultPopulate: [
        "brand",
        "branch",
        "customerLoyalty",
        "reward",
        "order",
        "createdBy",
      ],
      defaultSort: { createdAt: -1 },
    });
  }

  /* =====================================================
     🔹 CORE CREATE TRANSACTION (INTERNAL)
  ===================================================== */
  async createTransaction(data, session) {
    const wallet = await customerLoyaltyService.model.findById(
      data.customerLoyalty
    );

    if (!wallet) throw new Error("Wallet not found");

    const balanceAfter = wallet.points + data.points;

    const tx = await this.model.create(
      [
        {
          ...data,
          balanceAfter,
        },
      ],
      { session }
    );

    return tx[0];
  }

  /* =====================================================
     🔹 EARN
  ===================================================== */
  async earn({
    brand,
    branch,
    customerLoyalty,
    points,
    order,
    userId,
    session,
  }) {
    const wallet =
      await customerLoyaltyService.model.findById(customerLoyalty);

    wallet.points += points;
    wallet.totalEarned += points;

    await wallet.save({ session });

    return this.createTransaction(
      {
        brand,
        branch,
        customerLoyalty,
        type: "earn",
        points,
        order,
        createdBy: userId,
      },
      session
    );
  }

  /* =====================================================
     🔹 REDEEM
  ===================================================== */
  async redeem({
    brand,
    branch,
    customerLoyalty,
    points,
    reward,
    order,
    userId,
    session,
  }) {
    const wallet =
      await customerLoyaltyService.model.findById(customerLoyalty);

    if (wallet.points < points) {
      throw new Error("Insufficient points");
    }

    wallet.points -= points;
    wallet.totalRedeemed += points;

    await wallet.save({ session });

    return this.createTransaction(
      {
        brand,
        branch,
        customerLoyalty,
        type: "redeem",
        reward,
        points: -points,
        order,
        createdBy: userId,
      },
      session
    );
  }

  /* =====================================================
     🔹 ADJUST
  ===================================================== */
  async adjust({
    brand,
    branch,
    customerLoyalty,
    points,
    note,
    userId,
    session,
  }) {
    const wallet =
      await customerLoyaltyService.model.findById(customerLoyalty);

    wallet.points += points;

    if (points > 0) wallet.totalEarned += points;
    if (points < 0) wallet.totalRedeemed += Math.abs(points);

    if (wallet.points < 0) wallet.points = 0;

    await wallet.save({ session });

    return this.createTransaction(
      {
        brand,
        branch,
        customerLoyalty,
        type: "adjustment",
        points,
        note,
        createdBy: userId,
      },
      session
    );
  }

  /* =====================================================
     🔹 GET CUSTOMER HISTORY
  ===================================================== */
  async getCustomerHistory(customerLoyaltyId) {
    return this.model.find({
      customerLoyalty: customerLoyaltyId,
    });
  }
}

export default new LoyaltyTransactionService();