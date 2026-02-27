// import React, { useState, useEffect, useContext } from "react";
// import axios from "axios";
// import { AppContext } from "../../../../context/appContext";
// import { toast } from "react-toastify";

// const Info = () => {
//   const [restaurantId, setrestaurantId] = useState("");

//   const [name, setName] = useState("");
//   const [description, setDescription] = useState("");
//   const [image, setImage] = useState("");
//   const [aboutText, setaboutText] = useState("");
//   const [website, setwebsite] = useState(`${clientUrl}`);
//   const [locationUrl, setlocationUrl] = useState("");
//   const [dineIn, setdineIn] = useState(false);
//   const [takeAway, settakeAway] = useState(false);
//   const [deliveryService, setdeliveryService] = useState(false);
//   const [usesReservationSystem, setusesReservationSystem] = useState(false);
//   const [salesTaxRate, setsalesTaxRate] = useState(0);
//   const [serviceTaxRate, setserviceTaxRate] = useState(0);

//   const [country, setCountry] = useState("");
//   const [state, setState] = useState("");
//   const [city, setCity] = useState("");
//   const [street, setStreet] = useState("");
//   const [postalCode, setPostalCode] = useState("");

//   const listFeatures = [
//     "WiFi",
//     "Parking",
//     "Outdoor Seating",
//     "Wheelchair Accessible",
//     "Live Music",
//     "Pet Friendly",
//     "Kids Friendly",
//   ];
//   const listFeaturesAr = [
//     "WiFi",
//     "موقف سيارات",
//     "أماكن جلوس خارجية",
//     "مناسب للكراسي المتحركة",
//     "موسيقى حية",
//     "صديق للحيوانات الأليفة",
//     "ركن للاطفال",
//   ];

//   const [features, setfeatures] = useState([]);
//   const handleFeaturesCheckboxChange = (feature) => {
//     if (features.includes(feature)) {
//       setfeatures(features.filter((item) => item !== feature));
//     } else {
//       setfeatures([...features, feature]);
//     }
//   };

//   const handleFeatures = async (e) => {
//     e.preventDefault();
//     const config = await handleGetTokenAndConfig();
//     try {
//       const response = await axios.put(
//         `${apiUrl}/api/restaurant/${restaurantId}`,
//         { features },
//         config
//       );
//       if (response.status === 200) {
//         toast.success("تمت إضافة الخدمات الاضافية بنجاح");
//         getRestaurant();
//       } else {
//         toast.error("حدث خطأ أثناء إضافة الخدمات الاضافية! حاول مرة أخرى.");
//       }
//     } catch (error) {
//       toast.error("فشل إضافة الخدمات الاضافية! حاول مرة أخرى");
//     }
//   };

//   const listAcceptedPayments = [
//     "Cash",
//     "Credit Card",
//     "Debit Card",
//     "Vodafone Cash",
//     "Etisalat Cash",
//     "Orange Cash",
//     "Fawry",
//     "Meeza",
//     "PayPal",
//     "Aman",
//   ];
//   const listAcceptedPaymentsAr = [
//     "نقداً",
//     "بطاقة ائتمان",
//     "بطاقة خصم مباشر",
//     "فودافون كاش",
//     "اتصالات كاش",
//     "أورنج كاش",
//     "فوري",
//     "ميزة",
//     "باي بال",
//     "أمان",
//   ];

//   const [acceptedPayments, setacceptedPayments] = useState([]);
//   const handleacceptedPaymentsCheckboxChange = (acceptedPayment) => {
//     if (acceptedPayments.includes(acceptedPayment)) {
//       setacceptedPayments(
//         acceptedPayments.filter((item) => item !== acceptedPayment)
//       );
//     } else {
//       setacceptedPayments([...acceptedPayments, acceptedPayment]);
//     }
//   };

//   const handleAcceptedPayments = async (e) => {
//     e.preventDefault();
//     const config = await handleGetTokenAndConfig();
//     try {
//       const response = await axios.put(
//         `${apiUrl}/api/restaurant/${restaurantId}`,
//         { acceptedPayments },
//         config
//       );
//       if (response.status === 200) {
//         toast.success("تمت إضافة الخدمات الاضافية بنجاح");
//         getRestaurant();
//       } else {
//         toast.error("حدث خطأ أثناء إضافة الخدمات الاضافية! حاول مرة أخرى.");
//       }
//     } catch (error) {
//       toast.error("فشل إضافة الخدمات الاضافية! حاول مرة أخرى");
//     }
//   };

//   const handleFileUpload = (e) => {
//     const file = e.target.files[0];
//     if (file) {
//       setImage(file);
//       setPreview(URL.createObjectURL(file)); // show preview of the image
//     }
//     const maxSize = 1024 * 1024; // 1 MB
//     const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];

//     if (file) {
//       // Check file size
//       if (file.size > maxSize) {
//         toast.error(
//           "Maximum file size exceeded (1 MB). Please select a smaller file."
//         );
//         return;
//       }

//       // Check file type
//       if (!allowedTypes.includes(file.type)) {
//         toast.error("Invalid file type. Only JPEG, JPG, and PNG are allowed.");
//         return;
//       }

//       // If both checks pass, set the file
//       setImage(file);
//     } else {
//       toast.error("No file selected.");
//     }
//   };

//   const handleExtractSrc = (Url) => {
//     const srcMatch = Url.match(/src="([^"]+)"/);
//     const extractedSrc = srcMatch ? srcMatch[1] : null;
//     setlocationUrl(extractedSrc);
//   };

//   const handleCreateRestaurant = async (e) => {
//     e.preventDefault();
//     const config = await handleGetTokenAndConfig();
//     try {
//       const address = {
//         country: country ? country : null,
//         city: city ? city : null,
//         state: state ? state : null,
//         street: street ? street : null,
//         website: website ? website : null,
//         postal_code: postalCode ? postalCode : null,
//       };

