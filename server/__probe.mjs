import mongoose from "mongoose";

await mongoose.connect("mongodb://127.0.0.1:27017/restaurant");

const svcModule = await import("./modules/organization/delivery-area/delivery-area.service.js");
const service = svcModule.default;

try {
  const result = await service.getArea({
    areaId: "000000000000000000000000",
    branchId: "000000000000000000000000",
  });
  console.log("UNEXPECTED SUCCESS:", result);
} catch (e) {
  console.log("THREW AS EXPECTED:", e.message, e.statusCode);
}

await mongoose.disconnect();
process.exit(0);
