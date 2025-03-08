import { useState } from "react";
import { set, ref, get, child } from 'firebase/database';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import db, { auth } from '../firebase';
import '../App.css';
import '../Styles/hospital.css';
import Navbar from './Navbar';

const HospitalHome = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [wrd,setWard] = useState("");
  const [password, setPassword] = useState("");
  const [hospitalName, setHospitalName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [location, setLocation] = useState({ latitude: null, longitude: null });
  const [locationError, setLocationError] = useState("");
  const navigate = useNavigate();

  const getLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationError("");
      },
      (error) => {
        setLocationError("Unable to retrieve your location.");
        console.error("Error getting location:", error);
      }
    );
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError("");

    if (isRegistering) {
      // Registration
      if (!hospitalName || !phone || !email || !password || !location.latitude || !location.longitude) {
        setError("All fields are required!");
        return;
      }

      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const uniqueCode = Math.floor(10000 + Math.random() * 90000).toString();
        
        // Store hospital data in Realtime Database
        const hospitalRef = ref(db, `Hospital/${uniqueCode}`);
        await set(hospitalRef, {
          hospitalName,
          phone,
          email,
          hospitalCode: uniqueCode,
          uid: userCredential.user.uid,
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
          },
          wrd,
        });
        
        // Navigate to Institute with hospital code in state
        navigate('/Institute', { 
          state: { 
            foundHospitalCode: uniqueCode 
          } 
        });
      } catch (error) {
        setError(error.message);
      }
    } else {
      // Login
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // Find hospital code for this user
        const dbRef = ref(db);
        const snapshot = await get(child(dbRef, 'Hospital'));
        
        if (snapshot.exists()) {
          let foundHospitalCode = null;
          
          snapshot.forEach(childSnapshot => {
            const hospitalData = childSnapshot.val();
            if (hospitalData.uid === userCredential.user.uid) {
              foundHospitalCode = childSnapshot.key; // Use the key as the hospital code
            }
          });
          
          if (foundHospitalCode) {
            // Navigate to Institute with hospital code in state
            navigate('/Institute', { 
              state: { 
                foundHospitalCode 
              } 
            });
            localStorage.setItem('inscode', foundHospitalCode);
          } else {
            setError("Hospital account not found.");
          }
        } else {
          setError("No hospital data available.");
        }
      } catch (error) {
        setError("Invalid email or password.");
      }
    }
  };

  return (
    <div className="hospital-auth-container">
      <div className="hospital-auth-card">
        <h2>{isRegistering ? "Hospital Registration" : "Hospital Login"}</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleAuth}>
          {isRegistering && (
            <>
              <div className="form-group">
                <label>Hospital Name</label>
                <input
                  type="text"
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  placeholder="Enter hospital name"
                />
              </div>
              
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>
            </>
          )}
          
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
            />
          </div>
          
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>

          {isRegistering &&
            <div className="form-group">
              <label>Number of Wards</label>
              <input
                type="number"
                value={wrd}
                onChange={(e) => setWard(e.target.value)}
                placeholder="Number of Wards"
              />
            </div>
          }

          {isRegistering && (
            <div className="form-group">
              <label>Location</label>
              <button
                type="button"
                onClick={getLocation}
                className="location-button"
              >
                Get My Location
              </button>
              {location.latitude && location.longitude ? (
                <p className="location-coordinates">
                  Latitude: {location.latitude}, Longitude: {location.longitude}
                </p>
              ) : (
                <p className="location-error">{locationError}</p>
              )}
            </div>
          )}

          <button type="submit" className="auth-button">
            {isRegistering ? "Register" : "Login"}
          </button>
        </form>
        
        <div className="auth-toggle">
          <button 
            className="toggle-button"
            onClick={() => setIsRegistering(!isRegistering)}
          >
            {isRegistering ? "Already have an account? Login" : "Don't have an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HospitalHome;