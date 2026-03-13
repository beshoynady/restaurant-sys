import React from "react";
import { Link } from "react-router-dom";

const NoInternetPage = () => {
  return (
    <div
      className="container-fluid d-flex justify-content-center align-items-center"
      style={{ height: "100vh", backgroundColor: "#f8f9fa" }}
    >
      <div className="text-center bg-dark text-white p-5 rounded shadow">
        <h1 className="display-4 mb-4">لا يوجد اتصال بالإنترنت</h1>
        <p className="lead mb-4">
          يبدو أنك غير متصل بالإنترنت. يرجى التحقق من الاتصال والمحاولة مرة
          أخرى.
        </p>
        <Link to="/" className="btn btn-primary btn-lg">
          إعادة المحاولة
        </Link>
      </div>
    </div>
  );
};

export   default NoInternetPage;
