import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import logo from '../Assets/logo-main.png';

function Navbar() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("userEmail"));
  const [userType, setUserType] = useState(localStorage.getItem("userType"));
  const dropdownRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleStorageChange = () => {
      setIsLoggedIn(!!localStorage.getItem("userEmail"));
      setUserType(localStorage.getItem("userType"));
    };
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Effect to check login status every 500ms
  useEffect(() => {
    const interval = setInterval(() => {
      setIsLoggedIn(!!localStorage.getItem("userEmail"));
      setUserType(localStorage.getItem("userType"));
    }, 500); 
    return () => clearInterval(interval);
  }, []);

  // Add click outside listener to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        // If the click is outside both the dropdown and the profile button
        const dropdown = document.querySelector('#drop');
        if (dropdown && dropdown.classList.contains('active')) {
          dropdown.classList.remove('active');
        }
      }
    }

    // Add event listener
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      // Clean up the event listener
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleMenu = () => setMenuOpen(!menuOpen);
  const closeMenu = () => setMenuOpen(false);

  const handleLogout = (e) => {
    // Prevent event from bubbling up to parent elements
    e.stopPropagation();
    
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userType");
    setIsLoggedIn(false);
    setUserType(null);
    
    // Close the dropdown
    document.querySelector('#drop').classList.remove('active');
    
    navigate("/");
  };

  const setdrop = () => {
    document.querySelector('#drop').classList.toggle('active');
  };

  const navigateback = (e) => {
    // Prevent event from bubbling up to parent elements
    e.stopPropagation();
    
    const email = localStorage.getItem('userEmail');
    
    // Close the dropdown
    document.querySelector('#drop').classList.remove('active');
    
    if (userType === 'doctor') {
      navigate('/DoctorPanel', { state: { email } });
    } else if (userType === 'patient') {
      navigate('/PatientPanel', { state: { email } });
    } else {
      navigate('/');
    }
  };

  return (
    <>
      <header>
        <div className='logo-div'>
          <img src={logo} className='App-logo' alt='logo' />
          <h1>MEDILOG</h1>
        </div>
        <button className='mobile-menu-btn' onClick={toggleMenu}>
          <i className={menuOpen ? "fa-solid fa-xmark" : "fa-solid fa-bars"}></i>
        </button>
        <div className={`nav-div ${menuOpen ? 'open' : ''}`}>
          <Link to='/' onClick={closeMenu}><i className="fa-solid fa-house"></i>Home</Link>
          {userType !== 'doctor' && (
            userType === 'patient' ? (
              <Link to='/bookappointment' onClick={closeMenu}>
                <i className="fa-solid fa-calendar-check"></i> Book Appointment
              </Link>
            ) : !userType ? (
              <Link to='/BookAccount' onClick={closeMenu}>
                <i className="fa-solid fa-calendar-check"></i> Book Appointment
              </Link>
            ) : null
          )}
          <Link to='/Contact' onClick={closeMenu}><i className="fa-solid fa-phone"></i>Contact</Link>
          {userType !== 'doctor' && userType !== 'patient' && (
            <Link to='/InstituteAction' onClick={closeMenu}>
              <i className="fa-solid fa-hospital"></i>Hospital
            </Link>
          )}
          {isLoggedIn ? (
            <div className='profile-container'>
              <div className='profile' onClick={setdrop} ref={profileRef}>
                <i className="fa-solid fa-user"></i>
                <p>Profile</p>
              </div>
              <div className='drop-down' id='drop' ref={dropdownRef}>
                <p onClick={navigateback}>Dashboard</p>
                <p onClick={handleLogout} className="logout-btn">Logout</p>
              </div>
            </div>
          ) : (
            <Link to='/Account' onClick={closeMenu}><i className="fa-solid fa-user"></i>Login / Register</Link>
          )}
        </div>
      </header>
    </>
  );
}

export default Navbar;