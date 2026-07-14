import asyncHandler from "../../../utils/asyncHandler.js";
import authCredentialService from "./auth-credential.service.js";

class AuthCredentialController {
  issue = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;

    const credential = await authCredentialService.issueCredential({
      brand: brandId,
      branch: req.body.branch || null,
      principal: req.body.principal,
      principalType: req.body.principalType,
      type: req.body.type,
      value: req.body.value,
      expiresAt: req.body.expiresAt || null,
      createdBy: userId,
    });

    res.status(201).json({
      success: true,
      // lookupKey is select:false on the schema already; this is a defense-in-depth strip in
      // case a future populate/lean call ever includes it.
      data: { ...credential.toObject(), lookupKey: undefined },
    });
  });

  listForPrincipal = asyncHandler(async (req, res) => {
    const credentials = await authCredentialService.listForPrincipal(req.params.principalId);
    res.json({ success: true, data: credentials });
  });

  revoke = asyncHandler(async (req, res) => {
    const { brandId, userId } = req.user;

    const credential = await authCredentialService.revokeCredential({
      id: req.params.id,
      brand: brandId,
      revokedBy: userId,
    });

    res.json({ success: true, data: credential });
  });
}

export default new AuthCredentialController();
