import { useState, useEffect } from 'react';
import { Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import logo from '../src/Assets/logo-main.png';
import './App.css';
import Chatbot from './Components/Chatbot';
import Home from './Components/Home';
import Account from './Components/Account';
import Admin from './Components/Admin';
import DoctorHome from './Components/DoctorHome';
import Administrator from './Components/Administrator';
import PatientHome from './Components/PatientHome';
import HospitalHome from './Components/HospitalHome';
import Institution from './Components/Institution';
import Contact from './Components/Contact';
import SpecialtiesPage from './Components/Specialities';
import LearnMore from './Components/LearnMore';
import Footer from './Components/Footer';
import VideoCall from "./Components/VideoCall";
// import Video from "./Components/Video";
import Navbar from './Components/Navbar';
import Market from './Components/Market';
import BookAccount from './Components/BookAccount';


// Create a ScrollToTop component that doesn't modify your existing code
function ScrollToTop() {
  const { pathname } = useLocation();
  
  useEffect(() => {
    // Apply smooth scrolling on route change
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, [pathname]);
  
  return null;
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("userEmail"));

  // Hide Navbar on specific routes
  const hideNavbarRoutes = ['/HospitalHome', '/Institute', '/Market'];
  const hideNavbar = hideNavbarRoutes.includes(location.pathname);

  // Update isLoggedIn when localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const email = localStorage.getItem("userEmail");
      setIsLoggedIn(!!email); // Update state based on current localStorage
    };

    // Listen for storage changes (e.g., from other tabs)
    window.addEventListener("storage", handleStorageChange);

    // Check localStorage on mount and after login
    handleStorageChange();

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []); // Empty dependency array to run only on mount/unmount

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth', // Smooth scrolling
    });
  }, [location.pathname]);

  const toggleMenu = () => setMenuOpen(!menuOpen);
  const closeMenu = () => setMenuOpen(false);

  const handleLogout = () => {
    localStorage.removeItem("userEmail");
    localStorage.removeItem("userType"); // Consistent key
    setIsLoggedIn(false);
    navigate("/");
  };

  const setdrop = () => {
    document.querySelector('#drop').classList.toggle('active');
  };

  const navigateback = () => {
    const email = localStorage.getItem('userEmail');
    const type = localStorage.getItem('userType'); // Fixed key to 'userType'
    console.log('Email:', email, 'Type:', type); // Debug
    if (type === 'doctor') {
      navigate('/DoctorPanel', { state: { email } });
    } else if (type === 'patient') { // Explicitly handle patient type
      navigate('/PatientPanel', { state: { email } });
    } else {
      console.error('Unknown user type:', type);
      navigate('/'); // Fallback to home if type is invalid
    }
  };

  // Add CSS for smooth scrolling globally
  useEffect(() => {
    // Create style element
    const style = document.createElement('style');
    style.textContent = `
      html {
        scroll-behavior: smooth !important;
      }
    `;
    // Add to document head
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <>
      {/* Add ScrollToTop component before the rest of your layout */}
      <ScrollToTop />
      
      {/* Conditionally render Navbar based on the current route */}
      {!hideNavbar && <Navbar />}
      
      <Routes>
        <Route path="/HospitalHome" element={<HospitalHome />} />
        <Route path="/Institute" element={<Institution />} />
        <Route path='/account' element={<Account />} />
        <Route path='/' element={<Home />} />
        <Route path='/DoctorPanel' element={<DoctorHome />} />
        <Route path='/Admin' element={<Admin />} />
        <Route path='/PatientPanel' element={<PatientHome />} />
        <Route path='/bookappointment' element={<SpecialtiesPage />} />
        <Route path='/Administator' element={<Administrator />} />
        <Route path='/Contact' element={<Contact />} />
        <Route path='/InstituteAction' element={<HospitalHome />} />
        <Route path='/LearnMore' element={<LearnMore />} />
        <Route path="/call" element={<VideoCall />} />
        <Route path='/Market' element={<Market />} />
        <Route path='/BookAccount' element={<BookAccount />} />

      </Routes>
      
      <Chatbot />
      <Footer />
    </>
  );
}

export default App;