import '../Styles/Doctor.css';
import { useLocation, useNavigate } from 'react-router-dom';
import db from '../firebase';
import { get, ref, set } from 'firebase/database';
import { useEffect, useState } from 'react';

const DoctorHome = () => {
    const [doctorDetail, setDoctorDetail] = useState({});
    const [patientCode, setPatientCode] = useState('');
    const [doctorID, setDoctorID] = useState('');
    const [searchedPatient, setSearchedPatient] = useState({});
    const [searchMessage, setSearchMessage] = useState('');
    const [myPatients, setMyPatients] = useState([]); 
    const [currentTime, setCurrentTime] = useState(new Date());
    
    // New states for appointment availability
    const [showAppointmentForm, setShowAppointmentForm] = useState(false);
    const [availableDays, setAvailableDays] = useState([]);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [doctorAppointments, setDoctorAppointments] = useState([]);
    
    // New states for specific dates
    const [useSpecificDates, setUseSpecificDates] = useState(false);
    const [specificDates, setSpecificDates] = useState([]);
    const [newDate, setNewDate] = useState('');
    
    // New states for unavailability time slots
    const [unavailabilitySlots, setUnavailabilitySlots] = useState({});
    const [currentDateSlots, setCurrentDateSlots] = useState([]);
    const [slotStartTime, setSlotStartTime] = useState('');
    const [slotEndTime, setSlotEndTime] = useState('');
    const [selectedDate, setSelectedDate] = useState('');

    const navigate = useNavigate();
    const location = useLocation();
    const doctorId = location.state?.email;

    useEffect(() => {
        fetchDoctorByEmail(doctorId);
        
        // Update current time every minute
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000);
        
        return () => clearInterval(timer);
    }, [doctorId]);

    useEffect(() => {
        if (doctorID) {
            fetchDoctorPatients(doctorID);
            fetchDoctorAppointments(doctorID);
            fetchUnavailabilitySlots(doctorID);
        }
    }, [doctorID]);

    // Fetch unavailability slots from Firebase
    const fetchUnavailabilitySlots = async (doctorId) => {
        try {
            const unavailabilityRef = ref(db, `doctor/${doctorId}/unavailabilitySlots`);
            const snapshot = await get(unavailabilityRef);
            
            if (snapshot.exists()) {
                setUnavailabilitySlots(snapshot.val());
            }
        } catch (error) {
            console.error('Error fetching unavailability slots:', error);
        }
    };

    // When a date is selected, load its unavailability slots
    useEffect(() => {
        if (selectedDate && unavailabilitySlots[selectedDate]) {
            setCurrentDateSlots(unavailabilitySlots[selectedDate]);
        } else {
            setCurrentDateSlots([]);
        }
    }, [selectedDate, unavailabilitySlots]);

    const handlePatientCode = (e) => {
        setPatientCode(e.target.value);
    };

    const handleSearchedPatient = () => {
        const email = searchedPatient.email;
        const doctorname = doctorDetail.firstname;
        navigate('/PatientPanel', { state: { email, patientCode, doctorID, doctorname } });
    };

    const searchPatient = async () => { 
        if (patientCode.length === 10) {
            try {
                const patient = ref(db, `patient/${parseInt(patientCode)}`);
                const snapshot = await get(patient);
                if (snapshot.exists()) {
                    setSearchedPatient(snapshot.val());
                    setSearchMessage('Success !');
                    document.getElementById('patient-list').style.display = 'flex';
                } else {
                    setSearchMessage('No Such Patient Found !');
                }
            } catch (error) {
                console.log(error.message);
                setSearchMessage('Having some issue finding patient');
            }
        }
    };

    const fetchDoctorByEmail = async (email) => {
        try {
            const doctorsRef = ref(db, 'doctor/');
            const snapshot = await get(doctorsRef);
    
            if (snapshot.exists()) {
                const doctorsData = snapshot.val();
                const doctorId = Object.keys(doctorsData).find(id => doctorsData[id].email === email);
                setDoctorID(doctorId);
    
                if (doctorId) {
                    setDoctorDetail({ doctorId, ...doctorsData[doctorId] });
                    return { doctorId, ...doctorsData[doctorId] };
                } else {
                    console.log("Doctor not found!");
                    return null;
                }
            } else {
                console.log("No doctor records found.");
                return null;
            }
        } catch (error) {
            console.error("Error fetching doctor details:", error);
            return null;
        }
    };

    const fetchDoctorPatients = async (doctorId) => {
        try {
            const myPatientsRef = ref(db, `doctor/${doctorId}/MyPatients`);
            const patientsSnapshot = await get(myPatientsRef);
    
            if (patientsSnapshot.exists()) {
                console.log('yes');
                const patientIds = patientsSnapshot.val(); // This is an array
    
                console.log("Patient IDs array:", patientIds);
    
                // Loop directly through the array values
                const patientPromises = patientIds.map(async (patientId) => {
                    const patientRef = ref(db, `patient/${patientId}`);
                    console.log(`Fetching patient/${patientId}`);
                    const patientSnapshot = await get(patientRef);
    
                    if (patientSnapshot.exists()) {
                        const patientData = patientSnapshot.val();
                        console.log(patientData.firstname);
    
                        return {
                            id: patientId,
                            firstname: patientData.firstname,
                            lastname: patientData.lastname,
                            email : patientData.email
                        };
                    }
                    return null;
                });
    
                const patientsList = (await Promise.all(patientPromises)).filter(p => p !== null);
                console.log('last link',patientsList)
                setMyPatients(patientsList);
            } else {
                console.log("No patients found for this doctor.");
                setMyPatients([]);
            }
        } catch (error) {
            console.error("Error fetching doctor's patients:", error);
            setMyPatients([]);
        }
    };
    
    const handlePatientClick = (email) => {
        const doctorname = doctorDetail.firstname;
        navigate('/PatientPanel', { state: { email, patientCode, doctorID, doctorname } });
    };

    // Add a specific date to the list
    const addSpecificDate = () => {
        if (newDate && !specificDates.includes(newDate)) {
            setSpecificDates([...specificDates, newDate]);
            setNewDate('');
            setSelectedDate(newDate); // Set as the current selected date for unavailability slots
        }
    };

    // Remove a specific date from the list
    const removeSpecificDate = (dateToRemove) => {
        setSpecificDates(specificDates.filter(date => date !== dateToRemove));
        
        // If the removed date is currently selected, clear the selection
        if (selectedDate === dateToRemove) {
            setSelectedDate('');
            setCurrentDateSlots([]);
        }
        
        // Remove unavailability slots for the date if they exist
        if (unavailabilitySlots[dateToRemove]) {
            const updatedSlots = { ...unavailabilitySlots };
            delete updatedSlots[dateToRemove];
            setUnavailabilitySlots(updatedSlots);
        }
    };

    // Select a date to manage its unavailability slots
    const handleDateSelection = (date) => {
        setSelectedDate(date);
        setSlotStartTime('');
        setSlotEndTime('');
    };

    // Add a new unavailability time slot
    const addUnavailabilitySlot = () => {
        if (selectedDate && slotStartTime && slotEndTime) {
            // Validate time (end time should be after start time)
            if (slotStartTime >= slotEndTime) {
                alert('End time must be after start time');
                return;
            }
            
            const newSlot = {
                id: Date.now().toString(), // Unique ID
                startTime: slotStartTime,
                endTime: slotEndTime
            };
            
            // Update current date slots
            const updatedCurrentSlots = [...currentDateSlots, newSlot];
            setCurrentDateSlots(updatedCurrentSlots);
            
            // Update all slots
            const updatedAllSlots = { 
                ...unavailabilitySlots, 
                [selectedDate]: updatedCurrentSlots 
            };
            setUnavailabilitySlots(updatedAllSlots);
            
            // Clear inputs
            setSlotStartTime('');
            setSlotEndTime('');
        } else {
            alert('Please select a date and specify both start and end times');
        }
    };

    // Remove an unavailability slot
    const removeUnavailabilitySlot = (slotId) => {
        if (selectedDate) {
            const updatedSlots = currentDateSlots.filter(slot => slot.id !== slotId);
            setCurrentDateSlots(updatedSlots);
            
            const updatedAllSlots = { 
                ...unavailabilitySlots, 
                [selectedDate]: updatedSlots 
            };
            setUnavailabilitySlots(updatedAllSlots);
        }
    };

    // New method to handle appointment availability form
    const handleAppointmentAvailability = async (e) => {
        e.preventDefault();
        try {
            // Store availability in Firebase
            const availabilityRef = ref(db, `doctor/${doctorID}/availability`);
            await set(availabilityRef, {
                useSpecificDates: useSpecificDates,
                days: useSpecificDates ? [] : availableDays,
                specificDates: useSpecificDates ? specificDates : [],
                startTime: startTime,
                endTime: endTime
            });
            
            // Store unavailability slots in Firebase
            const unavailabilityRef = ref(db, `doctor/${doctorID}/unavailabilitySlots`);
            await set(unavailabilityRef, unavailabilitySlots);

            alert('Availability and unavailability times updated successfully!');
            setShowAppointmentForm(false);
        } catch (error) {
            console.error('Error updating availability:', error);
            alert('Failed to update availability');
        }
    };

    // Fetch doctor's appointments
    const fetchDoctorAppointments = async (doctorId) => {
        try {
            const appointmentsRef = ref(db, `doctor/${doctorId}/appointments`);
            const snapshot = await get(appointmentsRef);

            if (snapshot.exists()) {
                const appointmentsData = snapshot.val();
                const appointmentsList = Object.keys(appointmentsData).map(key => ({
                    id: key,
                    ...appointmentsData[key]
                }));

                // Sort appointments by time
                const sortedAppointments = appointmentsList.sort((a, b) => 
                    new Date(a.appointmentTime) - new Date(b.appointmentTime)
                );

                setDoctorAppointments(sortedAppointments);
            }
        } catch (error) {
            console.error('Error fetching appointments:', error);
        }
    };

    // Helper function to determine if an appointment can be joined (for online appointments)
    const canJoinAppointment = (appointment) => {
        if (appointment.type !== 'online') return false;
        
        // Parse appointment date and time
        const appointmentDate = new Date(appointment.day);
        const today = new Date(currentTime);
        
        // Check if it's the same day
        const isSameDay = 
            appointmentDate.getDate() === today.getDate() &&
            appointmentDate.getMonth() === today.getMonth() &&
            appointmentDate.getFullYear() === today.getFullYear();
            
        if (!isSameDay) return false;
        
        // Parse appointment time
        const [hours, minutes] = appointment.time.split(':').map(Number);
        const appointmentTime = new Date(today);
        appointmentTime.setHours(hours, minutes, 0, 0);
        
        // Difference in minutes
        const diffMs = appointmentTime - today;
        const diffMinutes = Math.floor(diffMs / 60000);
        
        // Enable if within 5 minutes before or during the appointment (until 30 min after start)
        return diffMinutes <= 5 && diffMinutes >= -30;
    };

    // Helper function to determine appointment status for styling
    const getAppointmentStatus = (appointment) => {
        const appointmentDate = new Date(appointment.day);
        const today = new Date(currentTime);
        
        // Reset time to just compare dates
        today.setHours(0, 0, 0, 0);
        appointmentDate.setHours(0, 0, 0, 0);
        
        if (appointmentDate < today) {
            return 'expired'; // Past appointment
        } else if (appointmentDate.getTime() === today.getTime()) {
            return 'today'; // Current day appointment
        } else {
            return 'upcoming'; // Future appointment
        }
    };

    // Handle join call button click
    const handleJoinCall = (appointmentId, patientId, mainid) => {
        console.log(`Joining call for appointment ${appointmentId} ${patientId} ${mainid}`);
        const doctorid = doctorDetail.doctorid;
        console.log(doctorid, appointmentId, patientId); // Removed undefined doctorID
        navigate('/call', {
            state: {
                doctorid,
                appointmentId,
                patientId,
                mainid,
                isPatient: false // Explicitly mark this as not a patient
            }
        });
    };

    return (
        <>
            <h2 style={{ marginLeft: '20px' }}>Welcome {doctorDetail.firstname}</h2>
            <div className='doctor-panel'>
                <div className='doctor-profile'>
                    <h2>Doctor Detail</h2>
                    <p>Name: {doctorDetail.firstname} {doctorDetail.lastname}</p>
                    <p>Contact: {doctorDetail.contact}</p>
                    <p>Email: {doctorId}</p>
                    <p>Specialisation: {doctorDetail.specialisation}</p>
                    
                    {/* New Appointment Availability Button */}
                    <button 
                        onClick={() => setShowAppointmentForm(!showAppointmentForm)}
                        style={{marginTop: '10px',marginLeft:'20px',padding: '8px 15px',backgroundColor: '#4CAF50',color: 'white',border: 'none',borderRadius: '4px',cursor: 'pointer',fontFamily:'poppins'}}
                    >
                        {showAppointmentForm ? 'Close' : 'Set Appointment Availability'}
                    </button>

                    {/* Appointment Availability Form */}
                    {showAppointmentForm && (
                        <div className="appointment-modal-overlay">
                            <div className="appointment-availability-form-container">
                                <button 
                                    className="appointment-modal-close"
                                    onClick={() => setShowAppointmentForm(false)}
                                >
                                    &times;
                                </button>
                                <form onSubmit={handleAppointmentAvailability} className="appointment-availability-form">
                                    <h3>Set Appointment Availability</h3>
                                    
                                    {/* Toggle between recurring days or specific dates */}
                                    <div className="availability-type-toggle">
                                        <label>
                                            <input 
                                                type="radio" 
                                                name="availabilityType" 
                                                checked={!useSpecificDates} 
                                                onChange={() => setUseSpecificDates(false)} 
                                            />
                                            Recurring Weekly Schedule
                                        </label>
                                        <label>
                                            <input 
                                                type="radio" 
                                                name="availabilityType" 
                                                checked={useSpecificDates} 
                                                onChange={() => setUseSpecificDates(true)} 
                                            />
                                            Specific Dates
                                        </label>
                                    </div>

                                    {/* Recurring days selection */}
                                    {!useSpecificDates && (
                                        <div>
                                            <label>Available Days:</label>
                                            <div className="days-container">
                                                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                                                    <label key={day}>
                                                        <input 
                                                            type="checkbox" 
                                                            value={day}
                                                            checked={availableDays.includes(day)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setAvailableDays([...availableDays, day]);
                                                                } else {
                                                                    setAvailableDays(availableDays.filter(d => d !== day));
                                                                }
                                                            }}
                                                        />
                                                        {day}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Specific dates selection */}
                                    {useSpecificDates && (
                                        <div>
                                            <label style={{color:'black',fontFamily:'poppins'}}>Available Dates:</label>
                                            <div className="date-selector">
                                                <input 
                                                    type="date" 
                                                    value={newDate} 
                                                    onChange={(e) => setNewDate(e.target.value)}
                                                    min={new Date().toISOString().split('T')[0]}
                                                />
                                                <button 
                                                    type="button" 
                                                    onClick={addSpecificDate}
                                                    style={{
                                                        padding: '4px 10px',
                                                        backgroundColor: '#4CAF50',
                                                        color: 'white',
                                                        fontWeight:'bold',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        marginLeft: '5px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Add Date
                                                </button>
                                            </div>
                                            <div className="selected-dates">
                                                {specificDates.length > 0 ? (
                                                    specificDates.map((date, index) => (
                                                        <div key={index} className="date-tag">
                                                            <span
                                                                onClick={() => handleDateSelection(date)}
                                                                style={{
                                                                    cursor: 'pointer',
                                                                    fontWeight: selectedDate === date ? 'bold' : 'normal',
                                                                    textDecoration: selectedDate === date ? 'underline' : 'none'
                                                                }}
                                                            >
                                                                {new Date(date).toLocaleDateString()}
                                                            </span>
                                                            <button 
                                                                type="button" 
                                                                onClick={() => removeSpecificDate(date)}
                                                                style={{
                                                                    marginLeft: '8px',
                                                                    background: 'none',
                                                                    border: 'none',
                                                                    color: 'red',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <p>No dates selected yet</p>
                                                )}
                                            </div>
                                            
                                            {/* Unavailability Slots Section */}
                                            {selectedDate && (
                                                <div className="unavailability-slots-container" style={{ marginTop: '20px', border: '1px solid #ddd', padding: '15px', borderRadius: '5px' }}>
                                                    <h4>Set Unavailability Time Slots for {new Date(selectedDate).toLocaleDateString()}</h4>
                                                    <p style={{ fontSize: '14px', color: '#666' }}>
                                                        Specify time durations when you will NOT be available on this date.
                                                    </p>
                                                    
                                                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px',color:'black' }}>
                                                        <div style={{marginLeft:'20px'}}>
                                                            <label>Start Time:</label>
                                                            <input 
                                                                style={{marginLeft:'10px',borderRadius:'3px',border:'1px solid black',fontFamily:'poppins'}}
                                                                type="time" 
                                                                value={slotStartTime} 
                                                                onChange={(e) => setSlotStartTime(e.target.value)}
                                                            />
                                                        </div>
                                                        <div style={{marginLeft:'20px'}}>
                                                            <label>End Time:</label>
                                                            <input 
                                                                style={{marginLeft:'10px',borderRadius:'3px',border:'1px solid black',fontFamily:'poppins'}}
                                                                type="time" 
                                                                value={slotEndTime} 
                                                                onChange={(e) => setSlotEndTime(e.target.value)}
                                                            />
                                                        </div>
                                                        <button 
                                                            type="button"
                                                            onClick={addUnavailabilitySlot}
                                                            style={{
                                                                padding: '5px 10px',
                                                                backgroundColor: '#4CAF50',
                                                                color: 'white',
                                                                fontFamily:'poppins',
                                                                border: 'none',
                                                                borderRadius: '4px',
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            Add Slot
                                                        </button>
                                                    </div>
                                                    
                                                    <div className="unavailability-slots-list">
                                                        <h5>Unavailable Time Slots:</h5>
                                                        {currentDateSlots.length > 0 ? (
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                                                {currentDateSlots.map((slot) => (
                                                                    <div 
                                                                        key={slot.id} 
                                                                        style={{ 
                                                                            padding: '5px 10px', 
                                                                            backgroundColor: '#f8f8f8', 
                                                                            borderRadius: '5px',
                                                                            border: '1px solid #ddd',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: '10px'
                                                                        }}
                                                                    >
                                                                        <span>{slot.startTime} - {slot.endTime}</span>
                                                                        <button 
                                                                            type="button"
                                                                            onClick={() => removeUnavailabilitySlot(slot.id)}
                                                                            style={{
                                                                                background: 'none',
                                                                                border: 'none',
                                                                                color: 'red',
                                                                                cursor: 'pointer',
                                                                                fontSize: '16px',
                                                                                padding: '0'
                                                                            }}
                                                                        >
                                                                            ✕
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <p>No unavailability slots added yet</p>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Time selection (common for both types) */}
                                    <div className='time-container' style={{ marginTop: '20px' }}>
                                        <label style={{color:'black',fontFamily:'poppins'}}>Overall Working Hours:</label>
                                        <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                                            <div>
                                                <label style={{color:'black'}}>Start Time:</label>
                                                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required/>
                                            </div>
                                            <div>
                                                <label>End Time:</label>
                                                <input style={{marginLeft:'20px'}} type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <button 
                                        type="submit"
                                        style={{
                                            marginTop: '20px',
                                            padding: '10px 20px',
                                            backgroundColor: '#4CAF50',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        Save Availability
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
                <div className='doctor-tools'>
                    <div className='patient-search'>
                        <p>Search Patient :- Id</p>
                        <p style={{ color: 'green', margin: '1px', fontSize: '15px' }}>{searchMessage}</p>
                        <div className='search-bar'>
                            <input 
                                type='number' 
                                placeholder='Search Here' 
                                name='patient-code' 
                                maxLength={10} 
                                onChange={handlePatientCode}
                            />
                            <button onClick={searchPatient}>Search</button>
                        </div>
                        <div className='search-list' onClick={handleSearchedPatient} id='patient-list'>
                            {searchedPatient.firstname} {searchedPatient.lastname}
                        </div>
                        <h3>My Patients</h3>
                        <div className='recentPatientContainer'>
                            <div className='DoctorsPatient'>
                                {myPatients.length > 0 ? (
                                    myPatients.map((patient) => (
                                        <div 
                                            key={patient.id} 
                                            className='patient-item'
                                            onClick={() => handlePatientClick(patient.email)}
                                        >
                                            {patient.firstname} {patient.lastname} (ID: {patient.id})
                                        </div>
                                    ))
                                ) : (
                                    <p>No patients assigned yet.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Appointments List - Modified to show status-based styling */}
            <div 
                style={{
                    margin: '20px',
                    padding: '15px',
                    border: '1px solid #ddd',
                    borderRadius: '5px'}}>
                <h3>My Appointments</h3>
                {doctorDetail.upcomingAppointments && Object.keys(doctorDetail.upcomingAppointments).length > 0 ? (
                    <div className='upcoming-appointments-list'>
                        {Object.entries(doctorDetail.upcomingAppointments).map(([appointmentId, appointment]) => {
                            const appointmentStatus = getAppointmentStatus(appointment);
                            const isOnlineAppointment = appointment.type === 'online';
                            const canJoin = canJoinAppointment(appointment);
                            
                            // Format time to Indian time format (12-hour with AM/PM)
                            let formattedTime = appointment.time;
                            try {
                                // Assuming appointment.time is in 24-hour format like "14:30"
                                const [hours, minutes] = appointment.time.split(':');
                                const hour = parseInt(hours, 10);
                                const ampm = hour >= 12 ? 'PM' : 'AM';
                                const hour12 = hour % 12 || 12; // Convert to 12-hour format
                                formattedTime = `${hour12}:${minutes} ${ampm}`;
                            } catch (error) {
                                console.error("Error formatting time:", error);
                                // Keep the original format if there's an error
                            }
                            
                            // Determine border color based on appointment status
                            let borderColor = '#ddd'; // Default grey
                            if (appointmentStatus === 'expired') {
                                borderColor = '#ff4d4d'; // Red for expired
                            } else if (appointmentStatus === 'today') {
                                borderColor = '#4682B4'; // Blue for today
                            }
                            
                            return (
                                <div 
                                    key={appointmentId} 
                                    className='appointment-item'
                                    style={{
                                        borderLeft: `5px solid ${borderColor}`,
                                        position: 'relative'
                                    }}
                                >
                                    <p><strong>Appointment ID:</strong> {appointment.patientRef}</p>
                                    <p><strong>Patient ID:</strong> {appointment.patientId}</p>
                                    <p><strong>Date:</strong> {appointment.day}</p>
                                    <p><strong>Time:</strong> {formattedTime}</p>
                                    <p><strong>Type:</strong> {appointment.type}</p>
                                    {/* Rest of your code... */}
                                    
                                    {/* Online call button - visible only for online appointments */}
                                    {isOnlineAppointment && (
                                        <button
                                            onClick={() => handleJoinCall(appointment.id,appointment.patientId,appointment.id)}
                                            disabled={canJoin}
                                            style={{
                                                padding: '6px 12px',
                                                backgroundColor: canJoin ? '#4CAF50' : '#e0e0e0',
                                                color: canJoin ? 'white' : '#999',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: canJoin ? 'pointer' : 'not-allowed',
                                                marginTop: '8px',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            Join Call
                                        </button>
                                    )}
                                    
                                    {/* Status indicator */}
                                    <div style={{
                                        position: 'absolute',
                                        top: '10px',
                                        right: '10px',
                                        padding: '3px 8px',
                                        borderRadius: '10px',
                                        fontSize: '12px',
                                        fontWeight: 'bold',
                                        backgroundColor: 
                                            appointmentStatus === 'expired' ? '#ffeded' : 
                                            appointmentStatus === 'today' ? '#e7f3e7'
                                            : '#f0f0f0', // Default for upcoming
                                            color:
                                                appointmentStatus === 'expired' ? '#ff4d4d' :
                                                appointmentStatus === 'today' ? '#4682B4'
                                                : '#666' // Default for upcoming
                                        }}>
                                            {appointmentStatus === 'expired' ? 'Expired' :
                                             appointmentStatus === 'today' ? 'Today' :
                                             'Upcoming'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p>No upcoming appointments found.</p>
                    )}
                </div>
            </>
        );
    };
    
    export default DoctorHome;