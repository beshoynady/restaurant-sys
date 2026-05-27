import OrdersFilters from "./OrdersFilters";
import OrdersPagination from "./OrdersPagination";
import OrderRow from "./OrderRow";

const OrdersTable = () => {
  const orders = [];

  return (
    <div className="card h-100 w-100" style={{ overflow: "auto" }}>
      <div className="card-header w-100">
        <h3 className="card-title">الأوردرات الحالية</h3>
      </div>

      <div className="card-body w-auto">
        <OrdersFilters />

        <div className="table-responsive">
          <table className="table align-middle table-striped table-hover mb-0">
            <thead className="table-primary">
              <tr>
                <th>رقم الفاتورة</th>
                <th>الإجمالي</th>
                <th>حالة الأوردر</th>
                <th>حالة الدفع</th>
              </tr>
            </thead>

            <tbody>
              {orders.length > 0 ? (
                orders.map((order) => (
                  <OrderRow key={order._id} recent={order} />
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="text-center py-3">
                    لا توجد أوردرات
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <OrdersPagination />
      </div>
    </div>
  );
};

export default OrdersTable;