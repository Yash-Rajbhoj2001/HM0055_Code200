import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../Styles/Footer.css';

const Footer = () => {
  const [userType, setUserType] = useState(localStorage.getItem('userType'));
  const navigate = useNavigate();

  useEffect(() => {
    const handleStorageChange = () => {
      setUserType(localStorage.getItem('userType'));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleProfileClick = () => {
    const email = localStorage.getItem('userEmail');
    if (userType === 'doctor') {
      navigate('/DoctorPanel', { state: { email } });
    } else if (userType === 'patient') {
      navigate('/PatientPanel', { state: { email } });
    } else {
      navigate('/Account');
    }
  };

  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Quick Links Section */}
        <div className="footer-section">
          <h3 className="footer-heading">Quick Links</h3>
          <ul className="footer-links">
            <li><Link to="/">Home</Link></li>

            <li
              onClick={handleProfileClick}
              style={{ cursor: 'pointer' }}
            >
              {userType === 'doctor' || userType === 'patient'
                ? 'Profile'
                : 'Login / Register'}
            </li>

            <li><Link to="/LearnMore">About Us</Link></li>
            <li><Link to="/">Services</Link></li>
            <li><Link to="/Contact">Contact Us</Link></li>
          </ul>
        </div>

        {/* Contact Information Section */}
        <div className="footer-section">
          <h3 className="footer-heading">Contact Us</h3>
          <ul className="footer-contact">
            <li>📞 +91 123 456 7890</li>
            <li>✉️ info@healthcaremanagement.com</li>
            <li>📍 123 Main Street, Mumbai, India</li>
          </ul>
        </div>

        {/* Social Media Section */}
        <div className="footer-section">
          <h3 className="footer-heading">Follow Us</h3>
          <div className="social-icons">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">
              <i className="fa-brands fa-facebook"></i>
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">
              <i className="fa-brands fa-x-twitter"></i>
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
              <i className="fa-brands fa-instagram"></i>
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">
              <i className="fa-brands fa-linkedin"></i>
            </a>
          </div>
        </div>
      </div>

      {/* Copyright Section */}
      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} Healthcare Management System. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
