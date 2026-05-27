import { useEffect, useState } from "react";

const useDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const getOrders = async () => {
    try {
      setLoading(true);

      // call api here

      setOrders([]);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getOrders();
  }, []);

  return {
    orders,
    loading,
    getOrders,
  };
};

export default useDashboard;