//       const requestData = {
//         name,
//         description,
//         address,
//         website,
//         image,
//         locationUrl,
//         aboutText,
//         dineIn,
//         takeAway,
//         deliveryService,
//         usesReservationSystem,
//         salesTaxRate,
//         serviceTaxRate,
//       };

//       let response;
//       if (restaurantId) {
//         response = await axios.put(
//           `${apiUrl}/api/restaurant/${restaurantId}`,
//           requestData,
//           {
//             headers: {
//               "Content-Type": "multipart/form-data",
//               ...config.headers,
//             },
//           }
//         );
//       } else {
//         response = await axios.post(`${apiUrl}/api/restaurant/`, requestData, {
//           headers: {
//             "Content-Type": "multipart/form-data",
//             ...config.headers,
//           },
//         });
//       }

//       if (response.status === 200 || response.status === 201) {
//         toast.success(
//           restaurantId ? "تم تحديث المطعم بنجاح" : "تمت إضافة المطعم بنجاح"
//         );
//         getRestaurant();
//         URL.revokeObjectURL(preview);
//         setPreview(null);
//       } else {
//         toast.error("حدث خطأ أثناء معالجة الطلب");
//       }
//     } catch (error) {
//       console.error("Error:", error);
//       toast.error("حدث خطأ أثناء إضافة/تحديث المطعم");
//     }
//   };

//   const [phone, setPhone] = useState([]);
//   const [whatsapp, setWhatsapp] = useState("");
//   const [email, setEmail] = useState("");
//   const [facebook, setFacebook] = useState("");
//   const [twitter, setTwitter] = useState("");
//   const [instagram, setInstagram] = useState("");
//   const [linkedin, setLinkedin] = useState("");
//   const [youtube, setYoutube] = useState("");
//   // const [socialMedia, setsocialMedia] = useState([{platform:'', url:''}]);
//   // const [listsocialMedia, setlistsocialMedia] = useState(['facebook', 'twitter', 'instagram', 'linkedin', 'youtube']);

//   const handleContactSocialmedia = async (e) => {
//     e.preventDefault();
//     const config = await handleGetTokenAndConfig();
//     try {
//       const contact = {
//         phone: [...phone],
//         whatsapp: whatsapp ? whatsapp : null,
//         email: email ? email : null,
//       };
//       const socialMedia = [
//         facebook ? { platform: "facebook", url: facebook } : "",
//         twitter ? { platform: "twitter", url: twitter } : "",
//         instagram ? { platform: "instagram", url: instagram } : "",
//         linkedin ? { platform: "linkedin", url: linkedin } : "",
//         youtube ? { platform: "youtube", url: youtube } : "",
//       ];

//       // إرسال البيانات إلى الخادم باستخدام axios
//       const response = await axios.put(
//         `${apiUrl}/api/restaurant/${restaurantId}`,
//         { contact, socialMedia },
//         config
//       );

//       if (response.status === 200) {
//         toast.success("تمت إضافة بيانات التواصل بنجاح");
//         getRestaurant();
//       } else {
//         toast.error("فشل إضافة بيانات التواصل");
//       }
//     } catch (error) {
//       toast.error("حدث خطأ أثناء إضافة بيانات التواصل");
//       console.error("Error:", error);
//     }
//   };

//   const daysOfWeek = [
//     "السبت",
//     "الأحد",
//     "الاثنين",
//     "الثلاثاء",
//     "الأربعاء",
//     "الخميس",
//     "الجمعة",
//   ];
//   const daysOfWeekEn = [
//     "Saturday",
//     "Sunday",
//     "Monday",
//     "Tuesday",
//     "Wednesday",
//     "Thursday",
//     "Friday",
//   ];

//   const initialOpeningHours = daysOfWeekEn.map((day) => ({
//     day,
//     from: "",
//     to: "",
//     closed: false,
//   }));

//   const [operatingHours, setoperatingHours] = useState(initialOpeningHours);

//   const handleSetFrom = (index, value) => {
//     console.log({ index, value });
//     setoperatingHours((prev) => {
//       const updated = [...prev];
//       updated[index] = { ...updated[index], from: value };
//       return updated;
//     });
//     console.log({ operatingHours });
//   };

//   const handleSetTo = (index, value) => {
//     console.log({ index, value });

//     setoperatingHours((prev) => {
//       const updated = [...prev];
//       updated[index] = { ...updated[index], to: value };
//       return updated;
//     });
//     console.log({ operatingHours });
//   };

//   const handleCheckboxChange = (index) => {
//     console.log({ index });

//     setoperatingHours((prev) => {
//       const updated = [...prev];
//       updated[index] = { ...updated[index], closed: !updated[index].closed };
//       return updated;
//     });
//   };

//   const handleOpeningHours = async (e) => {
//     e.preventDefault();
//     const config = await handleGetTokenAndConfig();
//     console.log({ operatingHours });
//     try {
//       const response = await axios.put(
//         `${apiUrl}/api/restaurant/${restaurantId}`,
//         { operatingHours },
//         config
//       );
//       if (response.status === 200) {
//         toast.success("تمت إضافة مواعيد العمل بنجاح");
//         getRestaurant();
//       } else {
//         toast.error("حدث خطأ أثناء إضافة مواعيد العمل! حاول مرة أخرى.");
//       }
//     } catch (error) {
//       toast.error("فشل إضافة مواعيد العمل! حاول مرة أخرى");
//     }
//   };

//   const getRestaurant = async () => {
//     const config = await handleGetTokenAndConfig();
//     try {
//       const response = await axios.get(`${apiUrl}/api/restaurant/`, config);
//       const brandInfo = response.data[0];
//       console.log({ brandInfo });

//       if (brandInfo) {
//         setrestaurantId(brandInfo._id);
//         setName(brandInfo.name);
//         setSubscriptionStart(brandInfo.subscriptionStart);
//         setSubscriptionEnd(brandInfo.subscriptionEnd);
//         setImage(brandInfo.image);
//         setwebsite(brandInfo.website);
//         setlocationUrl(brandInfo.locationUrl);
//         setaboutText(brandInfo.aboutText);
//         setDescription(brandInfo.description);
//         setsalesTaxRate(brandInfo.salesTaxRate);
//         setserviceTaxRate(brandInfo.serviceTaxRate);

//         setCountry(brandInfo.address.country);
//         setState(brandInfo.address.state);
//         setCity(brandInfo.address.city);
//         setStreet(brandInfo.address.street);
//         setPostalCode(brandInfo.address.postal_code);

//         setfeatures(brandInfo.features);
//         setacceptedPayments(brandInfo.acceptedPayments);

//         setPhone(brandInfo.contact.phone);
//         setWhatsapp(brandInfo.contact.whatsapp);
//         setEmail(brandInfo.contact.email);

//         setdineIn(brandInfo.dineIn);
//         setdeliveryService(brandInfo.deliveryService);
//         settakeAway(brandInfo.takeAway);
//         setusesReservationSystem(brandInfo.usesReservationSystem);

//         brandInfo.socialMedia.forEach((item) => {
//           switch (item.platform) {
//             case "facebook":
//               setFacebook(item.url);
//               break;
//             case "twitter":
//               setTwitter(item.url);
//               break;
//             case "instagram":
//               setInstagram(item.url);
//               break;
//             case "linkedin":
//               setLinkedin(item.url);
//               break;
//             case "youtube":
//               setYoutube(item.url);
//               break;
//             default:
//               break;
//           }
//         });

//         setoperatingHours(
//           brandInfo.operatingHours?.length > 0
//             ? brandInfo.operatingHours
//             : initialOpeningHours
//         );
//       } else {
//         toast.warning("لم يتم اضافه بيانات المطعم");
//       }
//     } catch (error) {
//       console.error("Error fetching restaurant data:", error);
//       toast.error("خطأ في جلب بيانات المطعم");
//     }
//   };

//   const [subscriptionStart, setSubscriptionStart] = useState("");
//   const [subscriptionEnd, setSubscriptionEnd] = useState("");

//   const updateSubscriptionDates = async (e) => {
//     e.preventDefault();
//     const config = await handleGetTokenAndConfig();
//     if (employeeLoginInfo.role !== "programer") {
//       toast.error("ليس لك صلاحية لتعديل بيانات الاشتراك");
//       return;
//     }
//     try {
//       const response = await axios.put(
//         `${apiUrl}/api/restaurant/update-subscription/${restaurantId}`,
//         { subscriptionStart, subscriptionEnd },
//         config
//       );

//       if (response.status === 200) {
//         toast.success("تمت تعديل بيانات الاشتراك بنجاح");
//         getRestaurant();
//       } else {
//         toast.error("حدث خطأ أثناء تعديل بيانات الاشتراك! حاول مرة أخرى.");
//       }
//     } catch (error) {
//       console.error(
//         "Error updating subscription dates:",
//         error.response ? error.response.data : error.message
//       );
//       toast.error("فشل تعديل بيانات الاشتراك! حاول مرة أخرى");
//     }
//   };

//   const [remainingTime, setRemainingTime] = useState({ months: 0, days: 0 });

//   useEffect(() => {
//     subscriptionStart &&
//       subscriptionEnd &&
//       setRemainingTime(
//         calculateRemainingTime(subscriptionStart, subscriptionEnd)
//       );
//   }, [subscriptionStart, subscriptionEnd]);

//   const calculateRemainingTime = (startDate, endDate) => {
//     const start = new Date(startDate);
//     const end = new Date(endDate);
//     const today = new Date();

//     if (today > end) {
//       return { months: 0, days: 0 };
//     }

//     let months =
//       (end.getFullYear() - today.getFullYear()) * 12 +
//       (end.getMonth() - today.getMonth());
//     let days = end.getDate() - today.getDate();

//     if (days < 0) {
//       months -= 1;
//       days += new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate(); // days in the current month
//     }

//     if (months < 0) {
//       months = 0;
//       days = 0;
//     }

//     return { months, days };
//   };

//   const [preview, setPreview] = useState(null); // رابط العرض المؤقت

//   useEffect(() => {
//     getRestaurant();
//     getAllShifts();
//     getAllDeliveryAreas();
//   }, []);

//   return (
//     <div className="container w-100 h-auto" dir="rtl">
//       <div className="content-wrapper w-100">
//         <div
//           className="w-100 d-flex flex-wrap align-items-center justify-content-between"
//           style={{
//             color: "darkblue",
//             fontWeight: "900",
//             textAlign: "center",
//             overflowX: "hidden",
//           }}
//         >
//           <div className="col-12 grid-margin">
//             <div className="card">
//               <div className="card-body">
//                 <h4 className="card-title">بيانات الاشتراك</h4>
//                 <form
//                   className="form-sample row d-flex flex-wrap"
//                   onSubmit={updateSubscriptionDates}
//                 >
//                   <div className="form-group  h-auto px-3 d-flex align-items-center justify-content-start col-12 col-md-6 row">
//                     <label className="form-label col-form-label p-0 m-0">
//                       تاريخ بداية الاشتراك
//                     </label>
//                     <div className="col-8">
//                       <input
//                         type="date"
//                         className="form-control border-primary col-12 p-1"
//                         value={formatDate(subscriptionStart)}
//                         onChange={(e) => setSubscriptionStart(e.target.value)}
//                         required
//                         readOnly={employeeLoginInfo.role !== "programer"}
//                       />
//                     </div>
//                   </div>

//                   <div className="form-group  h-auto px-3 d-flex align-items-center justify-content-start col-12 col-md-6 row">
//                     <label className="form-label col-form-label p-0 m-0">
//                       تاريخ نهاية الاشتراك
//                     </label>
//                     <div className="col-8">
//                       <input
//                         type="date"
//                         className="form-control border-primary col-12 p-1"
//                         value={formatDate(subscriptionEnd)}
//                         onChange={(e) => {
//                           setSubscriptionEnd(e.target.value);
//                         }}
//                         required
//                         readOnly={employeeLoginInfo.role !== "programer"}
//                       />
//                     </div>
//                   </div>

