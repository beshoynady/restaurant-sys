# Accounting Module Overview

This module provides:

- Complete accounting engine for restaurants.
- Payroll, sales, purchase, expense, asset, and cash tracking.
- Automatic journal entries based on business activities.
- Multi-branch and multi-currency support.
- Audit logs and financial compliance.

## Quick Start

1. Define accounts in `Account` model.
2. Configure `AccountingSettings` for control accounts and activity mapping.
3. Define `AccountingPeriod`.
4. Generate transactions through system activities (sales, payroll, etc.).
5. Journal entries are created automatically and can be posted.
6. Reports and statements are derived from posted journal entries.

## Notes

- Always set `createdBy` for auditing.
- Use `CostCenter` for segmented reporting if enabled.
- Do not hard-code accounts in operational modules.
