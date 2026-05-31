import { useState } from "react";

import DataTable from "../../../shared/tables/DataTable";
import TableToolbar from "../../../shared/tables/TableToolbar";
import TableFilters from "../../../shared/tables/TableFilters";
import TablePagination from "../../../shared/tables/TablePagination";

import FormModal from "../../../shared/tables/modals/FormModal";
import ConfirmModal from "../../../shared/tables/modals/ConfirmModal";

import ActionsButton from "../../../shared/tables/actions/ActionsButton";

import { TextFilter } from "../../../shared/tables/filters/TextFilter";
import { SelectFilter } from "../../../shared/tables/filters/SelectFilter";
import { DateRangeFilter } from "../../../shared/tables/filters/DateRangeFilter";

import { FormInput } from "../../../shared/forms/inputField";

export default function EmployeesPage() {
  // ================= DATA =================
  const [employees] = useState([
    {
      _id: "1",
      fullname: "Ali Ahmed",
      phone: "010",
      role: "admin",
      salary: 5000,
    },
    {
      _id: "2",
      fullname: "Sara Ali",
      phone: "011",
      role: "cashier",
      salary: 3000,
    },
  ]);

  // ================= STATE =================
  const [selectedRows, setSelectedRows] = useState([]);

  const [openForm, setOpenForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // ================= FILTERS (FIXED) =================
  const [filters, setFilters] = useState({
    search: "",
    role: "",
    fromDate: "",
    toDate: "",
  });

  const resetFilters = () => {
    setFilters({
      search: "",
      role: "",
      fromDate: "",
      toDate: "",
    });
  };

  // ================= FORM =================
  const [form, setForm] = useState({
    fullname: "",
    phone: "",
    role: "",
    salary: 0,
  });

  // ================= COLUMNS =================
  const columns = [
    { title: "Name", key: "fullname" },
    { title: "Phone", key: "phone" },
    { title: "Role", key: "role" },
    { title: "Salary", key: "salary" },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log(editMode ? "UPDATE" : "CREATE", form);
    setOpenForm(false);
  };

  return (
    <div className="p-4 space-y-3">
      {/* ================= TOOLBAR ================= */}
      <TableToolbar
        title="Employees"
        rightContent={
          <>
            <ActionsButton
              label="Add"
              variant="success"
              onClick={() => {
                setEditMode(false);
                setForm({
                  fullname: "",
                  phone: "",
                  role: "",
                  salary: 0,
                });
                setOpenForm(true);
              }}
            />

            <ActionsButton
              label="Export"
              variant="primary"
              onClick={() => console.log("export")}
            />

            <ActionsButton
              label="Print"
              variant="info"
              onClick={() => window.print()}
            />

            <ActionsButton
              label="Delete Selected"
              variant="danger"
              onClick={() => console.log(selectedRows)}
              disabled={!selectedRows.length}
            />
          </>
        }
      />

      {/* ================= FILTERS ================= */}
      <TableFilters onReset={resetFilters}>
        {/* TEXT SEARCH */}
        <TextFilter
          label="Search"
          value={filters.search}
          onChange={(v) => setFilters({ ...filters, search: v })}
        />

        {/* ROLE */}
        <SelectFilter
          label="Role"
          value={filters.role}
          onChange={(v) => setFilters({ ...filters, role: v })}
          options={[
            { value: "admin", label: "Admin" },
            { value: "cashier", label: "Cashier" },
          ]}
        />

        {/* DATE RANGE */}
        <DateRangeFilter
          label="Created Date"
          from={filters.fromDate}
          to={filters.toDate}
          onChangeFrom={(v) => setFilters({ ...filters, fromDate: v })}
          onChangeTo={(v) => setFilters({ ...filters, toDate: v })}
        />
      </TableFilters>

      {/* ================= TABLE ================= */}
      <DataTable
        columns={columns}
        data={employees}
        selectable
        selectedRows={selectedRows}
        onSelectRow={(id) =>
          setSelectedRows((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
          )
        }
        onSelectAll={(checked) =>
          setSelectedRows(checked ? employees.map((e) => e._id) : [])
        }
        renderActions={(row) => (
          <div className="flex gap-2">
            <button
              className="text-blue-600"
              onClick={() => {
                setEditMode(true);
                setForm(row);
                setOpenForm(true);
              }}
            >
              Edit
            </button>

            <button
              className="text-red-600"
              onClick={() => setDeleteId(row._id)}
            >
              Delete
            </button>
          </div>
        )}
      />

      {/* ================= PAGINATION ================= */}
      <TablePagination
        total={employees.length}
        page={1}
        pageSize={10}
        onPageChange={(p) => console.log(p)}
      />

      {/* ================= FORM MODAL ================= */}
      <FormModal
        open={openForm}
        title={editMode ? "Edit Employee" : "Add Employee"}
        onClose={() => setOpenForm(false)}
        onSubmit={handleSubmit}
      >
        <FormInput
          label="Full Name"
          value={form.fullname}
          onChange={(e) => setForm({ ...form, fullname: e.target.value })}
        />

        <FormInput
          label="Phone"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />

        <FormInput
          label="Role"
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
        />

        <FormInput
          label="Salary"
          type="number"
          value={form.salary}
          onChange={(e) => setForm({ ...form, salary: e.target.value })}
        />
      </FormModal>

      {/* ================= DELETE MODAL ================= */}
      <ConfirmModal
        open={!!deleteId}
        title="Delete Employee"
        message="Are you sure you want to delete this employee?"
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          console.log("DELETE", deleteId);
          setDeleteId(null);
        }}
      />
    </div>
  );
}
