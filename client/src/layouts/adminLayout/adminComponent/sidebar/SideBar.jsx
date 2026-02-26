import React, { useState, useEffect, useRef, useContext } from "react";
import { dataContext } from "../../../../App";

import { Link } from "react-router-dom";

import "./SideBar.css";

const SideBar = () => {
  const arrowRefs = {
    arrowsetting: useRef(),
    arrowmenue: useRef(),
    arrowemployee: useRef(),
    arrowstory: useRef(),
    arrowmessage: useRef(),
    arrowsexpinsev: useRef(),
    arrowssupplier: useRef(),
    arrowsCash: useRef(),
    arrowtable: useRef(),
    arrowreports: useRef(),
  };

  const sidebarRef = useRef();

  const openSubMenu = (arrowRef) => {
    arrowRef.current.classList.toggle("showMenu");
  };

  const openSidebar = () => {
    sidebarRef.current.classList.toggle("close");
  };

  useEffect(() => {
    const navLinks = document.querySelectorAll(
      ".side-bar.close .navlinks .list"
    );

    navLinks.forEach((link) => {
      link.addEventListener("click", () => {
        link.classList.toggle("hover");
      });
    });

    return () => {
      navLinks.forEach((link) => {
        link.removeEventListener("click", () => {
          link.classList.toggle("hover");
        });
      });
    };
  }, []);

  return (
    <dataContext.Consumer>
      {({ brandInfo, permissionsList, employeeLoginInfo }) => {
        const role = employeeLoginInfo ? employeeLoginInfo.role : "";
        const isOwner = employeeLoginInfo.isOwner || employeeLoginInfo.isAdmin;

        return (
          <>
            <div className="side-bar-icon" onClick={openSidebar}>
              <div className="side-bar-icon-content">
                <i className="bx bx-menu text-light"></i>
              </div>
            </div>
            <div
              ref={sidebarRef}
              className="side-bar close"
              style={{ scrollbarWidth: "thin" }}
            >
              <div className="logo-details">
                <i className="bx bxl-c-plus-plus"></i>
                <span className="logo_name">{brandInfo.name}</span>
              </div>
              <ul className="navlinks overflowX-hidden">
                {(isOwner ||
                  role === "cashier" ||
                  role === "manager" ||
                  role === "owner") && (
                  <li className="list">
                    <Link to="/admin">
                      <span className="material-symbols-outlined list-icon ml-2">
                        dashboard
                      </span>
                      <span className="linkname">لوحة التحكم</span>
                    </Link>
                    <ul className="submenu blank">
                      <li className="list">
                        <Link to="/admin" className="linkname">
                          لوحة التحكم
                        </Link>
                      </li>
                    </ul>
                  </li>
                )}

                {/* managerdashboard */}
                {(isOwner || role === "manager" || role === "owner") && (
                  <li className="list">
                    <Link to="managerdashboard">
                      <span className="material-symbols-outlined list-icon ml-2">
                        dashboard
                      </span>
                      <span className="linkname">داش بورد</span>
                    </Link>
                    <ul className="submenu blank">
                      <li className="list">
                        <Link to="managerdashboard" className="linkname">
                          داش بورد
                        </Link>
                      </li>
                    </ul>
                  </li>
                )}
                {/* POS */}
                {(isOwner ||
                  role === "cashier" ||
                  role === "waiter" ||
                  role === "manager" ||
                  role === "owner") && (
                  <li className="list">
                    <Link to="pos">
                      <span className="material-symbols-outlined list-icon ml-2">
                        point_of_sale
                      </span>
                      <span className="linkname">نقطة البيع</span>
                    </Link>
                    <ul className="submenu blank">
                      <li className="list">
                        <Link to="pos" className="linkname">
                          نقطة البيع
                        </Link>
                      </li>
                    </ul>
                  </li>
                )}

                {/* Kitchen */}
                {(isOwner ||
                  role === "chef" ||
                  role === "manager" ||
                  role === "owner") && (
                  <li className="list">
                    <Link to="preparationscreen">
                      <span className="material-symbols-outlined list-icon ml-2">
                        cooking
                      </span>
                      <span className="linkname">قسم الاعداد</span>
                    </Link>
                    <ul className="submenu blank">
                      <li className="list">
                        <Link to="preparationscreen" className="linkname">
                          قسم الاعداد
                        </Link>
                      </li>
                    </ul>
                  </li>
                )}

                {/* Waiter */}
                {(isOwner ||
                  role === "manager" ||
                  role === "owner" ||
                  role === "waiter") && (
                  <li className="list">
                    <Link to="waiter">
                      <span className="material-symbols-outlined list-icon ml-2">
                        concierge
                      </span>
                      <span className="linkname">الويتر</span>
                    </Link>
                    <ul className="submenu blank">
                      <li className="list">
                        <Link to="waiter" className="linkname">
                          الويتر
                        </Link>
                      </li>
                    </ul>
                  </li>
                )}

                {/* Deliveryman */}
                {(isOwner ||
                  role === "deliveryman" ||
                  role === "manager" ||
                  role === "owner") && (
                  <li className="list">
                    <Link to="deliveryman">
                      <span className="material-symbols-outlined list-icon ml-2">
                        directions_bike
                      </span>
                      <span className="linkname">الديلفري</span>
                    </Link>
                    <ul className="submenu blank">
                      <li className="list">
                        <Link to="deliveryman" className="linkname">
                          الديلفري
                        </Link>
                      </li>
                    </ul>
                  </li>
                )}

                {/* Orders */}
                {(isOwner ||
                  permissionsList?.filter(
                    (permission) => permission.resource === "Orders"
                  )[0]?.read) && (
                  <li className="list">
                    <Link to="orders">
                      <span className="material-symbols-outlined list-icon ml-2">
                        list_alt
                      </span>
                      <span className="linkname">الطلبات</span>
                    </Link>
                    <ul className="submenu blank">
                      <li className="list">
                        <Link to="orders" className="linkname">
                          الطلبات
                        </Link>
                      </li>
                    </ul>
                  </li>
                )}
                {(isOwner ||
                  permissionsList?.filter(
                    (permission) => permission.resource === "Orders"
                  )[0]?.read) && (
                  <li className="list">
                    <Link to="preparationticket">
                      <span className="material-symbols-outlined list-icon ml-2">
                        checklist
                      </span>
                      <span className="linkname">تذاكر الاعداد</span>
                    </Link>
                    <ul className="submenu blank">
                      <li className="list">
                        <Link to="preparationticket" className="linkname">
                          تذاكر الاعداد
                        </Link>
                      </li>
                    </ul>
                  </li>
                )}

                {/* Tables */}
                {(isOwner ||
                  permissionsList?.filter(
                    (permission) => permission.resource === "Tables"
                  )[0]?.read) && (
                  <li
                    className="list"
                    ref={arrowRefs.arrowtable}
                    onClick={() => openSubMenu(arrowRefs.arrowtable)}
                  >
                    <div className="iconlink">
                      <a href="#">
                        <span className="material-symbols-outlined list-icon ml-2">
                          table_restaurant
                        </span>
                        <span className="linkname">الطاولات</span>
                      </a>
                      <i className="bx bxs-chevron-down arrow"></i>
                    </div>
                    <ul className="submenu">
                      <li className="list">
                        <Link to="tables">ادارة الطاولات</Link>
                      </li>
                      {(isOwner ||
                        permissionsList?.filter(
                          (permission) =>
                            permission.resource === "Table Reservations"
                        )[0]?.read) && (
                        <li className="list">
                          <Link to="reservation">حجز الطاولات</Link>
                        </li>
                      )}
                      {(isOwner ||
                        permissionsList?.filter(
                          (permission) => permission.resource === "Tables"
                        )[0]?.read) && (
                        <li className="list">
                          <Link to="tablespage">الطاولات</Link>
                        </li>
                      )}
                    </ul>
                  </li>
                )}

                {/* Menu */}
                {(isOwner ||
                  permissionsList?.filter(
                    (permission) => permission.resource === "Products"
                  )[0]?.read) && (
                  <li
                    className="list"
                    ref={arrowRefs.arrowmenue}
                    onClick={() => openSubMenu(arrowRefs.arrowmenue)}
                  >
                    <div className="iconlink">
                      <a href="#">
                        <span className="material-symbols-outlined list-icon ml-2">
                          restaurant_menu
                        </span>
                        <span className="linkname">المنيو</span>
                      </a>
                      <i className="bx bxs-chevron-down arrow"></i>
                    </div>
                    <ul className="submenu">
                      <li className="list">
                        <Link to="department">اقسام الاعداد</Link>
                      </li>
                      {(isOwner ||
                        permissionsList?.filter(
                          (permission) =>
                            permission.resource === "Menu Categories"
                        )[0]?.read) && (
                        <li className="list">
                          <Link to="menuCategory">التصنيفات</Link>
                        </li>
                      )}
                      {(isOwner ||
                        permissionsList?.filter(
                          (permission) => permission.resource === "Products"
                        )[0]?.read) && (
                        <li className="list">
                          <Link to="products">الأطباق</Link>
                        </li>
                      )}
                      {(isOwner ||
                        permissionsList?.filter(
                          (permission) => permission.resource === "Recipes"
                        )[0]?.read) && (
                        <li className="list">
                          <Link to="productrecipe">الوصفات</Link>
                        </li>
                      )}
                    </ul>
                  </li>
                )}

                {/* Employees */}
                {(isOwner ||
                  permissionsList?.filter(
                    (permission) => permission.resource === "Employees"
                  )[0]?.read ||
                  permissionsList?.filter(
                    (permission) => permission.resource === "Permissions"
                  )[0]?.read) && (
                  <li
                    className="list"
                    ref={arrowRefs.arrowemployee}
                    onClick={() => openSubMenu(arrowRefs.arrowemployee)}
                  >
                    <div className="iconlink">
                      <a href="#">
                        <span className="material-symbols-outlined list-icon ml-2">
                          group_add
                        </span>
                        <span className="linkname">الموظفون</span>
                      </a>
                      <i className="bx bxs-chevron-down arrow"></i>
                    </div>
                    <ul className="submenu">
                      <li className="list">
                        <Link to="employees">البيانات</Link>
                      </li>
                      {(isOwner ||
                        permissionsList?.filter(
                          (permission) => permission.resource === "Permissions"
                        )[0]?.read) && (
                        <li className="list">
                          <Link to="permissions">الصلاحيات</Link>
                        </li>
                      )}
                      {(isOwner ||
                        permissionsList?.filter(
                          (permission) => permission.resource === "Attendance"
                        )[0]?.read) && (
                        <li className="list">
                          <Link to="attendancerecord">الحضور والانصراف</Link>
                        </li>
                      )}
                      {(isOwner ||
                        permissionsList?.filter(
                          (permission) =>
                            permission.resource === "Employee Transactions"
                        )[0]?.read) && (
                        <li className="list">
                          <Link to="employeetransactions">
                            معاملات الموظفين
                          </Link>
                        </li>
                      )}
                      {(isOwner ||
                        permissionsList?.filter(
                          (permission) => permission.resource === "Payroll"
                        )[0]?.read) && (
                        <li className="list">
                          <Link to="payroll">المرتبات</Link>
                        </li>
                      )}
                    </ul>
                  </li>
                )}

                {/* Users */}
                {(isOwner ||
                  permissionsList?.filter(
                    (permission) => permission.resource === "Users"
                  )[0]?.read ||
                  permissionsList?.filter(
                    (permission) => permission.resource === "Message"
                  )[0]?.read) && (
                  <li
                    className="list"
                    ref={arrowRefs.arrowmessage}
                    onClick={() => openSubMenu(arrowRefs.arrowmessage)}
                  >
                    <div className="iconlink">
                      <a href="#">
                        <span className="material-symbols-outlined list-icon ml-2">
                          user_attributes
                        </span>
                        <span className="linkname">المستخدمين</span>
                      </a>
                      <i className="bx bxs-chevron-down arrow"></i>
                    </div>
                    <ul className="submenu">
                      <li className="list">
                        <Link to="users">إدارة المستخدمين</Link>
                      </li>
                      <li className="list">
                        <Link to="customers">إدارة العملاء</Link>
                      </li>
                      {(isOwner ||
                        permissionsList?.filter(
                          (permission) => permission.resource === "Messages"
                        )[0]?.read) && (
                        <li className="list">
                          <Link to="message">رسائل العملاء</Link>
                        </li>
                      )}
                    </ul>
                  </li>
                )}

                {/* Stock */}
                {(isOwner ||
                  permissionsList?.filter(
                    (permission) =>
                      permission.resource === "stock Item" ||
                      permission.resource === "Section Consumption"
                  )[0]?.read) && (
                  <li
                    className="list"
                    ref={arrowRefs.arrowstory}
                    onClick={() => openSubMenu(arrowRefs.arrowstory)}
                  >
                    <div className="iconlink">
                      <a href="#">
                        <span className="material-symbols-outlined list-icon ml-2">
                          receipt_long
                        </span>
                        <span className="linkname">المخزون</span>
                      </a>
                      <i className="bx bxs-chevron-down arrow"></i>
                    </div>
                    <ul className="submenu">
                      {(isOwner ||
                        permissionsList?.filter(
                          (permission) => permission.resource === "store"
                        )[0]?.read) && (
                        <li className="list">
                          <Link to="store">المخازن</Link>
                        </li>
                      )}
                      {(isOwner ||
                        permissionsList?.filter(
                          (permission) =>
                            permission.resource === "stock Categories"
                        )[0]?.read) && (
                        <li className="list">
                          <Link to="stockCategory">التصنيفات</Link>
                        </li>
                      )}
                      {(isOwner ||
                        permissionsList?.filter(
                          (permission) => permission.resource === "stock Item"
                        )[0]?.read) && (
                        <li className="list">
                          <Link to="stockitem">الأصناف</Link>
                        </li>
                      )}
                      {(isOwner ||
                        permissionsList?.filter(
                          (permission) =>
                            permission.resource === "stock Movement"
                        )[0]?.read) && (
                        <li className="list">
                          <Link to="StockMovement">إدارة المخزون</Link>
                        </li>
                      )}
                      {(isOwner ||
                        permissionsList?.filter(
                          (permission) =>
                            permission.resource === "stock Movement"
                        )[0]?.read) && (
                        <li className="list">
                          <Link to="batchstockreport">تقرير دفعات المخزن</Link>
                        </li>
                      )}
                      {(isOwner ||
                        permissionsList?.filter(
                          (permission) =>
                            permission.resource === "Section Consumption"
                        )[0]?.read) && (
                        <li className="list">
                          <Link to="SectionConsumption">الاستهلاك اليومي</Link>
                        </li>
                      )}
                      {(isOwner ||
                        permissionsList?.filter(
                          (permission) =>
                            permission.resource === "Stock Production Recipes"
                        )[0]?.read) && (
                        <li className="list">
                          <Link to="productionrecipe">ريسبي التصنيع</Link>
                        </li>
                      )}
                      {(isOwner ||
                        permissionsList?.filter(
                          (permission) =>
                            permission.resource === "Production Order"
                        )[0]?.read) && (
                        <li className="list">
                          <Link to="productionorder">طلبات التصنيع</Link>
                        </li>
                      )}
                      {(isOwner ||
                        permissionsList?.filter(
                          (permission) =>
                            permission.resource === "Production Record"
                        )[0]?.read) && (
                        <li className="list">
                          <Link to="productionrecord">سجلات التصنيع</Link>
                        </li>
                      )}
                    </ul>
                  </li>
                )}

                {/* Suppliers */}
                {(isOwner ||
                  permissionsList?.filter(
                    (permission) => permission.resource === "Supplier Data"
                  )[0]?.read) && (
                  <li
                    className="list"
                    ref={arrowRefs.arrowssupplier}
                    onClick={() => openSubMenu(arrowRefs.arrowssupplier)}
                  >
                    <div className="iconlink">
                      <a href="#">
                        <span className="material-symbols-outlined list-icon ml-2">
                          people
                        </span>
                        <span className="linkname">الموردين</span>
                      </a>
                      <i className="bx bxs-chevron-down arrow"></i>
                    </div>
                    <ul className="submenu">
                      <li className="list">
                        <Link to="supplier">الموردين</Link>
                      </li>
                      {(isOwner ||
                        permissionsList?.filter(
                          (permission) => permission.resource === "Purchases"
                        )[0]?.read) && (
                        <li className="list">
                          <Link to="purchase">المشتريات</Link>
                        </li>
                      )}
                      {(isOwner ||
                        permissionsList?.filter(
                          (permission) =>
                            permission.resource === "Purchase Returns"
                        )[0]?.read) && (
                        <li className="list">
                          <Link to="purchasereturn">مرتجع المشتريات</Link>
                        </li>
                      )}
                      {(isOwner ||
                        permissionsList?.filter(
                          (permission) =>
                            permission.resource === "Supplier Movement"
                        )[0]?.read) && (
                        <li className="list">
                          <Link to="suppliertransaction">تعاملات الموردين</Link>
                        </li>
                      )}
                    </ul>
                  </li>
                )}

                {/* Expenses */}
                {(isOwner ||
                  permissionsList?.filter(
                    (permission) => permission.resource === "Expenses"
                  )[0]?.read) && (
                  <li
                    className="list"
                    ref={arrowRefs.arrowsexpinsev}
                    onClick={() => openSubMenu(arrowRefs.arrowsexpinsev)}
                  >
                    <div className="iconlink">
                      <a href="#">
                        <span className="material-symbols-outlined list-icon ml-2">
                          money
                        </span>
                        <span className="linkname">المصروفات</span>
                      </a>
                      <i className="bx bxs-chevron-down arrow"></i>
                    </div>
                    <ul className="submenu">
                      <li className="list">
                        <Link to="expense">المصروفات</Link>
                      </li>
                      {(isOwner ||
                        permissionsList?.filter(
                          (permission) =>
                            permission.resource === "Daily Expenses"
                        )[0]?.read) && (
                        <li className="list">
                          <Link to="dailyexpense">تسجيل مصروف</Link>
                        </li>
                      )}
                    </ul>
                  </li>
                )}

                {(isOwner ||
                  permissionsList?.filter(
                    (permission) => permission.resource === "Cash Register"
                  )[0]?.read) && (
                  <li
                    className="list"
                    ref={arrowRefs.arrowsCash}
                    onClick={() => openSubMenu(arrowRefs.arrowsCash)}
                  >
                    <div className="iconlink">
                      <a href="#">
                        <span className="material-symbols-outlined list-icon ml-2">
                          monetization_on
                        </span>
                        <span className="linkname">الخزينة</span>
                      </a>
                      <i className="bx bxs-chevron-down arrow"></i>
                    </div>
                    <ul className="submenu">
                      <li className="list">
                        <Link to="cashregister">الرصيد</Link>
                      </li>
                      {(isOwner ||
                        permissionsList?.filter(
                          (permission) =>
                            permission.resource === "Cash Movement"
                        )[0]?.read) && (
                        <li className="list">
                          <Link to="cashmovement">تسجيل حركة</Link>
                        </li>
                      )}
                    </ul>
                  </li>
                )}

                {/* <li
                  ref={arrowRefs.arrowreports}
                  onClick={() => openSubMenu(arrowRefs.arrowreports)}
                >
                  <div className="iconlink">
                    <a href="#">
                      <span className="material-symbols-outlined list-icon ml-2">
                        receipt_long
                      </span>
                      <span className="linkname">التقارير</span>
                    </a>
                    <i className="bx bxs-chevron-down arrow"></i>
                  </div>
                  <ul className="submenu">
                    <li className="list">
                      <a className="linkname" href="#">
                        الارباح و الخسائر
                      </a>
                    </li> */}
                {/* {(isOwner || permissionsList?.filter(permission => permission.resource === 'stock Categories')[0]?.read) && ( */}
                {/* <li className="list"> */}
                {/* <Link to="profitloss">التصنيفات</Link>
                    </li> */}
                {/* )} */}
                {/* {(isOwner || permissionsList?.filter(permission => permission.resource === 'stock Item')[0]?.read) && (
                          <li className="list"><Link to="stockitem">الأصناف</Link></li>
                        )}
                        {(isOwner || permissionsList?.filter(permission => permission.resource === 'stock Movement')[0]?.read) && (
                          <li className="list"><Link to="StockMovement">إدارة المخزون</Link></li>
                        )}
                        {(isOwner || permissionsList?.filter(permission => permission.resource === 'Section Consumption')[0]?.read) && (
                          <li className="list"><Link to="kitchenconsumption">استهلاك المطبخ</Link></li>
                        )} */}
                {/* </ul>
                </li>
 */}
                {(isOwner ||
                  permissionsList?.filter(
                    (permission) =>
                      permission.resource === "Delivery Zones" ||
                      permission.resource === "Shifts" ||
                      permission.resource === "Restaurant Settings"
                  )[0]?.read) && (
                  <li className="list">
                    <Link to="info">
                      <span className="material-symbols-outlined list-icon ml-2">
                        settings
                      </span>
                      <span className="linkname">الإعدادات</span>
                    </Link>
                    <ul className="submenu blank">
                      <li className="list">
                        <Link to="info" className="linkname">
                          الإعدادات
                        </Link>
                      </li>
                    </ul>
                  </li>
                )}
              </ul>
            </div>
          </>
        );
      }}
    </dataContext.Consumer>
  );
};

export default SideBar;
