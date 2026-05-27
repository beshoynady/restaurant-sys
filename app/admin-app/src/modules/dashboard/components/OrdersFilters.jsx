const OrdersFilters = ({
  setStartPagination,
  setEndPagination,
  searchBySerial,
  getOrdersByType,
}) => {
  return (
    <div className="row mb-3">
      <div className="col-4">
        <label className="form-label fw-bolder p-0 m-0">عرض</label>

        <select
          className="form-control border-primary m-0 p-2 h-auto"
          onChange={(e) => {
            setStartPagination(0);
            setEndPagination(parseInt(e.target.value));
          }}
        >
          <option value={5}>5</option>
          <option value={10}>10</option>
          <option value={15}>15</option>
          <option value={20}>20</option>
        </select>
      </div>

      <div className="col-4">
        <label className="form-label fw-bolder p-0 m-0">
          رقم الفاتورة
        </label>

        <input
          type="text"
          className="form-control border-primary m-0 p-2 h-auto"
          onChange={(e) => searchBySerial(e.target.value)}
        />
      </div>

      <div className="col-4">
        <label className="form-label fw-bolder p-0 m-0">
          نوع الأوردر
        </label>

        <select
          className="form-control border-primary m-0 p-2 h-auto"
          onChange={(e) => getOrdersByType(e.target.value)}
        >
          <option value="">الكل</option>
          <option value="Dine-in">صالة</option>
          <option value="Delivery">ديليفري</option>
          <option value="Takeaway">تيك اوي</option>
        </select>
      </div>
    </div>
  );
};

export default OrdersFilters;