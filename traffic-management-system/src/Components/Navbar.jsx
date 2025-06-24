import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

export default function Navbar() {
  const location = useLocation();
  
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          Traffic Management
        </Link>
        
        <div className="navbar-links">
          <Link 
            to="/" 
            className={`navbar-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            Home
          </Link>
          <Link 
            to="/booking" 
            className={`navbar-link ${location.pathname === '/booking' ? 'active' : ''}`}
          >
            Book Journey
          </Link>
          <Link 
            to="/cancel" 
            className={`navbar-link ${location.pathname === '/cancel' ? 'active' : ''}`}
          >
            Cancel Journey
          </Link>
          <Link 
            to="/capacity" 
            className={`navbar-link ${location.pathname === '/capacity' ? 'active' : ''}`}
          >
            Check Capacity
          </Link>
          <Link 
            to="/check_status" 
            className={`navbar-link ${location.pathname === '/check_status' ? 'active' : ''}`}
          >
            Check Booking Status
          </Link>
        </div>
        
      </div>
    </nav>
  );
}