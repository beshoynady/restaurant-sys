import asyncHandler from "../../../utils/asyncHandler.js";
import authService from "./auth.service.js";

class AuthController {
  login = asyncHandler(async (req, res) => {
    const result = await authService.login({
      identifier: req.body.identifier,
      password: req.body.password,
      brandId: req.body.brandId, // أو من subdomain
    });

    res.json(result);
  });

  register = asyncHandler(async (req, res) => {
    const result = await authService.register({
      brandId: req.brandId,
      data: req.body,
      createdBy: req.user?._id,
    });

    res.json(result);
  });

  refresh = asyncHandler(async (req, res) => {
    const result = await authService.refresh(req.body.refreshToken);
    res.json(result);
  });

  logout = asyncHandler(async (req, res) => {
    res.json({ message: "Logged out successfully" });
  });
}

export default new AuthController();