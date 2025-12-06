import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, FileText } from "lucide-react";

const Navbar = () => {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      <div className="logo-section">
        <div className="logo-icon">
          <FileText size={22} color="white" />
        </div>
        <h2 className="logo-text">Procurement Management System</h2>
      </div>

      <div className="nav-links">
        <Link to="/" className={`nav-btn ${isActive("/") ? "active" : ""}`}>
          <Home size={18} />
          <span>Dashboard</span>
        </Link>
        <Link
          to="/create-rfp"
          className={`nav-btn ${isActive("/create-rfp") ? "active" : ""}`}
        >
          <FileText size={18} />
          <span>Create RFP</span>
        </Link>
        <Link
          to="/vendors"
          className={`nav-btn ${isActive("/vendors") ? "active" : ""}`}
        >
          <span>Vendors</span>
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
