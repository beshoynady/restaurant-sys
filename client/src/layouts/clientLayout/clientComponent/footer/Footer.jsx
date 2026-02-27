import React, { useState, useContext } from "react";
import { AppContext } from "../../../../context/appContext";

const Footer = () => {
  const { brandInfo, handleGetTokenAndConfig, apiUrl } =
    useContext(AppContext);

  return (
    <footer
      className="w-100 h-100 d-flex align-items-center flex-column justify-content-start text-white text-center bottom-0"
      style={{
        scrollMarginTop: "80px",
        marginTop: "80px",
        backgroundColor: "#23242a",
      }}
    >
      <div className="container p-4">
        <div className="row mt-4">
          <div className="col-lg-4 col-md-12 mb-4 mb-md-0">
            <h5 className="text-uppercase mb-4">{brandInfo.name}</h5>
            <p>{brandInfo.aboutText}</p>
            <div className="mt-4">
              {brandInfo.socialMedia &&
                brandInfo.socialMedia.map((item, i) =>
                  item.platform === "facebook" ? (
                    <a
                      key={i}
                      href={item.url}
                      target="_blank"
                      className="h-100 btn btn-floating btn-warning btn-lg mr-1"
                    >
                      <i className="fab fa-facebook-f"></i>
                    </a>
                  ) : item.platform === "twitter" ? (
                    <a
                      key={i}
                      href={item.url}
                      target="_blank"
                      className="h-100 btn btn-floating btn-warning btn-lg mr-1"
                    >
                      <i className="fab fa-twitter"></i>
                    </a>
                  ) : item.platform === "instagram" ? (
                    <a
                      key={i}
                      href={item.url}
                      target="_blank"
                      className="h-100 btn btn-floating btn-warning btn-lg mr-1"
                    >
                      <i className="fab fa-instagram"></i>
                    </a>
                  ) : item.platform === "linkedin" ? (
                    <a
                      key={i}
                      href={item.url}
                      target="_blank"
                      className="h-100 btn btn-floating btn-warning btn-lg mr-1"
                    >
                      <i className="fab fa-linkedin-in"></i>
                    </a>
                  ) : item.platform === "youtube" ? (
                    <a
                      key={i}
                      href={item.url}
                      target="_blank"
                      className="h-100 btn btn-floating btn-warning btn-lg mr-1"
                    >
                      <i className="fab fa-youtube"></i>
                    </a>
                  ) : null
                )}
            </div>
          </div>
          <div className="col-lg-4 col-md-6 mb-4 mb-md-0">
            <h5 className="text-uppercase mb-4 pb-1">ابحث عن شيء</h5>
            <div className="form-outline form-white mb-4">
              <input
                type="text"
                id="formControlLg"
                className="form-control form-control-lg"
              />
              <label
                className="form-label text-wrap text-right fw-bolder p-0 m-0"
                htmlFor="formControlLg"
                style={{ marginRight: 0 }}
              >
                بحث
              </label>
            </div>
            <ul className="fa-ul" style={{ marginRight: "1.65em" }}>
              {brandInfo.address && (
                <li className="mb-3">
                  <span className="ms-2">
                    {`${brandInfo.address.state || ""} ${
                      brandInfo.address.city || ""
                    } ${brandInfo.address.street || ""}`}
                  </span>
                  <span className="fa-li">
                    <i className="fas fa-home"></i>
                  </span>
                </li>
              )}
              {brandInfo.contact?.email && (
                <li className="mb-3">
                  <a
                    className="ms-2"
                    href={`mailto:${brandInfo.contact.email}`}
                  >
                    {brandInfo.contact.email}
                  </a>
                  <span className="fa-li">
                    <i className="fas fa-envelope"></i>
                  </span>
                </li>
              )}
              {brandInfo.contact?.phone && (
                <li className="mb-3">
                  <a className="ms-2" href={`tel:${brandInfo.contact?.phone}`}>
                    {brandInfo.contact?.phone}
                  </a>
                  <span className="fa-li">
                    <i className="fas fa-phone"></i>
                  </span>
                </li>
              )}
              {brandInfo.contact?.whatsapp && (
                <li className="mb-3">
                  <a
                    className="ms-2"
                    href={`https://api.whatsapp.com/send?phone=+2${brandInfo.contact?.whatsapp}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {brandInfo.contact?.whatsapp}
                  </a>
                  <span className="fa-li">
                    <i className="fab fa-whatsapp"></i>
                  </span>
                </li>
              )}
            </ul>
          </div>
          <div className="col-lg-4 col-md-6 mb-4 mb-md-0">
            <h5 className="text-uppercase mb-4">مواعيد العمل</h5>
            <table className="table text-center text-white">
              <tbody className="font-weight-normal">
                {brandInfo.operatingHours
                  ? brandInfo.operatingHours.map((item, index) => (
                      <tr key={index}>
                        <td>{item.day}:</td>
                        <td>
                          {item.closed ? "مغلق" : `${item.from} - ${item.to}`}
                        </td>
                      </tr>
                    ))
                  : ""}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div
        className="text-center p-3"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.2)" }}
      >
        © 2024 حقوق النشر:
        <a className="text-white" href="https://menufy.tech">
          menufy.tech
        </a>
      </div>
    </footer>
  );
};

export default Footer;
