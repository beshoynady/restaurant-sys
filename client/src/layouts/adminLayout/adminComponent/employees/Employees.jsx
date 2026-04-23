import React, { useState, useEffect, useRef, useContext } from "react";
import axios from "axios";
import { AppContext } from "../../../../context/appContext";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { useReactToPrint } from "react-to-print";
import "./orders/Orders.css";

import {useTranslation} from "react-i18next";

const Employees = () => {
  const [isExecuting, setIsExecuting] = useState(false);


  const {t, i18n} = useTranslation();
  useEffect(() => {
    const crruntLang = localStorage.getItem("lang") || "en";
    i18n.changeLanguage(crruntLang);
  }, []);

  const {
    permissionsList,
    brandInfo,
    formatDateTime,
    setIsLoading,
    allTable,
    EditPagination,
    startPagination,
    endPagination,
    setStartPagination,
    setEndPagination,
    apiUrl,
    handleGetTokenAndConfig,
  } = useContext(AppContext);

  const notify = (message, type) => {
    toast[type](message);
  };

  const permissionsForEmployee =
    permissionsList &&
    permissionsList?.filter(
      (permission) => permission.resource === "Employees"
    )[0];

  const roleEn = [
    "owner",
    "manager",
    "cashier",
    "waiter",
    "deliveryman",
    "chef",
    "Grill Chef",
    "Bartender",
  ];

  const roleAr = [
    "مالك",
    "مدير",
    "كاشير",
    "ويتر",
    "ديليفري مان",
    "شيف",
    "شيف شوايه",
    "البار مان",
  ];

  const [listOfEmployees, setListOfEmployees] = useState([]);

  const getEmployees = async () => {
    const config = await handleGetTokenAndConfig();
    if (permissionsForEmployee && permissionsForEmployee.read === false) {
      notify("ليس لك صلاحية لعرض بيانات الموظفين", "info");
      return;
    }
    try {
      const response = await axios.get(`${apiUrl}/api/employee`, config);
      const data = response.data;
      if (data) {
        setListOfEmployees(data);
      } else {
        toast.info("لا توجد بيانات لعرضها");
      }
      //
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    }
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

  const [employeeid, setemployeeid] = useState("");
  const [fullname, setfullname] = useState("");
  const [numberID, setnumberID] = useState("");
  const [username, setusername] = useState("");
  const [workingDays, setworkingDays] = useState(0);
  const [basicSalary, setbasicSalary] = useState(0);
  const [shift, setshift] = useState("");
  const [taxRate, settaxRate] = useState(0);
  const [insuranceRate, setinsuranceRate] = useState(0);
  const [password, setpassword] = useState("");
  const [address, setaddress] = useState("");
  const [phone, setphone] = useState("");
  const [email, setemail] = useState("");
  const [isActive, setisActive] = useState(true);
  const [isAdmin, setisAdmin] = useState(true);
  const [role, setrole] = useState("");
  const [sectionNumber, setsectionNumber] = useState("");

  const createEmployee = async (e) => {
    e.preventDefault();

    if (isExecuting) {
      toast.warn("انتظر لانشاء حساب الموظف");
      return;
    }

    // Check if the user has the permission to create an employee
    if (permissionsForEmployee && permissionsForEmployee.create === false) {
      notify("ليس لك صلاحية لانشاء حساب موظف", "info");
      return;
    }

    // Validate that all required fields are filled
    if (
      !fullname ||
      !username ||
      !basicSalary ||
      !workingDays ||
      !numberID ||
      !password ||
      !address ||
      !phone ||
      !role
    ) {
      notify("جميع الحقول مطلوبة! رجاءً ملء جميع الحقول", "error");
      return;
    }

    try {
      const config = await handleGetTokenAndConfig();
      setIsExecuting(true);

      const newEmployee = await axios.post(
        apiUrl + "/api/employee",
        {
          fullname,
          basicSalary,
          taxRate,
          insuranceRate,
          workingDays,
          numberID,
          username,
          password,
          address,
          shift,
          phone,
          email,
          isActive,
          role,
          sectionNumber,
        },
        config
      );

      if (newEmployee) {
        notify("تم انشاء حساب الموظف بنجاح", "success");
      }

      getEmployees();
      setIsExecuting(false);
    } catch (error) {
      console.error(error);
      notify("فشل انشاء حساب الموظف! حاول مرة اخرى", "error");
      setIsExecuting(false);
    }
  };

  const editEmployee = async (e) => {
    e.preventDefault();
    const config = await handleGetTokenAndConfig();
    if (permissionsForEmployee && permissionsForEmployee.update === false) {
      notify("ليس لك صلاحية لتعديل حساب الموظف", "info");
      return;
    }
    if (isExecuting) {
      toast.warn("انتظر لتعديل حساب الموظف");
      return;
    }

    try {
      setIsExecuting(true);
      if (permissionsForEmployee && permissionsForEmployee.update === true) {
        const updateData = password
          ? {
              fullname,
              numberID,
              username,
              email,
              shift,
              address,
              phone,
              password,
              basicSalary,
              taxRate,
              insuranceRate,
              workingDays,
              isActive,
              role,
              sectionNumber,
            }
          : {
              fullname,
              numberID,
              username,
              email,
              shift,
              address,
              phone,
              basicSalary,
              taxRate,
              insuranceRate,
              workingDays,
              isActive,
              role,
              sectionNumber,
            };

        const update = await axios.put(
          `${apiUrl}/api/employee/${employeeid}`,
          updateData,
          config
        );
        if (update.status === 200) {
          getEmployees();
          resetFeilds();
          notify("تم تحديث بيانات الموظف", "success");
          // Additional logic if needed after successful update
        }
      } else {
        notify("ليس لك صلاحية لتعديل حساب موظف", "info");
      }
      setIsExecuting(false);
    } catch (error) {
      notify("فشل تحديث بيانات الموظف! حاول مره اخري", "error");
      console.error(error);

      setIsExecuting(false);
    }
  };
  const resetFeilds = () => {
    setemployeeid("");
    setfullname("");
    setnumberID("");
    setusername("");
    setaddress("");
    setemail("");
    setisActive(true);
    setphone("");
    setrole("");
    setbasicSalary(0);
    setworkingDays(0);
    setshift("");
    settaxRate(0);
    setinsuranceRate(0);
    setsectionNumber("");
    setemployeeShift({});
    setpassword("");
  };

  const [employeeShift, setemployeeShift] = useState({});
  const handleEditEmployee = (employeeData) => {
    const employee = JSON.parse(employeeData);
    setemployeeid(employee._id);
    setfullname(employee.fullname);
    setnumberID(employee.numberID);
    setusername(employee.username);
    setaddress(employee.address);
    setemail(employee.email);
    setisActive(employee.isActive);
    setphone(employee.phone);
    setrole(employee.role);
    setbasicSalary(employee.basicSalary);
    setworkingDays(employee.workingDays);
    setshift(employee.shift?._id);
    setemployeeShift(employee.shift);
    settaxRate(employee.taxRate);
    setinsuranceRate(employee.insuranceRate);
    setsectionNumber(employee.sectionNumber ? employee.sectionNumber : "");
  };

  const getEmployeesByJob = (role) => {
    getEmployees();
    if (role === "all") {
      getEmployees();
      return;
    }
    if (listOfEmployees.length > 0) {
      const filteredEmployees = listOfEmployees.filter(
        (employee) => employee.role === role
      );
      if (filteredEmployees) {
        setListOfEmployees(filteredEmployees);
      } else {
        setListOfEmployees([]);
      }
    }
  };

  const getEmployeesByShift = (shift) => {
    getEmployees();
    if (shift === "all") {
      getEmployees();
      return;
    }
    if (listOfEmployees.length > 0 && shift) {
      const FilterEmployees = listOfEmployees.filter(
        (employee) => employee.shift?._id === shift
      );
      if (FilterEmployees) {
        setListOfEmployees(FilterEmployees);
      } else {
        setListOfEmployees([]);
      }
    }
  };

  const getEmployeesByName = (name) => {
    getEmployees();

    if (listOfEmployees.length > 0 && name) {
      const employee = listOfEmployees.filter(
        (employee) => employee.fullname.startsWith(name) === true
      );
      if (employee) {
        setListOfEmployees(employee);
      } else {
        setListOfEmployees([]);
      }
    } else {
      getEmployees();
    }
  };
  const filterEmpByStatus = (status) => {
    getEmployees();

    if (status === "true") {
      const filteredEmployees =
        listOfEmployees.length > 0
          ? listOfEmployees.filter((employee) => employee.isActive === true)
          : "";
      setListOfEmployees(filteredEmployees);
    } else if (status === "false") {
      const filteredEmployees = listOfEmployees
        ? listOfEmployees.filter((employee) => employee.isActive === false)
        : "";
      setListOfEmployees(filteredEmployees);
    } else if (status === "all") {
      getEmployees();
    }
  };

  const deleteEmployee = async (e) => {
    e.preventDefault();
    try {
      const config = await handleGetTokenAndConfig();
      if (permissionsForEmployee && permissionsForEmployee.delete === true) {
        const deleted = await axios.delete(
          `${apiUrl}/api/employee/${employeeid}`,
          config
        );
        notify("تم حذف سجل الموظف بنجاح", "success");
        getEmployees();
      } else {
        notify("ليس لك صلاحية لحذف حساب الموظف", "info");
      }
    } catch (error) {
      notify("فشل حذف سجل الموظف !حاول مره اخري", "error");
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

    try {
      const config = await handleGetTokenAndConfig();

      for (const Id of selectedIds) {
        await axios.delete(`${apiUrl}/api/order/${Id}`, config);
      }
      getEmployees();
      toast.success("Selected orders deleted successfully");
      setSelectedIds([]);
    } catch (error) {
      toast.error("Failed to delete selected orders");
    }
  };

  const exportToExcel = () => {
    if (permissionsForEmployee && permissionsForEmployee.read === false) {
      toast.error("ليس لك صلاحية لعرض بيانات الموظفين وتصديرها");
      return;
    }

    const data = listOfEmployees.map((employee, i) => ({
      م: i + 1,
      الاسم: employee.fullname,
      "رقم قومي": employee.numberID,
      العنوان: employee.address,
      الموبايل: employee.phone,
      "البريد الإلكتروني": employee.email,
      "اسم المستخدم": employee.username,
      الوظيفة: employee.role,
      "أيام العمل": employee.workingDays,
      الراتب: employee.basicSalary,
      "معدل الضريبة": employee.taxRate,
      "معدل التأمين": employee.insuranceRate,
      الحالة: employee.isActive ? "متاح" : "غير متاح",
      السكشن: employee.sectionNumber,
      الشيفت: employee.shift && employee.shift.shiftType,
      "أضيف بواسطة": employee.createdBy && employee.createdBy.username,
      "تحديث بواسطة": employee.updatedBy && employee.updatedBy.username,
      التاريخ: employee.createdAt && formatDateTime(employee.createdAt),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees");

    XLSX.writeFile(wb, "employees.xlsx");
  };

  const printEmployeeContainer = useRef();
  const handlePrint = useReactToPrint({
    content: () => printEmployeeContainer.current,
    copyStyles: true,
    removeAfterPrint: true,
    bodyClass: "printpage",
  });

  useEffect(() => {
    getEmployees();
    getShifts();
  }, []);

  const [listOfSectionNumber, setlistOfSectionNumber] = useState([]);
  useEffect(() => {
    const sectionNumbers = [];
    allTable &&
      allTable.forEach((table) => {
        if (table.sectionNumber) {
          if (sectionNumbers.includes(table.sectionNumber)) {
            return;
          }

          sectionNumbers.push(table.sectionNumber);
        }
      });
    setlistOfSectionNumber([...new Set(sectionNumbers)]);
  }, [role]);

  return (
    <div className="w-100 px-3 d-flex align-itmes-center justify-content-start">
      <div className="table-responsive" ref={printEmployeeContainer}>
        <div className="table-wrapper p-3 mw-100">
          <div className="table-title">
            <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
              <div className="col-sm-6 text-right">
                <h2>
                  {t("Employee Management")}
                </h2>
              </div>
              <div className="col-12 col-md-6 p-0 m-0 d-flex flex-wrap aliegn-items-center justify-content-end print-hide">
                {permissionsList?.filter(
                  (permission) => permission.resource === "Employees"
                )[0]?.create === true ? (
                  <a
                    href="#addEmployeeModal"
                    className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-success"
                    data-toggle="modal"
                  >
                    {" "}
                    <span>اضافة موظف جديد</span>
                  </a>
                ) : null}
                <a
                  href="#"
                  className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-info"
                  data-toggle="modal"
                  onClick={exportToExcel}
                >
                  {" "}
                  <span>تصدير</span>
                </a>
                <a
                  href="#"
                  className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-primary"
                  data-toggle="modal"
                  onClick={handlePrint}
                >
                  {" "}
                  <span>طباعه</span>
                </a>
              </div>
            </div>
          </div>
          <div className="table-filter print-hide">
            <div className="d-flex flex-wrap flex-row w-100 text-dark">
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
                  {roleEn.map((role, i) => {
                    return (
                      <option value={role} key={i}>
                        {roleAr[i]}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  الشيفت
                </label>
                <select
                  className="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => getEmployeesByShift(e.target.value)}
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
              <div className="filter-group d-flex flex-wrap align-items-center justify-content-between p-0 mb-1">
                <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                  الحالة
                </label>
                <select
                  className="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => filterEmpByStatus(e.target.value)}
                >
                  <option value="all">الكل</option>
                  <option value={true}>متاح</option>
                  <option value={false}>غير متاح</option>
                </select>
              </div>
              {/* <span className="filter-icon"><i className="fa fa-filter"></i></span> */}
            </div>
          </div>
          <table className="table table-striped table-hover">
            <thead>
              <tr>
                <th>م</th>
                <th>الاسم</th>
                <th>رقم قومي</th>
                <th>العنوان</th>
                <th>الموبايل</th>
                <th>البريد الإلكتروني</th>
                <th>اسم المستخدم</th>
                <th>الوظيفة</th>
                <th>أيام العمل</th>
                <th>الراتب</th>
                <th>معدل الضريبة</th>
                <th>معدل التأمين</th>
                <th>الحالة</th>
                <th>علي راس العمل</th>
                <th>السكشن</th>
                <th>الشيفت</th>
                <th>أضيف بواسطة</th>
                <th>تحديث بواسطة</th>
                <th>التاريخ</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {listOfEmployees.length > 0
                ? listOfEmployees.map((employee, i) => {
                    if (i >= startPagination && i < endPagination) {
                      return (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td>{employee.fullname}</td>
                          <td>{employee.numberID}</td>
                          <td>{employee.address}</td>
                          <td>{employee.phone}</td>
                          <td>{employee.email}</td>
                          <td>{employee.username}</td>
                          <td>{employee.role}</td>
                          <td>{employee.workingDays}</td>
                          <td>{employee.basicSalary}</td>
                          <td>{employee.taxRate}</td>
                          <td>{employee.insuranceRate}</td>
                          <td>{employee.isActive ? "متاح" : "غير متاح"}</td>
                          <td>
                            {employee.isAdmin ? "في الفريق" : "ترك العمل"}
                          </td>
                          <td>{employee.sectionNumber}</td>
                          <td>{employee.shift && employee.shift?.shiftType}</td>
                          <td>
                            {employee.createdBy && employee.createdBy?.username}
                          </td>
                          <td>
                            {employee.updatedBy && employee.updatedBy?.username}
                          </td>
                          <td>
                            {employee.createdAt &&
                              formatDateTime(employee.createdAt)}
                          </td>
                          <td>
                            {permissionsForEmployee?.update ? (
                              <button
                                data-target="#editEmployeeModal"
                                className="btn btn-sm btn-primary ml-2 "
                                data-toggle="modal"
                              >
                                <i
                                  className="material-icons"
                                  data-toggle="tooltip"
                                  title="Edit"
                                  onClick={() =>
                                    handleEditEmployee(JSON.stringify(employee))
                                  }
                                >
                                  &#xE254;
                                </i>
                              </button>
                            ) : (
                              ""
                            )}
                            {permissionsForEmployee?.delete ? (
                              <button
                                data-target="#deleteEmployeeModal"
                                className="btn btn-sm btn-danger"
                                data-toggle="modal"
                              >
                                <i
                                  className="material-icons"
                                  data-toggle="tooltip"
                                  title="Delete"
                                  onClick={() => setemployeeid(employee._id)}
                                >
                                  &#xE872;
                                </i>
                              </button>
                            ) : (
                              ""
                            )}
                          </td>
                        </tr>
                      );
                    }
                    return null;
                  })
                : ""}
            </tbody>
          </table>

          <div className="clearfix">
            <div className="hint-text text-dark">
              عرض{" "}
              <b>
                {listOfEmployees.length > endPagination
                  ? endPagination
                  : listOfEmployees.length}
              </b>{" "}
              من <b>{listOfEmployees.length}</b> عنصر
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

      <div id="addEmployeeModal" className="modal fade">
        {permissionsForEmployee?.create && (
          <div className="modal-dialog modal-lg">
            <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
              <h4 className="modal-title">إضافة موظف</h4>
              <button
                type="button"
                className="close m-0 p-1"
                data-dismiss="modal"
                aria-hidden="true"
              >
                &times;
              </button>
            </div>
            <div className="modal-content shadow-lg border-0 rounded">
              <form className="text-right" onSubmit={(e) => createEmployee(e)}>
                <div className="modal-body d-flex flex-wrap align-items-center p-3 text-right">
                  <div className="form-group col-12 col-md-6">
                    <label
                      className="form-label text-wrap text-right fw-bolder p-0 m-0"
                      htmlFor="fullname"
                    >
                      الاسم
                    </label>
                    <input
                      type="text"
                      id="fullname"
                      className="form-control border-primary m-0 p-2 h-auto"
                      required
                      pattern="[A-Za-z\u0600-\u06FF\s]+"
                      onChange={(e) => setfullname(e.target.value)}
                    />
                    <div className="invalid-feedback">
                      الرجاء إدخال اسم صحيح.
                    </div>
                  </div>
                  <div className="form-group col-12 col-md-6">
                    <label
                      className="form-label text-wrap text-right fw-bolder p-0 m-0"
                      htmlFor="username"
                    >
                      اسم المستخدم
                    </label>
                    <input
                      type="text"
                      id="username"
                      className="form-control border-primary m-0 p-2 h-auto"
                      required
                      onChange={(e) => setusername(e.target.value)}
                    />
                  </div>
                  <div className="form-group col-12 col-md-6">
                    <label
                      className="form-label text-wrap text-right fw-bolder p-0 m-0"
                      htmlFor="phone"
                    >
                      الموبايل
                    </label>
                    <input
                      type="text"
                      id="phone"
                      className="form-control border-primary m-0 p-2 h-auto"
                      required
                      pattern="[0-9]{11}"
                      onChange={(e) => setphone(e.target.value)}
                    />
                    <div className="invalid-feedback">
                      الرجاء إدخال رقم هاتف صحيح (11 رقم).
                    </div>
                  </div>
                  <div className="form-group col-12 col-md-6">
                    <label
                      className="form-label text-wrap text-right fw-bolder p-0 m-0"
                      htmlFor="password"
                    >
                      الباسورد
                    </label>
                    <input
                      type="text"
                      id="password"
                      className="form-control border-primary m-0 p-2 h-auto"
                      minLength={3}
                      maxLength={30}
                      required
                      onChange={(e) => setpassword(e.target.value)}
                    />
                    <div className="invalid-feedback">
                      الرجاء إدخال باسورد مكون من 3 - 30 رقم و حرف .
                    </div>
                  </div>
                  <div className="form-group col-12 col-md-6">
                    <label
                      className="form-label text-wrap text-right fw-bolder p-0 m-0"
                      htmlFor="numberID"
                    >
                      الرقم القومي
                    </label>
                    <input
                      type="text"
                      id="numberID"
                      pattern="[0-9]{14}"
                      className="form-control border-primary m-0 p-2 h-auto"
                      required
                      onChange={(e) => setnumberID(e.target.value)}
                    />
                    <div className="invalid-feedback">
                      الرجاء إدخال رقم قومي صحيح صحيح.
                    </div>
                  </div>
                  <div className="form-group col-12 col-md-6">
                    <label
                      className="form-label text-wrap text-right fw-bolder p-0 m-0"
                      htmlFor="email"
                    >
                      الايميل
                    </label>
                    <input
                      type="email"
                      id="email"
                      className="form-control border-primary m-0 p-2 h-auto"
                      onChange={(e) => setemail(e.target.value)}
                    />
                    <div className="invalid-feedback">
                      الرجاء إدخال عنوان بريد إلكتروني صحيح.
                    </div>
                  </div>
                  <div className="form-group col-12 col-md-6">
                    <label
                      className="form-label text-wrap text-right fw-bolder p-0 m-0"
                      htmlFor="address"
                    >
                      العنوان
                    </label>
                    <textarea
                      id="address"
                      className="form-control border-primary m-0 p-2 h-auto"
                      required
                      onChange={(e) => setaddress(e.target.value)}
                    ></textarea>
                  </div>
                  <div className="form-group col-12 col-md-6">
                    <label
                      className="form-label text-wrap text-right fw-bolder p-0 m-0"
                      htmlFor="isActive"
                    >
                      الحالة
                    </label>
                    <select
                      id="isActive"
                      className="form-control border-primary m-0 p-2 h-auto"
                      required
                      onChange={(e) => setisActive(e.target.value)}
                    >
                      <option value="">اختر</option>
                      <option value={true}>متاح</option>
                      <option value={false}>ليس متاح</option>
                    </select>
                  </div>
                  <div className="form-group col-12 col-md-6">
                    <label
                      className="form-label text-wrap text-right fw-bolder p-0 m-0"
                      htmlFor="shift"
                    >
                      الشيفت
                    </label>
                    <select
                      id="shift"
                      className="form-control border-primary m-0 p-2 h-auto"
                      onChange={(e) => setshift(e.target.value)}
                    >
                      <option value="">اختر</option>
                      {shifts ? (
                        shifts.map((shift, i) => (
                          <option value={shift._id} key={i}>
                            {shift.shiftType}
                          </option>
                        ))
                      ) : (
                        <option>لم يتم إنشاء شفتات</option>
                      )}
                    </select>
                  </div>
                  <div className="form-group col-12 col-md-6">
                    <label
                      className="form-label text-wrap text-right fw-bolder p-0 m-0"
                      htmlFor="role"
                    >
                      الوظيفة
                    </label>
                    <select
                      id="role"
                      className="form-control border-primary m-0 p-2 h-auto"
                      required
                      onChange={(e) => setrole(e.target.value)}
                    >
                      <option value="">اختر وظيفة</option>
                      {roleEn.map((role, i) => {
                        return (
                          <option value={role} key={i}>
                            {roleAr[i]}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="form-group col-12 col-md-6">
                    <label
                      className="form-label text-wrap text-right fw-bolder p-0 m-0"
                      htmlFor="workingDays"
                    >
                      ايام العمل الشهرية
                    </label>
                    <input
                      type="number"
                      id="workingDays"
                      className="form-control border-primary m-0 p-2 h-auto"
                      min={0}
                      max={31}
                      required
                      onChange={(e) => setworkingDays(Number(e.target.value))}
                    />
                    <div className="invalid-feedback">
                      الرجاء إدخال أيام عمل صحيحة.
                    </div>
                  </div>
                  <div className="form-group col-12 col-md-6">
                    <label
                      className="form-label text-wrap text-right fw-bolder p-0 m-0"
                      htmlFor="basicSalary"
                    >
                      المرتب الأساسي
                    </label>
                    <input
                      type="number"
                      id="basicSalary"
                      className="form-control border-primary m-0 p-2 h-auto"
                      min={0}
                      required
                      onChange={(e) => setbasicSalary(Number(e.target.value))}
                    />
                    <div className="invalid-feedback">
                      الرجاء إدخال راتب صحيح.
                    </div>
                  </div>
                  <div className="form-group col-12 col-md-6">
                    <label
                      className="form-label text-wrap text-right fw-bolder p-0 m-0"
                      htmlFor="taxRate"
                    >
                      نسبة الضريبة
                    </label>
                    <input
                      type="number"
                      id="taxRate"
                      className="form-control border-primary m-0 p-2 h-auto"
                      min={0}
                      max={100}
                      required
                      onChange={(e) => settaxRate(Number(e.target.value))}
                    />
                    <div className="invalid-feedback">
                      الرجاء إدخال نسبة ضريبة صحيحة.
                    </div>
                  </div>
                  <div className="form-group col-12 col-md-6">
                    <label
                      className="form-label text-wrap text-right fw-bolder p-0 m-0"
                      htmlFor="insuranceRate"
                    >
                      نسبة التأمين
                    </label>
                    <input
                      type="number"
                      id="insuranceRate"
                      className="form-control border-primary m-0 p-2 h-auto"
                      min={0}
                      max={100}
                      required
                      onChange={(e) => setinsuranceRate(Number(e.target.value))}
                    />
                    <div className="invalid-feedback">
                      الرجاء إدخال نسبة تأمين صحيحة.
                    </div>
                  </div>
                  {role === "waiter" && (
                    <div className="form-group col-12 col-md-6">
                      <label
                        className="form-label text-wrap text-right fw-bolder p-0 m-0"
                        htmlFor="sectionNumber"
                      >
                        السكشن المسؤول عنه
                      </label>
                      <select
                        className="form-control border-primary m-0 p-2 h-auto"
                        required
                        onChange={(e) => setsectionNumber(e.target.value)}
                      >
                        {listOfSectionNumber.map((sectionNumber, i) => (
                          <option value={sectionNumber} key={i}>
                            {sectionNumber}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="modal-footer flex-nowrap d-flex flex-row align-items-center justify-content-between">
                  <button
                    type="submit"
                    className="btn btn-success col-6 h-100 px-2 py-3 m-0"
                  >
                    إضافة
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger col-6 h-100 px-2 py-3 m-0"
                    data-dismiss="modal"
                  >
                    إغلاق
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <div id="editEmployeeModal" className="modal fade">
        {permissionsForEmployee?.update && (
          <div className="modal-dialog modal-lg">
            <div className="modal-content shadow-lg border-0 rounded">
              <form className="text-right" onSubmit={(e) => editEmployee(e)}>
                <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                  <h4 className="modal-title">تعديل بيانات الموظف</h4>
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
                    <label
                      className="form-label text-wrap text-right fw-bolder p-0 m-0"
                      htmlFor="fullnameEdit"
                    >
                      الاسم
                    </label>
                    <input
                      type="text"
                      id="fullnameEdit"
                      className="form-control border-primary m-0 p-2 h-auto"
                      defaultValue={fullname}
                      required
                      pattern="[A-Za-z\u0600-\u06FF\s]+"
                      onChange={(e) => setfullname(e.target.value)}
                    />
                    <div className="invalid-feedback">
                      الرجاء إدخال اسم صحيح.
                    </div>
                  </div>
                  <div className="form-group col-12 col-md-6">
                    <label
                      className="form-label text-wrap text-right fw-bolder p-0 m-0"
                      htmlFor="usernameEdit"
                    >
                      اسم المستخدم
                    </label>
                    <input
                      type="text"
                      id="usernameEdit"
                      className="form-control border-primary m-0 p-2 h-auto"
                      required
                      defaultValue={username}
                      onChange={(e) => setusername(e.target.value)}
                    />
                  </div>
                  <div className="form-group col-12 col-md-6">
                    <label
                      className="form-label text-wrap text-right fw-bolder p-0 m-0"
                      htmlFor="phoneEdit"
                    >
                      الموبايل
                    </label>
                    <input
                      type="text"
                      id="phoneEdit"
                      className="form-control border-primary m-0 p-2 h-auto"
                      defaultValue={phone}
                      required
                      pattern="[0-9]{11}"
                      onChange={(e) => setphone(e.target.value)}
                    />
                    <div className="invalid-feedback">
                      الرجاء إدخال رقم هاتف صحيح (11 رقم).
                    </div>
                  </div>
                  <div className="form-group col-12 col-md-6">
                    <label
                      className="form-label text-wrap text-right fw-bolder p-0 m-0"
                      htmlFor="passwordEdit"
                    >
                      الباسورد
                    </label>
                    <input
                      type="text"
                      id="passwordEdit"
                      minLength={3}
                      maxLength={30}
                      className="form-control border-primary m-0 p-2 h-auto"
                      onChange={(e) => setpassword(e.target.value)}
                    />
                  </div>
                  <div className="form-group col-12 col-md-6">
                    <label
                      className="form-label text-wrap text-right fw-bolder p-0 m-0"
                      htmlFor="numberIDEdit"
                    >
                      الرقم القومي
                    </label>
                    <input
                      type="text"
                      id="numberIDEdit"
                      className="form-control border-primary m-0 p-2 h-auto"
                      defaultValue={numberID}
                      pattern="[0-9]{14}"
                      required
                      onChange={(e) => setnumberID(e.target.value)}
                    />
                    <div className="invalid-feedback">
                      الرجاء إدخال رقم قومي صحيح صحيح.
                    </div>
                  </div>
                  <div className="form-group col-12 col-md-6">
                    <label
                      className="form-label text-wrap text-right fw-bolder p-0 m-0"
                      htmlFor="emailEdit"
                    >
                      الايميل
                    </label>
                    <input
                      type="email"
                      id="emailEdit"
                      className="form-control border-primary m-0 p-2 h-auto"
                      defaultValue={email}
                      onChange={(e) => setemail(e.target.value)}
                    />
                    <div className="invalid-feedback">
                      الرجاء إدخال عنوان بريد إلكتروني صحيح.
                    </div>
                  </div>
                  <div className="form-group col-12 col-md-6">
                    <label
                      className="form-label text-wrap text-right fw-bolder p-0 m-0"
                      htmlFor="addressEdit"
                    >
                      العنوان
                    </label>
                    <textarea
                      id="addressEdit"
                      className="form-control border-primary m-0 p-2 h-auto"
                      defaultValue={address}
                      required
                      onChange={(e) => setaddress(e.target.value)}
                    ></textarea>
                  </div>
                  <div className="form-group col-12 col-md-6">
                    <label
                      className="form-label text-wrap text-right fw-bolder p-0 m-0"
                      htmlFor="isActiveEdit"
                    >
                      الحالة
                    </label>
                    <select
                      id="isActiveEdit"
                      className="form-control border-primary m-0 p-2 h-auto"
                      defaultValue={isActive}
                      required
                      onChange={(e) => setisActive(e.target.value)}
                    >
                      <option value={isActive}>
                        {isActive ? "متاح" : "ليس متاح"}
                      </option>
                      <option value={true}>متاح</option>
                      <option value={false}>ليس متاح</option>
                    </select>
                  </div>
                  <div className="form-group col-12 col-md-6">
                    <label
                      className="form-label text-wrap text-right fw-bolder p-0 m-0"
                      htmlFor="shiftEdit"
                    >
                      الشيفت
                    </label>
                    <select
                      id="shiftEdit"
                      className="form-control border-primary m-0 p-2 h-auto"
                      defaultValue={employeeShift}
                      required
                      onChange={(e) => setshift(e.target.value)}
                    >
                      <option value={shift}>{employeeShift.shiftType}</option>
                      {shifts ? (
                        shifts.map((shift, i) => (
                          <option value={shift._id} key={i}>
                            {shift.shiftType}
                          </option>
                        ))
                      ) : (
                        <option>لم يتم إنشاء شفتات</option>
                      )}
                    </select>
                  </div>
                  <div className="form-group col-12 col-md-6">
                    <label
                      className="form-label text-wrap text-right fw-bolder p-0 m-0"
                      htmlFor="roleEdit"
                    >
                      الوظيفة
                    </label>
                    <select
                      id="roleEdit"
                      className="form-control border-primary m-0 p-2 h-auto"
                      defaultValue={role}
                      required
                      onChange={(e) => setrole(e.target.value)}
                    >
                      <option value={role}>{role}</option>
                      {roleEn.map((role, i) => {
                        return (
                          <option value={role} key={i}>
                            {roleAr[i]}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="form-group col-12 col-md-6">
                    <label
                      className="form-label text-wrap text-right fw-bolder p-0 m-0"
                      htmlFor="workingDaysEdit"
                    >
                      ايام العمل الشهرية
                    </label>
                    <input
                      type="number"
                      id="workingDaysEdit"
                      className="form-control border-primary m-0 p-2 h-auto"
                      min={0}
                      max={31}
                      value={workingDays}
                      required
                      onChange={(e) => setworkingDays(Number(e.target.value))}
                    />
                    <div className="invalid-feedback">
                      الرجاء إدخال أيام عمل صحيحة.
                    </div>
                  </div>
                  <div className="form-group col-12 col-md-6">
                    <label
                      className="form-label text-wrap text-right fw-bolder p-0 m-0"
                      htmlFor="basicSalaryEdit"
                    >
                      المرتب الأساسي
                    </label>
                    <input
                      type="number"
                      id="basicSalaryEdit"
                      className="form-control border-primary m-0 p-2 h-auto"
                      min={0}
                      value={basicSalary}
                      required
                      onChange={(e) => setbasicSalary(Number(e.target.value))}
                    />
                    <div className="invalid-feedback">
                      الرجاء إدخال راتب صحيح.
                    </div>
                  </div>
                  <div className="form-group col-12 col-md-6">
                    <label
                      className="form-label text-wrap text-right fw-bolder p-0 m-0"
                      htmlFor="taxRateEdit"
                    >
                      نسبة الضريبة
                    </label>
                    <input
                      type="number"
                      id="taxRateEdit"
                      className="form-control border-primary m-0 p-2 h-auto"
                      min={0}
                      max={100}
                      value={taxRate}
                      required
                      onChange={(e) => settaxRate(Number(e.target.value))}
                    />
                    <div className="invalid-feedback">
                      الرجاء إدخال نسبة ضريبة صحيحة.
                    </div>
                  </div>
                  <div className="form-group col-12 col-md-6">
                    <label
                      className="form-label text-wrap text-right fw-bolder p-0 m-0"
                      htmlFor="insuranceRateEdit"
                    >
                      نسبة التأمين
                    </label>
                    <input
                      type="number"
                      id="insuranceRateEdit"
                      className="form-control border-primary m-0 p-2 h-auto"
                      min={0}
                      max={100}
                      value={insuranceRate}
                      required
                      onChange={(e) => setinsuranceRate(Number(e.target.value))}
                    />
                    <div className="invalid-feedback">
                      الرجاء إدخال نسبة تأمين صحيحة.
                    </div>
                  </div>
                  {role === "waiter" && (
                    <div className="form-group col-12 col-md-6">
                      <label
                        className="form-label text-wrap text-right fw-bolder p-0 m-0"
                        htmlFor="sectionNumber"
                      >
                        السكشن المسؤول عنه
                      </label>
                      <select
                        className="form-control border-primary m-0 p-2 h-auto"
                        onChange={(e) => setsectionNumber(e.target.value)}
                      >
                        {listOfSectionNumber.map((sectionNumber, i) => (
                          <option value={sectionNumber} key={i}>
                            {sectionNumber}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="modal-footer d-flex flex-wrap align-items-center p-3">
                  <button
                    type="submit"
                    className="btn btn-success col-6 h-100 px-2 py-3 m-0"
                  >
                    تعديل
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger col-6 h-100 px-2 py-3 m-0"
                    data-dismiss="modal"
                  >
                    إغلاق
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <div id="deleteEmployeeModal" className="modal fade">
        {permissionsForEmployee?.delete === true && (
          <div className="modal-dialog modal-lg">
            <div className="modal-content shadow-lg border-0 rounded ">
              <form className="text-right" onSubmit={(e) => deleteEmployee(e)}>
                <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                  <h4 className="modal-title">حذف موظف</h4>
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
                  <p>
                    هل أنت متأكد من حذف الموظف <strong>{fullname}</strong>؟
                  </p>
                </div>
                <div className="modal-footer flex-nowrap d-flex flex-row align-items-center justify-content-between">
                  <input
                    type="submit"
                    className="btn btn-warning col-6 h-100 px-2 py-3 m-0"
                    value="حذف"
                  />
                  <input
                    type="button"
                    className="col-md-6 col-12 h-100 p-0 m-0 btn btn-default"
                    data-dismiss="modal"
                    value="إلغاء"
                  />
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* <div id="deleteListEmployeeModal" className="modal fade">
                <div className="modal-dialog modal-lg">
                  <div className="modal-content shadow-lg border-0 rounded ">
                    <form className='text-right' onSubmit={deleteSelectedIds}>
                      <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                        <h4 className="modal-title">حذف الموظفين المحددين</h4>
                        <button type="button" className="close m-0 p-1" data-dismiss="modal" aria-hidden="true">&times;</button>
                      </div>
                      <div className="modal-body d-flex flex-wrap align-items-center p-3 text-right">
                        <p>هل انت متاكد من حذف هذا السجل؟?</p>
                        <p className="text-warning text-center mt-3"><small>لا يمكن الرجوع في هذا الاجراء.</small></p>
                      </div>
                      <div className="modal-footer flex-nowrap d-flex flex-row align-items-center justify-content-between">
                        <input type="submit" className="btn btn-warning col-6 h-100 px-2 py-3 m-0" value="حذف" />
                        <input type="button" className="btn btn-danger col-6 h-100 px-2 py-3 m-0" data-dismiss="modal" value="اغلاق" />
                      </div>
                    </form>
                  </div>
                </div>
              </div> */}
    </div>
  );
};

export   default Employees;