//                   <div className="form-group  h-auto px-3 d-flex align-items-center justify-content-start col-12 col-md-6 row">
//                     <label className="form-label col-3 p-0 m-0">
//                       باقي من الوقت
//                     </label>
//                     <div className="col-9">
//                       <input
//                         type="text"
//                         className="form-control border-primary col-12 p-1"
//                         value={`${remainingTime.months} شهر و ${remainingTime.days} يوم`}
//                         readOnly
//                       />
//                     </div>
//                   </div>
//                   {employeeLoginInfo.role === "programer" && (
//                     <div
//                       className="col-12 d-flex flex-nowrap align-items-center justify-content-between "
//                       style={{ height: "50px" }}
//                     >
//                       <button
//                         type="submit"
//                         className="btn btn-success col-6 h-100 p-0"
//                       >
//                         تأكيد
//                       </button>
//                       <button
//                         type="button"
//                         className="btn btn-danger col-6 h-100 p-0"
//                       >
//                         إلغاء
//                       </button>
//                     </div>
//                   )}
//                 </form>
//               </div>
//             </div>
//           </div>

//           <div className="col-12 grid-margin">
//             <div className="card">
//               <div className="card-body">
//                 <h4 className="card-title">بيانات المطعم</h4>
//                 <form
//                   className="form-sample row d-flex flex-wrap"
//                   onSubmit={handleCreateRestaurant}
//                 >
//                   <div className="form-group h-auto px-3 d-flex flex-nowrap align-items-center justify-content-start col-12 col-md-6 ">
//                     <label className="form-label col-3 p-0 m-0">الاسم</label>
//                     <div className="col-9">
//                       <input
//                         type="text"
//                         className="form-control border-primary col-12 p-1"
//                         defaultValue={name}
//                         required
//                         onChange={(e) => setName(e.target.value)}
//                       />
//                     </div>
//                   </div>

//                   <div className="form-group h-auto px-3 d-flex flex-nowrap align-items-center justify-content-start col-12 col-md-6 ">
//                     <label className="form-label col-3 p-0 m-0">الوصف</label>
//                     <div className="col-9">
//                       <textarea
//                         type="text"
//                         className="form-control border-primary col-12 p-1"
//                         defaultValue={description}
//                         required
//                         onChange={(e) => setDescription(e.target.value)}
//                       />
//                     </div>
//                   </div>

//                   <p className="card-description col-12"> العنوان </p>
//                   <div className="form-group h-auto px-3 d-flex flex-nowrap align-items-center justify-content-start col-12 col-md-6 ">
//                     <label className="form-label col-3 p-0 m-0">الدولة</label>
//                     <div className="col-9">
//                       <input
//                         type="text"
//                         className="form-control border-primary col-12 p-1"
//                         defaultValue={country}
//                         onChange={(e) => setCountry(e.target.value)}
//                       />
//                     </div>
//                   </div>

//                   <div className="form-group h-auto px-3 d-flex flex-nowrap align-items-center justify-content-start col-12 col-md-6 ">
//                     <label className="form-label col-3 p-0 m-0">المحافظة</label>
//                     <div className="col-9">
//                       <input
//                         type="text"
//                         className="form-control border-primary col-12 p-1"
//                         defaultValue={state}
//                         required
//                         onChange={(e) => setState(e.target.value)}
//                       />
//                     </div>
//                   </div>

//                   <div className="form-group h-auto px-3 d-flex flex-nowrap align-items-center justify-content-start col-12 col-md-6 ">
//                     <label className="form-label col-3 p-0 m-0">المدينة</label>
//                     <div className="col-9">
//                       <input
//                         type="text"
//                         className="form-control border-primary col-12 p-1"
//                         defaultValue={city}
//                         required
//                         onChange={(e) => setCity(e.target.value)}
//                       />
//                     </div>
//                   </div>

//                   <div className="form-group h-auto px-3 d-flex flex-nowrap align-items-center justify-content-start col-12 col-md-6 ">
//                     <label className="form-label col-3 p-0 m-0">العنوان</label>
//                     <div className="col-9">
//                       <input
//                         type="text"
//                         className="form-control border-primary col-12 p-1"
//                         defaultValue={street}
//                         required
//                         onChange={(e) => setStreet(e.target.value)}
//                       />
//                     </div>
//                   </div>

//                   <div className="form-group h-auto px-3 d-flex flex-nowrap align-items-center justify-content-start col-12 col-md-6 ">
//                     <label className="form-label col-3 p-0 m-0">
//                       رابط المنيو
//                     </label>
//                     <div className="col-9">
//                       <input
//                         type="text"
//                         className="form-control border-primary col-12 p-1"
//                         defaultValue={website}
//                         required
//                         onChange={(e) => setwebsite(e.target.value)}
//                       />
//                     </div>
//                   </div>

//                   <div className="form-group h-auto px-3 d-flex flex-nowrap align-items-center justify-content-start col-12 col-md-6 ">
//                     <label className="form-label col-3 p-0 m-0">
//                       كود البريد
//                     </label>
//                     <div className="col-9">
//                       <input
//                         type="text"
//                         className="form-control border-primary col-12 p-1"
//                         defaultValue={postalCode}
//                         onChange={(e) => setPostalCode(e.target.value)}
//                       />
//                     </div>
//                   </div>

