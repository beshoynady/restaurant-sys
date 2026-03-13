import React, { useState, useEffect, useRef, useContext } from "react";
import axios from "axios";
import { AppContext } from "../../../../context/appContext";
import { useReactToPrint } from "react-to-print";
import { toast } from "react-toastify";
import "./Orders.css";
import InvoiceComponent from "../invoice/invoice";
import department from "../products/department";

const PreparationTicket = () => {
  const {
    brandInfo,
    permissionsList,
    setStartDate,
    setEndDate,
    filterByDateRange,
    filterByTime,
    employeeLoginInfo,
    formatDate,
    formatDateTime,
    setIsLoading,
    EditPagination,
    startPagination,
    endPagination,
    setStartPagination,
    setEndPagination,
    apiUrl,
    handleGetTokenAndConfig,
  } = useContext(AppContext);

  const [showModal, setShowModal] = useState(false);

  const [PreparationTickets, setPreparationTickets] = useState([]);
  const [departments, setdepartments] = useState([]);

  // Fetch all preparation sections
  const fetchdepartments = async () => {
    const config = await handleGetTokenAndConfig();

    try {
      const response = await axios.get(`${apiUrl}/api/department`, config);
      if (response.status === 200) {
        setdepartments(response.data.data);
      } else {
        throw new Error("Failed to fetch sections.");
      }
    } catch (error) {
      console.error("Error fetching preparation sections:", error);
      toast.error(
        "An error occurred while fetching sections. Please try again later."
      );
    }
  };

  const fetchPreparationTickets = async () => {
    const config = await handleGetTokenAndConfig();

    try {
      const response = await axios.get(
        `${apiUrl}/api/preparationticket`,
        config
      );
      if (response.status === 200) {
        setPreparationTickets(response.data.data);
      } else {
        throw new Error("Failed to fetch sections.");
      }
    } catch (error) {
      console.error("Error fetching preparation sections:", error);
      toast.error(
        "An error occurred while fetching sections. Please try again later."
      );
    }
  };

  const printContainer = useRef();

  const Print = useReactToPrint({
    content: () => printContainer.current,
    copyStyles: true,
    removeAfterPrint: true,
    bodyClass: "printpage",
  });
  const handlePrint = (e) => {
    e.preventDefault();
    Print();
  };

  // State to manage order deletion
  const [PreparationTicketId, setPreparationTicketId] = useState("");

  // Delete order
  const handleDeletePreparationTickets = async (event) => {
    event.preventDefault();

    // Check if the user is authenticated
    const config = await handleGetTokenAndConfig();

    try {
      const PreparationTicketIdToDelete = PreparationTicketId; // Use a clear and descriptive variable name
      const deleteUrl = `${apiUrl}/api/preparationticket/${PreparationTicketIdToDelete}`; // Construct the API URL

      // Send a DELETE request to the server
      await axios.delete(deleteUrl, config);

      // Refresh the orders list after deletion
      await fetchPreparationTickets();

      // Show a success message
      toast.success("تم حذف التذكره بنجاح.");
    } catch (error) {
      // Handle specific error scenarios based on status code
      if (error.response) {
        // Server responded with a status code outside the 2xx range
        const { status, data } = error.response;
        if (status === 401) {
          toast.error("غير مصرح. يرجى تسجيل الدخول مرة أخرى.");
        } else if (status === 404) {
          await fetchPreparationTickets();
          toast.error("التذكره غير موجود. قد يكون تم حذفه مسبقًا.");
        } else {
          await fetchPreparationTickets();
          toast.error(data?.message || "حدث خطأ غير متوقع.");
        }
      } else if (error.request) {
        await fetchPreparationTickets();
        // Request was made but no response was received
        console.error("No response received:", error.request);
        toast.error("فشل الاتصال بالخادم. يرجى التحقق من الشبكة.");
      } else {
        await fetchPreparationTickets();
        // Something else went wrong during the request setup
        console.error("Request setup error:", error.message);
        toast.error("حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.");
      }
    } finally {
      await fetchPreparationTickets();
    }
  };

  const [selectedIds, setSelectedIds] = useState([]);
  const handleCheckboxChange = (e) => {
    const Id = e.target.value;
    const isChecked = e.target.checked;

    if (isChecked) {
      setSelectedIds([...selectedIds, Id]);
    } else {
      const updatedSelectedIds = selectedIds.filter((id) => id !== Id);
      setSelectedIds(updatedSelectedIds);
    }
  };

  const deleteSelectedIds = async (e) => {
    e.preventDefault();

    const config = await handleGetTokenAndConfig();
    try {
      for (const Id of selectedIds) {
        await axios.delete(`${apiUrl}/api/preparationticket/${Id}`, config);
      }
      fetchPreparationTickets();
      toast.success("Selected orders deleted successfully");
      setSelectedIds([]);
    } catch (error) {
      toast.error("Failed to delete selected orders");
    }
  };

  // Filter orders by serial number
  const searchBySerial = (serial) => {
    if (serial) {
      const PreparationTicketsfilter = PreparationTickets.filter((Ticket) =>
        Ticket.order?.serial.toString().startsWith(serial)
      );
      setPreparationTickets(PreparationTicketsfilter);
    } else {
      fetchPreparationTickets();
    }
  };

  // Filter orders by order type
  const getPreparationTicketByType = (type) => {
    if (!type) {
      fetchPreparationTickets();
    } else {
      const PreparationTicketsfilter = PreparationTickets.filter(
        (Ticket) => Ticket.order?.orderType === type
      );
      setPreparationTickets(PreparationTicketsfilter.reverse());
    }
  };

  // Fetch orders on component mount
  useEffect(() => {
    fetchdepartments();
    fetchPreparationTickets();
  }, []);

  return (
    <div className="w-100 px-3 d-flex align-itmes-center justify-content-start">
      <div className="table-responsive">
        <div className="table-wrapper p-3 mw-100">
          <div className="table-title">
            <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
              <div className="text-right">
                <h2>
                  ادارة <b>تذاكر اقسام الاعداد</b>
                </h2>
              </div>
              {/* <div className="col-12 col-md-6 p-0 m-0 d-flex flex-wrap aliegn-items-center justify-content-end print-hide">
                        <a href="#addOrderModal" className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-success" data-toggle="modal"> <span>اضافة اوردر جديد</span></a>
                        <a href="#deleteListOrderModal" className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-danger" data-toggle="modal" > <span>حذف</span></a>
                      </div> */}
            </div>
          </div>
          <div className="table-filter print-hide">
            <div className="col-12 text-dark d-flex flex-wrap align-items-center justify-content-start p-0 m-0">
              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  عرض
                </label>
                <select
                  className="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => {
                    setStartPagination(0);
                    setEndPagination(e.target.value);
                  }}
                >
                  {(() => {
                    const options = [];
                    for (let i = 5; i < 100; i += 5) {
                      options.push(
                        <option key={i} value={i}>
                          {i}
                        </option>
                      );
                    }
                    return options;
                  })()}
                </select>
              </div>

              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  رقم الفاتورة
                </label>
                <input
                  type="text"
                  className="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => searchBySerial(e.target.value)}
                />
              </div>

              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  نوع الاوردر
                </label>
                <select
                  className="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => getPreparationTicketByType(e.target.value)}
                >
                  <option value={""}>الكل</option>
                  <option value="Dine-in">Dine-in</option>
                  <option value="Delivery">Delivery</option>
                  <option value="Takeaway">Takeaway</option>
                </select>
                {/* <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">Status</label>
                  <select className="form-control border-primary m-0 p-2 h-auto">
                    <option>Any</option>
                    <option>Delivered</option>
                    <option>Shipped</option>
                    <option>Pending</option>
                    <option>Cancelled</option>
                  </select>
                </div>
                <span className="filter-icon"><i className="fa fa-filter"></i></span> */}
              </div>

              <div className="col-12 text-dark d-flex flex-wrap align-items-center justify-content-start p-0 m-0 mt-3">
                <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    فلتر حسب الوقت
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    onChange={(e) =>
                      setPreparationTickets(
                        filterByTime(e.target.value, department)
                      )
                    }
                  >
                    <option value="">اختر</option>
                    <option value="today">اليوم</option>
                    <option value="week">هذا الأسبوع</option>
                    <option value="month">هذا الشهر</option>
                    <option value="month">هذه السنه</option>
                  </select>
                </div>

                <div className="d-flex align-items-stretch justify-content-between flex-nowrap p-0 m-0 px-1">
                  <label className="form-label text-nowrap d-flex align-items-center justify-content-center p-0 m-0 ml-1">
                    <strong>مدة محددة:</strong>
                  </label>

                  <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                    <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                      من
                    </label>
                    <input
                      type="date"
                      className="form-control border-primary m-0 p-2 h-auto"
                      onChange={(e) => setStartDate(e.target.value)}
                      placeholder="اختر التاريخ"
                    />
                  </div>

                  <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                    <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                      إلى
                    </label>
                    <input
                      type="date"
                      className="form-control border-primary m-0 p-2 h-auto"
                      onChange={(e) => setEndDate(e.target.value)}
                      placeholder="اختر التاريخ"
                    />
                  </div>

                  <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                    <button
                      type="button"
                      className="btn btn-primary h-100 p-2 "
                      onClick={() =>
                        setPreparationTickets(
                          filterByDateRange(PreparationTickets)
                        )
                      }
                    >
                      <i className="fa fa-search"></i>
                    </button>
                    <button
                      type="button"
                      className="btn btn-warning h-100 p-2"
                      onClick={fetchPreparationTickets}
                    >
                      استعادة
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <table className="table table-striped table-hover">
            <thead>
              <tr>
                {/* <th>
                          <span className="custom-checkbox">
                            <input type="checkbox" className="form-check-input form-check-input-lg" id="selectAll" />
                            <label htmlFor="selectAll"></label>
                          </span>
                        </th> */}
                <th>م</th>
                <th>رقم الفاتورة</th>
                <th>رقم الاوردر</th>
                <th>العميل</th>
                <th>المكان</th>
                <th>القسم</th>
                <th>حالة التذكره</th>
                <th>الكاشير</th>
                <th>الويتر</th>
                <th>الوقت</th>
                <th>اجراءات</th>
              </tr>
            </thead>
            <tbody>
              {PreparationTickets &&
                PreparationTickets.map((Ticket, i) => {
                  if ((i >= startPagination) & (i < endPagination)) {
                    return (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>
                          <a
                            data-toggle="modal"
                            data-target="#invoiceOrderModal"
                            onClick={() => {
                              searchBySerial(Ticket.order?.serial);
                              setShowModal(!showModal);
                            }}
                          >
                            {Ticket.order?.serial}{" "}
                          </a>
                        </td>

                        <td>
                          {Ticket.order?.orderNum
                            ? Ticket.order?.orderNum
                            : "--"}
                        </td>
                        <td>
                          {Ticket.order?.table != null
                            ? Ticket.order?.table.tableNumber
                            : Ticket.order?.user
                            ? Ticket.order?.user?.username
                            : Ticket.order?.createdBy
                            ? Ticket.order?.createdBy?.fullname
                            : "--"}
                        </td>

                        <td>{Ticket.order?.orderType}</td>
                        <td>{Ticket.department?.name}</td>
                        <td>{Ticket.preparationStatus}</td>
                        <td>
                          {Ticket.responsibleEmployee &&
                            Ticket.responsibleEmployee?.fullname}
                        </td>
                        <td>{Ticket.waiter?.fullname}</td>
                        <td>{formatDateTime(Ticket.createdAt)}</td>

                        <td>
                          {/* <a href="#editOrderModal" className="btn btn-sm btn-primary ml-2 " data-toggle="modal"><i className="material-icons" data-toggle="tooltip" title="Edit">&#xE254;</i></a> */}
                          <button
                            data-target="#deletePreparationTicketModal"
                            className="btn btn-sm btn-danger"
                            data-toggle="modal"
                            onClick={() => setPreparationTicketId(Ticket._id)}
                          >
                            <i
                              className="material-icons"
                              data-toggle="tooltip"
                              title="Delete"
                            >
                              &#xE872;
                            </i>
                          </button>
                        </td>
                      </tr>
                    );
                  }
                })}
            </tbody>
          </table>
          <div className="clearfix">
            <div className="hint-text text-dark">
              عرض{" "}
              <b>
                {PreparationTickets.length > endPagination
                  ? endPagination
                  : PreparationTickets.length}
              </b>{" "}
              من <b>{PreparationTickets.length}</b> عنصر
            </div>
            <ul className="pagination">
              <li onClick={EditPagination} className="page-item disabled">
                <a href="#">السابق</a>
              </li>
              <li
                onClick={EditPagination}
                className={`page-item ${endPagination === 5 ? "active" : ""}`}
              >
                <a href="#" className="page-link">
                  1
                </a>
              </li>
              <li
                onClick={EditPagination}
                className={`page-item ${endPagination === 10 ? "active" : ""}`}
              >
                <a href="#" className="page-link">
                  2
                </a>
              </li>
              <li
                onClick={EditPagination}
                className={`page-item ${endPagination === 15 ? "active" : ""}`}
              >
                <a href="#" className="page-link">
                  3
                </a>
              </li>
              <li
                onClick={EditPagination}
                className={`page-item ${endPagination === 20 ? "active" : ""}`}
              >
                <a href="#" className="page-link">
                  4
                </a>
              </li>
              <li
                onClick={EditPagination}
                className={`page-item ${endPagination === 25 ? "active" : ""}`}
              >
                <a href="#" className="page-link">
                  5
                </a>
              </li>
              <li
                onClick={EditPagination}
                className={`page-item ${endPagination === 30 ? "active" : ""}`}
              >
                <a href="#" className="page-link">
                  التالي
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* <InvoiceComponent
        ModalId="invoiceOrderModal"
        orderData={orderData}
        showModal={showModal}
        setShowModal={setShowModal}
      /> */}

      <div id="deletePreparationTicketModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form onSubmit={handleDeletePreparationTickets}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">Delete Order</h4>
                <button
                  type="button"
                  className="close m-0 p-1"
                  data-dismiss="modal"
                  aria-hidden="true"
                >
                  &times;
                </button>
              </div>
              <div className="modal-body text-center">
                <p className="text-right text-dark fs-3 fw-800 mb-2">
                  هل أنت متأكد من حذف هذا السجل؟
                </p>
                <p className="text-warning text-center mt-3">
                  <small>لا يمكن الرجوع في هذا الإجراء.</small>
                </p>
              </div>
              <div className="modal-footer d-flex flex-nowrap align-items-center justify-content-between m-0 p-1">
                <input
                  type="submit"
                  className="btn btn-warning  col-6 h-100 px-2 py-3 m-0"
                  value="حذف"
                />
                <input
                  type="button"
                  className="btn btn-danger col-6 h-100 px-2 py-3 m-0"
                  data-toggle="modal"
                  data-dismiss="modal"
                  value="الغاء"
                />
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export   default PreparationTicket;
