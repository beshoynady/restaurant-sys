import DashboardHeader from "../components/DashboardHeader";
import DashboardStats from "../components/DashboardStats";
import OrdersTable from "../components/OrdersTable";
import TableFollowup from "../components/TableFollowup";
import PaymentModal from "../components/PaymentModal";
import KitchenModal from "../components/KitchenModal";
import SplitInvoiceModal from "../components/SplitInvoiceModal";
import NavBar from "../../navbar/components/NavBar";

const DashboardPage = () => {
  return (
    <section className="w-100 mw-100 p-1 m-0">
      <NavBar />
      <DashboardHeader />

      <DashboardStats />

      <div className="w-100 p-0 m-0">
        <div className="w-100 d-flex flex-wrap align-content-start justify-content-between align-items-start">
          <div className="col-12 col-lg-8 h-auto mb-3">
            <OrdersTable />
          </div>

          <div className="col-12 col-lg-4 h-auto">
            <TableFollowup />
          </div>
        </div>
      </div>

      <PaymentModal />

      <KitchenModal />

      <SplitInvoiceModal />
    </section>
  );
};

export default DashboardPage;
