import React, { useState, useEffect } from 'react';
import { ref, get, set, push, onValue } from "firebase/database";
import db from '../firebase';
import '../Styles/Specialities.css';

const specialties = [
  { name: "General Physician", image: require('../Assets/general Physician.png') },
  { name: "Dermatology", image: require('../Assets/dry-skin-dermatology.png') },
  { name: "Obstetrics & Gynaecology", image: require('../Assets/checkup-obstetrics.png') },
  { name: "Orthopaedics", image: require('../Assets/orthopedics.png') },
  { name: "ENT", image: require('../Assets/sore-throat-Ent.png') },
  { name: "Neurology", image: require('../Assets/neurology.png') },
  { name: "Cardiology", image: require('../Assets/cardiology.png') },
  { name: "Urology", image: require('../Assets/urology.png') },
  { name: "Gastroenterology", image: require('../Assets/gastroenterology.png') },
  { name: "Psychiatry", image: require('../Assets/psychiatry.png') },
  { name: "Paediatrics", image: require('../Assets/paedritics.png') },
  { name: "Pulmonology", image: require('../Assets/pulmonology.png') },
  { name: "Cancer", image: require('../Assets/cancer.png') },
  { name: "Dental", image: require('../Assets/tooth.png') },
];

const SpecialtiesPage = () => {
  const [selectedSpecialty, setSelectedSpecialty] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [appointmentPopup, setAppointmentPopup] = useState(false);
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [timeSlots, setTimeSlots] = useState([]);
  const [appointmentType, setAppointmentType] = useState('');
  const [bookedAppointments, setBookedAppointments] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [availableDates, setAvailableDates] = useState([]);
  const [isUsingRecurringSchedule, setIsUsingRecurringSchedule] = useState(true);

  const fetchDoctors = async (specialty) => {
    setLoading(true);
    try {
      const doctorsRef = ref(db, 'doctor');
      const snapshot = await get(doctorsRef);
      if (snapshot.exists()) {
        const allDoctors = snapshot.val();
        const filteredDoctors = Object.keys(allDoctors)
          .map(doctorId => ({ id: doctorId, ...allDoctors[doctorId] }))
          .filter(doctor => doctor.specialisation === specialty && doctor.availability);

        setDoctors(filteredDoctors);
      } else {
        setDoctors([]);
      }
    } catch (error) {
      console.error("Error fetching doctors:", error);
      setDoctors([]);
    }
    setLoading(false);
  };

  const handleSpecialtyClick = (specialty) => {
    setSelectedSpecialty(specialty);
    fetchDoctors(specialty);
  };

  const openAppointmentPopup = (doctor) => {
    setSelectedDoctor(doctor);
    setSelectedDay('');
    setSelectedDate('');
    setSelectedTime('');
    setAppointmentType('');
    setTimeSlots([]);
    setErrorMessage('');
    fetchBookedAppointments(doctor.id);
    checkDoctorScheduleType(doctor);
    setAppointmentPopup(true);
  };

  const checkDoctorScheduleType = (doctor) => {
    if (doctor.availability) {
      setIsUsingRecurringSchedule(!doctor.availability.useSpecificDates);
      
      if (doctor.availability.useSpecificDates) {
        // Doctor uses specific dates
        setAvailableDates(doctor.availability.specificDates || []);
      } else {
        // Doctor uses recurring weekly schedule
        // No need to set available dates here as we'll use doctor.availability.days
      }
    } else {
      setIsUsingRecurringSchedule(true);
      setAvailableDates([]);
    }
  };

  const closeAppointmentPopup = () => {
    setAppointmentPopup(false);
    setErrorMessage('');
  };

  // Real-time listener for booked appointments
  useEffect(() => {
    if (selectedDoctor && appointmentPopup) {
      const appointmentsRef = ref(db, `doctor/${selectedDoctor.id}/upcomingAppointments`);
      const unsubscribe = onValue(appointmentsRef, (snapshot) => {
        if (snapshot.exists()) {
          const appointments = Object.values(snapshot.val());
          setBookedAppointments(appointments);
          
          // If user already selected a day/date, refresh time slots with new booking data
          if (isUsingRecurringSchedule && selectedDay) {
            handleDayChange({ target: { value: selectedDay } });
          } else if (!isUsingRecurringSchedule && selectedDate) {
            handleDateChange({ target: { value: selectedDate } });
          }
        } else {
          setBookedAppointments([]);
        }
      });
      
      // Clean up listener when popup closes
      return () => unsubscribe();
    }
  }, [selectedDoctor, appointmentPopup, selectedDay, selectedDate, isUsingRecurringSchedule]);

  const fetchBookedAppointments = async (doctorId) => {
    try {
      const appointmentsRef = ref(db, `doctor/${doctorId}/upcomingAppointments`);
      const snapshot = await get(appointmentsRef);
      if (snapshot.exists()) {
        const appointments = Object.values(snapshot.val());
        setBookedAppointments(appointments);
      } else {
        setBookedAppointments([]);
      }
    } catch (error) {
      console.error("Error fetching booked appointments:", error);
      setBookedAppointments([]);
    }
  };

  const handleDayChange = (event) => {
    const day = event.target.value;
    setSelectedDay(day);
    setSelectedTime('');
    setSelectedDate(''); // Clear date when day is selected

    // Clear error message when changing day
    setErrorMessage('');
    
    // Check if doctor is available on this day
    if (!selectedDoctor.availability.days.includes(day)) {
      setTimeSlots([]);
      setErrorMessage("Doctor is not available on this day.");
      return;
    }

    const startTime = selectedDoctor.availability.startTime;
    const endTime = selectedDoctor.availability.endTime;
    
    // Get unavailable times for this day from the unavailabilitySlots
    const doctorUnavailableTimes = [];
    if (selectedDoctor.unavailabilitySlots && selectedDoctor.unavailabilitySlots[day]) {
      selectedDoctor.unavailabilitySlots[day].forEach(slot => {
        // Convert slot times to hour format
        const startHour = parseInt(slot.startTime.split(':')[0]);
        const endHour = parseInt(slot.endTime.split(':')[0]);
        
        // Create array of all hours in the slot
        for (let hour = startHour; hour < endHour; hour++) {
          doctorUnavailableTimes.push(`${hour}:00`);
        }
      });
    }
    
    // Get already booked appointments for this day
    const bookedTimesForDay = bookedAppointments
      .filter(appt => appt.day === day)
      .map(appt => appt.time);
    
    generateTimeSlots(startTime, endTime, doctorUnavailableTimes, bookedTimesForDay);
  };

  const handleDateChange = (event) => {
    const date = event.target.value;
    setSelectedDate(date);
    setSelectedTime('');
    setSelectedDay(''); // Clear day when date is selected
    
    // Clear error message when changing date
    setErrorMessage('');
    
    // Check if date is in available dates
    if (!availableDates.includes(date)) {
      setTimeSlots([]);
      setErrorMessage("Doctor is not available on this date.");
      return;
    }

    const startTime = selectedDoctor.availability.startTime;
    const endTime = selectedDoctor.availability.endTime;
    
    // Get unavailable times for this date from the unavailabilitySlots
    const doctorUnavailableTimes = [];
    if (selectedDoctor.unavailabilitySlots && selectedDoctor.unavailabilitySlots[date]) {
      selectedDoctor.unavailabilitySlots[date].forEach(slot => {
        // Convert slot times to hour format
        const startHour = parseInt(slot.startTime.split(':')[0]);
        const endHour = parseInt(slot.endTime.split(':')[0]);
        
        // Create array of all hours in the slot
        for (let hour = startHour; hour < endHour; hour++) {
          doctorUnavailableTimes.push(`${hour}:00`);
        }
      });
    }
    
    // Get already booked appointments for this date
    const bookedTimesForDate = bookedAppointments
      .filter(appt => appt.day === date)
      .map(appt => appt.time);
    
    generateTimeSlots(startTime, endTime, doctorUnavailableTimes, bookedTimesForDate);
  };

  const generateTimeSlots = (start, end, unavailableTimes = [], bookedTimes = []) => {
    let slots = [];
    let currentTime = parseInt(start);
    let endTime = parseInt(end);

    while (currentTime < endTime) {
      const timeSlot = `${currentTime}:00`;
      // Add slot only if it's not in unavailable times and not already booked
      if (!unavailableTimes.includes(timeSlot) && !bookedTimes.includes(timeSlot)) {
        slots.push(timeSlot);
      }
      currentTime++;
    }
    
    if (slots.length === 0) {
      setErrorMessage("No available time slots for this day.");
    }
    
    setTimeSlots(slots);
  };

  const bookAppointment = async () => {
    // Use either selectedDay or selectedDate based on doctor's schedule type
    const appointmentDay = isUsingRecurringSchedule ? selectedDay : selectedDate;
    
    if (!appointmentDay || !selectedTime) {
      setErrorMessage("Please select both day and time.");
      return;
    }
    
    if (!appointmentType) {
      setErrorMessage("Please select appointment type (online or offline).");
      return;
    }
    
    const patientId = localStorage.getItem('id');
    if (!patientId) {
      setErrorMessage("You must be logged in to book an appointment.");
      return;
    }
    
    // Check one more time if slot is still available (real-time verification)
    try {
      const appointmentsRef = ref(db, `doctor/${selectedDoctor.id}/upcomingAppointments`);
      const snapshot = await get(appointmentsRef);
      
      let isSlotBooked = false;
      if (snapshot.exists()) {
        const appointments = Object.values(snapshot.val());
        isSlotBooked = appointments.some(
          appt => appt.day === appointmentDay && appt.time === selectedTime
        );
      }
      
      if (isSlotBooked) {
        setErrorMessage("This slot has just been booked. Please select another time.");
        
        // Refresh available slots
        if (isUsingRecurringSchedule) {
          handleDayChange({ target: { value: selectedDay } });
        } else {
          handleDateChange({ target: { value: selectedDate } });
        }
        return;
      }
      
      const appointment = {
        doctorId: selectedDoctor.id,
        doctorName: `${selectedDoctor.firstname} ${selectedDoctor.lastname}`,
        day: appointmentDay,
        time: selectedTime,
        type: appointmentType,
        patientId: patientId,
        status: 'scheduled',
        createdAt: new Date().toISOString()
      };

      const doctorRef = ref(db, `doctor/${selectedDoctor.id}/upcomingAppointments`);
      const patientRef = ref(db, `patient/${patientId}/upcomingAppointments`);

      // Save to doctor's appointments
      const newDoctorAppointmentRef = push(doctorRef);
      const newPatientAppoitmentRef = push(patientRef)
      appointment.patientRef = newPatientAppoitmentRef.key;
      appointment.id = newDoctorAppointmentRef.key;
      await set(newDoctorAppointmentRef, appointment);
      
      // Save to patient's appointments
      await set(newPatientAppoitmentRef,appointment);
      
      alert("Appointment booked successfully!");
      closeAppointmentPopup();
    } catch (error) {
      console.error("Error booking appointment:", error);
      setErrorMessage("Failed to book appointment. Please try again.");
    }
  };

  // Helper function to format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <div className="app-container">
      {!selectedSpecialty ? (
        <div className="container">
          <h1 className="heading">Browse by Specialties</h1>
          <div className="grid">
            {specialties.map((specialty, index) => (
              <div key={index} className="specialty-card" onClick={() => handleSpecialtyClick(specialty.name)}>
                <img src={specialty.image} alt={specialty.name} className="specialty-image" />
                <h3 className="specialty-name">{specialty.name}</h3>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="container">
          <h1 className="heading">{selectedSpecialty} Specialists</h1>
          <button onClick={() => setSelectedSpecialty(null)} className="back-button">Back to Specialties</button>
          {loading ? (
            <p>Loading doctors...</p>
          ) : doctors.length > 0 ? (
            <div className="doctors-list">
              {doctors.map(doctor => (
                <div key={doctor.id} className="doctor-card">
                  <p><strong>Name:</strong> {doctor.firstname} {doctor.lastname}</p>
                  <p><strong>Email:</strong> {doctor.email}</p>
                  <button className='BookAppointment' onClick={() => openAppointmentPopup(doctor)}>Book Appointment</button>
                </div>
              ))}
            </div>
          ) : (
            <p>No doctors found for {selectedSpecialty}.</p>
          )}
        </div>
      )}

      {appointmentPopup && (
        <div className="popup">
          <div className="popup-content">
            <h2>Book Appointment with Dr. {selectedDoctor.lastname || selectedDoctor.firstname}</h2>
            
            <div className="form-group">
              <label>Appointment Type:</label>
              <select 
                value={appointmentType} 
                onChange={(e) => setAppointmentType(e.target.value)}
              >
                <option value="">Select type</option>
                <option value="online">Online</option>
                <option value="offline">Offline</option>
              </select>
            </div>
            
            {isUsingRecurringSchedule ? (
              // Recurring weekly schedule option
              <div className="form-group">
                <label>Select Day:</label>
                <select value={selectedDay} onChange={handleDayChange}>
                  <option value="">Select a day</option>
                  {selectedDoctor.availability?.days?.map((day, index) => (
                    <option key={index} value={day}>{day}</option>
                  ))}
                </select>
              </div>
            ) : (
              // Specific dates option
              <div className="form-group">
                <label>Select Date:</label>
                <select value={selectedDate} onChange={handleDateChange}>
                  <option value="">Select a date</option>
                  {availableDates.map((date, index) => (
                    <option key={index} value={date}>
                      {formatDate(date)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="form-group">
              <label>Select Time:</label>
              <select 
                value={selectedTime} 
                onChange={(e) => setSelectedTime(e.target.value)}
                disabled={timeSlots.length === 0}
              >
                <option value="">Select a time</option>
                {timeSlots.map((time, index) => (
                  <option key={index} value={time}>{time}</option>
                ))}
              </select>
            </div>
            
            {errorMessage && (
              <div className="error-message">
                {errorMessage}
              </div>
            )}
            
            <div className="popup-buttons">
              <button 
                className="confirm-btn" 
                onClick={bookAppointment}
                disabled={!(isUsingRecurringSchedule ? selectedDay : selectedDate) || !selectedTime || !appointmentType}
              >
                Confirm Booking
              </button>
              <button className="cancel-btn" onClick={closeAppointmentPopup}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpecialtiesPage;