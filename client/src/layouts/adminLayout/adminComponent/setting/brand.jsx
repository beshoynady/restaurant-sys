import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AppContext } from "../../../../context/appContext";
import { toast } from "react-toastify";

const Brand = () => {
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
    config,
    apiUrl,
    clientUrl,
  } = useContext(AppContext);

  const [formData, setFormData] = useState({
    brandEn: "",
    brandAr: "",
    descriptionEn: "",
    descriptionAr: "",
    logo: "",
    coverImage: "",
    aboutTextEn: "",
    aboutTextAr: "",

    socialMedia: [
      {
        platform: "",
        url: "",
      },
    ],
    website: "",
    salesTaxRate: 0,
    serviceTaxRate: 0,
  });

  const brandData = {
    brand: {
      en: formData.brandEn,
      ar: formData.brandAr,
    },
    logo: formData.logo,
    coverImage: formData.coverImage,
    aboutText: {
      en: formData.aboutTextEn,
      ar: formData.aboutTextAr,
    },
    socialMedia: formData.socialMedia,
    website: formData.website,
    salesTaxRate: formData.salesTaxRate,
    serviceTaxRate: formData.serviceTaxRate,
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSocialMediaChange = (index, e) => {
    const { name, value } = e.target;
    const updatedSocialMedia = [...formData.socialMedia];
    updatedSocialMedia[index][name] = value;
    setFormData((prevData) => ({
      ...prevData,
      socialMedia: updatedSocialMedia,
    }));
  };

  const [previewLogo, setPreviewLogo] = useState(null);
  const [previewCoverImage, setPreviewCoverImage] = useState(null);

  const handleFileUpload = (e) => {
    const { name } = e.target;
    const file = e.target.files[0];

    const maxSize = 1024 * 1024; // 1 MB
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];

    if (file) {
      // Check file size
      if (file.size > maxSize) {
        toast.error(
          "Maximum file size exceeded (1 MB). Please select a smaller file."
        );
        return;
      }

      // Check file type
      if (!allowedTypes.includes(file.type)) {
        toast.error("Invalid file type. Only JPEG, JPG, and PNG are allowed.");
        return;
      }

      // Set preview
      if (name === "logo") {
        setPreviewLogo(URL.createObjectURL(file));
      } else if (name === "coverImage") {
        setPreviewCoverImage(URL.createObjectURL(file));
      }

      // If both checks pass, set the file
      setFormData((prevData) => ({
        ...prevData,
        [name]: file,
      }));
    } else {
      toast.error("No file selected.");
    }
  };

  const handleBrandSubmit = async (e) => {
    e.preventDefault();
    // Perform validation if needed

    // Submit the brandData to the server or perform desired actions
    console.log("Submitted Brand Data:", brandData);

    // Update existing brand
    try {
      setIsLoading(true);
      if (brandInfo) {
        const response = await axios.put(
          `${apiUrl}/restaurant/brand/${brandInfo._id}`,
          brandData,
          config
        );
        console.log("Brand updated successfully:", response.data);
      } else {
        const response = await axios.post(
          `${apiUrl}/restaurant/brand`,
          brandData,
          config
        );
        console.log("Brand created successfully:", response.data);
      }
      // Optionally, refresh brand info or provide user feedback here
    } catch (error) {
      console.error("Error updating brand:", error);
    } finally {
      setIsLoading(false);
    }
  };

    const [theme, setTheme] = useState("light");
    const [lang, setLang] = useState("en");
  
    // Load saved preferences (theme + language)
    useEffect(() => {
      const savedTheme = localStorage.getItem("theme") || "light";
      const savedLang = localStorage.getItem("lang") || "en";
      setTheme(savedTheme);
      setLang(savedLang);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    }, []);

  return (
    <div className="container w-100 h-auto" dir="rtl">
      <div className="content-wrapper w-100">
        <div
          className="w-100 d-flex flex-wrap align-items-center justify-content-between"
          style={{
            color: "darkblue",
            fontWeight: "900",
            textAlign: "center",
            overflowX: "hidden",
          }}
        >
          {/* <div className="col-12 grid-margin">
            <div className="card">
              <div className="card-body">
                <h4 className="card-title">بيانات الاشتراك</h4>
                <form
                  className="form-sample row d-flex flex-wrap"
                  onSubmit={updateSubscriptionDates}
                >
                  <div className="form-group  h-auto px-3 d-flex align-items-center justify-content-start col-12 col-md-6 row">
                    <label className="form-label col-form-label p-0 m-0">
                      تاريخ بداية الاشتراك
                    </label>
                    <div className="col-8">
                      <input
                        type="date"
                        className="form-control border-primary col-12 p-1"
                        value={formatDate(subscriptionStart)}
                        onChange={(e) => setSubscriptionStart(e.target.value)}
                        required
                        readOnly={employeeLoginInfo.role !== "programer"}
                      />
                    </div>
                  </div>

                  <div className="form-group  h-auto px-3 d-flex align-items-center justify-content-start col-12 col-md-6 row">
                    <label className="form-label col-form-label p-0 m-0">
                      تاريخ نهاية الاشتراك
                    </label>
                    <div className="col-8">
                      <input
                        type="date"
                        className="form-control border-primary col-12 p-1"
                        value={formatDate(subscriptionEnd)}
                        onChange={(e) => {
                          setSubscriptionEnd(e.target.value);
                        }}
                        required
                        readOnly={employeeLoginInfo.role !== "programer"}
                      />
                    </div>
                  </div>

                  <div className="form-group  h-auto px-3 d-flex align-items-center justify-content-start col-12 col-md-6 row">
                    <label className="form-label col-3 p-0 m-0">
                      باقي من الوقت
                    </label>
                    <div className="col-9">
                      <input
                        type="text"
                        className="form-control border-primary col-12 p-1"
                        value={`${remainingTime.months} شهر و ${remainingTime.days} يوم`}
                        readOnly
                      />
                    </div>
                  </div>
                  {employeeLoginInfo.role === "programer" && (
                    <div
                      className="col-12 d-flex flex-nowrap align-items-center justify-content-between "
                      style={{ height: "50px" }}
                    >
                      <button
                        type="submit"
                        className="btn btn-success col-6 h-100 p-0"
                      >
                        تأكيد
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger col-6 h-100 p-0"
                      >
                        إلغاء
                      </button>
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div> */}

          <div className="col-12 grid-margin">
            <div className="card">
              <div className="card-body">
                <h4 className="card-title">بيانات المطعم</h4>
                <form
                  className="form-sample row d-flex flex-wrap"
                  onSubmit={handleBrandSubmit}
                >
                  <div className="form-group h-auto px-3 d-flex flex-nowrap align-items-center justify-content-start col-12 col-md-6 ">
                    <label className="form-label col-3 p-0 m-0">الاسم</label>
                    <div className="col-9">
                      <input
                        type="text"
                        className="form-control border-primary col-12 p-1"
                        defaultValue={formData.brandEn}
                        name="brandEn"
                        required
                        onChange={(e) => handleInputChange()}
                      />
                    </div>
                  </div>
                  <div className="form-group h-auto px-3 d-flex flex-nowrap align-items-center justify-content-start col-12 col-md-6 ">
                    <label className="form-label col-3 p-0 m-0">الاسم</label>
                    <div className="col-9">
                      <input
                        type="text"
                        className="form-control border-primary col-12 p-1"
                        defaultValue={formData.brandAr}
                        name="brandAr"
                        required
                        onChange={(e) => handleInputChange(e)}
                      />
                    </div>
                  </div>

                  <div className="form-group h-auto px-3 d-flex flex-nowrap align-items-center justify-content-start col-12 col-md-6 ">
                    <label className="form-label col-3 p-0 m-0">الوصف</label>
                    <div className="col-9">
                      <textarea
                        type="text"
                        className="form-control border-primary col-12 p-1"
                        defaultValue={formData.descriptionEn}
                        name="descriptionEn"
                        required
                        onChange={(e) => handleInputChange(e)}
                      />
                    </div>
                  </div>
                  <div className="form-group h-auto px-3 d-flex flex-nowrap align-items-center justify-content-start col-12 col-md-6 ">
                    <label className="form-label col-3 p-0 m-0">الوصف</label>
                    <div className="col-9">
                      <textarea
                        type="text"
                        className="form-control border-primary col-12 p-1"
                        defaultValue={formData.descriptionAr}
                        name="descriptionAr"
                        required
                        onChange={(e) => handleInputChange(e)}
                      />
                    </div>
                  </div>

                  <div className="form-group h-auto px-3 d-flex flex-nowrap align-items-center justify-content-start col-12 col-md-6 ">
                    <label className="form-label col-3 p-0 m-0">
                      رابط المنيو
                    </label>
                    <div className="col-9">
                      <input
                        type="text"
                        className="form-control border-primary col-12 p-1"
                        defaultValue={formData.website}
                        name="website"
                        required
                        onChange={(e) => handleInputChange(e)}
                      />
                    </div>
                  </div>

                  <div className="form-group h-auto px-3 d-flex flex-nowrap align-items-center justify-content-start col-12 col-md-6 ">
                    <label className="form-label col-3 p-0 m-0">about us</label>
                    <div className="col-9">
                      <textarea
                        className="form-control border-primary col-12 p-1"
                        defaultValue={formData.aboutTextEn}
                        name="aboutTextEn"
                        required
                        onChange={(e) => handleInputChange(e)}
                      />
                    </div>
                  </div>
                  <div className="form-group h-auto px-3 d-flex flex-nowrap align-items-center justify-content-start col-12 col-md-6 ">
                    <label className="form-label col-3 p-0 m-0">about us</label>
                    <div className="col-9">
                      <textarea
                        className="form-control border-primary col-12 p-1"
                        defaultValue={formData.aboutTextAr}
                        name="aboutTextAr"
                        required
                        onChange={(e) => handleInputChange(e)}
                      />
                    </div>
                  </div>

                  <div className="form-group h-auto px-3 d-flex flex-nowrap align-items-center justify-content-start col-12 col-md-6 ">
                    <label className="form-label col-3 p-0 m-0">
                      {lang === "ar" ? "نسبة الضريبة" : "Tax Rate"} (%)
                    </label>
                    <div className="col-9">
                      <input
                        type="number"
                        className="form-control border-primary col-12 p-1"
                        value={brandInfo ? brandInfo.salesTaxRate : 0}
                        onChange={(e) => handleInputChange(e)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group h-auto px-3 d-flex flex-nowrap align-items-center justify-content-start col-12 col-md-6 ">
                    <label className="form-label col-3 p-0 m-0">
                      {lang === "ar" ? "نسبة الخدمة" : "Service Rate"} (%)
                    </label>
                    <div className="col-9">
                      <input
                        type="number"
                        className="form-control border-primary col-12 p-1"
                        value={brandInfo ? brandInfo.serviceTaxRate : 0}
                        onChange={(e) => handleInputChange(e)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group h-auto px-3 d-flex flex-nowrap align-items-center justify-content-start col-12 col-md-6 ">
                    <label className="form-label col-3 p-0 m-0">{lang === "ar" ? "اللوجو" : "Logo"}</label>
                    <div className="d-flex flex-wrap align-items-center col-9">
                      <input
                        className="form-control border-primary m-0 p-2 h-auto"
                        type="file"
                        name="logo"
                        onChange={(e) => handleFileUpload(e)}
                      />
                      <div
                        className="d-flex align-items-center justify-content-center w-100 mt-2"
                        style={{ height: "120px", backgroundColor: "gray" }}
                      >
                        <img
                          src={`${
                            brandInfo.logo
                              ? `${apiUrl}/images/${brandInfo.logo}`
                              : previewLogo
                          }`}
                          alt="image"
                          className="img-fluid"
                          style={{ width: "100%", height: "100%" }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="form-group h-auto px-3 d-flex flex-nowrap align-items-center justify-content-start col-12 col-md-6 ">
                    <label className="form-label col-3 p-0 m-0">
                      {lang === "ar" ? "صورة الغلاف" : "Cover Image"}
                    </label>
                    <div className="d-flex flex-wrap align-items-center col-9">
                      <input
                        className="form-control border-primary m-0 p-2 h-auto"
                        type="file"
                        name="coverImage"
                        onChange={(e) => handleFileUpload(e)}
                      />
                      <div
                        className="d-flex align-items-center justify-content-center w-100 mt-2"
                        style={{ height: "120px", backgroundColor: "gray" }}
                      >
                        <img
                          src={`${
                            brandInfo.coverImage
                              ? `${apiUrl}/images/${brandInfo.coverImage}`
                              : previewCoverImage
                          }`}
                          alt="image"
                          className="img-fluid"
                          style={{ width: "100%", height: "100%" }}
                        />
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>

          {/* contact  */}
          <div className="col-lg-6 d-flex grid-margin">
            <div className="row flex-grow">
              <div className="col-12 stretch-card mb-3">
                <div className="card">
                  <div className="card-body">
                    <h4 className="card-title">بيانات التواصل</h4>
                    <p className="card-description">
                      {" "}
                      ادخل بيانات التواصل المتاحة لديك{" "}
                    </p>
                    <form
                      className="forms-sample p-2"
                    >
                      <div
                        className="form-group  h-auto px-3 d-flex align-items-center justify-content-start col-12 "
                        style={{ width: "100%" }}
                      >
                        <label className="col-4 text-dark fs-5" htmlFor="phone">
                          رقم الهاتف:
                        </label>
                        <input
                          type="text"
                          className="form-control border-primary m-0 p-2 h-auto"
                          id="phone"
                          placeholder="ادخل رقم الهاتف"
                          required
                          value={brandInfo ? brandInfo.phone : ""}
                          onChange={(e) => handleSocialMediaChange(e)}
                        />
                      </div>
                      <div
                        className="form-group  h-auto px-3 d-flex align-items-center justify-content-start col-12 "
                        style={{ width: "100%" }}
                      >
                        <label
                          className="col-4 text-dark fs-5"
                          htmlFor="whatsapp"
                        >
                          واتساب:
                        </label>
                        <input
                          type="text"
                          className="form-control border-primary m-0 p-2 h-auto"
                          id="whatsapp"
                          placeholder={lang === "en" ? "Enter whatsapp number" : "ادخل رقم الواتساب"}
                          name="whatsapp"
                          required
                          value={brandInfo ? brandInfo.whatsapp : ""}
                          onChange={(e) => handleSocialMediaChange(e)}
                        />
                      </div>
                      <div
                        className="form-group  h-auto px-3 d-flex align-items-center justify-content-start col-12 "
                        style={{ width: "100%" }}
                      >
                        <label className="col-4 text-dark fs-5" htmlFor="email">
                          البريد الإلكتروني:
                        </label>
                        <input
                          type="email"
                          className="form-control border-primary m-0 p-2 h-auto"
                          id="email"
                          name="email"
                          placeholder={lang === "en" ? "Enter email address" : "ادخل البريد الإلكتروني"}
                          value={brandInfo ? brandInfo.email : ""}
                          onChange={(e) => handleSocialMediaChange(e)}
                        />
                      </div>
                      <div
                        className="form-group  h-auto px-3 d-flex align-items-center justify-content-start col-12 "
                        style={{ width: "100%" }}
                      >
                        <label
                          className="col-4 text-dark fs-5"
                          htmlFor="facebook"
                        >
                          فيسبوك:
                        </label>
                        <input
                          type="text"
                          className="form-control border-primary m-0 p-2 h-auto"
                          id="facebook"
                          placeholder={lang === "en" ? "Enter facebook link" : "ادخل رابط فيسبوك"}
                          value={brandInfo ? brandInfo.facebook : ""}
                          name="facebook"
                          required
                          onChange={(e) => handleSocialMediaChange(e)}
                        />
                      </div>
                      <div className="form-group  h-auto px-3 d-flex align-items-center justify-content-start col-12 ">
                        <label
                          className="col-4 text-dark fs-5"
                          htmlFor="twitter"
                        >
                          تويتر:
                        </label>
                        <input
                          type="text"
                          className="form-control border-primary m-0 p-2 h-auto"
                          id="twitter"
                          placeholder={lang === "en" ? "Enter twitter link" : "ادخل رابط تويتر"}
                          name="twitter"
                          value={brandInfo ? brandInfo.twitter : ""}
                          onChange={(e) => handleSocialMediaChange(e)}
                        />
                      </div>
                      <div className="form-group  h-auto px-3 d-flex align-items-center justify-content-start col-12 ">
                        <label
                          className="col-4 text-dark fs-5"
                          htmlFor="instagram"
                        >
                          انستجرام:
                        </label>
                        <input
                          type="text"
                          className="form-control border-primary m-0 p-2 h-auto"
                          id="instagram"
                          placeholder={lang === "en" ? "Enter instagram link" : "ادخل رابط انستجرام"}
                          name="instagram"
                          value={brandInfo ? brandInfo.instagram : ""}
                          onChange={(e) => handleSocialMediaChange(e)}
                        />
                      </div>

                      <div className="form-group  h-auto px-3 d-flex align-items-center justify-content-start col-12 ">
                        <label
                          className="col-4 text-dark fs-5"
                          htmlFor="youtube"
                        >
                          يوتيوب:
                        </label>
                        <input
                          type="text"
                          className="form-control border-primary m-0 p-2 h-auto"
                          id="youtube"
                          placeholder={lang === "en" ? "Enter youtube link" : "ادخل رابط يوتيوب"}
                          name="youtube"
                          value={brandInfo ? brandInfo.youtube : ""}
                          onChange={(e) => handleSocialMediaChange(e)}
                        />
                      </div>
                      <div className="form-group  h-auto px-3 d-flex align-items-center justify-content-start col-12 ">
                        <label
                          className="col-4 text-dark fs-5"
                          htmlFor="tiktok"
                        >
                          {lang === "en" ? "tiktok" : "تيك توك:"}
                        </label>
                        <input
                          type="text"
                          className="form-control border-primary m-0 p-2 h-auto"
                          id="tiktok"
                          placeholder={lang === "en" ? "tiktok link" : "ادخل رابط تيك توك"}
                          name="tiktok"
                          value={brandInfo ? brandInfo.tiktok : ""}
                          onChange={(e) => handleSocialMediaChange(e)}
                        />
                      </div>
                      <div
                        className="col-12 d-flex flex-nowrap align-items-center justify-consten-between "
                        style={{ height: "50px" }}
                      >
                        <button
                          type="submit"
                          className="btn btn-success col-6 h-100 p-0"
                        >
                          {lang === "en" ? "Submit" : "تأكيد"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger col-6 h-100 p-0"
                        >
                          {lang === "en" ? "Cancel" : "إلغاء"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Brand;
