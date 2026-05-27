// StatCard.jsx

const StatCard = ({ title, value, bg, icon }) => {
  return (
    <div className="col-lg-3 col-md-6 mb-3">
      <div className={`card text-white bg-${bg} h-100`}>
        <div className="card-body d-flex justify-content-between align-items-center">
          <div className="info">
            <p>{title}</p>
            <h3>{value}</h3>
          </div>

          {icon}
        </div>
      </div>
    </div>
  );
};

export default StatCard;