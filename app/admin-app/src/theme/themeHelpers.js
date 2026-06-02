// src/theme/themeHelpers.js

/**
 * Theme helper functions.
 */

export const isDarkTheme = () =>
  document.documentElement.classList.contains(
    "dark"
  );

export const setTheme = (theme) => {
  if (theme === "dark") {
    document.documentElement.classList.add(
      "dark"
    );
  } else {
    document.documentElement.classList.remove(
      "dark"
    );
  }
};

export const getTheme = () =>
  isDarkTheme() ? "dark" : "light";