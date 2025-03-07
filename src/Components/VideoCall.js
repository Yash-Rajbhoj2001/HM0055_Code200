import React, { useEffect, useRef } from "react";
import db from "../firebase";
import { set, ref,update,get } from "firebase/database";
import { useLocation, useNavigate } from "react-router-dom";


// ✅ Add loadScript() here
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve(true);
    script.onerror = () => reject(false);
    document.body.appendChild(script);
  });
}

// ✅ Then your component
const VideoCall = () => {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const location = useLocation();
  const doctorid = location.state?.doctorid;
  const appointmentid = location.state?.appointmentId;
  const patientId = location.state?.patientId;
  const mainid = location.state?.mainid;

  console.log("Doctor ID:", doctorid);
  console.log("Appointment ID:", appointmentid);
  console.log("Patient ID:", patientId);
  console.log("main id: ",mainid);

  useEffect(() => {
    const startCall = async () => {
      // Check if required IDs are present
      if (!appointmentid) {
        console.error("Missing required appointment ID.");
        return;
      }
    
      // Load ZegoUIKitPrebuilt script
      const loaded = await loadScript(
        "https://unpkg.com/@zegocloud/zego-uikit-prebuilt/zego-uikit-prebuilt.js"
      );
    
      if (!loaded || !window.ZegoUIKitPrebuilt) {
        console.error("Zego UIKit failed to load");
        return;
      }
    
      // Use appointment ID as the room ID - make sure it's consistent
      const roomID = appointmentid;
      
      // The URL should be constructed the same way for both doctor and patient
      const callLink = window.location.protocol + "//" + window.location.host + "/call?roomID=" + roomID;
      
      const isPatient = location.state?.isPatient;
        
      // Set appropriate user ID and name based on who's joining
      const userID = isPatient ? patientId : doctorid;
      const userName = isPatient ? `Patient_${patientId}` : `Doctor_${doctorid}`;
        
      // Check if we have a valid user ID
      if (!userID) {
        console.error("Missing user ID for", isPatient ? "patient" : "doctor");
        return;
      }
    
      const appID = 1463874107; // Replace with your Zego app ID
      const serverSecret = "f6c044784324dca9c6b1f56530bf5ed2"; // Replace with your server secret
    
      // Generate Zego token
      const kitToken = window.ZegoUIKitPrebuilt.generateKitTokenForTest(
        appID,
        serverSecret,
        roomID,
        userID,
        userName
      );
    
      // Join the room
      const zp = window.ZegoUIKitPrebuilt.create(kitToken);
      zp.joinRoom({
        container: containerRef.current,
        sharedLinks: [
          {
            name: "Personal link",
            url: callLink,
          }
        ],
    
        scenario: {
          mode: window.ZegoUIKitPrebuilt.VideoConference,
        },
    
        turnOnMicrophoneWhenJoining: true,
        turnOnCameraWhenJoining: true,
        showMyCameraToggleButton: true,
        showMyMicrophoneToggleButton: true,
        showAudioVideoSettingsButton: true,
        showScreenSharingButton: true,
        showTextChat: true,
        showUserList: true,
        maxUsers: 2,
        layout: "Auto",
        showLayoutButton: false,
      });
    
      // Only update appointment link if this is the doctor joining
      // This prevents multiple updates and ensures the doctor sets the link
      if (!isPatient && patientId) {
        const appointmentRef = ref(db, `patient/${patientId}/upcomingAppointments/${appointmentid}`);
        
        try {
          // First fetch the existing appointment data
          const appointmentSnapshot = await get(appointmentRef);
          
          if (appointmentSnapshot.exists()) {
            const existingData = appointmentSnapshot.data();
            
            // Use update with spread operator to preserve existing data
            await update(appointmentRef, {
              ...existingData,
              appointmentLink: callLink,
            });
            console.log("Appointment updated with video call link.");
          } else {
            console.log("Appointment does not exist.");
          }
        } catch (error) {
          console.error("Failed to update appointment:", error);
        }
      }
    };
    
    startCall();
  }, [doctorid, appointmentid, patientId, location.state?.isPatient]);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }}></div>
    </div>
  );
};

export default VideoCall;