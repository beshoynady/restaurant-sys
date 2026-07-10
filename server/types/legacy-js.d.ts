/**
 * TypeScript helper for this codebase:
 * Many existing modules are authored in JavaScript (*.js) while the server middleware
 * is being migrated to TypeScript (*.ts).
 *
 * These declarations tell TS to treat imported legacy .js modules as `any` until
 * they are converted fully to TypeScript.
 *
 * notes:
 * - This avoids "Could not find a declaration file" errors during incremental migration.
 * - It is intentionally scoped to specific legacy modules used by the TS middleware.
 */

/**
 * NOTE:
 * This file is used to silence TS7016 errors during incremental migration.
 * The repository contains many legacy modules written in JavaScript (*.js)
 * that are imported from TypeScript (*.ts). Until those modules are fully
 * converted to TypeScript, we treat them as `any`.
 */

declare module "../modules/audit-log/audit-log.model.js" {
  const x: any;
  export default x;
}

declare module "../utils/audit/AuditContext.js" {
  export const createAuditContextFromRequest: any;
}

declare module "../modules/iam/user-account/user-account.model.js" {
  const x: any;
  export default x;
}

declare module "../modules/crm/online-customer/online-customer.model.js" {
  const x: any;
  export default x;
}

declare module "../utils/throwError.js" {
  const x: any;
  export default x;
}

declare module "./socket/socket.js" {
  export const initSocket: any;
  const x: any;
  export default x;
}

declare module "./router/v1/index.router.js" {
  const x: any;
  export default x;
}

