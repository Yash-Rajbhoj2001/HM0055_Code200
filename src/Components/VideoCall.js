import React, { useEffect, useRef } from "react";
import db from "../firebase";
import { set, ref } from "firebase/database";
import { useLocation } from "react-router-dom";

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
      if (!doctorid || !appointmentid || !patientId) {
        console.error("Missing required IDs (doctorid, appointmentid, patientId).");
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

      // Use appointment ID as the room ID
      const roomID = appointmentid;
      const userID = doctorid; // Use doctor ID as the user ID
      const userName = `Doctor_${doctorid}`; // Set username dynamically
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
            url: window.location.protocol + "//" + window.location.host + window.location.pathname + "?roomID=" + roomID,
          }],

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

      // Update the appointment in Firebase with the video call link
      const appointmentRef = ref(db, `patient/${patientId}/upcomingAppointments/${appointmentid}`);
      try {
        await set(appointmentRef, {
          appointmentLink: window.location.href, // Add the video call link
        });
        console.log("Appointment updated with video call link.");
      } catch (error) {
        console.error("Failed to update appointment:", error);
      }
    };

    startCall();
  }, [doctorid, appointmentid, patientId]);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }}></div>
    </div>
  );
};

export default VideoCall;