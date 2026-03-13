import React, { useState } from "react";
import { motion } from "framer-motion";

const StepOwnerContact = ({ onNext, onBack }) => {
  const [form, setForm] = useState({ phone: "", email: "", whatsapp: "" });
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

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
    >
      <h4 className="text-primary mb-3">Contact Information</h4>
      <div className="mb-3">
        <label className="form-label fw-semibold">Phone</label>
        <input type="text" name="phone" className="form-control" required onChange={handleChange} />
      </div>
      <div className="mb-3">
        <label className="form-label fw-semibold">Email</label>
        <input type="email" name="email" className="form-control" onChange={handleChange} />
      </div>
      <div className="mb-3">
        <label className="form-label fw-semibold">WhatsApp</label>
        <input type="text" name="whatsapp" className="form-control" onChange={handleChange} />
      </div>

      <div className="d-flex justify-content-between mt-4">
        <button type="button" className="btn btn-outline-secondary" onClick={onBack}>Back</button>
        <button type="submit" className="btn btn-primary">Next</button>
      </div>
    </motion.form>
  );
};

export   default StepOwnerContact;
