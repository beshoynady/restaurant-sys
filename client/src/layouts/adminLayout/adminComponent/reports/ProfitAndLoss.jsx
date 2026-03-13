import React from "react";

const ProfitAndLoss = () => {
  return (
    <div></div>
    // <div className="table-responsive">
    //   <div className="table-wrapper p-3 mw-100">
    //     <div className="table-title">
    //       <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
    //         <div className="text-right">
    //           <h2>
    //             ادارة <b>الاوردرات</b>
    //           </h2>
    //         </div>
    //         {/* <div className="col-12 col-md-6 p-0 m-0 d-flex flex-wrap aliegn-items-center justify-content-end print-hide">
    //                 <a href="#addOrderModal" className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-success" data-toggle="modal"> <span>اضافة اوردر جديد</span></a>
    //                 <a href="#deleteListOrderModal" className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-danger" data-toggle="modal" > <span>حذف</span></a>
    //               </div> */}
    //       </div>
    //     </div>
    //     <div className="table-filter print-hide">
    //       <div className="col-12 text-dark d-flex flex-wrap align-items-center justify-content-start p-0 m-0">
    //         <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
    //           <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
    //             عرض
    //           </label>
    //           <select
    //             className="form-control border-primary m-0 p-2 h-auto"
    //             onChange={(e) => {
    //               setStartPagination(0);
    //               setEndPagination(e.target.value);
    //             }}
    //           >
    //             {(() => {
    //               const options = [];
    //               for (let i = 5; i < 100; i += 5) {
    //                 options.push(
    //                   <option key={i} value={i}>
    //                     {i}
    //                   </option>
    //                 );
    //               }
    //               return options;
    //             })()}
    //           </select>
    //         </div>

    //         <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
    //           <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
    //             رقم الفاتورة
    //           </label>
    //           <input
    //             type="text"
    //             className="form-control border-primary m-0 p-2 h-auto"
    //             onChange={(e) => searchBySerial(e.target.value)}
    //           />
    //         </div>

    //         <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
    //           <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
    //             نوع الاوردر
    //           </label>
    //           <select
    //             className="form-control border-primary m-0 p-2 h-auto"
    //             onChange={(e) => getOrdersByType(e.target.value)}
    //           >
    //             <option value={""}>الكل</option>
    //             <option value="Dine-in">Dine-in</option>
    //             <option value="Delivery">Delivery</option>
    //             <option value="Takeaway">Takeaway</option>
    //           </select>
    //           {/* <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
    //           <label className="form-label text-wrap text-right fw-bolder p-0 m-0">Status</label>
    //           <select className="form-control border-primary m-0 p-2 h-auto">
    //             <option>Any</option>
    //             <option>Delivered</option>
    //             <option>Shipped</option>
    //             <option>Pending</option>
    //             <option>Cancelled</option>
    //           </select>
    //         </div>
    //         <span className="filter-icon"><i className="fa fa-filter"></i></span> */}
    //         </div>

    //         <div className="col-12 text-dark d-flex flex-wrap align-items-center justify-content-start p-0 m-0 mt-3">
    //           <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
    //             <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
    //               فلتر حسب الوقت
    //             </label>
    //             <select
    //               className="form-control border-primary m-0 p-2 h-auto"
    //               onChange={(e) =>
    //                 setlistOfOrders(filterByTime(e.target.value, listOfOrders))
    //               }
    //             >
    //               <option value="">اختر</option>
    //               <option value="today">اليوم</option>
    //               <option value="week">هذا الأسبوع</option>
    //               <option value="month">هذا الشهر</option>
    //               <option value="month">هذه السنه</option>
    //             </select>
    //           </div>

    //           <div className="d-flex align-items-stretch justify-content-between flex-nowrap p-0 m-0 px-1">
    //             <label className="form-label text-nowrap d-flex align-items-center justify-content-center p-0 m-0 ml-1">
    //               <strong>مدة محددة:</strong>
    //             </label>

    //             <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
    //               <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
    //                 من
    //               </label>
    //               <input
    //                 type="date"
    //                 className="form-control border-primary m-0 p-2 h-auto"
    //                 onChange={(e) => setStartDate(e.target.value)}
    //                 placeholder="اختر التاريخ"
    //               />
    //             </div>

    //             <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
    //               <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
    //                 إلى
    //               </label>
    //               <input
    //                 type="date"
    //                 className="form-control border-primary m-0 p-2 h-auto"
    //                 onChange={(e) => setEndDate(e.target.value)}
    //                 placeholder="اختر التاريخ"
    //               />
    //             </div>

    //             <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
    //               <button
    //                 type="button"
    //                 className="btn btn-primary h-100 p-2 "
    //                 onClick={() =>
    //                   setlistOfOrders(filterByDateRange(listOfOrders))
    //                 }
    //               >
    //                 <i className="fa fa-search"></i>
    //               </button>
    //               <button
    //                 type="button"
    //                 className="btn btn-warning h-100 p-2"
    //                 onClick={getOrders}
    //               >
    //                 استعادة
    //               </button>
    //             </div>
    //           </div>
    //         </div>
    //       </div>
    //     </div>

    //     <table className="table table-striped table-hover">
    //       <thead>
    //         <tr>
    //           {/* <th>
    //                   <span className="custom-checkbox">
    //                     <input type="checkbox" className="form-check-input form-check-input-lg" id="selectAll" />
    //                     <label htmlFor="selectAll"></label>
    //                   </span>
    //                 </th> */}
    //           <th>البيان</th>
    //           <th>القيمة</th>
    //           <th>رقم الاوردر</th>
    //           <th>العميل</th>
    //           <th>المكان</th>
    //           <th>الاجمالي</th>
    //           <th>حالة الطلب</th>
    //           <th>الكاشير</th>
    //           <th>حالة الدفع</th>
    //           <th>تاريخ الدفع</th>
    //           <th>اجراءات</th>
    //         </tr>
    //       </thead>
    //       <tbody>
    //         {listOfOrders &&
    //           listOfOrders.map((order, i) => {
    //             if ((i >= startPagination) & (i < endPagination)) {
    //               return (
    //                 <tr key={i}>
    //                   <td>{i + 1}</td>
    //                   <td>
    //                     <a
    //                       data-toggle="modal"
    //                       data-target="#invoiceOrderModal"
    //                       onClick={() => {
    //                         getOrderDataBySerial(order.serial);
    //                         setShowModal(!showModal);
    //                       }}
    //                     >
    //                       {order.serial}{" "}
    //                     </a>
    //                   </td>

    //                   <td>{order.orderNum ? order.orderNum : "--"}</td>
    //                   <td>
    //                     {order.table != null
    //                       ? order.table.tableNumber
    //                       : order.user
    //                       ? order.user?.username
    //                       : order.createdBy
    //                       ? order.createdBy?.fullname
    //                       : "--"}
    //                   </td>

    //                   <td>{order.orderType}</td>
    //                   <td>{order.total}</td>
    //                   <td>{order.status}</td>
    //                   <td>{order.cashier && order.cashier.fullname}</td>
    //                   <td>{order.payment_status}</td>
    //                   <td>{formatDateTime(order.payment_date)}</td>

    //                   <td>
    //                     {/* <a href="#editOrderModal" className="btn btn-sm btn-primary ml-2 " data-toggle="modal"><i className="material-icons" data-toggle="tooltip" title="Edit">&#xE254;</i></a> */}
    //                     <a
    //                       href="#deleteOrderModal"
    //                       className="btn btn-sm btn-danger"
    //                       data-toggle="modal"
    //                       onClick={() => setOrderId(order._id)}
    //                     >
    //                       <i
    //                         className="material-icons"
    //                         data-toggle="tooltip"
    //                         title="Delete"
    //                       >
    //                         &#xE872;
    //                       </i>
    //                     </a>
    //                   </td>
    //                 </tr>
    //               );
    //             }
    //           })}
    //       </tbody>
    //     </table>

    //   </div>
    // </div>
  );
};

export   default ProfitAndLoss;
