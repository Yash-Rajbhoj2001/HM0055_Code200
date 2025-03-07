import { useState, useEffect} from 'react';
import '../Styles/PatientHome.css'
import '../App.css'
import { redirect, useLocation, useNavigate } from 'react-router-dom'
import db from '../firebase';
import { get,ref, update } from 'firebase/database';
import Notification from './Notification';
import { Link } from 'react-router-dom';
import Tesseract from 'tesseract.js';


const PatientHome = () => {
    const location = useLocation();
    const [showToast, setShowToast] = useState(false);
    const [currentDateTime, setCurrentDateTime] = useState(new Date());
    const [appoint,setAppoint] = useState(false);
    const [processing,setProcessing] = useState(false);
    const [notificationMessage,setNotificationMessage] = useState('');
    const navigate = useNavigate();

    //files for
    const [note, setNote] = useState("");
    const [file, setFile] = useState(null);
    const [treatmentOn, setTreatmentOn] = useState("");

    const patientemail = location.state?.email;
    const doctorname = location.state?.doctorname;
    const doctorID = location.state?.doctorID;
    const [patient,setPatientDetail] = useState({});
    const [userType,setUserType] = useState(true);//true for doctor and false for patient
    const [appointments, setAppointments] = useState([]);
    const [appointmentToDisplay,setAppointmentsToDisplay] = useState({});
    const [aiExplaination,setAiExplaination] = useState('');

    

    localStorage.setItem('id',patient.patientid);
    useEffect(() => {
        // Update time every second
        const timer = setInterval(() => {
            setCurrentDateTime(new Date());
        }, 1000);

        return () => clearInterval(timer); // Cleanup interval on unmount
    }, []);

    useEffect(() => {
        if (!patient?.MyAppointments) return; // Prevent errors if patient has no appointments

        const fetchAppointments = async () => {
            let fetchedAppointments = [];

            for (let value of patient.MyAppointments) {
                const appointmentRef = ref(db, `Appointment/${value}`);
                const snapshot = await get(appointmentRef);

                if (snapshot.exists()) {
                    fetchedAppointments.push({ id: value, ...snapshot.val() });
                }
            }

            setAppointments(fetchedAppointments); // Update state with fetched appointments
        };
        fetchAppointments();
    }, [patient,patient?.MyAppointments]);


    useEffect(()=>{
        fetchPatientByEmail(patientemail);
        },[patientemail])
        
        useEffect(() => {
            const storedUserType = localStorage.getItem('userType'); // Retrieve from localStorage
            
            if (storedUserType === 'doctor') {
                setUserType(true);
            } else {
                setUserType(false);
            }
        }, []);


    const AddPatientToDoctor = async () => {
        const doctorRef = ref(db,`doctor/${doctorID}/MyPatients`);
        
        const snapshot = await get(doctorRef);
        let existingpatients = [];
         if(snapshot.exists()){
            existingpatients= snapshot.val();
         }
         const patientID = patient.patientid;
         const updatedPatients = [...existingpatients,patientID];

         await update(ref(db,`doctor/${doctorID}`),{
            MyPatients : updatedPatients,
         });
        console.log('Patient Added!');
        setNotificationMessage('Patient Added!')
        setShowToast(true);
        setTimeout(() => {setShowToast(false);}, 3000);
    }

    const fetchPatientByEmail = async (email) => {
        try {
            const patientsRef = ref(db, 'patient/'); // Update the reference to 'patients' node
            const snapshot = await get(patientsRef);
    
            if (snapshot.exists()) {
                const patientsData = snapshot.val();
    
                // Find patient by email
                const patientId = Object.keys(patientsData).find(id => patientsData[id].email === email);
    
                if (patientId) {
                    console.log("Patient Details:", patientsData[patientId]);
                    setPatientDetail({ patientId, ...patientsData[patientId] });
                    return { patientId, ...patientsData[patientId] }; // Return patient details
                } else {
                    console.log("Patient not found!");
                    return null;
                }
            } else {
                console.log("No patient records found.");
                return null;
            }
        } catch (error) {
            console.error("Error fetching patient details:", error);
            return null;
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return alert("Please upload a report!");
    
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", "unsigned_upload"); // Replace with your Cloudinary preset
        setProcessing(true);
        try {
            // Upload file to Cloudinary
            const response = await fetch(
                `https://api.cloudinary.com/v1_1/duhqwj0o6/raw/upload`, // Replace with your Cloudinary cloud name
                {
                    method: "POST",
                    body: formData,
                }
            );
    
            const generateAppointmentID = () => {
                const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"; // Alphanumeric characters
                let appointmentID = "Appointment_";
                for (let i = 0; i < 5; i++) {
                    appointmentID += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                return appointmentID;
            };

            const data = await response.json();
            if (data.secure_url) {
                // Save data to Firebase
                const appointmentID = generateAppointmentID();
                await update(ref(db, `Appointment/${appointmentID}`), {
                    note,
                    doctorID,
                    doctorname,
                    patientID: patient.patientId, 
                    date: currentDateTime.toISOString(),
                    treatmentOn,
                    file: data.secure_url, // Cloudinary file URL
                });
    
                const patientRef = ref(db,`patient/${patient.patientid}/MyAppointments`);
                const snapshot = await get(patientRef);
                let existingAppointments = [];
                if(snapshot.exists()){
                    existingAppointments = snapshot.val();
                }
                const updatedAppointment = [...existingAppointments,appointmentID];
                await update(ref(db,`patient/${patient.patientid}`),{
                    MyAppointments : updatedAppointment,
                });
                setNotificationMessage('Appointment Added!')
                setShowToast(true);
                setTimeout(() => {setShowToast(false);}, 3000);
                setProcessing(false);
            } else {
                alert("Upload failed!");
            }
        } catch (error) {
            console.error("Upload error:", error);
            alert("Upload failed!");
        }
    };

    const extractTextFromImage = async (imageURL) => {
        const { data: { text } } = await Tesseract.recognize(imageURL, 'eng');
        return text;
    };
    
    const generateAIExplanation = async (doctorNote, reportImage, medicines) => {
        try {
            // Extract text from report image using OCR
            const extractedText = await extractTextFromImage(reportImage);
    
            // Call Google Gemini API
            const response = await fetch(
                "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyCBMuRcsjTaJXsZ01MtRZh8yHtVXmUuMSw",
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [
                            {
                                role: "user",
                                parts: [
                                    { text: `Doctor's Note: ${doctorNote}\nExtracted Report Text: ${extractedText}\nPrescribed Medicines: ${JSON.stringify(medicines)}\nExplain this in simple medical terms for a patient.` }
                                ]
                            }
                        ]
                    })
                }
            );
    
            const data = await response.json();
    
            // Ensure the response is valid
            if (!data || !data.candidates || data.candidates.length === 0) {
                throw new Error("No response from Gemini API");
            }
    
            return data.candidates[0].content.parts[0].text;
        } catch (error) {
            console.error("Error generating AI explanation:", error);
            return "Unable to generate explanation.";
        }
    };
    
    const showAppointment = async (appointmentDetail) => {
        document.getElementById("Appointment-Display").style.display = "flex";
        setAppointmentsToDisplay(appointmentDetail);
    
        console.log(appointmentDetail);
    
        // Extract medicine names from appointmentDetail.medicines
        const medicineNames = Object.keys(appointmentDetail.medicines).join(", ");
    
        // Fetch AI explanation with extracted medicine names
        const data = await generateAIExplanation(
            appointmentDetail.doctorNote,
            appointmentDetail.file,
            medicineNames
        );
    
        console.log("Generated AI Explanation:", data);
        setAiExplaination(data); // Set explanation in state
    };
    
    
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text)
            .then(() => {
                console.log(`Copied: ${text}`);
            })
            .catch(err => console.error('Error copying:', err));
    };
    
    // Helper function to check if a date has passed
    const isExpired = (dateString) => {
        const appointmentDate = new Date(dateString);
        return appointmentDate < currentDateTime;
    };
    
    // Helper function to check if appointment is today
    const isToday = (dateString) => {
        const appointmentDate = new Date(dateString);
        return appointmentDate.toDateString() === currentDateTime.toDateString();
    };
    
    // Helper function to check if join call button should be enabled
    const shouldEnableJoinCall = (appointment) => {
        if (!isToday(appointment.day) || appointment.type !== 'online') return false;
        
        // Parse appointment time
        const [hourMinute, ampm] = appointment.time.split(' ');
        const [hour, minute] = hourMinute.split(':');
        
        let appointmentHour = parseInt(hour, 10);
        if (ampm === 'PM' && appointmentHour !== 12) appointmentHour += 12;
        if (ampm === 'AM' && appointmentHour === 12) appointmentHour = 0;
        
        // Create appointment time date object
        const appointmentTime = new Date(currentDateTime);
        appointmentTime.setHours(appointmentHour);
        appointmentTime.setMinutes(parseInt(minute, 10));
        
        // Enable 5 minutes before appointment time
        const fiveMinutesBefore = new Date(appointmentTime);
        fiveMinutesBefore.setMinutes(fiveMinutesBefore.getMinutes() - 5);
        
        return currentDateTime >= fiveMinutesBefore && currentDateTime <= appointmentTime;
    };
    
    // Function to handle join call button click
    const handleJoinCall = (appointmentId,appointLink) => {
        // Implement your video call logic here
        console.log(`Joining call for appointment: ${appointmentId}`);
        // This could redirect to a video call page or launch a modal with the video call
        navigate(appointLink);
        
    };

  return (
    <>
        <Notification showToast={showToast} message={'Patient Added'}/>
        <div className='patient-panel'>
            <h2>Welcome {!userType && patient.firstname}</h2>
            {userType && <div className='add-patient' id='add-patient' onClick={AddPatientToDoctor}>Add Patient</div>}
            <div className='patient-container'>
                <div className='patient-info'>
                    <div style={{display:'flex',fontWeight:'bold',width:'auto',alignItems:'center',gap:'10px'}}>
                        <p>Id : {patient.patientid}</p>
                        <i className="fa-solid fa-copy fa-lg" style={{cursor:'pointer'}} onClick={() => copyToClipboard(patient.patientid)}></i>
                    </div>
                    <p>Name : {patient.firstname} {patient.lastname}</p>
                    <p>Contact : {patient.contact}</p>
                    <p>Email : {patient.email}</p>
                    <div className='diseases'>
                        <p>Disease :</p> 
                        {Array.isArray(patient.disease) && patient.disease.length > 0 ? (
                        patient.disease.map((disease, index) => (
                            <p key={index}>{disease}</p>
                        ))
                        ) : (
                            <p>No diseases recorded</p> // Fallback message if disease data is missing or empty
                        )}
                    </div>
                </div>
            </div>
            
            <div className='patient-app'>
                {!userType &&
                <>
                    <p style={{marginLeft:'30px',fontWeight:'bold',fontSize:'20px'}}>Upcomming Appointment's</p>
                    <div className='upcomming-appointments'>
                    {patient.upcomingAppointments && Object.keys(patient.upcomingAppointments).length > 0 ? (
                        <div className='upcoming-appointments-list'>
                            {Object.entries(patient.upcomingAppointments).map(([appointmentId, appointment]) => {
                                const expired = isExpired(appointment.day);
                                const today = isToday(appointment.day);
                                const enableJoinButton = today && appointment.type === 'online' && shouldEnableJoinCall(appointment);
                                
                                return (
                                    <div 
                                        key={appointmentId} 
                                        className='appointment-item'
                                        style={{ 
                                            borderColor: expired ? 'red' : today ? '#007bff' : 'grey',
                                            borderWidth: '2px',
                                            borderStyle: 'solid',
                                            borderRadius: '8px',
                                            padding: '10px',
                                            marginBottom: '10px'
                                        }}
                                    >
                                        <p><strong>Appointment ID:</strong> {appointmentId}</p>
                                        <p><strong>Date:</strong> {appointment?.day}</p>
                                        <p><strong>Patient ID:</strong> {appointment.patientId}</p>
                                        <p><strong>Doctor ID:</strong> {appointment.doctorId}</p>
                                        <p><strong>Type:</strong> {appointment?.type}</p>
                                        <p><strong>Time:</strong> {appointment.time}</p>
                                        
                                        {appointment.type === 'online' && (
                                            <Link to={appointment?.appointmentLink}>
                                                <button 
                                                    onClick={() => handleJoinCall(appointmentId,appointment.appointmentLink)}
                                                    disabled={enableJoinButton}
                                                    style={{
                                                        backgroundColor: enableJoinButton ? '#4CAF50' : '#ccc',
                                                        color: 'white',
                                                        padding: '8px 12px',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        cursor: enableJoinButton ? 'pointer' : 'not-allowed',
                                                        marginTop: '10px'
                                                    }}
                                                >
                                                    Join Call
                                                </button>
                                            </Link>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p style={{ marginLeft: '30px', textAlign: 'center' }}>No Appointments further</p>
                    )}
                    </div>
                    </>
                }
                <p style={{marginLeft:'30px',fontWeight:'bold',fontSize:'20px'}}>Appointment</p>
                {patient.MyAppointments ?
                    <div className='appointment-container'>
                        
                        {appointments.map((value,index)=>(
                            <div className='appointments' key={index} onClick={() => showAppointment(value)}>
                                <p>Date : {value.date}</p>
                                <p>Doctor: {value.doctorname}</p>
                            </div>
                        ))}
                    </div>
                :
                    <p style={{marginLeft:'30px',textAlign:'center'}}>No Appointments to show</p>
                }
            </div>
            {userType
            &&<div className='add-appointment-containner' id='add-appointment'>
                <div className='add-app' onClick={() => setAppoint(true)}>
                    Add Appointment
                    <i className="fa-solid fa-plus fa-lg"></i>
                </div>
            </div>
            }
        </div>

        {userType && appoint && (
                <div className="appointment-form-container" id="appointmentContainer">
                    <div className="appointment-form-div">
                        <p>Add Appointment</p>
                        <div className="doctor-details">
                            <p>Doctor Detail</p>
                            <p>
                                Consulted By: {doctorname} | Doctor Id: {doctorID} | On Date:{" "}
                                {currentDateTime.toLocaleString()}
                            </p>
                        </div>
                        <form className="appointment-form" onSubmit={handleUpload}>
                            <label>Treatment On</label>
                            <select onChange={(e) => setTreatmentOn(e.target.value)}>
                                {Array.isArray(patient.disease) && patient.disease.length > 0 ? (
                                    patient.disease.map((disease, index) => (
                                        <option key={index}>{disease}</option>
                                    ))
                                ) : (
                                    <option>Other</option>
                                )}
                                <option>Other</option>
                            </select>
                            <label>Upload Reports</label>
                            <label htmlFor="reports" className="reports-label">
                                Upload here
                            </label>
                            <input type="file" id="reports" className="reports" onChange={(e) => setFile(e.target.files[0])}  />

                            <label>Note</label>
                            <input type="text" placeholder="Note" onChange={(e) => setNote(e.target.value)} />
                            <div style={{ display: "flex", gap: "10px" }}>
                                <button type="submit">{processing ? 'Adding...' : 'Add Appointment'}</button>
                                <button>Schedule Next Appointment</button>
                            </div>
                            <button type="button" onClick={() => setAppoint(false)}>
                                Close
                            </button>
                        </form>
                    </div>
                </div>
            )}
            <div className='Appointment-Display' id='Appointment-Display'>
                <div className='appointment-display-container'>
                    <button onClick={()=>{document.getElementById('Appointment-Display').style.display = 'none'}}>Close</button>
                    <div className='Detail'>
                        <span style={{fontWeight:'bold'}}>Appointment Id :</span><span> {appointmentToDisplay.id}</span>
                    </div>
                    <div className='Detail'>
                        <span style={{fontWeight:'bold'}}>Treatment On :</span><span> {appointmentToDisplay.treatmentOn}, Treated On : {appointmentToDisplay.date}</span>
                    </div>
                    <div className='Detail'>
                        <span style={{fontWeight:'bold'}}>Treatment By :</span><span> {appointmentToDisplay.doctorname}</span>
                    </div>
                    <div className='Detail'>
                        <span style={{fontWeight:'bold'}}>Note By Doctor :</span><span> {appointmentToDisplay.note}</span>
                    </div>
                    <div className='filesDisplay'>
                        <p>Reports :</p>
                        {/* <img src={appointmentToDisplay.file}></img> */}
                        <iframe src={appointmentToDisplay.file} title={appointmentToDisplay.file} width="100%" height="600px"></iframe>
                    </div>
                    <div className='prescription'>
                        <p>Prescriptions</p>
                        {appointmentToDisplay.medicines && Object.keys(appointmentToDisplay.medicines).length > 0 ? (
                            <div className='medicines-list'>
                                {Object.entries(appointmentToDisplay.medicines).map(([medicineName, details], index) => (
                                    <div key={index} className='medicine-item'>
                                        <p><strong>{medicineName}</strong></p>
                                        <ul>
                                            {Object.entries(details).map(([key, value], idx) => (
                                                <li key={idx}>
                                                    <span className='medicine-key'>{key}:</span> <span>{value}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p>No prescriptions available</p>
                        )}
                    </div>
                    {aiExplaination && typeof aiExplaination === "string" && (
    <div style={{ 
        backgroundColor: "#f9f9f9", 
        padding: "15px", 
        borderRadius: "10px", 
        marginTop: "10px", 
        lineHeight: "1.6" 
    }}>
        {aiExplaination
            .toString() // Ensure it's a string
            .split("\n") // Split into lines
            .map((line, index) => {
                if (line.startsWith("**") && line.endsWith("**")) {
                    // Bold headings
                    return <h3 key={index} style={{ color: "#333" }}>{line.replace(/\*\*/g, "")}</h3>;
                } else if (line.startsWith("*")) {
                    // Bulleted list for key points
                    return <ul key={index} style={{ marginLeft: "20px" }}>
                        <li>{line.replace(/\*/g, "")}</li>
                    </ul>;
                } else if (line.trim() !== "") {
                    // Normal paragraph text
                    return <p key={index} style={{ color: "#555" }}>{line}</p>;
                }
                return null;
            })}
    </div>
)}

                </div>
            </div>
        
    </>
  )
}

export default PatientHome