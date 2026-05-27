import axios from "../../../api/axios";

export const getDashboardOrders = async () => {
  const response = await axios.get("/orders/dashboard");

  return response.data;
};