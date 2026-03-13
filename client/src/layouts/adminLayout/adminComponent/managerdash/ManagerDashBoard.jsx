import React from "react";
import {
  CRow,
  CCol,
  CWidgetStatsA,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
} from "@coreui/react";

import CIcon from "@coreui/icons-react";

import { CChartLine, CChartBar, CChart } from "@coreui/react-chartjs";
import { cilArrowTop, cilOptions } from "@coreui/icons";
import "@coreui/coreui/dist/css/coreui.min.css";
import "bootstrap/dist/css/bootstrap.min.css";

const ManagerDashBoard = () => {
  const getStyle = (variable) => {
    return getComputedStyle(document.documentElement).getPropertyValue(
      variable
    );
  };

  return (
    <section
      className="w-100 mw-100 p-1 m-0"
      style={{ scrollbarWidth: "none" }}
    >
      <div className="w-100 p-0 m-0">
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
                className="btn btn-outline-light"
              >
                <i className="bx bx-world"></i>
                <span className="ms-2">زيارة الموقع</span>
              </a>
            </div>
          </div>
        </div>
      </div>
      <div className="container-lg h-auto mt-4">
        <div>
          <CRow>
            <CCol sm={6} lg={4}>
              <CWidgetStatsA
                className="mb-4"
                color="primary"
                value={
                  <>
                    $9.000{" "}
                    <span className="fs-6 fw-normal">
                      (40.9% <CIcon icon={cilArrowTop} />)
                    </span>
                  </>
                }
                title="Widget title"
                action={
                  <CDropdown alignment="end">
                    <CDropdownToggle
                      color="transparent"
                      caret={false}
                      className="p-0"
                    >
                      <CIcon icon={cilOptions} className="text-white" />
                    </CDropdownToggle>
                    <CDropdownMenu className="flex-column">
                      <CDropdownItem>Action</CDropdownItem>
                      <CDropdownItem>Another action</CDropdownItem>
                      <CDropdownItem>Something else here...</CDropdownItem>
                      <CDropdownItem disabled>Disabled action</CDropdownItem>
                    </CDropdownMenu>
                  </CDropdown>
                }
                chart={
                  <CChartLine
                    className="mt-3 mx-3"
                    style={{ height: "70px" }}
                    data={{
                      labels: [
                        "January",
                        "February",
                        "March",
                        "April",
                        "May",
                        "June",
                        "July",
                      ],
                      datasets: [
                        {
                          label: "My First dataset",
                          backgroundColor: "transparent",
                          borderColor: "rgba(255,255,255,.55)",
                          pointBackgroundColor: "#5856d6",
                          data: [65, 59, 84, 84, 51, 55, 40],
                        },
                      ],
                    }}
                    options={{
                      plugins: {
                        legend: {
                          display: false,
                        },
                      },
                      maintainAspectRatio: false,
                      scales: {
                        x: {
                          border: {
                            display: false,
                          },
                          grid: {
                            display: false,
                            drawBorder: false,
                          },
                          ticks: {
                            display: false,
                          },
                        },
                        y: {
                          min: 30,
                          max: 89,
                          display: false,
                          grid: {
                            display: false,
                          },
                          ticks: {
                            display: false,
                          },
                        },
                      },
                      elements: {
                        line: {
                          borderWidth: 1,
                          tension: 0.4,
                        },
                        point: {
                          radius: 4,
                          hitRadius: 10,
                          hoverRadius: 4,
                        },
                      },
                    }}
                  />
                }
              />
            </CCol>
            <CCol sm={6} lg={4}>
              <CWidgetStatsA
                className="mb-4"
                color="info"
                value={
                  <>
                    $9.000{" "}
                    <span className="fs-6 fw-normal">
                      (40.9% <CIcon icon={cilArrowTop} />)
                    </span>
                  </>
                }
                title="Widget title"
                action={
                  <CDropdown alignment="end">
                    <CDropdownToggle
                      color="transparent"
                      caret={false}
                      className="p-0"
                    >
                      <CIcon icon={cilOptions} className="text-white" />
                    </CDropdownToggle>
                    <CDropdownMenu className="flex-column">
                      <CDropdownItem>Action</CDropdownItem>
                      <CDropdownItem>Another action</CDropdownItem>
                      <CDropdownItem>Something else here...</CDropdownItem>
                      <CDropdownItem disabled>Disabled action</CDropdownItem>
                    </CDropdownMenu>
                  </CDropdown>
                }
                chart={
                  <CChartLine
                    className="mt-3 mx-3"
                    style={{ height: "70px" }}
                    data={{
                      labels: [
                        "January",
                        "February",
                        "March",
                        "April",
                        "May",
                        "June",
                        "July",
                      ],
                      datasets: [
                        {
                          label: "My First dataset",
                          backgroundColor: "transparent",
                          borderColor: "rgba(255,255,255,.55)",
                          pointBackgroundColor: "#39f",
                          data: [1, 18, 9, 17, 34, 22, 11],
                        },
                      ],
                    }}
                    options={{
                      plugins: {
                        legend: {
                          display: false,
                        },
                      },
                      maintainAspectRatio: false,
                      scales: {
                        x: {
                          border: {
                            display: false,
                          },
                          grid: {
                            display: false,
                            drawBorder: false,
                          },
                          ticks: {
                            display: false,
                          },
                        },
                        y: {
                          min: -9,
                          max: 39,
                          display: false,
                          grid: {
                            display: false,
                          },
                          ticks: {
                            display: false,
                          },
                        },
                      },
                      elements: {
                        line: {
                          borderWidth: 1,
                        },
                        point: {
                          radius: 4,
                          hitRadius: 10,
                          hoverRadius: 4,
                        },
                      },
                    }}
                  />
                }
              />
            </CCol>
            <CCol sm={6} lg={4}>
              <CWidgetStatsA
                className="mb-4"
                color="warning"
                value={
                  <>
                    $9.000{" "}
                    <span className="fs-6 fw-normal">
                      (40.9% <CIcon icon={cilArrowTop} />)
                    </span>
                  </>
                }
                title="Widget title"
                action={
                  <CDropdown alignment="end">
                    <CDropdownToggle
                      color="transparent"
                      caret={false}
                      className="p-0"
                    >
                      <CIcon icon={cilOptions} className="text-white" />
                    </CDropdownToggle>
                    <CDropdownMenu className="flex-column">
                      <CDropdownItem>Action</CDropdownItem>
                      <CDropdownItem>Another action</CDropdownItem>
                      <CDropdownItem>Something else here...</CDropdownItem>
                      <CDropdownItem disabled>Disabled action</CDropdownItem>
                    </CDropdownMenu>
                  </CDropdown>
                }
                chart={
                  <CChartLine
                    className="mt-3"
                    style={{ height: "70px" }}
                    data={{
                      labels: [
                        "January",
                        "February",
                        "March",
                        "April",
                        "May",
                        "June",
                        "July",
                      ],
                      datasets: [
                        {
                          label: "My First dataset",
                          backgroundColor: "rgba(255,255,255,.2)",
                          borderColor: "rgba(255,255,255,.55)",
                          data: [78, 81, 80, 45, 34, 12, 40],
                          fill: true,
                        },
                      ],
                    }}
                    options={{
                      plugins: {
                        legend: {
                          display: false,
                        },
                      },
                      maintainAspectRatio: false,
                      scales: {
                        x: {
                          display: false,
                        },
                        y: {
                          display: false,
                        },
                      },
                      elements: {
                        line: {
                          borderWidth: 2,
                          tension: 0.4,
                        },
                        point: {
                          radius: 0,
                          hitRadius: 10,
                          hoverRadius: 4,
                        },
                      },
                    }}
                  />
                }
              />
            </CCol>
            <CCol sm={6} lg={4}>
              <CWidgetStatsA
                className="mb-4"
                color="danger"
                value={
                  <>
                    $9.000{" "}
                    <span className="fs-6 fw-normal">
                      (40.9% <CIcon icon={cilArrowTop} />)
                    </span>
                  </>
                }
                title="Widget title"
                action={
                  <CDropdown alignment="end">
                    <CDropdownToggle
                      color="transparent"
                      caret={false}
                      className="p-0"
                    >
                      <CIcon icon={cilOptions} className="text-white" />
                    </CDropdownToggle>
                    <CDropdownMenu className="flex-column">
                      <CDropdownItem>Action</CDropdownItem>
                      <CDropdownItem>Another action</CDropdownItem>
                      <CDropdownItem>Something else here...</CDropdownItem>
                      <CDropdownItem disabled>Disabled action</CDropdownItem>
                    </CDropdownMenu>
                  </CDropdown>
                }
                chart={
                  <CChartBar
                    className="mt-3 mx-3"
                    style={{ height: "70px" }}
                    data={{
                      labels: [
                        "January",
                        "February",
                        "March",
                        "April",
                        "May",
                        "June",
                        "July",
                        "August",
                        "September",
                        "October",
                        "November",
                        "December",
                        "January",
                        "February",
                        "March",
                        "April",
                      ],
                      datasets: [
                        {
                          label: "My First dataset",
                          backgroundColor: "rgba(255,255,255,.2)",
                          borderColor: "rgba(255,255,255,.55)",
                          data: [
                            78, 81, 80, 45, 34, 12, 40, 85, 65, 23, 12, 98, 34,
                            84, 67, 82,
                          ],
                          barPercentage: 0.6,
                        },
                      ],
                    }}
                    options={{
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          display: false,
                        },
                      },
                      scales: {
                        x: {
                          grid: {
                            display: false,
                            drawTicks: false,
                          },
                          ticks: {
                            display: false,
                          },
                        },
                        y: {
                          border: {
                            display: false,
                          },
                          grid: {
                            display: false,
                            drawBorder: false,
                            drawTicks: false,
                          },
                          ticks: {
                            display: false,
                          },
                        },
                      },
                    }}
                  />
                }
              />
            </CCol>
          </CRow>
        </div>
        <div className="w-100 h-auto d-flex flex-wrap ">
          <CChart
            className="col-md-6 col-12"
            type="bar"
            data={{
              labels: [
                "January",
                "February",
                "March",
                "April",
                "May",
                "June",
                "July",
              ],
              datasets: [
                {
                  label: "GitHub Commits",
                  backgroundColor: "#f87979",
                  data: [40, 20, 12, 39, 10, 40, 39, 80, 40],
                },
              ],
            }}
            labels="months"
            options={{
              plugins: {
                legend: {
                  labels: {
                    color: getStyle("--cui-body-color"),
                  },
                },
              },
              scales: {
                x: {
                  grid: {
                    color: getStyle("--cui-border-color-translucent"),
                  },
                  ticks: {
                    color: getStyle("--cui-body-color"),
                  },
                },
                y: {
                  grid: {
                    color: getStyle("--cui-border-color-translucent"),
                  },
                  ticks: {
                    color: getStyle("--cui-body-color"),
                  },
                },
              },
            }}
          />

          <CChart
            className="col-md-6 col-12"
            type="polarArea"
            data={{
              labels: ["Red", "Green", "Yellow", "Grey", "Blue"],
              datasets: [
                {
                  data: [11, 16, 7, 3, 14],
                  backgroundColor: [
                    "#FF6384",
                    "#4BC0C0",
                    "#FFCE56",
                    "#E7E9ED",
                    "#36A2EB",
                  ],
                },
              ],
            }}
            options={{
              plugins: {
                legend: {
                  labels: {
                    color: getStyle("--cui-body-color"),
                  },
                },
              },
              scales: {
                r: {
                  grid: {
                    color: getStyle("--cui-border-color"),
                  },
                },
              },
            }}
          />
        </div>
      </div>
    </section>
  );
};

export   default ManagerDashBoard;
