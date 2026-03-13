import React, { useState, useEffect, useRef, useContext } from "react";
import axios from "axios";
import { useReactToPrint } from "react-to-print";
import { AppContext } from "../../../../context/appContext";
import { toast } from "react-toastify";
import "../orders/Orders.css";

const Tables = () => {
  const {
    permissionsList,
    brandInfo,
    setStartDate,
    setEndDate,
    filterByDateRange,
    filterByTime,
    employeeLoginInfo,
    formatDate,
    formatDateTime,
    setIsLoading,
    allTable,
    getAllTable,
    EditPagination,
    startPagination,
    endPagination,
    setStartPagination,
    setEndPagination,
    apiUrl,
    handleGetTokenAndConfig,
  } = useContext(AppContext);

  const tablePermission =
    permissionsList &&
    permissionsList.filter((permission) => permission.resource === "Tables")[0];

  const [qrimage, setQrImage] = useState("");
  const [tableId, settableId] = useState("");
  const [tableCode, setTableCode] = useState("");
  const [notes, setNotes] = useState("");
  const [location, setLocation] = useState("");
  const [listOfTable, setListOfTable] = useState([...allTable]);
  const [tableNumber, setTableNumber] = useState("");
  const [chairs, setChairs] = useState(0);
  const [sectionNumber, setSectionNumber] = useState("");
  const [isValid, setIsValid] = useState();
  const [status, setStatus] = useState("available");
  const [ListOfSections, setListOfSections] = useState([]);
  const [listOfLocations, setListOfLocations] = useState([]);
  useEffect(() => {
    const uniqueLocations = [];
    allTable.forEach((table) => {
      if (!uniqueLocations.includes(table.location)) {
        uniqueLocations.push(table.location);
      }
    });
    setListOfLocations(uniqueLocations);
  }, [allTable]);

  const listOfStatus = [
    "available",
    "reserved",
    "occupied",
    "cleaning",
    "maintenance",
    "out_of_service",
  ];

  const getSections = (allTable) => {
    const uniqueSections = [];
    allTable.forEach((table) => {
      if (!uniqueSections.includes(table.sectionNumber)) {
        uniqueSections.push(table.sectionNumber);
      }
    });
    setListOfSections(uniqueSections);
  };

  // Function to create a new table
  const createTable = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // الحصول على الـ token و config
      const config = await handleGetTokenAndConfig();
      if (!config) {
        toast.error("يرجى تسجيل الدخول مرة أخرى.");
        return;
      }

      // تحقق من صلاحية الإنشاء
      if (tablePermission && !tablePermission.create) {
        toast.warn("ليس لك صلاحية لإنشاء طاولة جديدة.");
        return;
      }

      // توليد كود فريد للطاولة (لـ QR أو معرف داخلي)
      const generateTableCode = () => {
        return [...Array(20)]
          .map(() => Math.random().toString(36).charAt(2))
          .join("");
      };
      const tableCode = generateTableCode();

      // بناء بيانات الطاولة
      const tableData = {
        sectionNumber,
        tableNumber,
        chairs,
        location,
        tableCode,
        isValid,
        status,
        notes,
      };

      // إرسال الطلب للسيرفر
      const response = await axios.post(
        `${apiUrl}/api/table/`,
        tableData,
        config
      );

      if (response.status === 201) {
        toast.success("✅ تم إنشاء الطاولة بنجاح.");
        await getAllTable();
      }
    } catch (error) {
      if (
        error.response &&
        error.response.status === 400 &&
        error.response.data.message
      ) {
        if (error.response.data.message.includes("already exists")) {
          toast.error(
            `رقم الطاولة ${tableNumber} موجود بالفعل في القسم ${sectionNumber}.`
          );
        } else {
          toast.error(error.response.data.message);
        }
      } else {
        console.error("خطأ أثناء إنشاء الطاولة:", error);
        toast.error("حدث خطأ أثناء إنشاء الطاولة. الرجاء المحاولة مرة أخرى.");
      }
    } finally {
      setIsLoading(false);
    }
  };
  // Function to reset all input fields

  const resetAll = () => {
    setTableNumber("");
    setChairs(0);
    setSectionNumber("");
    setLocation("");
    setIsValid();
    setNotes("");
    setStatus("");
    setQrImage("");
    setTableCode("");
  };

  // Function to edit an existing table
  const editTable = async (e) => {
    e.preventDefault();

    // Check if the user is authenticated
    const config = await handleGetTokenAndConfig();
    if (tablePermission && !tablePermission.update) {
      toast.warn("ليس لك صلاحية لتعديل بيانات طاوله ");
      return;
    }
    try {
      // Prepare the data to be sent in the request
      const tableData = {
        tableNumber,
        chairs,
        sectionNumber,
        location,
        isValid,
        status,
        notes,
      };

      // Send the PUT request to update the table
      const response = await axios.put(
        `${apiUrl}/api/table/${tableId}`,
        tableData,
        config
      );

      // Handle successful response
      if (response.status === 200) {
        resetAll();

        // Refresh the table list
        await getAllTable();

        // Show success notification
        toast.success("تم تعديل الطاولة بنجاح.");
      }
    } catch (error) {
      // Handle specific errors based on status codes and messages
      if (error.response && error.response.status === 404) {
        toast.error("الطاولة غير موجودة.");
      } else if (
        error.response &&
        error.response.status === 400 &&
        error.response.data.message
      ) {
        if (error.response.data.message.includes("already exists")) {
          toast.error(
            `رقم الطاولة ${tableNumber} موجود بالفعل في القسم ${sectionNumber}.`
          );
        } else {
          toast.error(error.response.data.message);
        }
      } else {
        // Handle unexpected errors
        console.error("Error updating table:", error);
        toast.error("حدث خطأ أثناء تعديل الطاولة. الرجاء المحاولة مرة أخرى.");
      }
    }
  };

  // Function to create QR code for the table URL
  const createQR = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const config = await handleGetTokenAndConfig();

    try {
      const URL = `https://${window.location.hostname}/${tableCode}`;
      const response = await axios.post(
        apiUrl + "/api/table/qr",
        { URL },
        config
      );
      const qrData = response.data.QRCode;

      setQrImage(qrData);
      toast.success("تم إنشاء رمز QR بنجاح!");
    } catch (error) {
      console.error("حدث خطأ أثناء إنشاء رمز QR:", error);
      toast.error("حدث خطأ أثناء إنشاء رمز QR!");
    } finally {
      setIsLoading(false);
    }
  };

  // Function to create web QR code
  const changeCode = async (e, tableId) => {
    e.preventDefault();
    if (tablePermission && !tablePermission.update) {
      toast.warn("ليس لك صلاحية لتعديل كود الطاولة");
      return;
    }
    setIsLoading(true);
    const config = await handleGetTokenAndConfig();

    const generateTableCode = () => {
      return [...Array(20)]
        .map(() => Math.random().toString(36).charAt(2))
        .join("");
    };

    try {
      const tableCode = generateTableCode();
      const response = await axios.put(
        `${apiUrl}/api/table/${tableId}`,
        { tableCode },
        config
      );
      if (response) {
        toast.success("تم تغير كود الطاوله بنجاح!", {
          position: toast.POSITION.TOP_CENTER,
          autoClose: 3000,
        });
        getAllTable();
      }
    } catch (error) {
      console.error("حدث خطأ أثناء إنشاء كود الطاوله", error);
      toast.error("حدث خطأ أثناء إنشاء كود الطاوله!", {
        position: toast.POSITION.TOP_CENTER,
        autoClose: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createwebQR = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const config = await handleGetTokenAndConfig();
    try {
      const URL = `https://${window.location.hostname}/`;
      const response = await axios.post(
        apiUrl + "/api/table/qr",
        { URL },
        config
      );
      const qrData = response.data.QRCode;

      setQrImage(qrData);
      toast.success("تم إنشاء رمز QR بنجاح!", {
        position: toast.POSITION.TOP_CENTER,
        autoClose: 3000,
      });
    } catch (error) {
      console.error("حدث خطأ أثناء إنشاء رمز QR للويب:", error);
      // عرض رسالة خطأ باستخدام toast
      toast.error("حدث خطأ أثناء إنشاء رمز QR للويب!", {
        position: toast.POSITION.TOP_CENTER,
        autoClose: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to delete a table
  const deleteTable = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const config = await handleGetTokenAndConfig();
    if (tablePermission && !tablePermission.delete) {
      toast.warn("ليس لك صلاحية لحذف طاوله ");
      return;
    }
    try {
      const response = await axios.delete(
        `${apiUrl}/api/table/${tableId}`,
        config
      );

      settableId(null);
      getAllTable();
    } catch (error) {
      console.error("Error deleting table:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const searchByNum = async (num) => {
    await getAllTable();
    if (!num) {
      await getAllTable();
      return;
    }
    const tables = listOfTable.filter(
      (table) => table.tableNumber.toString().startsWith(num) === true
    );
    setListOfTable(tables);
  };

  const searchBySection = async (sectionNumber) => {
    await getAllTable();
    if (!sectionNumber) {
      await getAllTable();
      return;
    }
    const tables = listOfTable.filter(
      (table) => table.sectionNumber === sectionNumber
    );
    setListOfTable(tables);
  };

  const filterByValidity = async (isValid) => {
    await getAllTable();
    if (isValid === undefined) {
      await getAllTable();
      return;
    }
    const filter = listOfTable.filter((table) => table.isValid === isValid);
    setListOfTable(filter);
  };

  const filterByStatus = async (Status) => {
    await getAllTable();
    if (!Status) {
      await getAllTable();
      return;
    }
    const filter = listOfTable.filter((table) => table.status === Status);
    setListOfTable(filter);
  };

  const filterByLocation = async (location) => {
    await getAllTable();
    if (!location) {
      await getAllTable();
      return;
    }
    const filter = listOfTable.filter((table) => table.location === location);
    setListOfTable(filter);
  };

  const printtableqr = useRef();

  const handlePrintTableQr = useReactToPrint({
    content: () => printtableqr.current,
    copyStyles: true,
    removeAfterPrint: true,
  });
  const printWepQr = useRef();

  const handlePrintWepQr = useReactToPrint({
    content: () => printWepQr.current,
    copyStyles: true,
    removeAfterPrint: true,
  });

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
    setIsLoading(true);
    const config = await handleGetTokenAndConfig();
    if (tablePermission && !tablePermission.delete) {
      toast.warn("ليس لك صلاحية لحذف طاوله ");
      return;
    }
    try {
      for (const Id of selectedIds) {
        await axios.delete(`${apiUrl}/api/table/${Id}`, config);
      }
      getAllTable();
      toast.success("Selected orders deleted successfully");
      setSelectedIds([]);
    } catch (error) {
      toast.error("Failed to delete selected orders");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getSections(allTable);
  }, []);

  return (
    <div className="w-100 px-3 d-flex align-items-center justify-content-start">
      <div className="table-responsive">
        <div className="table-wrapper p-3 mw-100">
          <div className="table-title">
            <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
              <div className="col-sm-6 text-right">
                <h2>
                  ادارة <b>الطاولات</b>
                </h2>
              </div>
              <div className="col-12 col-md-8 p-0 m-0 d-flex flex-wrap align-items-center justify-content-end print-hide">
                <a
                  href="#qrwebModal"
                  className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-info"
                  data-toggle="modal"
                >
                  <span
                    className="material-symbols-outlined"
                    data-toggle="tooltip"
                    title="QR"
                  >
                    qr_code_2_add
                  </span>
                  <span>انشاء qr للسايت</span>
                </a>
                <a
                  href="#addTableModal"
                  className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-success"
                  data-toggle="modal"
                >
                  {" "}
                  <span>اضافه طاولة جديدة</span>
                </a>
                <a
                  href="#deleteListTableModal"
                  className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-danger"
                  data-toggle="modal"
                >
                  {" "}
                  <span>حذف</span>
                </a>
              </div>
            </div>
          </div>
          <div className="table-filter print-hide">
            <div className="col-12 text-dark d-flex flex-wrap align-items-center justify-content-between p-0 m-0">
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
                  onChange={(e) => searchByNum(e.target.value)}
                />
              </div>
              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  القسم
                </label>
                <select
                  className="form-control border-primary m-0 p-2 h-auto"
                  name="section"
                  id="section"
                  onChange={(e) => searchBySection(e.target.value)}
                >
                  <option value="">اختر</option>
                  {ListOfSections.map((section, i) => (
                    <option key={i} value={section}>
                      {section}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  المكان
                </label>
                <select
                  className="form-control border-primary m-0 p-2 h-auto"
                  name="valid"
                  id="valid"
                  onChange={(e) => filterByLocation(e.target.value)}
                >
                  <option value="">اختر</option>
                  {listOfLocations.map((location, i) => (
                    <option key={i} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  الحالة
                </label>
                <select
                  className="form-control border-primary m-0 p-2 h-auto"
                  name="Status"
                  id="Status"
                  onChange={(e) => filterByStatus(e.target.value)}
                >
                  <option value="">اختر</option>
                  {listOfStatus.map((status, i) => (
                    <option key={i} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  متاح
                </label>
                <select
                  className="form-control border-primary m-0 p-2 h-auto"
                  name="Status"
                  id="Status"
                  onChange={(e) => filterByValidity(e.target.value)}
                >
                  <option value="">اختر</option>
                  <option value={true}>متاح</option>
                  <option value={false}>غير متاح</option>
                </select>
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
                <th>رقم الطاولة</th>
                <th>عدد المقاعد</th>
                <th>السكشن</th>
                <th>المكان</th>
                <th>الحاله</th>
                <th>متاح</th>
                <th>تغير الكود</th>
                <th>الكود</th>
                <th>QR</th>
                <th>تاريخ الانشاء</th>
                <th>اخر تعديل</th>
                <th>اجراءات</th>
              </tr>
            </thead>
            <tbody>
              {listOfTable &&
                listOfTable.map((table, i) => {
                  if ((i >= startPagination) & (i < endPagination)) {
                    return (
                      <tr key={i}>
                        <td>
                          <span className="custom-checkbox">
                            <input
                              type="checkbox"
                              id={`checkbox${i}`}
                              name="options[]"
                              value={table._id}
                              onChange={handleCheckboxChange}
                            />
                            <label htmlFor={`checkbox${i}`}></label>
                          </span>
                        </td>
                        <td>{i + 1}</td>
                        <td>{table.tableNumber}</td>
                        <td>{table.chairs}</td>
                        <td>{table.sectionNumber}</td>
                        <td>{table.location}</td>
                        <td>{table.status}</td>
                        <td>{table.isValid ? "متاح" : "غير متاح"}</td>
                        <td>
                          <button
                            className="btn btn-success"
                            onClick={(e) => changeCode(e, table._id)}
                          >
                            تغير الكود
                          </button>
                        </td>
                        <td>{table.tableCode}</td>
                        <td>
                          <button
                            data-target="#qrTableModal"
                            className="btn btn-sm btn-primary ml-2 "
                            data-toggle="modal"
                            onClick={() => {
                              settableId(table._id);
                              setTableNumber(table.tableNumber);
                              setTableCode(table.tableCode);
                              setQrImage("");
                            }}
                          >
                            <span
                              className="material-symbols-outlined"
                              data-toggle="tooltip"
                              title="QR"
                            >
                              qr_code_2_add
                            </span>
                          </button>
                        </td>
                        <td>{formatDateTime(table.createdAt)}</td>
                        <td>{formatDateTime(table.updatedAt)}</td>
                        <td>
                          <button
                            data-target="#editTableModal"
                            className="btn btn-sm btn-primary ml-2 "
                            data-toggle="modal"
                            onClick={() => {
                              settableId(table._id);
                              setTableNumber(table.tableNumber);
                              setSectionNumber(table.sectionNumber);
                              setChairs(table.chairs);
                              setLocation(table.location);
                              setIsValid(table.isValid);
                              setStatus(table.status);
                              setNotes(table.notes);
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

                          <button
                            data-target="#deleteTableModal"
                            className="btn btn-sm btn-danger"
                            data-toggle="modal"
                            onClick={() => settableId(table._id)}
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
                {listOfTable.length > endPagination
                  ? endPagination
                  : listOfTable.length}
              </b>{" "}
              من <b>{listOfTable.length}</b> عنصر
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

      <div id="addTableModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form onSubmit={createTable}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">اضافه طاولة</h4>
                <button
                  type="button"
                  className="close m-0 p-1"
                  data-dismiss="modal"
                  aria-hidden="true"
                >
                  &times;
                </button>
              </div>
              <div className="modal-body d-flex flex-wrap align-items-center p-0 m-0 text-center">
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    رقم السكشن
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    required
                    maxLength={20}
                    onChange={(e) => setSectionNumber(e.target.value)}
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    رقم الطاولة
                  </label>
                  <input
                    type="text"
                    maxLength={20}
                    defaultValue={
                      listOfTable.length > 0
                        ? listOfTable[listOfTable.length - 1].tableNumber
                        : ""
                    }
                    className="form-control border-primary m-0 p-2 h-auto"
                    required
                    onChange={(e) => setTableNumber(e.target.value)}
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    عدد المقاعد
                  </label>
                  <input
                    type="Number"
                    className="form-control border-primary m-0 p-2 h-auto"
                    required
                    max={20}
                    min={1}
                    onChange={(e) => setChairs(e.target.value)}
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    المكان
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    required
                    maxLength={100}
                    onChange={(e) => setLocation(e.target.value)}
                  ></input>
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    متاح
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    name="category"
                    id="category"
                    form="carform"
                    onChange={(e) => setIsValid(e.target.value)}
                  >
                    <option value="">اختر</option>
                    <option value={true}>متاح</option>
                    <option value={false}>غير متاح</option>
                  </select>
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الحالة
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    name="category"
                    id="category"
                    form="carform"
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    {listOfStatus.map((status, i) => (
                      <option key={i} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    ملاحظات
                  </label>
                  <textarea
                    className="form-control border-primary m-0 p-2 h-auto"
                    maxLength={100}
                    onChange={(e) => setNotes(e.target.value)}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer p-0 m-0 d-flex flex-nowrap align-items-center justify-content-between">
                <input
                  type="submit"
                  className="btn btn-success col-6 h-100 px-2 py-3 m-0"
                  value="ضافه"
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

      <div id="editTableModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form onSubmit={editTable}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">تعديل طاولة</h4>
                <button
                  type="button"
                  className="close m-0 p-1"
                  data-dismiss="modal"
                  aria-hidden="true"
                >
                  &times;
                </button>
              </div>
              <div className="modal-body d-flex flex-wrap align-items-center p-0 m-0 text-center">
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    رقم السكشن
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    required
                    defaultValue={sectionNumber}
                    maxLength={20}
                    onChange={(e) => setSectionNumber(e.target.value)}
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    رقم الطاولة
                  </label>
                  <input
                    type="text"
                    defaultValue={tableNumber}
                    maxLength={20}
                    className="form-control border-primary m-0 p-2 h-auto"
                    required
                    onChange={(e) => setTableNumber(e.target.value)}
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    عدد المقاعد
                  </label>
                  <input
                    type="Number"
                    value={chairs}
                    defaultValue={chairs}
                    className="form-control border-primary m-0 p-2 h-auto"
                    required
                    max={20}
                    min={1}
                    onChange={(e) => setChairs(e.target.value)}
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    المكان
                  </label>
                  <textarea
                    defaultValue={location}
                    className="form-control border-primary m-0 p-2 h-auto"
                    required
                    maxLength={100}
                    onChange={(e) => setLocation(e.target.value)}
                  ></textarea>
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    متاح
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    name="category"
                    id="category"
                    onChange={(e) => setIsValid(e.target.value)}
                  >
                    <option value={isValid}>
                      {isValid ? "متاح" : "غير متاح"}
                    </option>
                    <option value={true}>متاح</option>
                    <option value={false}>غير متاح</option>
                  </select>
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الحالة
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    name="category"
                    id="category"
                    form="carform"
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value={status}>{status}</option>
                    {listOfStatus
                      .filter((s) => s !== status)
                      .map((status, i) => (
                        <option key={i} value={status} d>
                          {status}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    ملاحظات
                  </label>
                  <textarea
                    className="form-control border-primary m-0 p-2 h-auto"
                    defaultValue={notes}
                    maxLength={100}
                    onChange={(e) => setNotes(e.target.value)}
                  ></textarea>
                </div>
              </div>
              <div className="modal-footer p-0 m-0 d-flex flex-nowrap align-items-center justify-content-between">
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

      <div id="qrTableModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form onSubmit={createQR}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">استخراج QR</h4>
              </div>
              <div className="modal-body d-flex flex-wrap align-items-center p-0 m-0 text-center">
                <div
                  ref={printtableqr}
                  className="form-group qrprint w-100 h-auto p-0 m-2 d-flex align-items-center justify-content-center"
                >
                  <div className="w-100 text-center">
                    <p
                      className="mb-3 text-nowrap text-center text-dark"
                      style={{
                        fontSize: "26px",
                        fontFamily: "Noto Nastaliq Urdu , serif",
                      }}
                    >
                      طاولة رقم {tableNumber}
                    </p>
                    {qrimage && (
                      <a href={qrimage} download>
                        <img
                          src={qrimage}
                          className="img-fluid  w-100 h-75"
                          alt="QR Code"
                        />
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer p-0 m-0 d-flex flex-nowrap align-items-center justify-content-between">
                {qrimage ? (
                  <button
                    type="button"
                    className="col-6 btn p-3 m-0 btn-info"
                    onClick={handlePrintTableQr}
                  >
                    طباعة
                  </button>
                ) : (
                  <input
                    type="submit"
                    className="btn btn-success col-6 h-100 px-2 py-3 m-0"
                    value="استخراج"
                  />
                )}
                <button
                  type="button"
                  className="btn btn-danger col-6 h-100 px-2 py-3 m-0"
                  data-dismiss="modal"
                >
                  اغلاق
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div id="qrwebModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form onSubmit={createwebQR}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">استخراج QR</h4>
              </div>
              <div className="modal-body d-flex flex-wrap align-items-center p-0 m-0 text-center">
                <div
                  ref={printWepQr}
                  className="form-group qrprint w-100 h-auto p-0 m-0 d-flex align-items-center justify-content-center"
                >
                  <div className="w-100 text-center text-dark">
                    <p
                      className="mb-3"
                      style={{
                        fontSize: "26px",
                        fontFamily: "Noto Nastaliq Urdu , serif",
                      }}
                    >
                      {brandInfo && brandInfo.name}
                    </p>
                    {qrimage && (
                      <a href={qrimage} download>
                        <img
                          src={qrimage}
                          className="img-fluid  w-100 h-75"
                          alt="QR Code"
                        />
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer p-0 m-0 d-flex flex-nowrap align-items-center justify-content-between">
                {qrimage ? (
                  <button
                    type="button"
                    className="col-6 btn p-3 m-0 btn-info"
                    onClick={handlePrintWepQr}
                  >
                    طباعة
                  </button>
                ) : (
                  <input
                    type="submit"
                    className="btn btn-success col-6 h-100 px-2 py-3 m-0"
                    value="استخراج"
                  />
                )}
                <button
                  type="button"
                  className="btn btn-danger col-6 h-100 px-2 py-3 m-0"
                  data-dismiss="modal"
                >
                  اغلاق
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div id="deleteTableModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form onSubmit={deleteTable}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">حذف طاولة</h4>
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
              <div className="modal-footer p-0 m-0 d-flex flex-nowrap align-items-center justify-content-between">
                <input
                  type="submit"
                  className="btn btn-warning col-6 h-100 px-2 py-3 m-0"
                  value="حذف"
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

      <div id="deleteListTableModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form onSubmit={deleteSelectedIds}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">حذف طاولة</h4>
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
              <div className="modal-footer p-0 m-0 d-flex flex-nowrap align-items-center justify-content-between">
                <input
                  type="submit"
                  className="btn btn-warning col-6 h-100 px-2 py-3 m-0"
                  value="حذف"
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

export   default Tables;
