import React from "react";
import ReactDOM from "react-dom/client";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./styles.css";
import AppRoutes from "./routes/AppRoutes.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppRoutes />
    <ToastContainer position="top-right" autoClose={2500} newestOnTop theme="colored" />
  </React.StrictMode>
);
