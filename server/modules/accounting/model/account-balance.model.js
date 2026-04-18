import mongoose from "mongoose";
const { ObjectId } = mongoose.Schema;

const accountBalanceSchema = new mongoose.Schema(
  {
    brand: { type: ObjectId, ref: "Brand", required: true },
    branch: { type: ObjectId, ref: "Branch", required: true },
    period: { type: ObjectId, ref: "AccountingPeriod", required: true },

    account: { type: ObjectId, ref: "Account", required: true },

    openingDebit: { type: Number, default: 0 },
    openingCredit: { type: Number, default: 0 },

    totalDebit: { type: Number, default: 0 },
    totalCredit: { type: Number, default: 0 },

    closingDebit: { type: Number, default: 0 },
    closingCredit: { type: Number, default: 0 },
  },
  { timestamps: true },
);

accountBalanceSchema.index(
  { brand: 1, branch: 1, period: 1, account: 1 },
  { unique: true },
);

const AccountBalance = mongoose.model("AccountBalance", accountBalanceSchema);
export default AccountBalance;
