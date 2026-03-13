import React, { useState } from "react";
import { motion } from "framer-motion";

const StepOwnerPersonal = ({ onNext, onBack }) => {
  const [form, setForm] = useState({
    fullName: "",
    gender: "",
    dateOfBirth: "",
    nationalID: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onNext();
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="p-4 border rounded shadow-sm bg-white"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h4 className="text-primary mb-3">Owner Personal Information</h4>
      <div className="mb-3">
        <label className="form-label fw-semibold">Full Name</label>
        <input type="text" className="form-control" name="fullName" value={form.fullName} onChange={handleChange} required />
      </div>

      <div className="mb-3">
        <label className="form-label fw-semibold">Gender</label>
        <select className="form-select" name="gender" value={form.gender} onChange={handleChange} required>
          <option value="">Select Gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </div>

      <div className="mb-3">
        <label className="form-label fw-semibold">Date of Birth</label>
        <input type="date" className="form-control" name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange} required />
      </div>

      <div className="mb-3">
        <label className="form-label fw-semibold">National ID</label>
        <input type="text" className="form-control" name="nationalID" value={form.nationalID} onChange={handleChange} required />
      </div>

      <div className="d-flex justify-content-between mt-4">
        <button type="button" className="btn btn-outline-secondary" onClick={onBack}>Back</button>
        <button type="submit" className="btn btn-primary">Next</button>
      </div>
    </motion.form>
  );
};

export   default StepOwnerPersonal;
