import React, { useState, useEffect, useRef, useContext } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { AppContext } from "../../../../context/appContext";
import "../orders/Orders.css";

const ReservationTables = () => {
  const {
    setIsLoading,
    EditPagination,
    startPagination,
    endPagination,
    setStartPagination,
    setEndPagination,
    createReservations,
    // confirmReservation, updateReservation, getReservationById, deleteReservation,
    getAllReservations,
    allReservations,
    setAllReservations,
    employeeLoginInfo,
    allusers,
    allTable,
    getAvailableTables,
    setavailableTableIds,
    availableTableIds,
    setStartDate,
    setEndDate,
    formatDate,
    formatTime,
    filterByDateRange,
    filterByTime,
    apiUrl,
    handleGetTokenAndConfig,
  } = useContext(AppContext);

  const createdBy = employeeLoginInfo?.id;
  const [reservationId, setReservationId] = useState("");
  const [tableId, settableId] = useState("");
  const [tableNumber, settableNumber] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [reservationNote, setReservationNote] = useState("");
  const [numberOfGuests, setNumberOfGuests] = useState("");
  const [reservationDate, setReservationDate] = useState();
  const [startTime, setStartTime] = useState();
  const [endTime, setEndTime] = useState();
  const [startTimeClicked, setStartTimeClicked] = useState(false);
  const [endTimeClicked, setEndTimeClicked] = useState(false);

  const getReservationById = async (id) => {
    try {
      if (!id) {
        toast.error("رجاء اختيار الحجز بشكل صحيح");
        return;
      }

      const reservation = await axios.get(`${apiUrl}/api/reservation/${id}`);
      if (!reservation) {
        toast.error("هذا الحجز غير موجود");
      }
    } catch (error) {
      toast.error(" حدث خطأ اثناء الوصول الي الحجز !حاول مرة اخري");
    }
  };

  const updateReservation = async (e) => {
    e.preventDefault();
    console.log({
      reservationId,
      tableId,
      tableNumber,
      numberOfGuests,
      reservationDate,
      startTime,
      endTime,
      reservationNote,
      updateBy: employeeLoginInfo?.id,
    });
    try {
      if (!reservationId) {
        toast.error("رجاء اختيار الحجز بشكل صحيح");
        return;
      }
      // setIsLoading(true)

      const filterReservationsByTable = allReservations.filter(
        (reservation) =>
          reservation.tableId === tableId &&
          reservation.reservationDate === reservationDate
      );

      const filterReservationsByTime = filterReservationsByTable.filter(
        (reservation) =>
          (new Date(reservation.startTime).getTime() <=
            new Date(startTime).getTime() &&
            new Date(reservation.endTime).getTime() >=
              new Date(startTime).getTime()) ||
          (new Date(reservation.startTime).getTime() <=
            new Date(endTime).getTime() &&
            new Date(reservation.endTime).getTime() >=
              new Date(endTime).getTime()) ||
          (new Date(startTime).getTime() <=
            new Date(reservation.startTime).getTime() &&
            new Date(endTime).getTime() >=
              new Date(reservation.endTime).getTime())
      );

      
      if (
        filterReservationsByTime.length === 0 ||
        (filterReservationsByTime.length === 1 &&
          filterReservationsByTime[0]._id === reservationId)
      ) {
        const response = await axios.put(
          `${apiUrl}/api/reservation/${reservationId}`,
          {
            tableId,
            tableNumber,
            numberOfGuests,
            reservationDate,
            startTime,
            endTime,
            reservationNote,
            updateBy: employeeLoginInfo?.id,
          }
        );
        if (response.status === 200) {
          getAllReservations();

          toast.success("تم تعديل ميعاد الحجز بنجاح");
        } else {
          getAllReservations();

          toast.error("حدث خطأ اثناء التعديل ! حاول مرة اخري");
        }
      } else {
        toast.error("لا يمكن تغير الحجز في هذا الميعاد");
      }
    } catch (error) {
      toast.error("حدث خطأاثناء تعديل الحجز ! حاول مرة اخري");
    } finally {
      setIsLoading(false);
    }
  };

  const confirmReservation = async (id, status) => {
    // setIsLoading(true)
    try {
      if (!id) {
        toast.error("رجاء اختيار الحجز بشكل صحيح");
        return;
      }
      const config = await handleGetTokenAndConfig();

      const response = await axios.put(
        `${apiUrl}/api/reservation/${id}`,
        {
          status,
        },
        config
      );
      if (response.status === 200) {
        getAllReservations();
        toast.success("تم تاكيد الحجز بنجاح");
      } else {
        getAllReservations();
        toast.error("حدث خطأ اثناء التاكيد ! حاول مرة اخري");
      }
    } catch (error) {
      toast.error("حدث خطأاثناء تاكيد الحجز ! حاول مرة اخري");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteReservation = async (id) => {
    // setIsLoading(true)
    try {
      if (!id) {
        toast.error("رجاء اختيار الحجز بشكل صحيح");
        return;
      }

      const response = await axios.delete(`${apiUrl}/api/reservation/${id}`);
      if (response.status === 200) {
        getAllReservations();
        toast.success("تم حذف الحجز بنجاح");
      } else {
        toast.error("حدث خطأ اثناء حذف الحجز !حاول مره اخري");
      }
    } catch (error) {
      toast.error("حدث خطاء عملية الحذف !حاول مره اخري");
    } finally {
      setIsLoading(false);
    }
  };

  const [userId, setUserId] = useState("");
  const [filteredClients, setFilteredClients] = useState([]);

  const clientByName = (allusers, name) => {
    setCustomerName(name);
    const client = allusers&&allusers.filter(
      (user) => user.username.startsWith(name) === true
    );
    if(client){
      setFilteredClients(client);
      const userId = client._id;
      setUserId(userId);
      
      
      
    }
  };

  const searchBytableNum = (num) => {
    if (!num) {
      getAllReservations();
      return;
    }
    const tables = allReservations.filter(
      (reservation) =>
        reservation.tableNumber.toString().startsWith(num) === true
    );
    setAllReservations(tables);
  };

  const filterByStatus = (status) => {
    if (status === "") {
      getAllReservations();
      return;
    }
    const filter = allReservations.filter(
      (reservation) => reservation.status === status
    );
    setAllReservations(filter);
  };

  const filterByPhone = (phone) => {
    if (phone === "") {
      getAllReservations();
      return;
    }
    const filter = allReservations.filter(
      (reservation) => reservation.phone === phone
    );
    setAllReservations(filter);
  };

  // const [selectedIds, setSelectedIds] = useState([]);
  // const handleCheckboxChange = (e) => {
  //   const Id = e.target.value;
  //   const isChecked = e.target.checked;

  //   if (isChecked) {
  //     setSelectedIds([...selectedIds, Id]);
  //   } else {
  //     const updatedSelectedIds = selectedIds.filter((id) => id !== Id);
  //     setSelectedIds(updatedSelectedIds);
  //   }
  // };

  // const deleteSelectedIds = async (e) => {
  //   e.preventDefault();
  //   
  //   try{
  // const config = await handleGetTokenAndConfig();
  //     for (const Id of selectedIds) {
  //       await axios.delete(`${apiUrl}/api/order/${Id}`);
  //     }
  //     getAllTable()
  //     toast.success('Selected orders deleted successfully');
  //     setSelectedIds([]);
  //   } catch (error) {
  //     
  //     toast.error('Failed to delete selected orders');
  //   }
  // };

  const translateStatus = (status) => {
    switch (status) {
      case "awaiting confirmation":
        return "في انتظار التأكيد";
      case "confirmed":
        return "تم التأكيد";
      case "canceled":
        return "تم الإلغاء";
      case "Missed reservation time":
        return "تم التخلف عن الميعاد";
      default:
        return status;
    }
  };

  const statusesEn = [
    "awaiting confirmation",
    "confirmed",
    "canceled",
    "Missed reservation time",
    "client arrived",
  ];

  const statusesAr = [
    "في انتظار التأكيد",
    "تم التأكيد",
    "تم الإلغاء",
    "تم التخلف عن الميعاد",
    "العميل حضر في الميعاد",
  ];


  useEffect(() => {
    if (reservationDate && startTime && endTime) {
      setavailableTableIds(getAvailableTables(reservationDate, startTime, endTime));
    }
  }, [reservationDate, startTime, endTime]);


  return (
    <div className="w-100 px-3 d-flex align-itmes-center justify-content-start">
      <div className="table-responsive">
        <div className="table-wrapper p-3 mw-100">
          <div className="table-title">
            <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
              <div className="text-right">
                <h2>
                  ادارة <b>حجز الطاولات</b>
                </h2>
              </div>
              <div className="col-12 col-md-6 p-0 m-0 d-flex flex-wrap aliegn-items-center justify-content-end print-hide">
                <a
                  href="#createreservationModal"
                  className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-success"
                  data-toggle="modal"
                >
                  <span>انشاء حجز جديد</span>
                </a>
                <a
                  href="#deleteListTableModal"
                  className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-danger"
                  data-toggle="modal"
                >
                  <span>حذف</span>
                </a>
              </div>
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
                  رقم الطاولة
                </label>
                <input
                  type="text"
                  className="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => searchBytableNum(e.target.value)}
                />
              </div>

              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  رقم الطاولة
                </label>
                <input
                  type="text"
                  className="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => filterByPhone(e.target.value)}
                />
              </div>

              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  حسب الحاله
                </label>
                <select
                  className="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => filterByStatus(e.target.value)}
                >
                  <option value={""}>الكل</option>
                  {statusesEn.map((status, i) => {
                    return (
                      <option value={status} key={i}>
                        {statusesAr[i]}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="col-12 text-dark d-flex flex-wrap align-items-center justify-content-start p-0 m-0 mt-3">
                <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    فلتر حسب الوقت
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    onChange={(e) =>
                      setAllReservations(
                        filterByTime(e.target.value, allReservations)
                      )
                    }
                  >
                    <option value="">اختر</option>
                    <option value="today">اليوم</option>
                    <option value="week">هذا الأسبوع</option>
                    <option value="month">هذا الشهر</option>
                    <option value="year">هذه السنه</option>
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
                      className="btn btn-primary h-100 p-2"
                      onClick={() =>
                        setAllReservations(filterByDateRange(allReservations))
                      }
                    >
                      <i className="fa fa-search"></i>
                    </button>
                    <button
                      type="button"
                      className="btn btn-warning h-100 p-2"
                      onClick={getAllReservations}
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
                <th>م</th>
                <th>رقم الطاولة</th>
                <th>الاسم</th>
                <th>الموبايل</th>
                <th>عدد الضيوف</th>
                <th>التاريخ</th>
                <th>من</th>
                <th>الي</th>
                <th>تاكيد</th>
                <th>اجراءات</th>
              </tr>
            </thead>
            <tbody>
              {allReservations.map((reservation, i) => {
                if ((i >= startPagination) & (i < endPagination)) {
                  return (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{reservation.tableNumber}</td>
                      <td>{reservation.customerName}</td>
                      <td>{reservation.customerPhone}</td>
                      <td>{reservation.numberOfGuests}</td>
                      <td>{formatDate(reservation.reservationDate)}</td>
                      <td>{formatTime(reservation.startTime)}</td>
                      <td>{formatTime(reservation.endTime)}</td>
                      <td>
                        <select
                          className="form-select border-primary m-0 p-2 h-auto"
                          name="status"
                          id="status"
                          onChange={(e) =>
                            confirmReservation(reservation._id, e.target.value)
                          }
                        >
                          <option>{translateStatus(reservation.status)}</option>
                          {statusesEn.map((status, i) => (
                            <option value={status} key={i}>
                              {statusesAr[i]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <button
                          data-target="#updatereservationModal"
                          className="btn btn-sm btn-primary ml-2 "
                          data-toggle="modal"
                          onClick={(e) => {
                            setCustomerName(reservation.customerName);
                            setReservationId(reservation._id);
                            setCustomerName(reservation.customerName);
                            setCustomerPhone(reservation.customerPhone);
                            setNumberOfGuests(reservation.numberOfGuests);
                            setEndTime(reservation.endTime);
                            setStartTime(reservation.startTime);
                            setReservationDate(reservation.reservationDate);
                            setReservationNote(reservation.reservationNotes);
                            settableId(reservation.tableId);
                            settableNumber(reservation.tableNumber);
                          }}
                        >
                          <i
                            className="material-icons"
                            data-toggle="tooltip"
                            title="Edit"
                          >
                            &#xE254;
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
                {allReservations.length > endPagination
                  ? endPagination
                  : allReservations.length}
              </b>{" "}
              من <b>{allReservations.length}</b> عنصر
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

      <div id="createreservationModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form
              onSubmit={(e) =>
                createReservations(
                  e,
                  tableId,
                  tableNumber,
                  userId,
                  numberOfGuests,
                  customerName,
                  customerPhone,
                  reservationDate,
                  startTime,
                  endTime,
                  reservationNote,
                  createdBy
                )
              }
            >
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">اضافه حجز طاولة</h4>
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
                <div className="container flex-column">
                  <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
                    <div className="col-12 col-md-8 mb-1">
                      <label
                        htmlFor="name"
                        className="form-label text-wrap text-right fw-bolder p-0 m-0"
                      >
                        الاسم
                      </label>
                      <input
                        type="text"
                        required
                        className="form-control border-primary m-0 p-2 h-auto"
                        id="name"
                        onChange={(e) => clientByName(allusers, e.target.value)}
                      />
                      <ul>
                        {filteredClients &&
                          filteredClients.map((client, index) => (
                            <li key={index}>{client.username}</li>
                          ))}
                      </ul>
                    </div>
                    <div className="col-12 col-md-4 mb-1">
                      <label
                        htmlFor="mobile"
                        className="form-label text-wrap text-right fw-bolder p-0 m-0"
                      >
                        رقم الموبايل
                      </label>
                      <input
                        type="tel"
                        className="form-control border-primary m-0 p-2 h-auto"
                        id="mobile"
                        requierd
                        onChange={(e) => setCustomerPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
                    <div className="col-12 col-md-4 mb-1">
                      <label
                        htmlFor="date"
                        className="form-label text-wrap text-right fw-bolder p-0 m-0"
                      >
                        التاريخ
                      </label>
                      <input
                        type="date"
                        className="form-control border-primary m-0 p-2 h-auto"
                        id="date"
                        required
                        onChange={(e) => {
                          const selectedDate = new Date(e.target.value);
                          setReservationDate(selectedDate);
                        }}
                      />
                    </div>
                    <div className="col-12 col-md-4 mb-1">
                      <label
                        htmlFor="arrivalTime"
                        className="form-label text-wrap text-right fw-bolder p-0 m-0"
                      >
                        وقت الحضور
                      </label>
                      <input
                        type="time"
                        className="form-control border-primary m-0 p-2 h-auto"
                        id="arrivalTime"
                        required
                        onChange={(e) => {
                          setStartTimeClicked(true);
                          if (reservationDate) {
                            const StartedDate = new Date(reservationDate);
                            const timeParts = e.target.value.split(":");
                            
                            if (StartedDate) {
                              StartedDate.setHours(parseInt(timeParts[0]));
                              StartedDate.setMinutes(parseInt(timeParts[1]));
                              
                              setStartTime(StartedDate);
                            }
                          } else {
                            e.target.value = "";
                          }
                        }}
                      />
                      {startTimeClicked && !reservationDate && (
                        <div
                          style={{
                            color: "red",
                            fontSize: "18px",
                            marginTop: "0.5rem",
                          }}
                        >
                          يرجى تحديد التاريخ أولاً
                        </div>
                      )}
                    </div>
                    <div className="col-12 col-md-4 mb-1">
                      <label
                        htmlFor="departureTime"
                        className="form-label text-wrap text-right fw-bolder p-0 m-0"
                      >
                        وقت الانصراف
                      </label>
                      <input
                        type="time"
                        className="form-control border-primary m-0 p-2 h-auto"
                        id="departureTime"
                        required
                        onChange={(e) => {
                          setEndTimeClicked(true);
                          if (reservationDate) {
                            const EndedDate = new Date(reservationDate);
                            const timeParts = e.target.value.split(":");
                            
                            if (EndedDate) {
                              EndedDate.setHours(parseInt(timeParts[0]));
                              EndedDate.setMinutes(parseInt(timeParts[1]));
                              
                              setEndTime(EndedDate);
                            }
                          } else {
                            e.target.value = "";
                          }
                        }}
                      />
                      {startTimeClicked && !reservationDate && (
                        <div
                          style={{
                            color: "red",
                            fontSize: "18px",
                            marginTop: "0.5rem",
                          }}
                        >
                           يرجى تحديد التاريخ و وقت الحضور أولاً
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
                    <div className="col-12 col-md-7">
                      <label
                        htmlFor="tableNumber"
                        className="form-label text-wrap text-right fw-bolder p-0 m-0"
                      >
                        رقم الطاولة
                      </label>
                      <select
                        className="form-control border-primary m-0 p-2 h-auto"
                        id="tableNumber"
                        onChange={(e) => {
                          settableId(e.target.value);
                          settableNumber(
                            e.target.options[e.target.selectedIndex].text
                          );
                        }}
                      >
                        <option>الطاولات المتاحة في هذا الوقت</option>
                        {availableTableIds&&allTable.map(
                          (table, i) =>
                            availableTableIds.includes(table._id) && (
                              <option key={i} value={table._id}>
                                {table.tableNumber}
                              </option>
                            )
                        )}
                      </select>
                    </div>
                    <div className="col-12 col-md-5">
                      <label
                        htmlFor="numberOfGuests"
                        className="form-label text-wrap text-right fw-bolder p-0 m-0"
                      >
                        عدد الضيوف
                      </label>
                      <input
                        type="number"
                        className="form-control border-primary m-0 p-2 h-auto"
                        id="numberOfGuests"
                        required
                        onChange={(e) => setNumberOfGuests(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-12 mb-1">
                    <label
                      htmlFor="notes"
                      className="form-label text-wrap text-right fw-bolder p-0 m-0"
                    >
                      ملاحظات
                    </label>
                    <textarea
                      className="form-control border-primary m-0 p-2 h-auto"
                      id="notes"
                      rows="2"
                      onChange={(e) => setReservationNote(e.target.value)}
                    ></textarea>
                  </div>
                </div>
              </div>
              <div className="modal-footer d-flex flex-nowrap align-items-center justify-content-between m-0 p-1">
                <input
                  type="submit"
                  className="btn btn-success col-6 h-100 px-2 py-3 m-0"
                  value="اضافه"
                />
                <input
                  type="button"
                  className="btn btn-danger col-6 h-100 px-2 py-3 m-0"
                  data-dismiss="modal"
                  value="إغلاق"
                />
              </div>
            </form>
          </div>
        </div>
      </div>

      <div id="updatereservationModal" className="modal fade">
        <div className="modal-dialog ">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form onSubmit={(e) => updateReservation(e)}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">اضافه حجز طاولة</h4>
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
                <div className="container flex-column">
                  <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
                    <div className="col-12 col-md-7 mb-1">
                      <label
                        htmlFor="name"
                        className="form-label text-wrap text-right fw-bolder p-0 m-0"
                      >
                        الاسم
                      </label>
                      <input
                        type="text"
                        className="form-control border-primary m-0 p-2 h-auto"
                        id="name"
                        defaultValue={customerName}
                        onChange={(e) => clientByName(allusers, e.target.value)}
                      />
                      <ul>
                        {filteredClients &&
                          filteredClients.map((client, index) => (
                            <li key={index}>{client.username}</li>
                          ))}
                      </ul>
                    </div>
                    <div className="col-12 col-md-5 mb-1">
                      <label
                        htmlFor="mobile"
                        className="form-label text-wrap text-right fw-bolder p-0 m-0"
                      >
                        رقم الموبايل
                      </label>
                      <input
                        type="tel"
                        className="form-control border-primary m-0 p-2 h-auto"
                        id="mobile"
                        defaultValue={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
                    <div className="col-12 col-md-4 mb-1">
                      <label
                        htmlFor="date"
                        className="form-label text-wrap text-right fw-bolder p-0 m-0"
                      >
                        التاريخ
                      </label>
                      <input
                        type="date"
                        className="form-control border-primary m-0 p-2 h-auto"
                        id="date"
                        defaultValue={
                          reservationDate
                            ? new Date(reservationDate)
                                .toISOString()
                                .split("T")[0]
                            : ""
                        }
                        onChange={(e) => {
                          const selectedDate = new Date(e.target.value);
                          setReservationDate(selectedDate);
                        }}
                      />
                    </div>
                    <div className="col-12 col-md-4 mb-1">
                      <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                        وقت الحضور
                      </label>
                      <input
                        type="time"
                        className="form-control border-primary m-0 p-2 h-auto"
                        required
                        defaultValue={
                          startTime
                            ? new Date(startTime)
                                .toISOString()
                                .split("T")[1]
                                .slice(0, 5)
                            : ""
                        }
                        onChange={(e) => {
                          setStartTimeClicked(true);
                          if (reservationDate) {
                            const StartedDate = new Date(reservationDate);
                            const timeParts = e.target.value.split(":");
                            
                            if (StartedDate) {
                              StartedDate.setHours(parseInt(timeParts[0]));
                              StartedDate.setMinutes(parseInt(timeParts[1]));
                              
                              setStartTime(StartedDate);
                            }
                          } else {
                            e.target.value = "";
                          }
                        }}
                      />
                      {startTimeClicked && !reservationDate && (
                        <div
                          style={{
                            color: "red",
                            fontSize: "18px",
                            marginTop: "0.5rem",
                          }}
                        >
                          يرجى تحديد التاريخ أولاً
                        </div>
                      )}
                    </div>
                    <div className="col-12 col-md-4 mb-1">
                      <label
                        htmlFor="departureTime"
                        className="form-label text-wrap text-right fw-bolder p-0 m-0"
                      >
                        وقت الانصراف
                      </label>
                      <input
                        type="time"
                        className="form-control border-primary m-0 p-2 h-auto"
                        id="departureTime"
                        required
                        defaultValue={
                          endTime
                            ? new Date(endTime)
                                .toISOString()
                                .split("T")[1]
                                .slice(0, 5)
                            : ""
                        }
                        onChange={(e) => {
                          setEndTimeClicked(true);
                          if (reservationDate) {
                            const EndedDate = new Date(reservationDate);
                            const timeParts = e.target.value.split(":");
                            
                            if (EndedDate) {
                              EndedDate.setHours(parseInt(timeParts[0]));
                              EndedDate.setMinutes(parseInt(timeParts[1]));
                              
                              setEndTime(EndedDate);
                              getAvailableTables(
                                reservationDate,
                                startTime,
                                EndedDate
                              );
                            }
                          } else {
                            e.target.value = "";
                          }
                        }}
                      />
                      {endTimeClicked && !reservationDate && (
                        <div
                          style={{
                            color: "red",
                            fontSize: "18px",
                            marginTop: "0.5rem",
                          }}
                        >
                          يرجى تحديد التاريخ أولاً
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
                    <div className="col-12 col-md-7">
                      <label
                        htmlFor="tableNumber"
                        className="form-label text-wrap text-right fw-bolder p-0 m-0"
                      >
                        رقم الطاولة
                      </label>
                      <select
                        className="form-control border-primary m-0 p-2 h-auto"
                        id="tableNumber"
                        defaultValue={tableNumber}
                        onChange={(e) => {
                          settableId(e.target.value);
                          settableNumber(
                            e.target.options[e.target.selectedIndex].text
                          );
                        }}
                      >
                        <option>{tableNumber}</option>
                        <option>الطاولات المتاحة في هذا الوقت</option>
                        {allTable.map(
                          (table, i) =>
                            availableTableIds.includes(table._id) && (
                              <option key={i} value={table._id}>
                                {table.tableNumber}
                              </option>
                            )
                        )}
                      </select>
                    </div>
                    <div className="col-12 col-md-5">
                      <label
                        htmlFor="numberOfGuests"
                        className="form-label text-wrap text-right fw-bolder p-0 m-0"
                      >
                        عدد الضيوف
                      </label>
                      <input
                        type="number"
                        className="form-control border-primary m-0 p-2 h-auto"
                        id="numberOfGuests"
                        defaultValue={numberOfGuests}
                        onChange={(e) => setNumberOfGuests(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="col-12 mb-1">
                    <label
                      htmlFor="notes"
                      className="form-label text-wrap text-right fw-bolder p-0 m-0"
                    >
                      ملاحظات
                    </label>
                    <textarea
                      className="form-control border-primary m-0 p-2 h-auto"
                      id="notes"
                      rows="2"
                      defaultValue={reservationNote}
                      onChange={(e) => setReservationNote(e.target.value)}
                    ></textarea>
                  </div>
                </div>
              </div>
              <div className="modal-footer d-flex flex-nowrap align-items-center justify-content-between m-0 p-1">
                <input
                  type="submit"
                  className="btn btn-success col-6 h-100 px-2 py-3 m-0"
                  value="تعديل"
                />
                <input
                  type="button"
                  className="btn btn-danger col-6 h-100 px-2 py-3 m-0"
                  data-dismiss="modal"
                  value="إغلاق"
                />
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReservationTables;
