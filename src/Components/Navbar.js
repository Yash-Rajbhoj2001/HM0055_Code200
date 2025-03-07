import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import logo from '../Assets/logo-main.png';

function Navbar() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("userEmail"));
  const [userType, setUserType] = useState(localStorage.getItem("userType"));

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

  // New effect to check login status every 500ms
  useEffect(() => {
    const interval = setInterval(() => {
      setIsLoggedIn(!!localStorage.getItem("userEmail"));
      setUserType(localStorage.getItem("userType"));
    }, 500); 

    return () => clearInterval(interval);
  }, []);

  const toggleMenu = () => setMenuOpen(!menuOpen);
  const closeMenu = () => setMenuOpen(false);

  const handleLogout = () => {
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userType");
    setIsLoggedIn(false);
    setUserType(null);
    navigate("/");
  };

  const setdrop = () => {
    document.querySelector('#drop').classList.toggle('active');
  };

  const navigateback = () => {
    const email = localStorage.getItem('userEmail');
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
              <Link to='/account' onClick={closeMenu}>
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
              <div className='profile' onClick={setdrop}>
                <i className="fa-solid fa-user"></i>
                <p>Profile</p>
              </div>
              <div className='drop-down' id='drop'>
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
