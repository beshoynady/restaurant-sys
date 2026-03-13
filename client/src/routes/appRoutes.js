import React, { createContext, useState, useEffect, Suspense } from "react";
import { useContext } from "react";
import { AppContext } from "../context/appContext";
import { Routes, Route, Navigate } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";
import LoadingPage from "../layouts/adminLayout/adminComponent/LoadingPage/LoadingPage";
import NoInternetPage from "../layouts/adminLayout/adminComponent/LoadingPage/NoInternetPage";
import Clientscreen from "../layouts/clientLayout/Clientscreen.jsx";
import Login from "../layouts/adminLayout/adminComponent/login/Login";
import SetupWizard from "../layouts/adminLayout/adminComponent/Setup/SetupWizard.jsx";
import Brand from "../layouts/adminLayout/adminComponent/setting/brand.jsx";

const ManagLayout = React.lazy(() =>
  import("../layouts/adminLayout/ManagLayout")
);

const ManagerDash = React.lazy(() =>
  import("../layouts/adminLayout/adminComponent/managerdash/ManagerDash")
);
const ManagerDashBoard = React.lazy(() =>
  import(
    "../layouts/adminLayout/adminComponent/managerdash/ManagerDashBoard.jsx"
  )
);
const Info = React.lazy(() =>
  import("../layouts/adminLayout/adminComponent/setting/info")
);
const Orders = React.lazy(() =>
  import("../layouts/adminLayout/adminComponent/orders/Orders")
);
const PreparationTicket = React.lazy(() =>
  import("../layouts/adminLayout/adminComponent/orders/PreparationTicket.jsx")
);
const Products = React.lazy(() =>
  import("../layouts/adminLayout/adminComponent/products/Products")
);
const Department = React.lazy(() =>
  import("../layouts/adminLayout/adminComponent/products/department.jsx")
);
const ProductRecipe = React.lazy(() =>
  import("../layouts/adminLayout/adminComponent/products/ProductRecipe")
);
const Tables = React.lazy(() =>
  import("../layouts/adminLayout/adminComponent/tables/Tables")
);
const TablesPage = React.lazy(() =>
  import("../layouts/adminLayout/adminComponent/tables/TablesPage")
);
const ReservationTables = React.lazy(() =>
  import("../layouts/adminLayout/adminComponent/tables/ReservationTables")
);
const Employees = React.lazy(() =>
  import("../layouts/adminLayout/adminComponent/employees/Employees")
);
const PermissionsComponent = React.lazy(() =>
  import("../layouts/adminLayout/adminComponent/employees/Permissions")
);
const EmployeeTransactions = React.lazy(() =>
  import("../layouts/adminLayout/adminComponent/employees/EmployeeTransactions")
);
const PayRoll = React.lazy(() =>
  import("../layouts/adminLayout/adminComponent/employees/PayRoll")
);
const AttendanceManagement = React.lazy(() =>
  import("../layouts/adminLayout/adminComponent/employees/attendance")
);
const MenuCategory = React.lazy(() =>
  import("../layouts/adminLayout/adminComponent/products/MenuCategory")
);
const PreparationScreen = React.lazy(() =>
  import("../layouts/adminLayout/adminComponent/kitchen/PreparationScreen.jsx")
);

const Waiter = React.lazy(() =>
  import("../layouts/adminLayout/adminComponent/waiter/Waiter")
);
const DeliveryMan = React.lazy(() =>
  import("../layouts/adminLayout/adminComponent/deliveryman/DeliveryMan")
);
const POS = React.lazy(() =>
  import("../layouts/adminLayout/adminComponent/pos/POS")
);
const Suppliers = React.lazy(() =>
  import("../layouts/adminLayout/adminComponent/suppliers/Suppliers")
);
const Purchase = React.lazy(() =>
  import("../layouts/adminLayout/adminComponent/suppliers/Purchase")
);
const PurchaseReturn = React.lazy(() =>
  import("../layouts/adminLayout/adminComponent/suppliers/PurchaseReturn.jsx")
);
const SupplierTransaction = React.lazy(() =>
  import("../layouts/adminLayout/adminComponent/suppliers/SupplierTransaction")
);
const StockCategory = React.lazy(() =>
  import("../layouts/adminLayout/adminComponent/stock/CategoryStock.jsx")
);
const Store = React.lazy(() =>
  import("../layouts/adminLayout/adminComponent/stock/Store.jsx")
);
const StockItem = React.lazy(() =>
  import("../layouts/adminLayout/adminComponent/stock/StockItem")
);
const ProductionRecipe = React.lazy(() =>
  import("../layouts/adminLayout/adminComponent/stock/ProductionRecipe.jsx")
);
const ProductionOrder = React.lazy(() =>
  import("../layouts/adminLayout/adminComponent/stock/ProductionOrder.jsx")
);
const ProductionRecord = React.lazy(() =>
  import("../layouts/adminLayout/adminComponent/stock/ProductionRecord.jsx")
);
const StockMovement = React.lazy(() =>
  import("../layouts/adminLayout/adminComponent/stock/StockMovement")
);
const BatchStockReport = React.lazy(() =>
  import("../layouts/adminLayout/adminComponent/stock/BatchStockReport.jsx")
);
const SectionConsumption = React.lazy(() =>
  import("../layouts/adminLayout/adminComponent/stock/SectionConsumption.jsx")
);

