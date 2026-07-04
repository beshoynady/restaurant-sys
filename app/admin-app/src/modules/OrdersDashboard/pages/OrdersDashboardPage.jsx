import React, { useState } from "react";
import StatChartCard from "../../../shared/tables/ChartCard/StatChartCard";
import TableToolbar from "../../../shared/tables/TableToolbar";
import DataTable from "../../../shared/tables/DataTable";
import TablePagination from "../../../shared/tables/TablePagination";
import FormModal from "../../../shared/tables/modals/FormModal";
import DeleteConfirmModal from "../../../shared/tables/modals/DeleteConfirmModal";

export default function OrdersDashboardPage() {
  // 1. زينة الإحصائيات العلوية للمطعم
  const statsMatrix = [
    { title: "Total Executed Orders", value: "3,450", chartType: "line", color: "indigo" },
    { title: "Gross Brand Revenue", value: "EGP 89,750", chartType: "line", color: "emerald" },
    { title: "Average Ticket Value", value: "EGP 155.00", chartType: "bar", color: "blue" },
  ];

  // 2. الـ States الأساسية للبيانات والفلترة والـ Checkboxes
  const [orders, setOrders] = useState([
    { _id: "1001", customerName: "Ahmed Samir", itemsCount: 3, status: "Completed", total: 450 },
    { _id: "1002", customerName: "Amr Khaled", itemsCount: 1, status: "Preparing", total: 150 },
    { _id: "1003", customerName: "Sara Mostafa", itemsCount: 5, status: "New", total: 890 },
  ]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedRows, setSelectedRows] = useState([]);
  
  // 3. الـ States الخاصة بالـ Modals الموحدة للتحكم
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [modalType, setModalType] = useState("add"); // add أو edit
  const [activeOrder, setActiveOrder] = useState({ _id: "", customerName: "", itemsCount: 1, status: "New", total: 0 });

  // أعمدة الجدول المحددة والمطابقة للتصميم المطلوب
  const columns = [
    { title: "Order ID", key: "_id", render: (r) => <span className="font-bold font-mono text-slate-900">#{r._id}</span> },
    { title: "Customer Name", key: "customerName" },
    { title: "Items Count", key: "itemsCount" },
    { 
      title: "Status", 
      key: "status", 
      render: (r) => {
        const style = r.status === "Completed" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                      r.status === "Preparing" ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-blue-50 text-blue-700 border-blue-100";
        return <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${style}`}>{r.status}</span>;
      }
    },
    { title: "Total Amount", key: "total", render: (r) => <span className="font-extrabold text-slate-900">EGP {r.total}</span> },
  ];

  // دالة تشغيل مودال الإضافة (تصفير كامل الحقول)
  const openAddModal = () => {
    setModalType("add");
    setActiveOrder({ _id: (Math.floor(Math.random() * 9000) + 1000).toString(), customerName: "", itemsCount: 1, status: "New", total: 0 });
    setIsFormModalOpen(true);
  };

  // دالة تشغيل مودال التعديل (حقن البيانات القديمة بالـ State)
  const openEditModal = (order) => {
    setModalType("edit");
    setActiveOrder({ ...order });
    setIsFormModalOpen(true);
  };

  // دالة تأكيد حفظ البيانات (سواء إضافة أو تعديل)
  const handleFormSubmit = () => {
    if (modalType === "add") {
      setOrders([activeOrder, ...orders]);
    } else {
      setOrders(orders.map((o) => (o._id === activeOrder._id ? activeOrder : o)));
    }
    setIsFormModalOpen(false);
  };

  // معالجة اختيار السطور (Checkboxes)
  const handleSelectRow = (id) => {
    setSelectedRows((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  };

  const handleSelectAll = (checked) => {
    setSelectedRows(checked ? orders.map((o) => o._id) : []);
  };

  // تصفية وتحليل البيانات بناءً على مدخلات شريط البحث
  const filteredOrders = orders.filter((o) => {
    const matchesSearch = o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || o._id.includes(searchTerm);
    const matchesStatus = statusFilter === "All" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 md:p-8 bg-slate-50 min-h-screen text-slate-800">
      
      {/* سطر الكروت الإحصائية الثلاثية العلوية */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        {statsMatrix.map((card, idx) => (
          <StatChartCard key={idx} title={card.title} value={card.value} chartType={card.chartType} color={card.color} icon="📊" />
        ))}
      </div>

      {/* شريط التحكم والبحث والفلترة */}
      <TableToolbar 
        title="Manage Orders Pipeline" 
        description="Monitor, update, and manage your dynamic restaurant branch kitchen pipeline orders."
        onAddClick={openAddModal}
        selectedCount={selectedRows.length}
        onBulkDeleteClick={() => setIsDeleteModalOpen(true)}
      >
        {/* حقل البحث السريع بالاسم أو المعرف */}
        <div className="flex flex-col gap-1 w-full max-w-xs">
          <input
            type="text"
            placeholder="🔍 Search by Order ID, Customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 text-xs font-semibold border rounded-xl px-3 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* أداة التصنيف والفلترة حسب الحالة */}
        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
          {["All", "New", "Preparing", "Completed"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                statusFilter === st ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </TableToolbar>

      {/* جدول البيانات الرئيسي */}
      <DataTable 
        columns={columns}
        data={filteredOrders}
        selectable={true}
        selectedRows={selectedRows}
        onSelectRow={handleSelectRow}
        onSelectAll={handleSelectAll}
        renderActions={(row) => (
          <>
            <button onClick={() => openEditModal(row)} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-100 transition">✏️ Edit</button>
            <button onClick={() => { setActiveOrder(row); setIsDeleteModalOpen(true); }} className="text-xs font-bold text-red-600 hover:text-red-800 bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-100 transition">🗑️ Delete</button>
          </>
        )}
      />

      {/* عناصر الـ Pagination السفلية للجدول */}
      <TablePagination total={filteredOrders.length} page={1} pageSize={10} onPageChange={() => {}} onPageSizeChange={() => {}} />

      {/* 📥 أولاً: مودال الإضافة والتعديل الموحد والآمن */}
      <FormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        title={modalType === "add" ? "✨ Create New Branch Order" : `📝 Modify Order Context: #${activeOrder._id}`}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Customer Client Name</label>
            <input type="text" value={activeOrder.customerName} onChange={(e) => setActiveOrder({ ...activeOrder, customerName: e.target.value })} className="w-full h-11 border rounded-xl px-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Total Meal Count</label>
              <input type="number" value={activeOrder.itemsCount} onChange={(e) => setActiveOrder({ ...activeOrder, itemsCount: Number(e.target.value) })} className="w-full h-11 border rounded-xl px-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" min="1" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Total Bill Cost (EGP)</label>
              <input type="number" value={activeOrder.total} onChange={(e) => setActiveOrder({ ...activeOrder, total: Number(e.target.value) })} className="w-full h-11 border rounded-xl px-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kitchen Pipeline Status</label>
            <select value={activeOrder.status} onChange={(e) => setActiveOrder({ ...activeOrder, status: e.target.value })} className="w-full h-11 border rounded-xl px-3 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer">
              <option value="New">New Order</option>
              <option value="Preparing">Preparing in Kitchen</option>
              <option value="Completed">Completed & Served</option>
            </select>
          </div>
        </div>
      </FormModal>

      {/* 🗑️ ثانياً: مودال تأكيد الحذف الديناميكي */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => {
          if (selectedRows.length > 0) {
            setOrders(orders.filter((o) => !selectedRows.includes(o._id)));
            setSelectedRows([]);
          } else {
            setOrders(orders.filter((o) => o._id !== activeOrder._id));
          }
          setIsDeleteModalOpen(false);
        }}
        itemName={selectedRows.length > 0 ? `عدد (${selectedRows.length}) طلبات محددة دفعة واحدة` : `الطلب رقم #${activeOrder._id}`}
      />

    </div>
  );
}