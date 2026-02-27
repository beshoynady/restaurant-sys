import React from "react";
import "./Location.css";
import { AppContext } from "../../../../context/appContext";

const Location = () => {
  return (
    <AppContext.Consumer>
      {({ brandInfo, askingForHelp, userLoginInfo }) => {
        return (
          <section id="location">
            <div className="container">
              <div className="section-title">
                <h2>موقعنا</h2>
              </div>

              <div className="location-content">
                <div className="right">
                  <h1>
                    منتظرنكم في <br />
                    {brandInfo.name}
                  </h1>
                  {brandInfo.address && (
                    <p>
                      العنوان :
                      {`محافظة: ${brandInfo.address.state || ""} -مدينة: ${
                        brandInfo.address.city || ""
                      } -شارع: ${brandInfo.address.street || ""}`}
                    </p>
                  )}
                </div>
                <div className="left">
                  {brandInfo.locationUrl && (
                    <iframe
                      src={brandInfo.locationUrl && brandInfo.locationUrl}
                      width="100%"
                      height="100%"
                      style={{
                        border: "0",
                        allowfullscreen: "",
                        referrerpolicy: "no-referrer-when-downgrade",
                      }}
                      loading="async"
                      title="Google Map"
                    ></iframe>
                  )}
                </div>
              </div>
            </div>
          </section>
        );
      }}
    </AppContext.Consumer>
  );
};

export default Location;