const ExpenseItem = React.lazy(() =>
  import("../layouts/adminLayout/adminComponent/expenses/Expense")
);
const DailyExpense = React.lazy(() =>
  import("../layouts/adminLayout/adminComponent/expenses/dailyExpense")
);
const CashRegister = React.lazy(() =>
  import("../layouts/adminLayout/adminComponent/cash/CashRegister")
);
const CashMovement = React.lazy(() =>
  import("../layouts/adminLayout/adminComponent/cash/CashMovement")
);
const Users = React.lazy(() =>
  import("../layouts/adminLayout/adminComponent/users/Users")
);
const Customers = React.lazy(() =>
  import("../layouts/adminLayout/adminComponent/users/Customers")
);
const CustomerMessage = React.lazy(() =>
  import("../layouts/adminLayout/adminComponent/users/CustomerMessage")
);
const ProfitLoss = React.lazy(() =>
  import("../layouts/adminLayout/adminComponent/reports/ProfitAndLoss.jsx")
);

const AppRoutes = () => {

    const context = useContext(AppContext);
  
  if (!context) {
    console.error("ManagLayout must be used within a AppContext.Provider");
    return null;
  }
  
  const { employeeLoginInfo } = context;
  
  return (
    <Routes>
      <Route path="/" element={<Clientscreen />} />
      <Route path="/:id" element={<Clientscreen />} />
      {/* 🔹 Login page */}
      <Route path="/login" element={<Login />} />

      {/* 🔹 Setup Wizard (for first-time setup) */}
      <Route path="/setup" element={<SetupWizard />} />

      {/* 🔹 Redirect any unknown route to login */}
      <Route path="*" element={<Login />} />
      <Route
        path="/admin/*"
        element={
          <Suspense fallback={<LoadingPage />}>
            <ManagLayout />
          </Suspense>
        }
      >
        <Route
          index
          element={
            <Suspense fallback={<LoadingPage />}>
              {employeeLoginInfo?.role === "chef" ? (
                <PreparationScreen />
              ) : employeeLoginInfo?.role === "waiter" ? (
                <Waiter />
              ) : employeeLoginInfo?.role === "deliveryMan" ? (
                <DeliveryMan />
              ) : (
                <ManagerDash />
              )}
            </Suspense>
          }
        />
        {/* <Route index element={<Suspense fallback={<LoadingPage />}><ManagerDash /></Suspense>} /> */}
        <Route
          path="managerdashboard"
          element={
            <Suspense fallback={<LoadingPage />}>
              <ManagerDashBoard />
            </Suspense>
          }
        />
        <Route
          path="info"
          element={
            <Suspense fallback={<LoadingPage />}>
              <Brand />
            </Suspense>
          }
        />
        <Route
          path="orders"
          element={
            <Suspense fallback={<LoadingPage />}>
              <Orders />
            </Suspense>
          }
        />
        <Route
          path="preparationticket"
          element={
            <Suspense fallback={<LoadingPage />}>
              <PreparationTicket />
            </Suspense>
          }
        />
        <Route
          path="products"
          element={
            <Suspense fallback={<LoadingPage />}>
              <Products />
            </Suspense>
          }
        />
        <Route
          path="department"
          element={
            <Suspense fallback={<LoadingPage />}>
              <Department />
            </Suspense>
          }
        />
        <Route
          path="productrecipe"
          element={
            <Suspense fallback={<LoadingPage />}>
              <ProductRecipe />
            </Suspense>
          }
        />
        <Route
          path="tables"
          element={
            <Suspense fallback={<LoadingPage />}>
              <Tables />
            </Suspense>
          }
        />
        <Route
          path="tablespage"
          element={
            <Suspense fallback={<LoadingPage />}>
              <TablesPage />
            </Suspense>
          }
        />
        <Route
          path="reservation"
          element={
            <Suspense fallback={<LoadingPage />}>
              <ReservationTables />
            </Suspense>
          }
        />
        <Route
          path="employees"
          element={
            <Suspense fallback={<LoadingPage />}>
              <Employees />
            </Suspense>
          }
        />
        <Route
          path="permissions"
          element={
            <Suspense fallback={<LoadingPage />}>
              <PermissionsComponent />
            </Suspense>
          }
        />
        <Route
          path="employeetransactions"
          element={
            <Suspense fallback={<LoadingPage />}>
              <EmployeeTransactions />
            </Suspense>
          }
        />
        <Route
          path="payroll"
          element={
            <Suspense fallback={<LoadingPage />}>
              <PayRoll />
            </Suspense>
          }
        />
        <Route
          path="attendancerecord"
          element={
            <Suspense fallback={<LoadingPage />}>
              <AttendanceManagement />
            </Suspense>
          }
        />
        <Route
          path="menucategory"
          element={
            <Suspense fallback={<LoadingPage />}>
              <MenuCategory />
            </Suspense>
          }
        />
        <Route
          path="preparationscreen"
          element={
            <Suspense fallback={<LoadingPage />}>
              <PreparationScreen />
            </Suspense>
          }
        />

        <Route
          path="waiter"
          element={
            <Suspense fallback={<LoadingPage />}>
              <Waiter />
            </Suspense>
          }
        />
        <Route
          path="deliveryman"
          element={
            <Suspense fallback={<LoadingPage />}>
              <DeliveryMan />
            </Suspense>
          }
        />
        <Route
          path="pos"
          element={
            <Suspense fallback={<LoadingPage />}>
              <POS />
            </Suspense>
          }
        />
        <Route
          path="supplier"
          element={
            <Suspense fallback={<LoadingPage />}>
              <Suppliers />
            </Suspense>
          }
        />
        <Route
          path="purchase"
          element={
            <Suspense fallback={<LoadingPage />}>
              <Purchase />
            </Suspense>
          }
        />
        <Route
          path="purchasereturn"
          element={
            <Suspense fallback={<LoadingPage />}>
              <PurchaseReturn />
            </Suspense>
          }
        />
        <Route
          path="suppliertransaction"
          element={
            <Suspense fallback={<LoadingPage />}>
              <SupplierTransaction />
            </Suspense>
          }
        />
        <Route
          path="stockCategory"
          element={
            <Suspense fallback={<LoadingPage />}>
              <StockCategory />
            </Suspense>
          }
        />
        <Route
          path="store"
          element={
            <Suspense fallback={<LoadingPage />}>
              <Store />
            </Suspense>
          }
        />
        <Route
          path="stockitem"
          element={
            <Suspense fallback={<LoadingPage />}>
              <StockItem />
            </Suspense>
          }
        />
        <Route
          path="productionrecipe"
          element={
            <Suspense fallback={<LoadingPage />}>
              <ProductionRecipe />
            </Suspense>
          }
        />
        <Route
          path="productionorder"
          element={
            <Suspense fallback={<LoadingPage />}>
              <ProductionOrder />
            </Suspense>
          }
        />
        <Route
          path="productionrecord"
          element={
            <Suspense fallback={<LoadingPage />}>
              <ProductionRecord />
            </Suspense>
          }
        />
        <Route
          path="StockMovement"
          element={
            <Suspense fallback={<LoadingPage />}>
              <StockMovement />
            </Suspense>
          }
        />
        <Route
          path="batchstockreport"
          element={
            <Suspense fallback={<LoadingPage />}>
              <BatchStockReport />
            </Suspense>
          }
        />
        <Route
          path="sectionconsumption"
          element={
            <Suspense fallback={<LoadingPage />}>
              <SectionConsumption />
            </Suspense>
          }
        />

        <Route
          path="expense"
          element={
            <Suspense fallback={<LoadingPage />}>
              <ExpenseItem />
            </Suspense>
          }
        />
        <Route
          path="dailyexpense"
          element={
            <Suspense fallback={<LoadingPage />}>
              <DailyExpense />
            </Suspense>
          }
        />
        <Route
          path="cashregister"
          element={
            <Suspense fallback={<LoadingPage />}>
              <CashRegister />
            </Suspense>
          }
        />
        <Route
          path="cashmovement"
          element={
            <Suspense fallback={<LoadingPage />}>
              <CashMovement />
            </Suspense>
          }
        />
        <Route
          path="users"
          element={
            <Suspense fallback={<LoadingPage />}>
              <Users />
            </Suspense>
          }
        />
        <Route
          path="customers"
          element={
            <Suspense fallback={<LoadingPage />}>
              <Customers />
            </Suspense>
          }
        />
        <Route
          path="message"
          element={
            <Suspense fallback={<LoadingPage />}>
              <CustomerMessage />
            </Suspense>
          }
        />
        <Route
          path="profitloss"
          element={
            <Suspense fallback={<LoadingPage />}>
              <ProfitLoss />
            </Suspense>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export AppRoutes;
