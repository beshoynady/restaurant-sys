import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { AppContext } from "../../../../context/appContext";
import "../orders/Orders.css";

const Department = () => {
  const {
    allProducts,
    setIsLoading,
    EditPagination,
    startPagination,
    endPagination,
    setStartPagination,
    setEndPagination,
    handleGetTokenAndConfig,
    apiUrl,
  } = useContext(AppContext);

  const [departmentName, setdepartmentName] = useState("");
  const [isActive, setisActive] = useState(false);

  const [departmentId, setdepartmentId] = useState("");

  const [alldepartments, setAlldepartments] = useState([]);

  const createdepartment = async (event) => {
    event.preventDefault();

    const config = await handleGetTokenAndConfig();

    const departmentData = {
      name: departmentName,
      isActive,
    };

    try {
      const response = await axios.post(
        `${apiUrl}/api/department/`,
        departmentData,
        config
      );
      if (response.status === 409) {
        toast.error("هذا القسم موجود بالفعل تاكد من الاسم.");
      }
      console.log({
        newdepartment: response.data.data,
        departmentData,
      });
      if (response.status === 201) {
        await getAlldepartments();
        toast.success("تم إنشاء قسم الاعداد بنجاح.");
      } else {
        throw new Error("حدث خطأ أثناء إنشاء قسم الاعداد.");
      }
    } catch (error) {
      console.error("حدث خطأ أثناء إرسال الطلب:", error);
      if (error.response) {
        handleErrorResponse(error.response);
      } else {
        toast.error("حدث خطأ أثناء الاتصال بالخادم.");
      }
    }
  };

  const handleErrorResponse = (response) => {
    if (
      response.status === 400 &&
      response.data.message === "Preparation Section name already exists"
    ) {
      toast.error("اسم قسم الاعداد موجود بالفعل. الرجاء اختيار اسم آخر.");
    } else if (response.status === 401) {
      toast.error("انتهت صلاحية الجلسة، رجاء تسجيل الدخول مره أخرى.");
    } else {
      toast.error("حدث خطأ أثناء إنشاء قسم الاعداد. الرجاء المحاولة مرة أخرى.");
    }
  };

  const getAlldepartments = async () => {
    const config = await handleGetTokenAndConfig();

    try {
      const res = await axios.get(`${apiUrl}/api/department`, config);
      if (res.status === 200) {
        const departments = res.data.data;

        setAlldepartments(departments);
      } else {
        throw new Error("Failed to fetch data");
      }
    } catch (error) {
      console.error("حدث خطأ أثناء استلام البيانات:", error);
      toast.error("حدث خطأ أثناء جلب البيانات، يرجى المحاولة مرة أخرى لاحقًا.");
    }
  };

  const editdepartment = async (event) => {
    event.preventDefault();

    const config = await handleGetTokenAndConfig();

    const bodyData = {
      name: departmentName,
      isActive,
    };

    try {
      const editResponse = await axios.put(
        `${apiUrl}/api/department/${departmentId}`,
        bodyData,
        config
      );

      if (editResponse.status === 200) {
        getAlldepartments();
        toast.success("تم تعديل قسم الاعداد بنجاح.");
      } else {
        throw new Error("فشل تعديل قسم الاعداد");
      }
    } catch (error) {
      console.error("حدث خطأ أثناء تعديل قسم الاعداد:", error);
      toast.error("حدث خطأ أثناء تعديل قسم الاعداد. الرجاء المحاولة لاحقًا.");
    }
  };

  const deletedepartment = async (event) => {
    event.preventDefault();

    const config = await handleGetTokenAndConfig();

    try {
      const deleted = await axios.delete(
        `${apiUrl}/api/department/${departmentId}`,
        config
      );
      if (deleted.status === 200) {
        getAlldepartments();
        toast.success("تم حذف قسم الاعداد بنجاح.");
      } else {
        throw new Error("فشل حذف قسم الاعداد");
      }
    } catch (error) {
      console.error("حدث خطأ أثناء حذف قسم الاعداد:", error);
      toast.error("حدث خطأ أثناء حذف قسم الاعداد. الرجاء المحاولة لاحقًا.");
    }
  };

  const searchBydepartmentName = (name) => {
    if (!name) {
      getAlldepartments();
    } else {
      const department = alldepartments
        ? alldepartments.filter(
            (department) => department.name.startsWith(name) === true
          )
        : [];
      setAlldepartments(department);
    }
  };

  const handledepartmentData = (department) => {
    setdepartmentId(department._id);
    setdepartmentName(department.name);
    setisActive(department.isActive);
  };

  useEffect(() => {
    getAlldepartments();
  }, []);

  return (
    <div className="w-100 px-3 d-flex align-itmes-center justify-content-start">
      <div className="table-responsive">
        <div className="table-wrapper p-3 mw-100">
          <div className="table-title">
            <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
              <div className="col-sm-6 text-right">
                <h2>
                  ادارة <b>اقسام اعداد الطلبات</b>
                </h2>
              </div>
              <div className="col-12 col-md-6 p-0 m-0 d-flex flex-wrap align-items-center justify-content-end print-hide">
                <a
                  href="#adddepartmentModal"
                  className="btn btn-success w-100 d-flex align-items-center justify-content-center text-nowrap"
                  data-toggle="modal"
                >
                  <span>اضافه قسم اعداد</span>
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
                  اسم قسم الاعداد
                </label>
                <input
                  type="text"
                  className="form-control border-primary m-0 p-2 h-auto"
                  onChange={(e) => searchBydepartmentName(e.target.value)}
                />
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
                <th>الاسم</th>
                <th>الحالة</th>
                <th>بواسطة</th>
                <th>تعديل</th>
                <th>اجراءات</th>
              </tr>
            </thead>
            <tbody>
              {alldepartments &&
                alldepartments.map((department, i) => {
                  if ((i >= startPagination) & (i < endPagination)) {
                    return (
                      <tr key={i}>
                        {/* <td>
                                  <span className="custom-checkbox">
                                    <input type="checkbox" className="form-check-input form-check-input-lg" id="checkbox1" name="options[]" value="1" />
                                    <label htmlFor="checkbox1"></label>
                                  </span>
                                </td> */}
                        <td>{i + 1}</td>
                        <td>{department.name}</td>
                        <td>{department.isActive ? "متاحة" : "ليست متاحة"}</td>

                        <td>
                          {department.createdBy
                            ? department.createdBy?.username
                            : "غير معروف"}
                        </td>
                        <td>
                          {department.updatedBy
                            ? department.updatedBy?.username
                            : "لا يوجد"}
                        </td>
                        <td>
                          <button
                            data-target="#editdepartmentModal"
                            className="btn btn-sm btn-primary ml-2 "
                            data-toggle="modal"
                            onClick={() => handledepartmentData(department)}
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
                            data-target="#deletedepartmentModal"
                            className="btn btn-sm btn-danger"
                            data-toggle="modal"
                            onClick={() => setdepartmentId(department._id)}
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
                {alldepartments.length > endPagination
                  ? endPagination
                  : alldepartments.length}
              </b>{" "}
              من <b>{alldepartments.length}</b> عنصر
            </div>
            <ul className="pagination">
              <li onClick={EditPagination} className="page-item disabled">
                <a href="#">السابق</a>
              </li>
              <li onClick={EditPagination} className="page-item">
                <a href="#" className="page-link">
                  1
                </a>
              </li>
              <li onClick={EditPagination} className="page-item">
                <a href="#" className="page-link">
                  2
                </a>
              </li>
              <li onClick={EditPagination} className="page-item true">
                <a href="#" className="page-link">
                  3
                </a>
              </li>
              <li onClick={EditPagination} className="page-item">
                <a href="#" className="page-link">
                  4
                </a>
              </li>
              <li onClick={EditPagination} className="page-item">
                <a href="#" className="page-link">
                  5
                </a>
              </li>
              <li onClick={EditPagination} className="page-item">
                <a href="#" className="page-link">
                  التالي
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div id="adddepartmentModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form onSubmit={(e) => createdepartment(e, setIsLoading)}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">اضافه قسم اعداد</h4>
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
                    required
                    value={departmentName}
                    onChange={(e) => setdepartmentName(e.target.value)}
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الحالة
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={isActive.toString()}
                    onChange={(e) => setisActive(e.target.value === "true")}
                  >
                    <option value="">اختر الحالة</option>
                    <option value="true">متاح</option>
                    <option value="false">غير متاح</option>
                  </select>
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

      <div id="editdepartmentModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form onSubmit={editdepartment}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">تعديل قسم الاعداد</h4>
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
                    required
                    value={departmentName}
                    onChange={(e) => setdepartmentName(e.target.value)}
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الحالة
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={isActive.toString()} // تحويل قيمة isActive إلى سلسلة نصية
                    onChange={(e) => setisActive(e.target.value === "true")} // تحويل القيمة المحددة إلى قيمة بوليانية
                  >
                    <option value="true">متاح</option>
                    <option value="false">غير متاح</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer d-flex flex-nowrap align-items-center justify-content-between m-0 p-1">
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

      <div id="deletedepartmentModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form onSubmit={deletedepartment}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">حذف قسم اعداد</h4>
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
                <p>هل انت متاكد من حذف هذا قسم الاعداد?</p>
                <p className="text-warning text-center mt-3">
                  <small>لا يمكن الرجوع فيه.</small>
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

export default Department;
