import {
  faCalendarCheck,
  faClock,
  faMoneyBill,
  faBan,
  faDollarSign,
  faCashRegister,
} from "@fortawesome/free-solid-svg-icons";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import StatCard from "./StatCard";

const DashboardStats = () => {
  return (
    <div className="container-lg h-auto mt-4">
      <div className="d-flex flex-wrap align-items-center justify-content-start">
        <StatCard
          title="اوردرات اليوم"
          value={0}
          bg="primary"
          icon={<FontAwesomeIcon icon={faCalendarCheck} size="3x" />}
        />

        <StatCard
          title="في الانتظار"
          value={0}
          bg="secondary"
          icon={<FontAwesomeIcon icon={faClock} size="3x" />}
        />

        <StatCard
          title="انتظار الدفع"
          value={0}
          bg="warning"
          icon={<FontAwesomeIcon icon={faMoneyBill} size="3x" />}
        />

        <StatCard
          title="اوردرات ملغاه"
          value={0}
          bg="danger"
          icon={<FontAwesomeIcon icon={faBan} size="3x" />}
        />

        <StatCard
          title="ايراد اليوم"
          value={0}
          bg="success"
          icon={<FontAwesomeIcon icon={faDollarSign} size="3x" />}
        />

        <StatCard
          title="رصيد الخزينه"
          value={0}
          bg="info"
          icon={<FontAwesomeIcon icon={faCashRegister} size="3x" />}
        />
      </div>
    </div>
  );
};

export default DashboardStats;