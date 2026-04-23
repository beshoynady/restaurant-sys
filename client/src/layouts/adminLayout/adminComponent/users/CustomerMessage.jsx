import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AppContext } from "../../../../context/appContext";
import { toast } from "react-toastify";
import "./orders/Orders.css";

const CustomerMessage = () => {
  const {
    setStartDate,
    setEndDate,
    filterByDateRange,
    filterByTime,
    brandInfo,
    formatDateTime,
    permissionsList,
    setIsLoading,
    formatDate,
    formatTime,
    EditPagination,
    startPagination,
    endPagination,
    setStartPagination,
    setEndPagination,
    apiUrl,
    handleGetTokenAndConfig,
  } = useContext(AppContext);

  const permissionUserMassage = permissionsList?.filter(
    (permission) => permission.resource === "Messages"
  )[0];

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [messageId, setmessageId] = useState("");
  const [allCustomerMessage, setAllCustomerMessage] = useState([]);

  const getAllCustomerMessage = async () => {
    if (permissionUserMassage && !permissionUserMassage.read) {
      toast.warn("ليس لك صلاحية لعرض رسائل المستخدمين");
      return;
    }
    try {
      const config = await handleGetTokenAndConfig();
      const response = await axios.get(`${apiUrl}/api/message`, config);
      setAllCustomerMessage(response.data);
    } catch (error) {}
  };

  const updateisSeenMessage = async (e, mes) => {
    e.preventDefault();
    const config = await handleGetTokenAndConfig();
    if (permissionUserMassage && !permissionUserMassage.show) {
      toast.warn("ليس لك صلاحية لتعديل رسائل المستخدمين");
      return;
    }
    const message = JSON.parse(mes);
    setName(message.name);
    setPhone(message.phone);
    setMessage(message.message);
    setEmail(message.email);
    setmessageId(message._id);
    try {
      const response = await axios.put(
        `${apiUrl}/api/message/${message._id}`,
        { isSeen: true },
        config
      );
      getAllCustomerMessage();
    } catch (error) {}
  };

  const deleteCustomerMessage = async (e) => {
    e.preventDefault();
    const config = await handleGetTokenAndConfig();
    if (permissionUserMassage && !permissionUserMassage.delete) {
      toast.warn("ليس لك صلاحية لحذف رسائل المستخدمين");
      return;
    }
    try {
      const response = await axios.delete(
        `${apiUrl}/api/message/${messageId}`,
        config
      );
      if (response) {
        toast.success("تم حذف الرسالة بنجاح");
      }
      getAllCustomerMessage();
    } catch (error) {}
  };

  const getCustomerMessageByPhone = async (phone) => {
    if (!phone) {
      getAllCustomerMessage();
      return;
    }
    const message = allCustomerMessage.filter((message) =>
      message.phone.startsWith(phone)
    );
    setAllCustomerMessage(message);
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
    if (permissionUserMassage && !permissionUserMassage.delete) {
      toast.warn("ليس لك صلاحية لحذف رسائل المستخدمين");
      return;
    }

    try {
      const config = await handleGetTokenAndConfig();

      for (const Id of selectedIds) {
        await axios.delete(`${apiUrl}/api/message/${Id}`, config);
      }
      getAllCustomerMessage();
      toast.success("تم حذف الرسائل المحدده");
      setSelectedIds([]);
    } catch (error) {
      toast.error("فشل حذف الرسائل المحددة ! حاول مره اخري");
    }
  };

  useEffect(() => {
    getAllCustomerMessage();
  }, []);

  return (
    <div className="w-100 px-3 d-flex align-itmes-center justify-content-start">
      <div className="table-responsive">
        <div className="table-wrapper p-3 mw-100">
          <div className="table-title">
            <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
              <div className="text-right">
                <h2>
                  ادارة <b>رسائل العملاء</b>
                </h2>
              </div>
              <div className="col-12 col-md-6 p-0 m-0 d-flex flex-wrap aliegn-items-center justify-content-end print-hide">
                {/* <a href="#addmessageModal" className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-success" data-toggle="modal"> <span>اضافة موظف جديد</span></a> */}
                <a
                  href="#deleteAllmessageModal"
                  className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-danger"
                  data-toggle="modal"
                >
                  {" "}
                  <span>حذف الكل</span>
                </a>
              </div>
            </div>
          </div>
          <div class="table-filter print-hide">
            <div className="w-100 d-flex flex-row flex-wrap align-items-center justify-content-start text-dark">
              <div class="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
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
              <div class="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  الموبايل
                </label>
                <input
                  type="text"
                  class="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => getCustomerMessageByPhone(e.target.value)}
                />
              </div>
              <div className="col-12 text-dark d-flex flex-wrap align-items-center justify-content-start p-0 m-0 mt-3">
                <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    فلتر حسب الوقت
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    onChange={(e) =>
                      setAllCustomerMessage(
                        filterByTime(e.target.value, allCustomerMessage)
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
                        setAllCustomerMessage(
                          filterByDateRange(allCustomerMessage)
                        )
                      }
                    >
                      <i className="fa fa-search"></i>
                    </button>
                    <button
                      type="button"
                      className="btn btn-warning h-100 p-2"
                      onClick={getAllCustomerMessage}
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
                <th>
                  {/* <span className="custom-checkbox">
                    <input
                      type="checkbox"
                      className="form-check-input form-check-input-lg"
                      id="selectAll"
                    />
                    <label htmlFor="selectAll"></label>
                  </span> */}
                </th>
                <th>م</th>
                <th>الاسم</th>
                <th>الموبايل</th>
                <th>الايميل</th>
                <th>الرساله</th>
                <th>المشاهده</th>
                <th>التاريخ</th>
                <th>اجراءات</th>
              </tr>
            </thead>
            <tbody>
              {allCustomerMessage.map((message, i) => {
                if ((i >= startPagination) & (i < endPagination)) {
                  return (
                    <tr key={i}>
                      <td>
                        <span className="custom-checkbox">
                          <input
                            type="checkbox"
                            className="form-check-input form-check-input-lg"
                            id="checkbox1"
                            name="options[]"
                            value={message._id}
                            onChange={handleCheckboxChange}
                          />
                          <label htmlFor="checkbox1"></label>
                        </span>
                      </td>
                      <td>{i + 1}</td>
                      <td>{message.name}</td>
                      <td>{message.phone}</td>
                      <td>{message.email}</td>
                      <td>{message.message}</td>
                      <td>{message.isSeen ? "تم المشاهده" : "لم تشاهد"}</td>
                      <td>{formatDateTime(message.createdAt)}</td>
                      <td>
                        <button
                          data-target="#showMessageModal"
                          className="btn btn-sm btn-primary ml-2 "
                          data-toggle="modal"
                          onClick={(e) => {
                            updateisSeenMessage(e, JSON.stringify(message));
                          }}
                        >
                          <i
                            className="material-icons"
                            data-toggle="tooltip"
                            title="View"
                          >
                            visibility
                          </i>
                        </button>
                        <button
                          data-target="#deletemessageModal"
                          className="btn btn-sm btn-danger"
                          data-toggle="modal"
                          onClick={() => setmessageId(message._id)}
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
                {allCustomerMessage.length > endPagination
                  ? endPagination
                  : allCustomerMessage.length}
              </b>{" "}
              من <b>{allCustomerMessage.length}</b> عنصر
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

      <div id="showMessageModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">رساله عميل</h4>
                <button
                  type="button"
                  className="close m-0 p-1"
                  data-dismiss="modal"
                  aria-hidden="true"
                >
                  &times;
                </button>
              </div>
              <div className="modal-body d-flex flex-wrap align-items-center p-3 text-right">
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الاسم
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    defaultValue={name}
                    required
                    readOnly
                  />
                </div>

                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الموبايل
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    defaultValue={phone}
                    required
                    readOnly
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الايميل
                  </label>
                  <input
                    type="email"
                    className="form-control border-primary m-0 p-2 h-auto"
                    defaultValue={email}
                    required
                    readOnly
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الرسالة
                  </label>
                  <textarea
                    className="form-control border-primary m-0 p-2 h-auto"
                    defaultValue={message}
                    required
                    readOnly
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer d-flex flex-nowrap align-items-center justify-content-between m-0 p-1">
                <input
                  type="submit"
                  className="btn btn-success col-6 h-100 px-2 py-3 m-0"
                  value="تم"
                />
                <input
                  type="button"
                  className="btn btn-danger col-6 h-100 px-2 py-3 m-0"
                  data-dismiss="modal"
                  value="اغلاق"
                />
              </div>
            </form>
          </div>
        </div>
      </div>

      <div id="deletemessageModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form onSubmit={deleteCustomerMessage}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">حذف رساله</h4>
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
                  className="btn btn-warning col-6 h-100 px-2 py-3 m-0"
                  value="حذف"
                />
                <input
                  type="button"
                  className="btn btn-danger col-6 h-100 px-2 py-3 m-0"
                  data-dismiss="modal"
                  value="اغلاق"
                />
              </div>
            </form>
          </div>
        </div>
      </div>

      <div id="deleteAllmessageModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form onSubmit={deleteSelectedIds}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">حذف الرسائل المحدده</h4>
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
                  className="btn btn-warning col-6 h-100 px-2 py-3 m-0"
                  value="حذف"
                />
                <input
                  type="button"
                  className="btn btn-danger col-6 h-100 px-2 py-3 m-0"
                  data-dismiss="modal"
                  value="اغلاق"
                />
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export   default CustomerMessage;
