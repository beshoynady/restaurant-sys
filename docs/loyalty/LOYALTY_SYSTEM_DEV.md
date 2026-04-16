# 👨‍💻 Loyalty System - Developer Documentation

---

## 📌 Overview

The Loyalty System is a modular, scalable system designed to:

* Reward customers with points
* Allow redemption via rewards
* Track all point movements using a ledger system
* Support multi-tenant architecture (brand-based)

---

# 🧠 Core Architecture

### Modules:

* LoyaltySettings → configuration layer
* CustomerLoyalty → wallet layer
* LoyaltyTransaction → ledger layer (source of truth)
* LoyaltyReward → reward system

---

# 🔑 Core Design Decisions

### 1. Decoupled from Customer Model

Loyalty is NOT directly linked to:

* OnlineCustomer
* OfflineCustomer

Instead:

```
phone + brand
```

is the unique identifier.

---

### 2. Ledger-Based System

* Transactions = source of truth
* Wallet = cached balance

---

# 🟦 Models Breakdown

---

## LoyaltySettings

Controls business rules.

### Key Logic

```js
points = (orderAmount / currencyAmount) * pointsPerCurrency;
```

### Responsibilities

* earning rules
* redemption rules
* tiers
* expiration

---

## CustomerLoyalty

Customer wallet.

### Rules

* Unique index:

```js
{ brand: 1, phone: 1 }
```

### Responsibilities

* current balance
* tier tracking
* aggregation (totalEarned / totalRedeemed)

---

## LoyaltyTransaction

### MOST IMPORTANT MODEL

Tracks:

* earn
* redeem
* expiration
* adjustment

### Rules

* points:

  * positive → earn
  * negative → redeem

* must always update:

```js
balanceAfter
```

---

## LoyaltyReward

Defines redeemable rewards.

### Types:

* discount
* product
* gift

---

# 🔗 Relationships

| From            | To                 | Type      |
| --------------- | ------------------ | --------- |
| Brand           | LoyaltySettings    | 1:1       |
| Customer        | CustomerLoyalty    | via phone |
| CustomerLoyalty | LoyaltyTransaction | 1:N       |
| LoyaltyReward   | LoyaltyTransaction | 1:N       |
| Order           | LoyaltyTransaction | optional  |

---

# 🔄 Business Flows

---

## 🟢 Earn Flow

1. Order created
2. Calculate points
3. Create transaction (earn)
4. Update wallet

---

## 🔴 Redeem Flow

1. Validate:

   * min points
   * max redeem %
2. Deduct points
3. Create transaction

---

## 🟡 Expiration Flow

* Cron Job
* Finds expired points
* Creates expiration transaction

---

# ⚙️ Business Rules

* Points cannot go below 0
* One wallet per customer per brand
* Redemption must respect limits
* Rewards may expire
* Tier auto-update based on points

---

# ⚠️ Edge Cases

* Partial redeem not allowed beyond limit
* Expired points must not be used
* Duplicate wallet must never occur
* Race conditions → use transactions (DB session)

---

# 🧪 Suggested Services

* LoyaltyService
* EarnPointsService
* RedeemService
* TierService
* ExpirationService

---

# 🧱 Suggested Folder Structure

```
server/
  services/
    loyalty/
      loyalty.service.js
      earn.service.js
      redeem.service.js
      tier.service.js
      expiration.service.js
```

---

# 📌 Developer Notes

* Always calculate from LoyaltySettings
* Never trust client-side points
* Always log transactions
* Use DB transactions for consistency

---

# 🚀 Summary

This system is:

* Scalable
* Decoupled
* Ledger-based
* SaaS-ready

---
