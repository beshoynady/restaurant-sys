import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AppContext } from "../../../../context/appContext";
import { toast } from "react-toastify";
import "../orders/Orders.css";

const Users = () => {
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

  const permissionUser = permissionsList?.filter(
    (permission) => permission.resource === "Users"
  )[0];

  const [AllUsers, setAllUsers] = useState([]);

  const getAllUsers = async () => {
    try {
      const config = await handleGetTokenAndConfig();
      if (permissionUser && !permissionUser.read) {
        toast.warn("ليس لك صلاحية لعرض بيانات المستخدمين");
        return;
      }
      const response = await axios.get(apiUrl + "/api/user", config);
      setAllUsers(response.data);
    } catch (error) {}
  };
  const changeorderVarified = async (e, id) => {
    if (permissionUser && !permissionUser.update) {
      toast.warn("ليس لك صلاحية لتعديل بيانات المستخدمين");
      return;
    }
    try {
      const config = await handleGetTokenAndConfig();

      // Get the value from the event
      const isVarified = e.target.value;

      // Send a request to update the 'isVarified' status
      const response = await axios.put(
        `${apiUrl}/api/user/update-status/${id}`,
        { isVarified },
        config
      );

      // Notify success using toast
      toast.success("تم تغير الحاله بنجاح");

      // Reload the user list or perform necessary actions
      getAllUsers();
    } catch (error) {
      // Handle errors and notify using toast
      console.error(error);
      toast.error("فشل تغير الحاله");
    }
  };

  const changeorderActive = async (e, id) => {
    if (permissionUser && !permissionUser.update) {
      toast.warn("ليس لك صلاحية لتعديل بيانات المستخدمين");
      return;
    }
    try {
      const config = await handleGetTokenAndConfig();

      // put the value from the event
      const isActive = e.target.value;

      // Send a request to update the 'isActive' status
      const response = await axios.put(
        `${apiUrl}/api/user/update-status/${id}`,
        { isActive },
        config
      );

      // Notify success using toast
      toast.success("تم تغير الحاله بنجاح");

      // Reload the user list or perform necessary actions
      getAllUsers();
    } catch (error) {
      // Handle errors and notify using toast
      console.error(error);
      toast.error("فشل تغير الحاله");
    }
  };

  const [userid, setUserid] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [deliveryArea, setDeliveryArea] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [isVarified, setIsVarified] = useState(false);

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    if (permissionUser && !permissionUser.update) {
      toast.warn("ليس لك صلاحية لتعديل بيانات المستخدمين");
      return;
    }
    try {
      const config = await handleGetTokenAndConfig();

      const response = await axios.put(`${apiUrl}/api/user/${userid}`, {
        username,
        email,
        address,
        deliveryArea,
        phone,
        // password,
        isActive,
        isVarified,
      });
      //
      if (response.status === 200) {
        toast.success("تم تحديث المستخدم بنجاح");
      }
    } catch (error) {
      toast.error(error.response.data.message || "حدث خطأ ما");
    }
  };
  const handelEditUser = (user) => {
    setUserid(user._id);
    setUsername(user.username);
    setEmail(user.email);
    setAddress(user.address);
    setDeliveryArea(user.deliveryArea);
    setPhone(user.phone);
    setIsActive(user.isActive);
    setIsVarified(user.isVarified);
  };

  const getUserByPhone = async (phone) => {
    if (!phone) {
      getAllUsers();
      return;
    }

    const user = AllUsers.filter((user) => user.phone.startsWith(phone));
    setAllUsers(user);
  };

  const [Areas, setAreas] = useState([]);
  const getAllDeliveryAreas = async () => {
    try {
      const config = await handleGetTokenAndConfig();
      const response = await axios.get(`${apiUrl}/api/deliveryarea`);
      const data = await response.data;
      //
      if (data) {
        setAreas(data);
      } else {
        toast.error(
          "لا يوجد بيانات لمنطقه التوصيل ! اضف بيانات منطقه التوصيل "
        );
      }
    } catch (error) {
      toast.error("حدث خطأ اثناء جلب بيانات منطقه التوصيل! اعد تحميل الصفحة");
    }
  };

  useEffect(() => {
    getAllUsers();
    getAllDeliveryAreas();
  }, []);

  return (
    <div className="w-100 px-3 d-flex align-itmes-center justify-content-start">
      <div className="table-responsive">
        <div className="table-wrapper p-3 mw-100">
          <div className="table-title">
            <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
              <div className="text-right">
                <h2>
                  ادارة <b>المستخدمين</b>
                </h2>
              </div>
              {/* <div className="col-12 col-md-6 p-0 m-0 d-flex flex-wrap aliegn-items-center justify-content-end print-hide">
                        <a href="#adduserModal" className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-success" data-toggle="modal"> <span>اضافة موظف جديد</span></a>
                        <a href="#deleteuserModal" className="d-flex align-items-center justify-content-center h-100 m-0 btn btn-danger" data-toggle="modal"> <span>حذف الكل</span></a>
                      </div> */}
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
                  onChange={(e) => getUserByPhone(e.target.value)}
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
                      setAllUsers(filterByTime(e.target.value, AllUsers))
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
                      onClick={() => setAllUsers(filterByDateRange(AllUsers))}
                    >
                      <i className="fa fa-search"></i>
                    </button>
                    <button
                      type="button"
                      className="btn btn-warning h-100 p-2"
                      onClick={getAllUsers}
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
                <th>الاسم</th>
                <th>الموبايل</th>
                <th>المنطقه</th>
                <th>العنوان</th>
                <th>الايميل</th>
                <th>نشط</th>
                <th>موثق</th>
                <th>التاريخ</th>
                <th>اجراءات</th>
              </tr>
            </thead>
            <tbody>
              {AllUsers.length > 0 &&
                AllUsers.map((user, i) => {
                  if ((i >= startPagination) & (i < endPagination)) {
                    return (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{user.username}</td>
                        <td>{user.phone}</td>
                        <td>
                          {user.deliveryArea
                            ? user.deliveryArea.name
                            : "لم يحدد"}
                        </td>
                        <td>{user.address}</td>
                        <td>{user.email}</td>
                        <td>
                          <select
                            className="form-control border-primary m-0 p-2 h-auto"
                            name="status"
                            id="status"
                            form="carform"
                            onChange={(e) => {
                              changeorderActive(e, user._id);
                            }}
                          >
                            <option>{user.isActive ? "نشط" : "غير نشط"}</option>
                            <option value={true} key={i}>
                              نشط
                            </option>
                            <option value={false} key={i}>
                              غير نشط
                            </option>
                          </select>
                        </td>
                        <td>
                          <select
                            className="form-control border-primary m-0 p-2 h-auto"
                            name="status"
                            id="status"
                            form="carform"
                            onChange={(e) => {
                              changeorderVarified(e, user._id);
                            }}
                          >
                            <option>
                              {user.isVarified ? "موثق" : "غير موثق"}
                            </option>
                            <option value={true} key={i}>
                              موثق
                            </option>
                            <option value={false} key={i}>
                              غير موثق
                            </option>
                          </select>
                        </td>
                        <td>{formatDateTime(user.createdAt)}</td>
                        <td>
                          <button
                            data-target="#edituserModal"
                            className="btn btn-sm btn-primary ml-2 "
                            data-toggle="modal"
                          >
                            <i
                              className="material-icons"
                              data-toggle="tooltip"
                              title="Edit"
                              onClick={() => {
                                handelEditUser(user);
                              }}
                            >
                              &#xE254;
                            </i>
                          </button>
                          <button
                            data-target="#deleteuserModal"
                            className="btn btn-sm btn-danger"
                            data-toggle="modal"
                          >
                            <i
                              className="material-icons"
                              data-toggle="tooltip"
                              title="Delete"
                              //    onClick={() => setuserloyeeid(user._id)}
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
                {AllUsers.length > endPagination
                  ? endPagination
                  : AllUsers.length}
              </b>{" "}
              من <b>{AllUsers.length}</b> عنصر
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

      {/* <div id="adduserModal" className="modal fade">
                <div className="modal-dialog modal-lg">
                  <div className="modal-content shadow-lg border-0 rounded ">
                    <form onSubmit={createuserloyee}>
                      <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                        <h4 className="modal-title">اضافه موظف</h4>
                        <button type="button" className="close m-0 p-1" data-dismiss="modal" aria-hidden="true">&times;</button>
                      </div>
                      <div className="modal-body d-flex flex-wrap align-items-center p-3 text-right">
                        <div className="form-group col-12 col-md-6">
                          <label className="form-label text-wrap text-right fw-bolder p-0 m-0">الاسم</label>
                          <input type="text" className="form-control border-primary m-0 p-2 h-auto" required pattern="[A-Za-z\u0600-\u06FF\s]+" onChange={(e) => setusername(e.target.value)} />
                          <div className="invalid-feedback">Please enter a valid name.</div>
                        </div>
                        <div className="form-group col-12 col-md-6">
                          <label className="form-label text-wrap text-right fw-bolder p-0 m-0">اسم المستخدم</label>
                          <input type="text" className="form-control border-primary m-0 p-2 h-auto" required onChange={(e) => setusername(e.target.value)} />
                        </div>
                        <div className="form-group col-12 col-md-6">
                          <label className="form-label text-wrap text-right fw-bolder p-0 m-0">الموبايل</label>
                          <input type="text" className="form-control border-primary m-0 p-2 h-auto" required pattern="[0-9]{11}" onChange={(e) => setphone(e.target.value)} />
                          <div className="invalid-feedback">Please enter a valid phone number (11 digits).</div>
                        </div>
                        <div className="form-group col-12 col-md-6">
                          <label className="form-label text-wrap text-right fw-bolder p-0 m-0">الباسورد</label>
                          <input type="text" className="form-control border-primary m-0 p-2 h-auto" required onChange={(e) => setpassword(e.target.value)} />
                        </div>
                        <div className="form-group col-12 col-md-6">
                          <label className="form-label text-wrap text-right fw-bolder p-0 m-0">الرقم القومي</label>
                          <input type="text" className="form-control border-primary m-0 p-2 h-auto" required onChange={(e) => setnumberID(e.target.value)} />
                        </div>
                        <div className="form-group col-12 col-md-6">
                          <label className="form-label text-wrap text-right fw-bolder p-0 m-0">الايميل</label>
                          <input type="email" className="form-control border-primary m-0 p-2 h-auto" required onChange={(e) => setemail(e.target.value)} />
                          <div className="invalid-feedback">Please enter a valid email address.</div>
                        </div>
                        <div className="form-group col-12 col-md-6">
                          <label className="form-label text-wrap text-right fw-bolder p-0 m-0">العنوان</label>
                          <textarea className="form-control border-primary m-0 p-2 h-auto" required onChange={(e) => setaddress(e.target.value)}></textarea>
                        </div>
                        <div className="form-group col-12 col-md-6">
                          <label className="form-label text-wrap text-right fw-bolder p-0 m-0">الحالة</label>
                          <select className="form-control border-primary m-0 p-2 h-auto" form="carform" required onChange={(e) => setisActive(e.target.value)}>
                            <option value="">اختر</option>
                            <option value={true}>متاح</option>
                            <option value={false}>ليس متاح</option>
                          </select>
                        </div>
                        <div className="form-group col-12 col-md-6">
                          <label className="form-label text-wrap text-right fw-bolder p-0 m-0">الوظيفه</label>
                          <select className="form-control border-primary m-0 p-2 h-auto"  name={role} form="carform" required onChange={(e) => setrole(e.target.value)}>
                            <option>اختار وظيفة</option>
                            <option value="manager">مدير</option>
                            <option value="cashier">كاشير</option>
                            <option value="deliveryman">الديلفري</option>
                            <option value="waiter">ويتر</option>
                            <option value="chef">شيف</option>
                          </select>
                        </div>
                        <div className="form-group col-12 col-md-6">
                          <label className="form-label text-wrap text-right fw-bolder p-0 m-0">المرتب الاساسي</label>
                          <input type="Number" min={0} className="form-control border-primary m-0 p-2 h-auto" required onChange={(e) => setbasicSalary(e.target.value)} />
                          <div className="invalid-feedback">Please enter a valid salary.</div>
                        </div>
                      </div>
                      <div className="modal-footer d-flex flex-nowrap align-items-center justify-content-between m-0 p-1">
                        <input type="button" className="btn btn-danger col-6 h-100 px-2 py-3 m-0" data-dismiss="modal" value="اغلاق" />
                        <input type="submit" className="btn btn-success col-6 h-100 px-2 py-3 m-0"  value="اضافه" />
                      </div>
                    </form>
                  </div>
                </div>
              </div> */}

      <div id="edituserModal" className="modal fade">
        <div className="modal-dialog modal-lg">
          <div className="modal-content shadow-lg border-0 rounded ">
            <form onSubmit={handleUpdateUser}>
              <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                <h4 className="modal-title">تعديل بيانات العملاء</h4>
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
                    value={username}
                    required
                    pattern="[A-Za-z\u0600-\u06FF\s]+"
                    onChange={(e) => setUsername(e.target.value)}
                  />
                  <div className="invalid-feedback">الرجاء إدخال اسم صحيح.</div>
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الموبايل
                  </label>
                  <input
                    type="text"
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={phone}
                    required
                    pattern="[0-9]{11}"
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <div className="invalid-feedback">
                    الرجاء إدخال رقم هاتف صحيح (11 رقم).
                  </div>
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الباسورد
                  </label>
                  <input
                    type="password"
                    className="form-control border-primary m-0 p-2 h-auto"
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الايميل
                  </label>
                  <input
                    type="email"
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={email}
                    required
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <div className="invalid-feedback">
                    الرجاء إدخال عنوان بريد إلكتروني صحيح.
                  </div>
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    العنوان
                  </label>
                  <textarea
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={address}
                    required
                    onChange={(e) => setAddress(e.target.value)}
                  ></textarea>
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    الحالة
                  </label>
                  <select
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={isActive}
                    required
                    onChange={(e) => setIsActive(e.target.value === "true")}
                  >
                    <option value="">اختر</option>
                    <option value="true">متاح</option>
                    <option value="false">ليس متاح</option>
                  </select>
                </div>
                <div className="form-group col-12 col-md-6">
                  <label className="form-label text-wrap text-right fw-bolder p-0 m-0">
                    المنطقة
                  </label>
                  <select
                    name="area"
                    className="form-control border-primary m-0 p-2 h-auto"
                    value={deliveryArea}
                    required
                    onChange={(e) => setDeliveryArea(e.target.value)}
                  >
                    <option value="">اختار المنطقه</option>
                    {Areas.map((area) => (
                      <option key={area._id} value={area._id}>
                        {area.name}
                      </option>
                    ))}
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
                  value="اغلاق"
                />
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* <div id="deleteuserModal" className="modal fade">
                <div className="modal-dialog modal-lg">
                  <div className="modal-content shadow-lg border-0 rounded ">
                    <form onSubmit={deleteuserloyee}>
                      <div className="modal-header d-flex flex-wrap align-items-center text-light bg-primary">
                        <h4 className="modal-title">حذف موظف</h4>
                        <button type="button" className="close m-0 p-1" data-dismiss="modal" aria-hidden="true">&times;</button>
                      </div>
                      <div className="modal-body d-flex flex-wrap align-items-center p-3 text-right">
                        <p>هل انت متاكد من حذف هذا السجل؟?</p>
                        <p className="text-warning text-center mt-3"><small>لا يمكن الرجوع في هذا الاجراء.</small></p>
                      </div>
                      <div className="modal-footer d-flex flex-nowrap align-items-center justify-content-between m-0 p-1">
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

export default Users;
