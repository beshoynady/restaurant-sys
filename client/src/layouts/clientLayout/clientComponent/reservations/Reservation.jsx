import React, { useState, useContext } from "react";
import { dataContext } from "../../../../context/appContext";

const Reservation = () => {
  const {
    allTable,
    getAvailableTables,
    availableTableIds,
    createReservations,
    updateReservation,
    getAllReservations,
    allReservations,
    getReservationById,
    deleteReservation,
    userLoginInfo,
    handleGetTokenAndConfig,
    apiUrl,
  } = useContext(dataContext);

  const userId = userLoginInfo?.userinfo?.id;

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [reservationNote, setReservationNote] = useState("");
  const [numberOfGuests, setNumberOfGuests] = useState("");
  const [tableInfo, setTableInfo] = useState({});
  const [reservationDate, setReservationDate] = useState();
  const [startTime, setStartTime] = useState();
  const [endTime, setEndTime] = useState();
  const [startTimeClicked, setStartTimeClicked] = useState(false);
  const [endTimeClicked, setEndTimeClicked] = useState(false);

  const isSmallScreen = window.innerWidth <= 768;

  const containerStyle = {
    height: isSmallScreen ? "calc(150vh- 80px)" : "calc(100vh - 80px)",
    marginTop: "80px",
    width: "100%",
    scrollMarginTop: "80px",
  };

  return (
    <div
      id="reservation"
      className="d-flex align-items-center flex-column justify-content-start"
      style={containerStyle}
    >
      <div className="section-title mb-2">
        <h2>حجز طاولة</h2>
      </div>
      <div
        className="col-12 col-md-10 p-2 "
        style={{
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          paddingBottom: "50px",
        }}
      >
        <form
          className="w-100 text-white text-right"
          style={{ fontSize: "20px", fontWeight: "800" }}
          onSubmit={(e) =>
            createReservations(
              e,
              tableInfo.id,
              tableInfo.tableNumber,
              userId,
              numberOfGuests,
              customerName,
              customerPhone,
              reservationDate,
              startTime,
              endTime,
              reservationNote
            )
          }
        >
          <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
            <div className="col-md-8 mb-1">
              <label
                htmlFor="name"
                className="form-label text-wrap text-right fw-bolder p-0 m-0"
              >
                الاسم
              </label>
              <input
                type="text"
                className="form-control border-primary m-0 p-2 h-auto"
                id="name"
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div className="col-md-4 mb-1">
              <label
                htmlFor="mobile"
                className="form-label text-wrap text-right fw-bolder p-0 m-0"
              >
                رقم الموبايل
              </label>
              <input
                type="tel"
                className="form-control border-primary m-0 p-2 h-auto"
                id="mobile"
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
            <div className="col-md-4 mb-1">
              <label
                htmlFor="date"
                className="form-label text-wrap text-right fw-bolder p-0 m-0"
              >
                التاريخ
              </label>
              <input
                type="date"
                className="form-control border-primary m-0 p-2 h-auto"
                id="date"
                onChange={(e) => {
                  const selectedDate = new Date(e.target.value);
                  setReservationDate(selectedDate);
                }}
              />
            </div>
            <div className="col-md-4 mb-1">
              <label
                htmlFor="arrivalTime"
                className="form-label text-wrap text-right fw-bolder p-0 m-0"
              >
                وقت الحضور
              </label>
              <input
                type="time"
                className="form-control border-primary m-0 p-2 h-auto"
                id="arrivalTime"
                required
                onChange={(e) => {
                  setStartTimeClicked(true);
                  if (reservationDate) {
                    const StartedDate = new Date(reservationDate);
                    const timeParts = e.target.value.split(":");
                    
                    if (StartedDate) {
                      StartedDate.setHours(parseInt(timeParts[0]));
                      StartedDate.setMinutes(parseInt(timeParts[1]));
                      
                      setStartTime(StartedDate);
                    }
                  } else {
                    e.target.value = "";
                  }
                }}
              />
              {startTimeClicked && !reservationDate && (
                <div
                  style={{
                    color: "red",
                    fontSize: "18px",
                    marginTop: "0.5rem",
                  }}
                >
                  يرجى تحديد التاريخ أولاً
                </div>
              )}
            </div>
            <div className="col-md-4 mb-1">
              <label
                htmlFor="departureTime"
                className="form-label text-wrap text-right fw-bolder p-0 m-0"
              >
                وقت الانصراف
              </label>
              <input
                type="time"
                className="form-control border-primary m-0 p-2 h-auto"
                id="departureTime"
                required
                onChange={(e) => {
                  setEndTimeClicked(true);
                  if (reservationDate) {
                    const EndedDate = new Date(reservationDate);
                    const timeParts = e.target.value.split(":");
                    
                    if (EndedDate) {
                      EndedDate.setHours(parseInt(timeParts[0]));
                      EndedDate.setMinutes(parseInt(timeParts[1]));
                      
                      setEndTime(EndedDate);
                      getAvailableTables(reservationDate, startTime, EndedDate);
                    }
                  } else {
                    e.target.value = "";
                  }
                }}
              />
              {endTimeClicked && !reservationDate && (
                <div
                  style={{
                    color: "red",
                    fontSize: "18px",
                    marginTop: "0.5rem",
                  }}
                >
                  يرجى تحديد التاريخ أولاً
                </div>
              )}
            </div>
          </div>
          <div className="row mb-1">
            <div className="col-md-7">
              <label
                htmlFor="tableNumber"
                className="form-label text-wrap text-right fw-bolder p-0 m-0"
              >
                رقم الطاولة
              </label>
              <select
                className="form-control border-primary m-0 p-2 h-auto"
                id="tableNumber"
                onChange={(e) =>
                  setTableInfo({
                    id: e.target.value,
                    tableNumber: e.target.options[e.target.selectedIndex].text,
                  })
                }
              >
                <option>الطاولات المتاحة في هذا الوقت</option>
                {allTable &&
                  allTable.map(
                    (table, i) =>
                      availableTableIds.includes(table._id) && (
                        <option key={i} value={table._id}>
                          {table.tableNumber}
                        </option>
                      )
                  )}
              </select>
            </div>

            <div className="col-md-5">
              <label
                htmlFor="numberOfGuests"
                className="form-label text-wrap text-right fw-bolder p-0 m-0"
              >
                عدد الضيوف
              </label>
              <input
                type="number"
                className="form-control border-primary m-0 p-2 h-auto"
                id="numberOfGuests"
                onChange={(e) => setNumberOfGuests(e.target.value)}
              />
            </div>
          </div>
          <div className="mb-1">
            <label
              htmlFor="notes"
              className="form-label text-wrap text-right fw-bolder p-0 m-0"
            >
              ملاحظات
            </label>
            <textarea
              className="form-control border-primary m-0 p-2 h-auto"
              id="notes"
              rows="2"
              onChange={(e) => setReservationNote(e.target.value)}
            ></textarea>
          </div>
          <button
            type="submit"
            className="h-100 btn btn-primary"
            style={{ width: "100%", height: "50px" }}
          >
            تأكيد الحجز
          </button>
        </form>
      </div>
    </div>
  );
};

export default Reservation;
