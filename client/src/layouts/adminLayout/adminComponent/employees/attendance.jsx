import React, { useState, useEffect, useRef, useContext } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "../orders/Orders.css";
import { AppContext } from "../../../../context/appContext";

const AttendanceManagement = () => {
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
    handleGetTokenAndConfig,
    apiUrl,
  } = useContext(AppContext);

  const permissionsForAttendance = permissionsList?.filter(
    (permission) => permission.resource === "Attendance"
  )[0];

  const permissionsForEmployee = permissionsList?.filter(
    (permission) => permission.resource === "Employees"
  )[0];

  const listOfStatus = ["Attendance", "Absence", "Vacation"];
  const listOfStatusAR = ["حضور", "غياب", "اجازة"];

  const [recordId, setRecordId] = useState("");
  const [employee, setEmployee] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [shift, setShift] = useState({});
  const [arrivalDate, setArrivalDate] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [status, setStatus] = useState("");
  const [isOvertime, setIsOvertime] = useState(false);
  const [overtimeMinutes, setOvertimeMinutes] = useState(0);
  const [isLate, setIsLate] = useState(false);
  const [lateMinutes, setLateMinutes] = useState(0);
  const [notes, setNotes] = useState("");

  const recordArrival = async (e) => {
    e.preventDefault();
    if (permissionsForattendance-recordreate === false) {
      toast.info("ليس لك صلاحية لانشاء سجل");
      return;
    }
    if (!employee || !shift || !currentDate || !status) {
      toast.error("يرجى ملء جميع الحقول المطلوبة.");
      return;
    }
    try {
      const config = await handleGetTokenAndConfig();
      let newattendanceData = {
        employee,
        shift: shift._id,
        currentDate,
        status,
        notes,
      };

      if (status === "Attendance") {
        if (!arrivalDate) {
          toast.error("يرجى تحديد وقت الحضور .");
          return;
        }
        newattendanceData.arrivalDate = arrivalDate;
        newattendanceData.isLate = isLate;
        newattendanceData.lateMinutes = lateMinutes;
      }

      const createRecord = await axios.post(
        `${apiUrl}/api/attendance`,
        newattendanceData,
        config
      );

      if (createRecord.status === 201) {
        if (status === "Attendance") {
          const activeemployee = await axios.put(
            `${apiUrl}/api/employee/${employee}`,
            { isActive: true },
            config
          );
        }

        getallAttendanceRecords();
        toast.success("تم انشاء السجل بنجاح:");
      } else {
        toast.error("فشل عمليه انشاء السجل! حاول مره أخرى.");
      }
    } catch (error) {
      toast.error("حدث خطأ أثناء انشاء السجل! حاول مره أخرى:");
      console.error("Error recording arrival:", error);
    }
  };

  const recordDeparture = async (e) => {
    e.preventDefault();

    if (permissionsForAttendance.update === false) {
      toast.info("ليس لك صلاحية لتسجيل انصراف");
      return;
    }
    try {
      const config = await handleGetTokenAndConfig();
      let newattendanceData = {
        departureDate,
        isOvertime,
        overtimeMinutes,
        notes,
      };

      const response = await axios.put(
        `${apiUrl}/api/attendance/${recordId}`,
        newattendanceData,
        config
      );
      if (response.status === 200) {
        const update = await axios.put(
          `${apiUrl}/api/employee/${employee}`,
          { isActive: false },
          config
        );
        getallAttendanceRecords();
        // attendance created successfully
        toast.success("تم انشاء السجل بنجاح:");
        // Add any further logic here, such as updating UI or state
      } else {
        toast.error("فشل عمليه انشاء السجل!حاول مره اخري");
      }
    } catch (error) {
      toast.error("حدث خطأ اثناء انشاء السجل !حاول مره اخري:");
      // Handle error, display message, etc.
    }
  };

  const [allAttendanceRecords, setAllAttendanceRecords] = useState([]);
  const getallAttendanceRecords = async () => {
    if (permissionsForAttendance && permissionsForAttendance.read === false) {
      toast.info("ليس لك صلاحية لعرض السجلات");
      return;
    }
    try {
      const config = await handleGetTokenAndConfig();
      const response = await axios.get(`${apiUrl}/api/attendance`, config);

      if (response.status === 200) {
        setAllAttendanceRecords(response.data);
      }
    } catch (error) {
      toast.error(
        "حدث خطاء اثناء جلب سجل الحضور و الانصراف ! اعد تحميل الصفحة"
      );
    }
  };

  const [recordToUpdate, setrecordToUpdate] = useState({});
  const handleEditRecord = (record) => {
    if (permissionsForAttendance.update === false) {
      toast.info("ليس لك صلاحية لتعديل السجلات");
      return;
    }
    if (record) {
      setrecordToUpdate(record);
      setRecordId(record._id);
      setEmployee(record.employee._id);
      setEmployeeName(record.employee.username);
      setCurrentDate(record.currentDate);
      setArrivalDate(record.arrivalDate);
      setDepartureDate(record.departureDate);
      setShift(record.shift);
      setOvertimeMinutes(record.overtimeMinutes);
      setLateMinutes(record.lateMinutes);
      setNotes(record.notes);
    }
  };

  const editAttendanceRecord = async (e) => {
    if (permissionsForAttendance.update === false) {
      toast.info("ليس لك صلاحية لتعديل السجلات");
      return;
    }
    e.preventDefault();
    let editattendanceData = {
      employee,
      shift: shift._id,
      arrivalDate,
      departureDate,
      currentDate,
      status,
      isOvertime,
      overtimeMinutes,
      isLate,
      lateMinutes,
      notes,
    };

    try {
      const config = await handleGetTokenAndConfig();
      const response = await axios.put(
        `${apiUrl}/api/attendance/${recordId}`,
        editattendanceData,
        config
      );

      if (response.status === 200) {
        getallAttendanceRecords();
        // attendance created successfully
        toast.success("تم تعديل السجل بنجاح:");
        // Add any further logic here, such as updating UI or state
      } else {
        toast.error("فشل عمليه تعديل السجل!حاول مره اخري");
      }
    } catch (error) {
      toast.error("حدث خطأ اثناء تعديل السجل !حاول مره اخري:");
      // Handle error, display message, etc.
    }
  };

  const deleteRecord = async (e) => {
    if (permissionsForAttendance.delete === false) {
      toast.info("ليس لك صلاحية لحذف السجلات");
      return;
    }
    e.preventDefault();
    try {
      const config = await handleGetTokenAndConfig();
      const response = await axios.delete(
        `${apiUrl}/api/attendance/${recordId}`,
        config
      );
      if (response.status === 200) {
        getallAttendanceRecords();
        toast.success("تم حذف السجل بنجاح");
      } else {
        toast.error("فشل حذف السجل ! حاول مره اخري");
      }
    } catch (error) {
      toast.error("حدث خطأ اثناء حذف السجل");
    }
  };

  const [listOfEmployees, setListOfEmployees] = useState([]);

  const getEmployees = async () => {
    if (permissionsForEmployee && permissionsForEmployee.read === false) {
      toast.error("ليس لك صلاحية لعرض الموظفين ");
      return;
    }
    try {
      const config = await handleGetTokenAndConfig();
      const response = await axios.get(`${apiUrl}/api/employee`, config);
      const data = response.data;
      setListOfEmployees(data);
      //
    } catch (error) {}
  };

  const [shifts, setshifts] = useState([]);

  const getShifts = async () => {
    try {
      const config = await handleGetTokenAndConfig();
      const response = await axios.get(`${apiUrl}/api/shift`, config);
      if (response.status === 200 && response.data) {
        const { data } = response;
        setshifts(data);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Failed to fetch shifts:", error);
    }
  };

  const handleSelectEmployee = (e) => {
    const employeeid = e.target.value;
    //
    const employee = listOfEmployees.filter(
      (employee) => employee._id === employeeid
    )[0];
    //
    if (employee) {
      setEmployee(employeeid);
      if (employee && employee.shift) {
        setShift(employee.shift);
      } else {
        toast.warn("لم يتم تحديد له شيفت ! حدد للموظف شيف اولا");
      }
    } else {
      setEmployee("");
      setShift({});
    }
  };

  const handleArrivealDate = (e) => {
    const arrivalDateTime = new Date(e.target.value);

    setArrivalDate(arrivalDateTime);
    const arrivalTimeInMinutes =
      arrivalDateTime.getHours() * 60 + arrivalDateTime.getMinutes();

    const shiftStartTime = new Date();

    const shiftStartTimeArray = shift.startTime.split(":");

    shiftStartTime.setHours(shiftStartTimeArray[0]);
    shiftStartTime.setMinutes(shiftStartTimeArray[1]);

    const shiftStartTimeInMinutes =
      new Date(shiftStartTime).getHours() * 60 +
      new Date(shiftStartTime).getMinutes();

    // تحويل فرق الساعات إلى دقائق وجمعها مع فرق الدقائق
    const calculateLateMinutes = arrivalTimeInMinutes - shiftStartTimeInMinutes;

    setLateMinutes(calculateLateMinutes);
    if (calculateLateMinutes !== 0) {
      setIsLate(true);
    }
  };

  const handleDepartureDate = (e) => {
    const departureDateTime = new Date(e.target.value);
    setDepartureDate(departureDateTime);

    const departureTime =
      departureDateTime.getHours() * 60 + departureDateTime.getMinutes();

    const shiftEndTime = new Date();

    const shiftEndTimeArray = shift.endTime.split(":");

    shiftEndTime.setHours(shiftEndTimeArray[0]);
    shiftEndTime.setMinutes(shiftEndTimeArray[1]);

    const shiftEndTimeInMinutes =
      new Date(shiftEndTime).getHours() * 60 +
      new Date(shiftEndTime).getMinutes();

    const calculateExtraMinutes = departureTime - shiftEndTimeInMinutes;
    setOvertimeMinutes(calculateExtraMinutes);
    if (calculateExtraMinutes !== 0) {
      setIsOvertime(true);
    }
  };

  const searchByStatus = (status) => {
    if (status) {
      const filter = allAttendanceRecords.filter(
        (record) => record.status === status
      );
      if (filter.length > 0) {
        setAllAttendanceRecords(filter);
      } else {
        setAllAttendanceRecords([]);
      }
    } else {
      getallAttendanceRecords();
    }
  };

  const getEmployeesByJob = (role) => {
    if (role === "all") {
      getallAttendanceRecords();
      return;
    }
    if (allAttendanceRecords.length > 0) {
      const filteredRecords = allAttendanceRecords.filter(
        (record) => record.employee.role === role
      );
      if (filteredRecords) {
        setAllAttendanceRecords(filteredRecords);
      } else {
        getallAttendanceRecords([]);
      }
    }
  };

  const getRecordsByShift = (shift) => {
    if (shift === "all") {
      getallAttendanceRecords();
      return;
    }
    if (allAttendanceRecords.length > 0 && shift) {
      const FilterEmployees = allAttendanceRecords.filter(
        (record) => record.shift._id === shift
      );
      if (FilterEmployees) {
        setAllAttendanceRecords(FilterEmployees);
      } else {
        getallAttendanceRecords([]);
      }
    }
  };

  const getEmployeesByName = (name) => {
    if (allAttendanceRecords.length > 0 && name) {
      const employee = allAttendanceRecords.filter(
        (record) =>
          (record.employee &&
            record.employee.fullname.startsWith(name) === true) ||
          record.employee.username.startsWith(name) === true
      );
      if (employee) {
        setAllAttendanceRecords(employee);
      } else {
        setAllAttendanceRecords([]);
      }
    } else {
      getallAttendanceRecords();
    }
  };

  useEffect(() => {
    getEmployees();
    getShifts();
    getallAttendanceRecords();
  }, []);

  return (
    <div className="w-100 px-3 d-flex align-itmes-center justify-content-start">
      <div className="table-responsive">
        <div className="table-wrapper p-3 mw-100">
          <div className="table-title">
            <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
              <div className="text-right">
                <h2>
                  ادارة <b>تسجيل الحضور و الانصراف و الاجازات و الغياب</b>
                </h2>
              </div>
              <div className="col-12 col-md-6 p-0 m-0 d-flex flex-wrap aliegn-items-center justify-content-end print-hide">
                <a
                  href="#arrivalModal"
                  className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-success"
                  data-toggle="modal"
                >
                  <span>اضافه تسجيل</span>
                </a>
                {/* <a href="#deleteRecordModal" className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-danger" data-toggle="modal"> <span>حذف</span></a> */}
              </div>
            </div>
          </div>
          <div className="table-filter w-100">
            <div className="w-100 d-flex flex-row flex-wrap align-items-center justify-content-start text-dark">
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
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={15}>15</option>
                  <option value={20}>20</option>
                  <option value={25}>25</option>
                  <option value={30}>30</option>
                </select>
              </div>
              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  نوع السجل
                </label>
                <select
                  className="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => searchByStatus(e.target.value)}
                >
                  <option value="">الكل</option>
                  {listOfStatus.map((statu, i) => (
                    <option key={i} value={statu}>
                      {listOfStatusAR[i]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  الاسم
                </label>
                <input
                  type="text"
                  className="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => getEmployeesByName(e.target.value)}
                />
              </div>
              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  الوظيفة
                </label>
                <select
                  className="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => getEmployeesByJob(e.target.value)}
                >
                  <option value="all">الكل</option>
                  <option value="manager">مدير</option>
                  <option value="cashier">كاشير</option>
                  <option value="waiter">ويتر</option>
                  <option value="Chef">شيف</option>
                </select>
              </div>
              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  الشيفت
                </label>
                <select
                  className="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => getRecordsByShift(e.target.value)}
                >
                  <option value="all">الكل</option>
                  {shifts ? (
                    shifts.map((shift, i) => (
                      <option value={shift._id} key={i}>
                        {shift.shiftType}
                      </option>
                    ))
                  ) : (
                    <option>لم يتم انشاء شفتات</option>
                  )}
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
                      setAllAttendanceRecords(
                        filterByTime(e.target.value, allAttendanceRecords)
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
                        setAllAttendanceRecords(
                          filterByDateRange(allAttendanceRecords)
                        )
                      }
                    >
                      <i className="fa fa-search"></i>
                    </button>
                    <button
                      type="button"
                      className="btn btn-warning h-100 p-2"
                      onClick={getallAttendanceRecords}
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
                <th>اليوم</th>
                <th>الاسم</th>
                <th>الشيفت</th>
                <th>الحالة</th>
                <th>اليوم</th>
                <th>وقت الحضور</th>
                <th>اليوم</th>
                <th>وقت الانصراف</th>
                <th>تاخير</th>
                <th>اضافي</th>
                <th>تسجيل</th>
                <th>تعديل</th>
                <th>ملاحظات</th>
                <th>انصراف</th>
                <th>اجراءات</th>
              </tr>
            </thead>
            <tbody>
              {allAttendanceRecords &&
                allAttendanceRecords.map((Record, i) => {
                  if ((i >= startPagination) & (i < endPagination)) {
                    return (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td className="text-nowrap text-truncate">
                          {Record.currentDate &&
                            formatDateTime(Record.currentDate)}
                        </td>
                        <td className="text-nowrap text-truncate">
                          {Record.employee && Record.employee.fullname}
                        </td>
                        <td className="text-nowrap text-truncate">
                          {Record.shift && Record.shift.shiftType}
                        </td>
                        <td className="text-nowrap text-truncate">
                          {Record.status && Record.status === "Attendance"
                            ? "حضور"
                            : Record.status === "Absence"
                            ? "غياب"
                            : Record.status === "Vacation"
                            ? "اجازة"
                            : ""}
                        </td>
                        <td className="text-nowrap text-truncate">
                          {Record.arrivalDate
                            ? formatDate(Record.arrivalDate)
                            : "-"}
                        </td>
                        <td className="text-nowrap text-truncate">
                          {Record.arrivalDate
                            ? formatTime(Record.arrivalDate)
                            : "-"}
                        </td>
                        <td className="text-nowrap text-truncate">
                          {Record.departureDate
                            ? formatDate(Record.departureDate)
                            : "-"}
                        </td>
                        <td className="text-nowrap text-truncate">
                          {Record.departureDate
                            ? formatTime(Record.departureDate)
                            : "-"}
                        </td>
                        <td className="text-nowrap text-truncate">
                          {Record.lateMinutes ? Record.lateMinutes : 0}
                        </td>
                        <td className="text-nowrap text-truncate">
                          {Record.overtimeMinutes ? Record.overtimeMinutes : 0}
                        </td>
                        <td className="text-nowrap text-truncate">
                          {Record.createdBy && Record.createdBy.username}
                        </td>
                        <td className="text-nowrap text-truncate">
                          {Record.updatedBy && Record.updatedBy.username}
                        </td>
                        <td className="text-nowrap text-truncate">
                          {Record.notes}
                        </td>
                        <td>
                          {Record.arrivalDate && !Record.departureDate ? (
                            <button
                              data-target="#departureModal"
                              className="edit h-100 btn btn-info"
                              data-toggle="modal"
                              onClick={() => handleEditRecord(Record)}
                            >
                              انصراف
                            </button>
                          ) : (
                            ""
                          )}
                        </td>
                        <td className="d-flex flex-nowrap">
                          <button
                            data-target="#editRecordModal"
                            className="btn btn-sm btn-primary ml-2 "
                            data-toggle="modal"
                            onClick={() => handleEditRecord(Record)}
                          >
                            <i
                              className="material-icons"
                              data-toggle="tooltip"
                              title="Edit"
                            >
                              &#xE254;
                            </i>
                          </button>

                          <button
                            data-target="#deleteRecordModal"
                            className="btn btn-sm btn-danger"
                            data-toggle="modal"
                            onClick={() => setRecordId(Record._id)}
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
                {allAttendanceRecords.length > endPagination
                  ? endPagination
                  : allAttendanceRecords.length}
              </b>{" "}
              من <b>{allAttendanceRecords.length}</b> عنصر
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

      <div id="arrivalModal" className="modal fade" tabIndex="-1">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form onSubmit={recordArrival}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">تسجيل سجل حضور الموظف</h4>
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
                <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
                  <div className="form-group col-12 col-md-6">
                    <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                      تاريخ الحالي
                    </label>
                    <input
                      type="text"
                      className="form-control border-primary m-0 p-2 h-auto"
                      readOnly
                      name="currentDate"
                      defaultValue={formatDate(currentDate)}
                    />
                  </div>
                  <div className="form-group col-12 col-md-6">
                    <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                      الاسم
                    </label>
                    <select
                      className="form-control border-primary m-0 p-2 h-auto"
                      required
                      name="employee"
                      onChange={handleSelectEmployee}
                    >
                      <option>اختر الموظف</option>
                      {listOfEmployees.map((employee, index) => (
                        <option key={index} value={employee._id}>
                          {employee.fullname}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group col-12 col-md-6">
                    <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                      الشيفت
                    </label>
                    <input
                      type="text"
                      className="form-control border-primary m-0 p-2 h-auto"
                      readOnly
                      name="shift"
                      value={shift?.shiftType || ""}
                    />
                  </div>
                  <div className="form-group col-12 col-md-6">
                    <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                      تاريخ الوصول
                    </label>
                    <input
                      type="datetime-local"
                      className="form-control border-primary m-0 p-2 h-auto"
                      name="arrivalDate"
                      defaultValue={formatDate(new Date())}
                      onChange={handleArrivealDate}
                    />
                  </div>
                  <div className="form-group col-12 col-md-6">
                    <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                      نوع السجل
                    </label>
                    <select
                      className="form-control border-primary m-0 p-2 h-auto"
                      required
                      name="status"
                      defaultValue={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option>اختر</option>
                      {listOfStatus.map((status, i) => (
                        <option key={i} value={status}>
                          {listOfStatusAR[i]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group col-12 col-md-6">
                    <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                      دقائق التأخر
                    </label>
                    <input
                      type="text"
                      className="form-control border-primary m-0 p-2 h-auto"
                      name="lateMinutes"
                      readOnly
                      value={lateMinutes || ""}
                    />
                  </div>
                  <div className="form-group col-12">
                    <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                      ملاحظات
                    </label>
                    <textarea
                      className="form-control border-primary m-0 p-2 h-auto"
                      name="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    ></textarea>
                  </div>
                </div>
              </div>
              <div className="modal-footer w-100 d-flex flex-nowrap">
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

      <div id="departureModal" className="modal fade" tabIndex="-1">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded">
            <form onSubmit={recordDeparture}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">تسجيل انصراف الموظف</h4>
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
                <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
                  <div className="form-group col-12 col-md-6">
                    <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                      الاسم
                    </label>
                    <input
                      type="text"
                      className="form-control border-primary m-0 p-2 h-auto"
                      readOnly
                      name="employee"
                      value={employeeName || ""}
                    />
                  </div>
                  <div className="form-group col-12 col-md-6">
                    <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                      الشيفت
                    </label>
                    <input
                      type="text"
                      className="form-control border-primary m-0 p-2 h-auto"
                      readOnly
                      name="shift"
                      value={shift?.shiftType || ""}
                    />
                  </div>
                  <div className="form-group col-12 col-md-6">
                    <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                      تاريخ الانصراف
                    </label>
                    <input
                      type="datetime-local"
                      className="form-control border-primary m-0 p-2 h-auto"
                      name="departureDate"
                      defaultValue={formatDate(new Date())}
                      onChange={handleDepartureDate}
                    />
                  </div>
                  <div className="form-group col-12 col-md-6">
                    <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                      دقائق التجاوز
                    </label>
                    <input
                      type="text"
                      className="form-control border-primary m-0 p-2 h-auto"
                      name="overtimeMinutes"
                      readOnly
                      value={overtimeMinutes || ""}
                    />
                  </div>
                  <div className="form-group col-12">
                    <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                      ملاحظات
                    </label>
                    <textarea
                      className="form-control border-primary m-0 p-2 h-auto"
                      name="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    ></textarea>
                  </div>
                </div>
              </div>
              <div className="modal-footer w-100 d-flex flex-nowrap">
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

      <div id="editRecordModal" className="modal fade" tabIndex="-1">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded">
            <form onSubmit={editAttendanceRecord}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">تعديل سجل</h4>
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
                <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
                  <div className="form-group col-12 col-md-6">
                    <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                      تاريخ الحالي
                    </label>
                    <input
                      type="text"
                      className="form-control border-primary m-0 p-2 h-auto"
                      readOnly
                      name="currentDate"
                      defaultValue={formatDate(currentDate)}
                    />
                  </div>
                  <div className="form-group col-12 col-md-6">
                    <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                      الاسم
                    </label>
                    <input
                      type="text"
                      className="form-control border-primary m-0 p-2 h-auto"
                      readOnly
                      defaultValue={recordToUpdate?.employee?.fullname || ""}
                    />
                  </div>
                  <div className="form-group col-12 col-md-6">
                    <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                      الشيفت
                    </label>
                    <input
                      type="text"
                      className="form-control border-primary m-0 p-2 h-auto"
                      readOnly
                      name="shift"
                      value={shift?.shiftType || ""}
                    />
                  </div>
                  <div className="form-group col-12 col-md-6">
                    <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                      تاريخ الوصول
                    </label>
                    <input
                      type="datetime-local"
                      className="form-control border-primary m-0 p-2 h-auto"
                      name="arrivalDate"
                      defaultValue={
                        arrivalDate
                          ? new Date(arrivalDate).toISOString().slice(0, 16)
                          : ""
                      }
                      onChange={handleArrivealDate}
                    />
                  </div>
                  <div className="form-group col-12 col-md-6">
                    <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                      تاريخ الانصراف
                    </label>
                    <input
                      type="datetime-local"
                      className="form-control border-primary m-0 p-2 h-auto"
                      name="departureDate"
                      defaultValue={
                        departureDate
                          ? new Date(departureDate).toISOString().slice(0, 16)
                          : ""
                      }
                      onChange={handleDepartureDate}
                    />
                  </div>
                  <div className="form-group col-12 col-md-6">
                    <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                      الحالة
                    </label>
                    <select
                      className="form-control border-primary m-0 p-2 h-auto"
                      required
                      name="status"
                      defaultValue={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option>اختر</option>
                      {listOfStatus.map((status, i) => (
                        <option key={i} value={status}>
                          {listOfStatusAR[i]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group col-12 col-md-6">
                    <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                      دقائق التجاوز
                    </label>
                    <input
                      type="text"
                      className="form-control border-primary m-0 p-2 h-auto"
                      name="overtimeMinutes"
                      readOnly
                      value={overtimeMinutes || ""}
                    />
                  </div>
                  <div className="form-group col-12 col-md-6">
                    <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                      دقائق التأخر
                    </label>
                    <input
                      type="text"
                      className="form-control border-primary m-0 p-2 h-auto"
                      name="lateMinutes"
                      readOnly
                      value={lateMinutes || ""}
                    />
                  </div>
                  <div className="form-group col-12">
                    <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                      ملاحظات
                    </label>
                    <textarea
                      className="form-control border-primary m-0 p-2 h-auto"
                      name="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    ></textarea>
                  </div>
                </div>
              </div>
              <div className="modal-footer w-100 d-flex flex-nowrap">
                <input
                  type="submit"
                  className="btn btn-success col-6 h-100 px-2 py-3 m-0"
                  value="حفظ"
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

      <div id="deleteRecordModal" className="modal fade" tabIndex="-1">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded">
            <form onSubmit={deleteRecord}>
              <div className="modal-header bg-danger text-white">
                <h4 className="modal-title">حذف تصنيف</h4>
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
              <div className="modal-footer w-100 d-flex flex-nowrap">
                <input
                  type="submit"
                  className="btn btn-warning  col-6 h-100 px-2 py-3 m-0"
                  value="حذف"
                />
                <input
                  type="button"
                  className="col-md-6 col-12 h-100 p-0 m-0 btn btn-secondary"
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

export default AttendanceManagement;
