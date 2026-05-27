// DashboardHeader.jsx
const DashboardHeader = () => {
  return (
    <div className="w-100 p-0 m-0 mb-3">
      <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
        <div className="w-100">
          <div
            className="d-flex justify-content-between align-items-center py-1 px-2 bg-primary text-light rounded"
            style={{ minHeight: "50px" }}
          >
            <h1 className="h5 mb-0">الصفحة الرئيسية</h1>

            <a
              href={`http://${window.location.hostname}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline-light"
            >
              <i className="bx bx-world"></i>
              <span className="ms-2">زيارة الموقع</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;