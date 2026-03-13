import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { AppContext } from "../../../../context/appContext";

import { toast } from "react-toastify";
import "./Contact.css";
import whatsapp from "../../../../image/whatsapp.png";
import facebook from "../../../../image/facebook.png";
// import io from 'socket.io-client';
// const socket = io(process.env.REACT_APP_API_URL, {
//   reconnection: true,
// });

const Contact = () => {
  const { brandInfo, handleGetTokenAndConfig, apiUrl } =
    useContext(AppContext);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const sendmessage = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token_e");

      if (!name || !phone || !message) {
        toast.error("الاسم و الموبايل و الرساله حقول مطلوبه");
      }
      const send = await axios.post(
        `${apiUrl}/api/message`,
        {
          name,
          email,
          phone,
          message,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (send.status === 201) {
        //  socket.emit("sendorder", "هناك رساله جديدة");

        toast.success("تم ارسال رسالتك بنجاح");
      } else {
        toast.error("حدث خطأ اثناء ارسال الرساله ! حاول مره اخري");
      }
    } catch (error) {
      toast.error("فشل ارسال الرسال ! حاول مرع اخري");
    }
  };

  return (
    <section className="contact" id="contact">
      <div className="container">
        <div className="section-title">
          <h2>تواصل معنا</h2>
        </div>
        <div className="contact-content">
          <div className="right">
            {brandInfo.socialMedia?.map((item, index) => {
              return item.platform === "facebook" ? (
                <p key={index}>
                  صفحتنا علي الفيس بوك
                  <a href={item.url} target="_blank" rel="noreferrer">
                    <img src={facebook} alt="facebook Icon" />
                  </a>
                </p>
              ) : null;
            })}

            <p>
              {" "}
              واتساب
              <a
                href={`https://api.whatsapp.com/send?phone=+2${brandInfo.contact?.whatsapp}`}
                target="_blank"
                rel="noreferrer"
              >
                <img src={whatsapp} alt="WhatsApp Icon" />
              </a>
            </p>
            <p>
              موبايل
              <a href={`tel:${brandInfo.contact?.phone}`}>
                {brandInfo.contact?.phone}
              </a>
            </p>
          </div>
          <div className="left">
            <h2>لارسال الشكاوي و الملاحظات</h2>
            <form onSubmit={sendmessage}>
              <input
                placeholder="اسمك"
                type="text"
                id="name"
                required
                onChange={(e) => setName(e.target.value)}
              />
              <input
                placeholder="البريد الالكتروني"
                type="email"
                id="email"
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                placeholder="رقم الموبايل"
                type="tel"
                id="phone"
                required
                onChange={(e) => setPhone(e.target.value)}
              />
              <textarea
                placeholder="رسالتك"
                maxLength={150}
                type="text"
                id="subject"
                required
                onChange={(e) => setMessage(e.target.value)}
              />
              <button type="Submit">ارسال</button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export   default Contact;