//                   <div className="form-group h-auto px-3 d-flex flex-nowrap align-items-center justify-content-start col-12 col-md-6 ">
//                     <label className="form-label col-3 p-0 m-0">
//                       رابط خريطه جوجل
//                     </label>
//                     <div className="col-9">
//                       <input
//                         type="text"
//                         className="form-control border-primary col-12 p-1"
//                         defaultValue={locationUrl}
//                         required
//                         onChange={(e) => handleExtractSrc(e.target.value)}
//                       />
//                     </div>
//                   </div>
//                   <div className="form-group h-auto px-3 d-flex flex-nowrap align-items-center justify-content-start col-12 col-md-6 ">
//                     <label className="form-label col-3 p-0 m-0">about us</label>
//                     <div className="col-9">
//                       <textarea
//                         className="form-control border-primary col-12 p-1"
//                         defaultValue={aboutText}
//                         required
//                         onChange={(e) => setaboutText(e.target.value)}
//                       />
//                     </div>
//                   </div>

//                   <div className="form-group h-auto px-3 d-flex flex-nowrap align-items-center justify-content-start col-12 col-md-6 ">
//                     <label className="form-label col-3 p-0 m-0">
//                       نسبة الضريبة (%)
//                     </label>
//                     <div className="col-9">
//                       <input
//                         type="number"
//                         className="form-control border-primary col-12 p-1"
//                         value={salesTaxRate}
//                         onChange={(e) => setsalesTaxRate(e.target.value)}
//                         required
//                       />
//                     </div>
//                   </div>

//                   <div className="form-group h-auto px-3 d-flex flex-nowrap align-items-center justify-content-start col-12 col-md-6 ">
//                     <label className="form-label col-3 p-0 m-0">
//                       نسبة الخدمة (%)
//                     </label>
//                     <div className="col-9">
//                       <input
//                         type="number"
//                         className="form-control border-primary col-12 p-1"
//                         value={serviceTaxRate}
//                         onChange={(e) => setserviceTaxRate(e.target.value)}
//                         required
//                       />
//                     </div>
//                   </div>

//                   <div className="form-group h-auto px-3 d-flex flex-nowrap align-items-center justify-content-start col-12 col-md-6 ">
//                     <label className="form-label col-3 p-0 m-0">اللوجو</label>
//                     <div className="d-flex flex-wrap align-items-center col-9">
//                       <input
//                         type="file"
//                         className="form-control border-primary m-0 p-2 h-auto"
//                         onChange={(e) => handleFileUpload(e)}
//                       />
//                       <div
//                         className="d-flex align-items-center justify-content-center w-100 mt-2"
//                         style={{ height: "120px", backgroundColor: "gray" }}
//                       >
//                         <img
//                           src={`${
//                             image ? `${apiUrl}/images/${image}` : preview
//                           }`}
//                           alt="image"
//                           className="img-fluid"
//                           style={{ width: "100%", height: "100%" }}
//                         />
//                       </div>
//                     </div>
//                   </div>

//                   <div className="col-12 col-lg-6 d-flex flex-wrap">
//                     <div className="form-check form-check-flat mb-2 mr-4 d-flex align-items-center w-50">
//                       <input
//                         className="form-check-input"
//                         id="dineInCheck"
//                         type="checkbox"
//                         checked={dineIn}
//                         onChange={() => setdineIn(!dineIn)}
//                       />
//                       <label
//                         className="form-check-label mr-4"
//                         htmlFor="dineInCheck"
//                         style={{ cursor: "pointer" }}
//                       >
//                         الصالة
//                       </label>
//                     </div>
//                     <div className="form-check form-check-flat mb-2 mr-4 d-flex align-items-center w-50">
//                       <input
//                         className="form-check-input"
//                         type="checkbox"
//                         id="takeawayCheck"
//                         checked={takeAway}
//                         onChange={() => settakeAway(!takeAway)}
//                       />
//                       <label
//                         className="form-check-label mr-4"
//                         htmlFor="takeawayCheck"
//                         style={{ cursor: "pointer" }}
//                       >
//                         التيك اوي
//                       </label>
//                     </div>
//                     <div className="form-check form-check-flat mb-2 mr-4 d-flex align-items-center w-50">
//                       <input
//                         className="form-check-input"
//                         type="checkbox"
//                         id="deliveryCheck"
//                         checked={deliveryService}
//                         onChange={() => setdeliveryService(!deliveryService)}
//                       />
//                       <label
//                         className="form-check-label mr-4"
//                         htmlFor="deliveryCheck"
//                         style={{ cursor: "pointer" }}
//                       >
//                         خدمة التوصيل
//                       </label>
//                     </div>
//                     <div className="form-check form-check-flat mb-2 mr-4 d-flex align-items-center w-50">
//                       <input
//                         className="form-check-input"
//                         type="checkbox"
//                         id="reservationCheck"
//                         checked={usesReservationSystem}
//                         onChange={() =>
//                           setusesReservationSystem(!usesReservationSystem)
//                         }
//                       />
//                       <label
//                         className="form-check-label mr-4"
//                         htmlFor="reservationCheck"
//                         style={{ cursor: "pointer" }}
//                       >
//                         حجز الطاولة
//                       </label>
//                     </div>
//                   </div>

//                   <div
//                     className="col-12 d-flex flex-nowrap align-items-center justify-consten-between "
//                     style={{ height: "50px" }}
//                   >
//                     <button
//                       type="submit"
//                       className="btn btn-success col-6 h-100 p-0"
//                     >
//                       تأكيد
//                     </button>
//                     <button
//                       type="button"
//                       className="btn btn-danger col-6 h-100 p-0"
//                     >
//                       إلغاء
//                     </button>
//                   </div>
//                 </form>
//               </div>
//             </div>
//           </div>

