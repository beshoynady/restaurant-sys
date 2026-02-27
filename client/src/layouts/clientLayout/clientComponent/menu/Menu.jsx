import React, { useState, useContext } from "react";
import "./Menu.css";
import MenuCard from "./Menu-card/Menu-card";
import { AppContext } from "../../../../context/appContext";

const Menu = () => {
  const {
    allMenuCategories,
    setMenuCategoryId,
    filterByMenuCategoryId,
    menuCategoryId,
    handleGetTokenAndConfig,
    apiUrl,
  } = useContext(AppContext);
  const [activeItem, setActiveItem] = useState(null);
  return (
    <section id="menu">
      <div className="container-lg">
        <div className="section-title">
          <h2>قائمة الطعام</h2>
        </div>
        <div className="section-content">
          <nav className="menu-nav">
            <ul className="menu-ul">
              {allMenuCategories && allMenuCategories.length > 0
                ? allMenuCategories.map((c, i) => (
                    <li key={i} className="menu-nav-li">
                      <a
                        href="#menu"
                        className={`category-btn ${
                          activeItem === i ? "active" : ""
                        }`}
                        onClick={() => {
                          setMenuCategoryId(c._id);
                          setActiveItem(i);
                        }}
                      >
                        {c.name}
                      </a>
                    </li>
                  ))
                : ""}
            </ul>
          </nav>
          <MenuCard />
        </div>
      </div>
    </section>
  );
};

export default Menu;
