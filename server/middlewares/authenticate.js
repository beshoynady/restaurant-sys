/**
 * Middleware: Authenticate access token and attach employee context
 */

const authenticateToken = async (req, res, next) => {
  try {

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Unauthorized: Token not provided",
      });
    }

    const token = authHeader.split(" ")[1];

    let payload;

    try {
      payload = jwt.verify(token, secretKey);
    } catch (err) {
      return res.status(403).json({
        message: "Forbidden: Invalid or expired token",
      });
    }

    if (
      !payload ||
      typeof payload.id !== "string" ||
      typeof payload.isAdmin !== "boolean" ||
      typeof payload.isOwner !== "boolean" ||
      typeof payload.isVerified !== "boolean" ||
      typeof payload.brand !== "string"
    ) {
      return res.status(403).json({
        message: "Forbidden: Invalid token payload",
      });
    }

    const employee = await EmployeeModel
      .findById(payload.id)
      .populate("brand")
      .populate("branch");

    if (!employee) {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    if (employee.isDeleted || employee.employmentInfo.status !== "active") {
      return res.status(403).json({
        message: "Employee inactive or deleted",
      });
    }

    if (employee.brand._id.toString() !== payload.brand) {
      return res.status(403).json({
        message: "Brand mismatch",
      });
    }

    if (
      employee.branch &&
      employee.branch._id.toString() !== payload.branch
    ) {
      return res.status(403).json({
        message: "Branch mismatch",
      });
    }

    req.user = employee;
    req.brand = employee.brand;
    req.branch = employee.branch || null;

    next();

  } catch (err) {
    console.error("Authentication error:", err);

    return res.status(500).json({
      message: "Server error during authentication",
    });
  }
};
/**
 * Refresh Access Token
 */
const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token required" });
    }

    let payload;
    try {
      payload = jwt.verify(refreshToken, secretKey);
    } catch (err) {
      return res.status(403).json({ message: "Invalid or expired refresh token" });
    }

    const employee = await EmployeeModel.findById(payload.id);
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    const accessToken = jwt.sign(
      {
        id: employee._id,
        isAdmin: employee.type === "system_user",
        isOwner: employee.employmentInfo?.isOwner || false,
        isVerified: employee.employmentInfo?.isVerified || false,
        isActive: employee.employmentInfo?.status === "active",
        brand: employee.brand.toString(),
        branch: employee.branch ? employee.branch.toString() : null,
      },
      secretKey,
      { expiresIn: "15m" }
    );

    return res.status(200).json({ success: true, accessToken });
  } catch (err) {
    console.error("Refresh token error:", err);
    return res.status(500).json({ message: "Server error during token refresh" });
  }
};

export  { authenticateToken, refreshAccessToken };