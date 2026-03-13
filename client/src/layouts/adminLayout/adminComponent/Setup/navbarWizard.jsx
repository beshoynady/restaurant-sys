import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sun, Moon, Globe } from "lucide-react";

/**
 * Navbar component
 * Provides dark/light mode toggle and language switcher
 * Used in SetupWizard screens (first-time setup)
 */
const NavbarWizard = ({ lang, setLang, theme, setTheme }) => {
  // Toggle dark/light theme and store preference in localStorage
  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  // Toggle language and store preference in localStorage
  const toggleLang = () => {
    const newLang = lang === "en" ? "ar" : "en";
    setLang(newLang);
    localStorage.setItem("lang", newLang);
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
  };

  // Apply theme to document root (for Tailwind dark mode)
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // Load saved preferences on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const savedLang = localStorage.getItem("lang");
    if (savedTheme) setTheme(savedTheme);
    if (savedLang) setLang(savedLang);
  }, []);

  return (
    <motion.nav
      className={`d-flex justify-content-between align-items-center px-4 py-2 shadow-sm position-fixed w-100 top-0 z-50 ${
        theme === "dark" ? "bg-dark text-light" : "bg-white text-dark"
      }`}
      style={{ top: 0, left: 0, right: 0, zIndex: 1000 }}
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Brand Name */}
      <h4 className="fw-bold text-primary m-0">Smart Menu Setup</h4>

      {/* Controls */}
      <div className="d-flex align-items-center gap-3">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`btn btn-sm rounded-circle mx-1 ${
            theme === "dark" ? "btn-warning" : "btn-dark"
          }`}
          title="Toggle Theme"
        >
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* Language Toggle */}
        <button
          onClick={toggleLang}
          className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1"
          title="Change Language"
        >
          <Globe size={16} />
          <span>{lang === "en" ? "عربي" : "English"}</span>
        </button>
      </div>
    </motion.nav>
  );
};

export   default NavbarWizard;
