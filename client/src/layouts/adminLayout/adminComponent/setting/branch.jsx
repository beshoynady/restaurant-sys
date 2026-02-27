import React from "react";

const branch = () => {
  const {
    brandInfo,
    permissionsList,
    setStartDate,
    setEndDate,
    filterByDateRange,
    filterByTime,
    employeeLoginInfo,
    formatDate,
    formatDateTime,
    setIsLoading,
    EditPagination,
    startPagination,
    endPagination,
    setStartPagination,
    setEndPagination,
    handleGetTokenAndConfig,
    apiUrl,
    clientUrl,
  } = useContext(AppContext);

  const [shifts, setShifts] = useState([]);

  const getAllShifts = async () => {
    const config = await handleGetTokenAndConfig();
    try {
      const response = await axios.get(`${apiUrl}/api/shift`, config);
      const data = await response.data;

      if (data) {
        setShifts(data);
      } else {
        toast.error("لا يوجد بيانات للورديات ! اضف بيانات الورديات ");
      }
    } catch (error) {
      toast.error("حدث خطأ اثناء جلب بيانات الورديات! اعد تحميل الصفحة");
    }
  };

  const addShift = () => {
    setShifts([...shifts, { shiftType: "", startTime: "", endTime: "" }]);
  };

  const removeShift = async (index, id) => {
    const config = await handleGetTokenAndConfig();
    const updatedShifts = shifts.filter((_, i) => i !== index);
    if (id) {
      const response = await axios.delete(`${apiUrl}/api/shift/${id}`, config);

      if (response.status === 200) {
        toast.success("تمت حذف الوردية بنجاح");
      } else {
        toast.error("حدث خطأ أثناء حذف الوردية");
      }
    }
    setShifts(updatedShifts);
  };

  const handleShiftTypeChange = (index, event) => {
    const updatedShifts = [...shifts];
    updatedShifts[index].shiftType = event.target.value;
    setShifts(updatedShifts);
  };

  const handleStartTimeChange = (index, event) => {
    const updatedShifts = [...shifts];
    updatedShifts[index].startTime = event.target.value;
    setShifts(updatedShifts);
  };

  // تحديث حقل ميعاد نهاية الوردية
  const handleEndTimeChange = (index, event) => {
    const updatedShifts = [...shifts];
    updatedShifts[index].endTime = event.target.value;
    setShifts(updatedShifts);
  };

  const handleCreateShifts = async (e) => {
    e.preventDefault();
    const config = await handleGetTokenAndConfig();
    try {
      shifts.map(async (shift) => {
        const id = shift._id ? shift._id : null;
        const shiftType = shift.shiftType;
        const startTime = shift.startTime;
        const endTime = shift.endTime;
        if (id && shiftType && startTime && endTime) {
          const response = await axios.put(
            `${apiUrl}/api/shift/${id}`,
            { startTime, endTime, shiftType },
            config
          );

          if (response.status === 200) {
            toast.success("تمت تعديل بيانات الوردية بنجاح");
          } else {
            toast.error("حدث خطأ أثناء تعديل بيانات الوردية");
          }
        } else if (shiftType && startTime && endTime) {
          const response = await axios.post(
            `${apiUrl}/api/shift`,
            { startTime, endTime, shiftType },
            config
          );

          if (response.status === 201) {
            toast.success("تمت إضافة الوردية بنجاح");
          } else {
            toast.error("حدث خطأ أثناء إضافة الوردية");
          }
        }
      });
      getAllShifts();
    } catch (error) {
      toast.error("حدث خطأ أثناء إضافة الوردية");
      console.error("Error:", error);
    }
  };

  const [areas, setAreas] = useState([]);

  const getAllDeliveryAreas = async () => {
    const config = await handleGetTokenAndConfig();
    try {
      const response = await axios.get(`${apiUrl}/api/deliveryarea`, config);
      const data = await response.data;

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

  const addArea = () => {
    setAreas([...areas, { name: "", delivery_fee: 0 }]);
  };

  const removeArea = async (index, id) => {
    const config = await handleGetTokenAndConfig();
    const updatedAreas = areas.filter((area, i) => i !== index);
    if (id) {
      const response = await axios.delete(
        `${apiUrl}/api/deliveryarea/${id}`,
        config
      );

      if (response.status === 200) {
        toast.success("تمت حذف منطقه التوصيل بنجاح");
      } else {
        toast.error("حدث خطأ أثناء حذف منطقه التوصيل");
      }
    }
    setAreas(updatedAreas);
  };

  const handleAreasNameChange = (index, event) => {
    const updatedAreas = [...areas];
    updatedAreas[index].name = event.target.value;
    setAreas(updatedAreas);
  };

  const handledeliveryFeeChange = (index, event) => {
    const updatedAreas = [...areas];
    updatedAreas[index].delivery_fee = Number(event.target.value);
    setAreas(updatedAreas);
  };

  const handleDeliveryArea = async (e) => {
    e.preventDefault();
    const config = await handleGetTokenAndConfig();
    try {
      areas.map(async (area, i) => {
        const id = area._id ? area._id : null;
        const name = area.name;
        const delivery_fee = area.delivery_fee;
        if (id && name && delivery_fee) {
          const response = await axios.put(
            `${apiUrl}/api/deliveryarea/${id}`,
            { name, delivery_fee },
            config
          );

          if (response.status === 200) {
            toast.success("تمت تعديل بيانات منطقه التوصيل بنجاح");
          } else {
            toast.error("حدث خطأ أثناء تعديل بيانات منطقه التوصيل");
          }
        } else if (name && delivery_fee) {
          const response = await axios.post(
            `${apiUrl}/api/deliveryarea`,
            { name, delivery_fee },
            config
          );

          if (response.status === 201) {
            toast.success("تمت إضافة منطقه التوصيل بنجاح");
          } else {
            toast.error("حدث خطأ أثناء إضافة منطقه التوصيل");
          }
        }
      });
      getAllDeliveryAreas();
    } catch (error) {
      toast.error("حدث خطأ أثناء إضافة منطقه التوصيل");
      console.error("Error:", error);
    }
  };
  return <div>branch</div>;
};

export default branch;