//           <div className="container mt-5">
//             <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
//               <div className="col-md-6 mb-4">
//                 <div className="card">
//                   <div className="card-body">
//                     <h4 className="card-title">وسائل الدفع المقبوله</h4>
//                     <p className="card-description">
//                       اختر وسائل الدفع المقبوله لدفع فواتير المطعم
//                     </p>
//                     <form
//                       className="forms-sample p-2"
//                       onSubmit={handleAcceptedPayments}
//                     >
//                       <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
//                         <div className="col-lg-12">
//                           <div className="form-group d-flex flex-wrap">
//                             {listAcceptedPayments.map((AcceptedPayment, i) => (
//                               <div
//                                 className="form-check form-check-flat mb-2 mr-4 d-flex align-items-center"
//                                 key={i}
//                                 style={{ minWidth: "200px" }}
//                               >
//                                 <input
//                                   type="checkbox"
//                                   className="form-check-input"
//                                   id={`acceptedPaymentCheck${i}`}
//                                   value={AcceptedPayment}
//                                   checked={acceptedPayments.includes(
//                                     AcceptedPayment
//                                   )}
//                                   onChange={() =>
//                                     handleacceptedPaymentsCheckboxChange(
//                                       AcceptedPayment
//                                     )
//                                   }
//                                 />
//                                 <label
//                                   className="form-check-label mr-4"
//                                   htmlFor={`acceptedPaymentCheck${i}`}
//                                 >
//                                   {listAcceptedPaymentsAr[i]}
//                                 </label>
//                               </div>
//                             ))}
//                           </div>
//                         </div>
//                       </div>
//                       <div
//                         className="col-12 d-flex flex-nowrap align-items-center justify-consten-between "
//                         style={{ height: "50px" }}
//                       >
//                         <button
//                           type="submit"
//                           className="btn btn-success col-6 h-100 p-0"
//                         >
//                           تأكيد
//                         </button>
//                         <button
//                           type="button"
//                           className="btn btn-danger col-6 h-100 p-0"
//                         >
//                           إلغاء
//                         </button>
//                       </div>
//                     </form>
//                   </div>
//                 </div>
//               </div>

