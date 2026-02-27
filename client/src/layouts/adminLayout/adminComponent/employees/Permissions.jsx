import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { dataContext } from "../../../../context/appContext";
import { toast } from "react-toastify";
import "../orders/Orders.css";

const PermissionsComponent = () => {
  const {
    employeeLoginInfo,
    formatDateTime,
    setIsLoading,
    EditPagination,
    startPagination,
    endPagination,
    setStartPagination,
    setEndPagination,
    apiUrl,
    handleGetTokenAndConfig,
  } = useContext(dataContext);

  const [listOfEmployees, setListOfEmployees] = useState([]);

  const getEmployees = async () => {
    try {
      const config = await handleGetTokenAndConfig();
      const response = await axios.get(`${apiUrl}/api/employee`, config);

      if (response.status === 200) {
        const data = response.data;
        setListOfEmployees(data);
      } else {
        throw new Error("Failed to fetch employees: Unexpected status code");
      }
    } catch (error) {
      console.error("Error fetching employees:", error.message);
    }
  };

  const [permissionsList, setpermissionsList] = useState([]);

  const getPermissions = async () => {
    try {
      const config = await handleGetTokenAndConfig();
      const response = await axios.get(`${apiUrl}/api/permission`, config);

      if (response.status === 200) {
        const data = response.data;
        setpermissionsList(data);
      } else {
        throw new Error(
          `فشل في جلب الصلاحيات: رمز حالة غير متوقع ${response.status}`
        );
      }
    } catch (error) {
      console.error("Error fetching permissions:", error);
      toast.error(
        `خطأ في جلب الصلاحيات: ${error.message || "حدث خطأ غير متوقع"}`
      );
    }
  };

  const [permissionsListEn, setpermissionsListEn] = useState([
    "Employees",
    "Attendance",
    "Employee Transactions",
    "Payroll",
    "Cash Register",
    "Cash Movement",
    "stock Item",
    "stock Categories",
    "stock Movement",
    "store",
    "Orders",
    "Tables",
    "Table Reservations",
    "Permissions",
    "Delivery Zones",
    "Shifts",
    "Expenses",
    "Daily Expenses",
    "Menu Categories",
    "Products",
    "Recipes",
    "Production",
    "Stock Production Recipes",
    "Production Order",
    "Production Record",
    "Section Consumption",
    "Purchases",
    "Purchase Returns",
    "Supplier Data",
    "Supplier Transactions",
    "Users",
    "Messages",
    "Restaurant Settings",
  ]);

  const [permissionsListAr, setpermissionsListAr] = useState([
    "الموظفين",
    "تسجيل الحضور",
    "معاملات الموظفين",
    "دفع المرتبات",
    "سجل النقدية",
    "حركة النقدية",
    "عنصر المخزن",
    "تصنيفات المخزن",
    "إدارة المخزن",
    "المخازن",
    "الطلبات",
    "الطاولة",
    "حجز الطاولات",
    "الصلاحيات",
    "مناطق التوصيل",
    "الوردية",
    "المصروفات",
    "سجل المصروفات",
    "تصنيفات المنيو",
    "المنتجات",
    "الوصفات",
    "التصنيع",
    "وصفات تصنيع",
    "طلبات التصنيع",
    "سجل التصنيع",
    "استهلاك القسم",
    "المشتريات",
    "مرتجع المشتريات",
    "بيانات الموردين",
    "تعاملات مع الموردين",
    "المستخدمين",
    "الرسائل",
    "اعدادات المطعم",
  ]);

  const [employeeid, setemployeeid] = useState("");
  const [Permissions, setPermissions] = useState([]);

  const handeladdPermissions = (e, i) => {
    //
    //
    const resource = permissionsListEn[i];
    const action = e.target.value;
    let updatePermissions = [...Permissions];
    const findPermission = updatePermissions.filter(
      (permission) => permission.resource === resource
    );

    if (findPermission.length > 0) {
      updatePermissions.map((permission, ind) => {
        if (permission.resource === resource) {
          if (action === "create") {
            permission.create = !permission.create;
            if (permission.create === true) {
              permission.read = true;
            }
          } else if (action === "update") {
            permission.update = !permission.update;
            if (permission.update === true) {
              permission.read = true;
            }
          } else if (action === "read") {
            permission.read = !permission.read;
          } else if (action === "delete") {
            permission.delete = !permission.delete;
            if (permission.delete === true) {
              permission.read = true;
            }
          }
          //

          if (
            !permission.create &&
            !permission.update &&
            !permission.read &&
            !permission.delete
          ) {
            const update = updatePermissions.filter(
              (per) => per.resource !== resource
            );
            updatePermissions = [...update];
          }
          //
        }
      });
    } else {
      let newPermission = {
        resource: resource,
        create: false,
        update: false,
        read: true,
        delete: false,
      };
      newPermission[action] = true;
      updatePermissions.push(newPermission);

      newPermission = {
        resource: resource,
        create: false,
        update: false,
        read: false,
        delete: false,
      };
      //
    }
    //
    setPermissions([...updatePermissions]);
  };

  const addAllPermissions = (action) => {
    let updatePermissions = [...Permissions];

    permissionsListEn.map((permission) => {
      const findPermission = updatePermissions.find(
        (pe) => pe.resource === permission
      );
      if (findPermission) {
        if (action === "create") {
          findPermission.create = findPermission.create ? false : true;
          findPermission.read = true;
        }
        if (action === "read") {
          findPermission.read = findPermission.read ? false : true;
        }
        if (action === "update") {
          findPermission.update = findPermission.update ? false : true;
          findPermission.read = true;
        }
        if (action === "delete") {
          findPermission.delete = findPermission.delete ? false : true;
          findPermission.read = true;
        }
      } else {
        let newPermission = {};
        newPermission.resource = permission;
        newPermission[action] = true;
        newPermission.read = true;
        updatePermissions.push(newPermission);
      }
    });

    setPermissions([...updatePermissions]);
  };

  const addPermissions = async (e) => {
    e.preventDefault();
    //

    try {
      const config = await handleGetTokenAndConfig();
      if (!employeeid || !Permissions || Permissions.length === 0) {
        toast.error(
          "اختار الموظف و الصلاحيات بشكل صحيح! اعد تحميل الصفحة ثم اعد المحاوله مره اخري."
        );
        return;
      }

      let response;

      if (!permissionEmployee || !permissionEmployee._id) {
        response = await axios.post(
          `${apiUrl}/api/permission`,
          {
            employee: employeeid,
            Permissions,
          },
          config
        );
        toast.success("تم انشاء الصلاحيات بنجاح");
      } else {
        const id = permissionEmployee._id;
        if (!id) {
          toast.error(
            "فشل في الوصول الي صلاحيات الموظف لتعديلها ! اعد تحميل الصفحة و حاول مره اخري."
          );
          return;
        }

        response = await axios.put(
          `${apiUrl}/api/permission/${id}`,
          {
            Permissions,
          },
          config
        );
        if (response) {
          toast.success("تم تعديل او اضافه الصلاحيات بنجاح");
        } else {
          toast.error(
            "فشل تعديل صلاحيات الموظف ! اعد تحميل الصفحة و حاول مره اخري."
          );
        }
      }
    } catch (error) {
      console.error("Error updating permissions:", error);
      toast.error("حدث خطأ اثناء اضافه الصلاحيات.");
    }
  };

  const [selectedEmployee, setselectedEmployee] = useState({});
  const [permissionEmployee, setpermissionEmployee] = useState({});

  const getEmployeesByName = (name) => {
    if (!name) {
      setselectedEmployee(null);
    } else if (listOfEmployees.length > 0) {
      const selectedEmployees = listOfEmployees.filter((employee) =>
        employee.fullname.toLowerCase().startsWith(name.toLowerCase())
      );

      if (selectedEmployees.length > 0) {
        const selectedEmployee = selectedEmployees[0];
        setselectedEmployee(selectedEmployee);
        setemployeeid(selectedEmployee._id);

        const permissionEmployee = permissionsList
          ? permissionsList.filter(
              (permission) => permission.employee?._id === selectedEmployee._id
            )[0]
          : null;

        if (permissionEmployee) {
          setpermissionEmployee(permissionEmployee);
          setPermissions(permissionEmployee.Permissions);
          //
          //
        } else {
          setpermissionEmployee([]);
          setPermissions([]);
          toast.info("هذا الموظف ليس له اي صلاحيات");
        }
      } else {
        setselectedEmployee(null);
      }
    }
  };

  const getEmployeesById = (id) => {
    try {
      if (!id) {
        setselectedEmployee(null);
        setemployeeid("");
        setpermissionEmployee({});
        setPermissions([]);
        return;
      }

      if (!Array.isArray(listOfEmployees) || listOfEmployees.length === 0) {
        console.error("listOfEmployees is empty or not an array");
        return;
      }

      const selectedEmployee = listOfEmployees.find(
        (employee) => employee._id === id
      );

      if (!selectedEmployee) {
        setselectedEmployee(null);
        setemployeeid("");
        setpermissionEmployee({});
        setPermissions([]);
        toast.error("لم يتم العثور على الموظف");
        return;
      }

      setselectedEmployee(selectedEmployee);
      setemployeeid(selectedEmployee._id);
      const permissionEmployee = permissionsList
        ? permissionsList.find(
            (permission) => permission.employee?._id === selectedEmployee._id
          )
        : null;

      if (permissionEmployee) {
        setpermissionEmployee(permissionEmployee);
        setPermissions(permissionEmployee.Permissions);
      } else {
        setpermissionEmployee({});
        setPermissions([]);
        toast.info("هذا الموظف ليس له أي صلاحيات");
      }
    } catch (error) {
      console.error("An error occurred in getEmployeesById:", error);
      toast.error("حدث خطأ غير متوقع");
    }
  };

  useEffect(() => {
    getPermissions();
    getEmployees();
  }, []);

  return (
    <dataContext.Consumer>
      {({
        brandInfo,
        setIsLoading,
        EditPagination,
        startPagination,
        endPagination,
        setStartPagination,
        setEndPagination,
      }) => {
        return (
          <div className="col-md-8 co;-12 px-3 d-flex align-itmes-center justify-content-start">
            <div className="table-responsive">
              <div className="table-wrapper p-3 mw-100">
                <div className="table-title">
                  <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
                    <div className="text-right">
                      <h2>
                        ادارة <b>صلاحيات الموظفين</b>
                      </h2>
                    </div>
                    <div className="col-12 col-md-6 p-0 m-0 d-flex flex-wrap aliegn-items-center justify-content-end print-hide">
                      <a
                        className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-success"
                        onClick={addPermissions}
                      >
                        {" "}
                        <span>حفظ</span>
                      </a>
                      <a
                        className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-danger"
                        onClick={getPermissions}
                      >
                        {" "}
                        <span>الغاء</span>
                      </a>
                    </div>
                  </div>
                </div>
                <div className="table-filter print-hide">
                  <div className="w-100 d-flex flex-column text-dark">
                    <div className="w-100 d-flex flex-nowrap align-items-center justify-content-between mb-2 m-0 p-0">
                      <div className="filter-group d-flex flex-wrap align-items-center justify-content-between col-4 p-0 mb-1">
                        <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                          الاسم
                        </label>
                        <input
                          type="text"
                          className="form-control border-primary m-0 p-2 h-auto"
                          onChange={(e) => getEmployeesByName(e.target.value)}
                        />
                      </div>
                      <div className="filter-group d-flex flex-wrap align-items-center justify-content-between col-4 p-0 mb-1">
                        <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                          الموظف
                        </label>
                        <select
                          className="form-control border-primary m-0 p-2 h-auto"
                          onChange={(e) => getEmployeesById(e.target.value)}
                        >
                          <option value="">الكل</option>
                          {listOfEmployees &&
                            listOfEmployees.map((employee, i) => (
                              <option key={i} value={employee._id}>
                                {employee.fullname}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                    <div className="w-100 d-flex flex-nowrap align-items-center justify-content-between m-0 p-0">
                      <div className="filter-group d-flex flex-wrap align-items-center justify-content-between col-4 p-0 mb-1">
                        <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                          اسم الموظف
                        </label>
                        <input
                          type="text"
                          className="form-control border-primary m-0 p-2 h-auto"
                          value={
                            selectedEmployee ? selectedEmployee.fullname : ""
                          }
                          readOnly
                        />
                      </div>

                      <div className="filter-group d-flex flex-wrap align-items-center justify-content-between col-4 p-0 mb-1">
                        <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                          الوظية
                        </label>
                        <input
                          type="text"
                          className="form-control border-primary m-0 p-2 h-auto"
                          value={selectedEmployee ? selectedEmployee.role : ""}
                          readOnly
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <table className="table table-striped table-hover">
                  <thead className="thead-light">
                    <tr>
                      <th scope="col"></th>
                      <th scope="col" style={{ width: "30%" }}>
                        اسم
                      </th>
                      <th
                        scope="col"
                        onClick={() => addAllPermissions("create")}
                      >
                        إنشاء{" "}
                        <i
                          className="fas fa-plus-circle"
                          data-toggle="tooltip"
                          data-placement="top"
                          title="Permission to create"
                        ></i>
                      </th>
                      <th
                        scope="col"
                        onClick={() => addAllPermissions("update")}
                      >
                        تعديل{" "}
                        <i
                          className="fas fa-edit"
                          data-toggle="tooltip"
                          data-placement="top"
                          title="Permission to edit"
                        ></i>
                      </th>
                      <th scope="col" onClick={() => addAllPermissions("read")}>
                        عرض{" "}
                        <i
                          className="fas fa-eye"
                          data-toggle="tooltip"
                          data-placement="top"
                          title="Permission to view"
                        ></i>
                      </th>
                      <th
                        scope="col"
                        onClick={() => addAllPermissions("delete")}
                      >
                        حذف{" "}
                        <i
                          className="fas fa-trash-alt"
                          data-toggle="tooltip"
                          data-placement="top"
                          title="Permission to delete"
                        ></i>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {permissionsListAr.map((permission, i) => {
                      //
                      return (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td>{permission}</td>
                          <td className="text-center">
                            <input
                              type="checkbox"
                              value="create"
                              className="form-check-input position-relative"
                              checked={
                                Array.isArray(Permissions)
                                  ? Permissions.filter(
                                      (per) =>
                                        per.resource === permissionsListEn[i]
                                    )[0]?.create
                                  : false
                              }
                              onChange={(e) => handeladdPermissions(e, i)}
                            />
                          </td>
                          <td className="text-center">
                            <input
                              type="checkbox"
                              value="update"
                              className="form-check-input position-relative"
                              checked={
                                Array.isArray(Permissions)
                                  ? Permissions.filter(
                                      (per) =>
                                        per.resource === permissionsListEn[i]
                                    )[0]?.update
                                  : false
                              }
                              onChange={(e) => handeladdPermissions(e, i)}
                            />
                          </td>
                          <td className="text-center">
                            <input
                              type="checkbox"
                              value="read"
                              className="form-check-input position-relative"
                              checked={
                                Array.isArray(Permissions)
                                  ? Permissions.filter(
                                      (per) =>
                                        per.resource === permissionsListEn[i]
                                    )[0]?.read
                                  : false
                              }
                              onChange={(e) => handeladdPermissions(e, i)}
                            />
                          </td>
                          <td className="text-center">
                            <input
                              type="checkbox"
                              value="delete"
                              className="form-check-input position-relative"
                              checked={
                                Array.isArray(Permissions)
                                  ? Permissions.filter(
                                      (per) =>
                                        per.resource === permissionsListEn[i]
                                    )[0]?.delete
                                  : false
                              }
                              onChange={(e) => handeladdPermissions(e, i)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      }}
    </dataContext.Consumer>
  );
};

export default PermissionsComponent;
