const PayrollModel = require("../../models/employees/payroll.model");

const createPayroll = async (req, res) => {
  const {
    employeeId,
    employeeName,
    Year,
    Month,
    shiftHour,
    salary,
    basicSalary,
    dailySalary,
    workingDays,
    attendanceDays,
    leaveDays,
    OvertimeDays,
    OvertimeValue,
    Bonus,
    TotalDue,
    AbsenceDays,
    AbsenceDeduction,
    Deduction,
    Predecessor,
    Insurance,
    Tax,
    TotalDeductible,
    NetSalary,
  } = req.body;

  try {
    const payroll = await PayrollModel.create({
      employeeId,
      employeeName,
      Year,
      Month,
      shiftHour,
      salary,
      basicSalary,
      dailySalary,
      workingDays,
      attendanceDays,
      leaveDays,
      OvertimeDays,
      OvertimeValue,
      Bonus,
      TotalDue,
      AbsenceDays,
      AbsenceDeduction,
      Deduction,
      Predecessor,
      Insurance,
      Tax,
      TotalDeductible,
      NetSalary,
    });

    res.status(201).json(payroll);
  } catch (error) {
    res.status(400).json({ error });
  }
};

const updatePayrollByEmployee = async (req, res) => {
  const {
    employeeName,
    Year,
    Month,
    shiftHour,
    salary,
    basicSalary,
    dailySalary,
    workingDays,
    attendanceDays,
    leaveDays,
    OvertimeDays,
    OvertimeValue,
    Bonus,
    TotalDue,
    AbsenceDays,
    AbsenceDeduction,
    Deduction,
    Predecessor,
    Insurance,
    Tax,
    TotalDeductible,
    NetSalary,
  } = req.body;

  const employeeId = req.params.employeeId;

  try {
    const payroll = await PayrollModel.findOneAndUpdate(
      { employeeId: employeeId },
      {
        employeeName,
        Year,
        Month,
        shiftHour,
        salary,
        basicSalary,
        dailySalary,
        workingDays,
        attendanceDays,
        leaveDays,
        OvertimeDays,
        OvertimeValue,
        Bonus,
        TotalDue,
        AbsenceDays,
        AbsenceDeduction,
        Deduction,
        Predecessor,
        Insurance,
        Tax,
        TotalDeductible,
        NetSalary,
      },
      { new: true }
    );

    if (!payroll) {
      return res
        .status(404)
        .json({ success: false, error: "Payroll not found" });
    }

    res.status(200).json(payroll);
  } catch (error) {
    res.status(500).json({ error });
  }
};

const updatePayroll = async (req, res) => {
  const { isPaid, paidBy } = req.body;

  try {
    const payroll = await PayrollModel.findByIdAndUpdate(
      req.params.id,
      { isPaid, paidBy },
      { new: true }
    );

    if (!payroll) {
      return res
        .status(404)
        .json({ success: false, error: "Payroll not found" });
    }

    res.status(200).json({ success: true, payroll });
  } catch (error) {
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

const getAllPayroll = async (req, res) => {
  try {
    const payroll = await PayrollModel.find({})
      .populate("employeeId")
      .populate("paidBy");

    res.status(200).json(payroll);
  } catch (error) {
    console.error("Error fetching payroll:", error);
    res.status(500).json({ success: false, error: "خطأ في الخادم" });
  }
};

const getPayrollById = async (req, res) => {
  try {
    const id = req.params.id;
    const payroll = await PayrollModel.findById(id)
      .populate("employeeId")
      .populate("paidBy");

    if (!payroll) {
      return res
        .status(404)
        .json({ success: false, error: "Payroll not found" });
    }

    res.status(200).json({ success: true, data: payroll });
  } catch (error) {
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

const deletePayroll = async (req, res) => {
  try {
    const payroll = await PayrollModel.findByIdAndDelete(req.params.id);

    if (!payroll) {
      return res
        .status(404)
        .json({ success: false, error: "Payroll not found" });
    }

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

module.exports = {
  createPayroll,
  getAllPayroll,
  getPayrollById,
  updatePayroll,
  updatePayrollByEmployee,
  deletePayroll,
};