//               <div className="col-md-6 mb-4">
//                 <div className="card">
//                   <div className="card-body">
//                     <h4 className="card-title">خدمات اضافيه</h4>
//                     <p className="card-description">
//                       اختر الخدمات المتاحة التي يقدمها المطعم
//                     </p>
//                     <form
//                       className="forms-sample p-2"
//                       onSubmit={handleFeatures}
//                     >
//                       <div className="w-100 d-flex flex-wrap align-items-center justify-content-between">
//                         <div className="col-lg-12">
//                           <div className="form-group d-flex flex-wrap">
//                             {listFeatures.map((feature, i) => (
//                               <div
//                                 className="form-check form-check-flat mb-2 mr-4 d-flex align-items-center"
//                                 key={i}
//                                 style={{ minWidth: "200px" }}
//                               >
//                                 <input
//                                   type="checkbox"
//                                   className="form-check-input"
//                                   id={`featureCheck${i}`}
//                                   value={feature}
//                                   checked={features.includes(feature)}
//                                   onChange={() =>
//                                     handleFeaturesCheckboxChange(feature)
//                                   }
//                                 />
//                                 <label
//                                   className="form-check-label mr-4"
//                                   htmlFor={`featureCheck${i}`}
//                                 >
//                                   {listFeaturesAr[i]}
//                                 </label>
//                               </div>
//                             ))}
//                           </div>
//                         </div>
//                       </div>
//                       <div
//                         className="col-12 d-flex flex-nowrap align-items-center justify-consten-between "
//                         style={{ height: "50px" }}
//                       >
//                         <button
//                           type="submit"
//                           className="btn btn-success col-6 h-100 p-0"
//                         >
//                           تأكيد
//                         </button>
//                         <button
//                           type="button"
//                           className="btn btn-danger col-6 h-100 p-0"
//                         >
//                           إلغاء
//                         </button>
//                       </div>
//                     </form>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* contact  */}
//           <div className="col-lg-6 d-flex grid-margin">
//             <div className="row flex-grow">
//               <div className="col-12 stretch-card mb-3">
//                 <div className="card">
//                   <div className="card-body">
//                     <h4 className="card-title">بيانات التواصل</h4>
//                     <p className="card-description">
//                       {" "}
//                       ادخل بيانات التواصل المتاحة لديك{" "}
//                     </p>
//                     <form
//                       className="forms-sample p-2"
//                       onSubmit={(e) => handleContactSocialmedia(e)}
//                     >
//                       <div
//                         className="form-group  h-auto px-3 d-flex align-items-center justify-content-start col-12 "
//                         style={{ width: "100%" }}
//                       >
//                         <label className="col-4 text-dark fs-5" htmlFor="phone">
//                           رقم الهاتف:
//                         </label>
//                         <input
//                           type="text"
//                           className="form-control border-primary m-0 p-2 h-auto"
//                           id="phone"
//                           placeholder="ادخل رقم الهاتف"
//                           required
//                           defaultValue={phone}
//                           onChange={(e) => setPhone([e.target.value])}
//                         />
//                       </div>
//                       <div
//                         className="form-group  h-auto px-3 d-flex align-items-center justify-content-start col-12 "
//                         style={{ width: "100%" }}
//                       >
//                         <label
//                           className="col-4 text-dark fs-5"
//                           htmlFor="whatsapp"
//                         >
//                           واتساب:
//                         </label>
//                         <input
//                           type="text"
//                           className="form-control border-primary m-0 p-2 h-auto"
//                           id="whatsapp"
//                           placeholder="ادخل رقم واتساب"
//                           required
//                           defaultValue={whatsapp}
//                           onChange={(e) => setWhatsapp(e.target.value)}
//                         />
//                       </div>
//                       <div
//                         className="form-group  h-auto px-3 d-flex align-items-center justify-content-start col-12 "
//                         style={{ width: "100%" }}
//                       >
//                         <label className="col-4 text-dark fs-5" htmlFor="email">
//                           البريد الإلكتروني:
//                         </label>
//                         <input
//                           type="email"
//                           className="form-control border-primary m-0 p-2 h-auto"
//                           id="email"
//                           placeholder="ادخل البريد الإلكتروني"
//                           defaultValue={email}
//                           onChange={(e) => setEmail(e.target.value)}
//                         />
//                       </div>
//                       <div
//                         className="form-group  h-auto px-3 d-flex align-items-center justify-content-start col-12 "
//                         style={{ width: "100%" }}
//                       >
//                         <label
//                           className="col-4 text-dark fs-5"
//                           htmlFor="facebook"
//                         >
//                           فيسبوك:
//                         </label>
//                         <input
//                           type="text"
//                           className="form-control border-primary m-0 p-2 h-auto"
//                           id="facebook"
//                           placeholder="ادخل رابط فيسبوك"
//                           defaultValue={facebook}
//                           required
//                           onChange={(e) => setFacebook(e.target.value)}
//                         />
//                       </div>
//                       <div className="form-group  h-auto px-3 d-flex align-items-center justify-content-start col-12 ">
//                         <label
//                           className="col-4 text-dark fs-5"
//                           htmlFor="twitter"
//                         >
//                           تويتر:
//                         </label>
//                         <input
//                           type="text"
//                           className="form-control border-primary m-0 p-2 h-auto"
//                           id="twitter"
//                           placeholder="ادخل رابط تويتر"
//                           defaultValue={twitter}
//                           onChange={(e) => setTwitter(e.target.value)}
//                         />
//                       </div>
//                       <div className="form-group  h-auto px-3 d-flex align-items-center justify-content-start col-12 ">
//                         <label
//                           className="col-4 text-dark fs-5"
//                           htmlFor="instagram"
//                         >
//                           انستجرام:
//                         </label>
//                         <input
//                           type="text"
//                           className="form-control border-primary m-0 p-2 h-auto"
//                           id="instagram"
//                           placeholder="ادخل رابط انستجرام"
//                           defaultValue={instagram}
//                           onChange={(e) => setInstagram(e.target.value)}
//                         />
//                       </div>
//                       <div className="form-group  h-auto px-3 d-flex align-items-center justify-content-start col-12 ">
//                         <label
//                           className="col-4 text-dark fs-5"
//                           htmlFor="linkedin"
//                         >
//                           لينكدإن:
//                         </label>
//                         <input
//                           type="text"
//                           className="form-control border-primary m-0 p-2 h-auto"
//                           id="linkedin"
//                           placeholder="ادخل رابط لينكدإن"
//                           defaultValue={linkedin}
//                           onChange={(e) => setLinkedin(e.target.value)}
//                         />
//                       </div>
//                       <div className="form-group  h-auto px-3 d-flex align-items-center justify-content-start col-12 ">
//                         <label
//                           className="col-4 text-dark fs-5"
//                           htmlFor="youtube"
//                         >
//                           يوتيوب:
//                         </label>
//                         <input
//                           type="text"
//                           className="form-control border-primary m-0 p-2 h-auto"
//                           id="youtube"
//                           placeholder="ادخل رابط يوتيوب"
//                           defaultValue={youtube}
//                           onChange={(e) => setYoutube(e.target.value)}
//                         />
//                       </div>
//                       <div
//                         className="col-12 d-flex flex-nowrap align-items-center justify-consten-between "
//                         style={{ height: "50px" }}
//                       >
//                         <button
//                           type="submit"
//                           className="btn btn-success col-6 h-100 p-0"
//                         >
//                           تأكيد
//                         </button>
//                         <button
//                           type="button"
//                           className="btn btn-danger col-6 h-100 p-0"
//                         >
//                           إلغاء
//                         </button>
//                       </div>
//                     </form>
//                   </div>
//                 </div>
//               </div>
//               <div className="col-12 stretch-card">
//                 <div className="card">
//                   <div className="card-body">
//                     <h4 className="card-title">إضافة بيانات مناطق التوصيل</h4>
//                     <p className="card-description">
//                       أضف المناطق وتكلفة التوصيل
//                     </p>
//                     <div className="form-row mb-3">
//                       <div className="col">
//                         <button
//                           type="button"
//                           className="btn btn-success col-6 p-2"
//                           onClick={addArea}
//                         >
//                           إضافة منطقة توصيل
//                         </button>
//                       </div>
//                     </div>
//                     <form
//                       className="forms-sample p-2"
//                       onSubmit={(e) => handleDeliveryArea(e)}
//                     >
//                       {areas.map((area, index) => (
//                         <div
//                           key={index}
//                           className="form-row mb-3 align-items-center"
//                         >
//                           <div className="col-8 mb-2 mb-md-0">
//                             <input
//                               type="text"
//                               className="form-control border-primary col-12 p-1"
//                               placeholder="اسم المنطقة"
//                               defaultValue={area.name}
//                               onChange={(e) => handleAreasNameChange(index, e)}
//                             />
//                           </div>
//                           <div className="col-2 mb-2 mb-md-0">
//                             <input
//                               type="number"
//                               className="form-control border-primary col-12 p-1"
//                               placeholder="تكلفة التوصيل"
//                               defaultValue={Number(area.delivery_fee)}
//                               onChange={(e) =>
//                                 handledeliveryFeeChange(index, e)
//                               }
//                             />
//                           </div>
//                           <div className="col-2 mb-2 mb-md-0">
//                             <button
//                               type="button"
//                               className="btn btn-danger col-12 h-100 p-0 m-0"
//                               onClick={() => removeArea(index, area._id)}
//                               style={{ height: "50px" }}
//                             >
//                               <i className="mdi mdi-delete fs-3" />
//                             </button>
//                           </div>
//                         </div>
//                       ))}
//                       <div
//                         className="col-12 d-flex flex-nowrap align-items-center justify-consten-between "
//                         style={{ height: "50px" }}
//                       >
//                         <button
//                           type="submit"
//                           className="btn btn-success col-6 h-100 p-0"
//                         >
//                           تأكيد
//                         </button>
//                         <button
//                           type="button"
//                           className="btn btn-danger col-6 h-100 p-0"
//                         >
//                           إلغاء
//                         </button>
//                       </div>
//                     </form>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>

//           <div
//             className="col-lg-6 d-flex grid-margin"
//             style={{ overflowX: "scroll" }}
//           >
//             <div className="row flex-grow">
//               <div className="col-12 stretch-card mb-3">
//                 <div className="card">
//                   <div className="card-body">
//                     <h4 className="card-title">مواعيد العمل </h4>
//                     <p className="card-description">
//                       ادخل مواعيد العمل اليومية{" "}
//                     </p>
//                     <form
//                       className="forms-sample p-2"
//                       onSubmit={(e) => handleOpeningHours(e)}
//                     >
//                       <table className="table table-striped">
//                         <thead>
//                           <tr>
//                             <th>اليوم</th>
//                             <th>وقت الافتتاح</th>
//                             <th>وقت الإغلاق</th>
//                             <th>مغلق</th>
//                           </tr>
//                         </thead>
//                         <tbody>
//                           {daysOfWeek.map((day, index) => (
//                             <tr key={index}>
//                               <td className="col- text-center">{day}</td>
//                               <td>
//                                 <input
//                                   type="time"
//                                   className="form-control border-primary m-0 p-2 h-auto"
//                                   name={`openingTime${day}`}
//                                   readOnly={
//                                     operatingHours &&
//                                     operatingHours[index]?.closed
//                                   }
//                                   disabled={
//                                     operatingHours &&
//                                     operatingHours[index]?.closed
//                                   }
//                                   value={
//                                     operatingHours && operatingHours[index].from
//                                   }
//                                   onChange={(e) =>
//                                     handleSetFrom(index, e.target.value)
//                                   }
//                                 />
//                               </td>

//                               <td>
//                                 <input
//                                   type="time"
//                                   className="form-control border-primary m-0 p-2 h-auto"
//                                   name={`closingTime${day}`}
//                                   readOnly={
//                                     operatingHours &&
//                                     operatingHours[index]?.closed
//                                   }
//                                   disabled={
//                                     operatingHours &&
//                                     operatingHours[index]?.closed
//                                   }
//                                   value={
//                                     operatingHours && operatingHours[index].to
//                                   }
//                                   onChange={(e) =>
//                                     handleSetTo(index, e.target.value)
//                                   }
//                                 />
//                               </td>

//                               <td>
//                                 <input
//                                   type="checkbox"
//                                   className="form-check-input form-check-input-lg"
//                                   name={`closed${day}`}
//                                   checked={operatingHours[index]?.closed}
//                                   onChange={(e) => handleCheckboxChange(index)}
//                                 />
//                               </td>
//                             </tr>
//                           ))}
//                         </tbody>
//                       </table>
//                       <div
//                         className="col-12 d-flex flex-nowrap align-items-center justify-consten-between "
//                         style={{ height: "50px" }}
//                       >
//                         <button
//                           type="submit"
//                           className="btn btn-success col-6 h-100 p-0"
//                         >
//                           تأكيد
//                         </button>
//                         <button
//                           type="button"
//                           className="btn btn-danger col-6 h-100 p-0"
//                         >
//                           إلغاء
//                         </button>
//                       </div>
//                     </form>
//                   </div>
//                 </div>
//               </div>
//               <div className="col-12 stretch-card">
//                 <div className="card">
//                   <div className="card-body">
//                     <h4 className="card-title">إضافة بيانات الورديات</h4>
//                     <p className="card-description">
//                       أضف الورديات و وقت الحضور و الانصراف
//                     </p>
//                     <div className="form-row mb-3">
//                       <div className="col">
//                         <button
//                           type="button"
//                           className="btn btn-success col-6 p-2"
//                           onClick={addShift}
//                         >
//                           إضافة وردية
//                         </button>
//                       </div>
//                     </div>
//                     <form
//                       className="forms-sample p-2"
//                       onSubmit={(e) => handleCreateShifts(e)}
//                     >
//                       {shifts.map((shift, index) => (
//                         <div
//                           key={index}
//                           className="form-row mb-3 align-items-center"
//                         >
//                           <div className="col-md-3 col-12 mb-2 mb-md-0">
//                             <input
//                               type="text"
//                               className="form-control border-primary col-12 p-1"
//                               placeholder="اسم الوردية"
//                               defaultValue={shift.shiftType}
//                               onChange={(e) => handleShiftTypeChange(index, e)}
//                             />
//                           </div>
//                           <div className="col-md-3 col-6 mb-2 mb-md-0">
//                             <input
//                               type="time"
//                               className="form-control border-primary col-12 p-1"
//                               placeholder="ميعاد البدء"
//                               defaultValue={shift.startTime}
//                               onChange={(e) => handleStartTimeChange(index, e)}
//                             />
//                           </div>
//                           <div className="col-md-3 col-6 mb-2 mb-md-0">
//                             <input
//                               type="time"
//                               className="form-control border-primary col-12 p-1"
//                               placeholder="ميعاد الانتهاء"
//                               defaultValue={shift.endTime}
//                               onChange={(e) => handleEndTimeChange(index, e)}
//                             />
//                           </div>
//                           <div className="col-md-2 col-6 mb-2 mb-md-0">
//                             <p className="form-control-plaintext">{`${
//                               shift.hours > 0 ? shift.hours : 0
//                             } ساعات`}</p>
//                           </div>
//                           <div className="col-md-1 col-6 m-0 p-0">
//                             <button
//                               type="button"
//                               className="btn btn-danger text-center w-100 h-100 p-0 m-0"
//                               onClick={() => removeShift(index, shift._id)}
//                             >
//                               <i className="mdi mdi-delete fs-3" />
//                             </button>
//                           </div>
//                         </div>
//                       ))}
//                       <div
//                         className="col-12 d-flex flex-nowrap align-items-center justify-consten-between "
//                         style={{ height: "50px" }}
//                       >
//                         <button
//                           type="submit"
//                           className="btn btn-success col-6 h-100 p-0"
//                         >
//                           تأكيد
//                         </button>
//                         <button
//                           type="button"
//                           className="btn btn-danger col-6 h-100 p-0"
//                         >
//                           إلغاء
//                         </button>
//                       </div>
//                     </form>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Info;
