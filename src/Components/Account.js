import { useState } from 'react';
import '../App.css';
import '../Styles/Account.css';
import { set, ref, get, update } from 'firebase/database';
import db from '../firebase';
import { auth, createUserWithEmailAndPassword, signInWithEmailAndPassword, setDoc, doc } from '../firebase';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import Notification from './Notification';

const Account = () => {
    const navigate = useNavigate();
    const [login, setLogin] = useState(true);
    const [patlogin, setPatLogin] = useState(true);
    const [diseaselist, setDiseaseList] = useState([]);
    const [processing, setProcessing] = useState(false);
    const [warning, setWarning] = useState('');
    const [notification, setNotificationMessage] = useState('');
    const [showToast, setShowToast] = useState(false);
    const [errorNotification, setErrorNotification] = useState('');
    const [showErrorToast, setShowErrorToast] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        contact: '',
        password: '',
        firstname: '',
        lastname: '',
        confirmPassword: '',
        specialisation: '',
        degree: '',
        age:'',
        gender:'',
        hospitalId: '', // Added hospital ID field
    });

    const setAccount = (e) => {
        e.preventDefault();
        setPatLogin(!patlogin);
    };

    const addDisease = (e) => {
        e.preventDefault();
        const d = document.getElementById('disease').value.trim(); // Trim whitespace
        if (!d) return; // Prevent adding empty values

        setDiseaseList(prevList => {
            if (prevList.includes(d)) {
                alert("This disease is already added!"); // Show alert if duplicate
                return prevList; // Return the same list without adding
            }
            return [...prevList, d]; // Add disease if it's unique
        });

        document.getElementById('disease').value = ''; // Clear input after adding
    };

    const removeDisease = (disease) => {
        setDiseaseList(prevList => prevList.filter(item => item !== disease));
    };

    const handleaccount = (e) => {
        e.preventDefault();
        setLogin(!login);
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Function to generate a 10-digit unique ID
    const generateUniqueId = () => {
        return Math.floor(1000000000 + Math.random() * 9000000000).toString();
    };

    // Function to check if email exists in a specific collection
    const checkEmailInCollection = async (email, collection) => {
        const collectionRef = ref(db, collection);
        const snapshot = await get(collectionRef);
        
        if (snapshot.exists()) {
            const data = snapshot.val();
            // Loop through all records to find if email exists
            for (const id in data) {
                if (data[id].email === email) {
                    return { exists: true, id: id };
                }
            }
        }
        return { exists: false, id: null };
    };

    // Function to show error notification
    const showError = (message) => {
        setErrorNotification(message);
        setShowErrorToast(true);
        setTimeout(() => { setShowErrorToast(false); }, 3000);
    };

    // Function to show success notification
    const showSuccess = (message) => {
        setNotificationMessage(message);
        setShowToast(true);
        setTimeout(() => { setShowToast(false); }, 1500);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const userType = patlogin ? "doctor" : "patient";

        // Check if the user is already logged in as a different type
        const loggedInUserType = localStorage.getItem("userType");
        if (loggedInUserType && loggedInUserType !== userType) {
            setWarning(`You are already logged in as a ${loggedInUserType}. Please log out first to switch roles.`);
            return;
        }

        if (login) {
            setProcessing(true);
            // Sign In
            try {
                // First authenticate with Firebase
                await signInWithEmailAndPassword(auth, formData.email, formData.password);
                const email = formData.email;

                // Now check if the email exists in the correct collection based on selected account type
                const collection = patlogin ? "doctor" : "patient";
                const checkResult = await checkEmailInCollection(email, collection);
                
                if (!checkResult.exists) {
                    // Email doesn't exist in the selected collection
                    const otherCollection = patlogin ? "patient" : "doctor";
                    const otherCheckResult = await checkEmailInCollection(email, otherCollection);
                    
                    if (otherCheckResult.exists) {
                        // Email exists but in the other collection
                        if (patlogin) {
                            // Doctor trying to login to patient dashboard
                            showError('Doctor data not found!');
                            setWarning(`This email is registered as a patient, not as a doctor. Please switch to the correct account type.`);
                        } else {
                            // Patient trying to login to doctor dashboard
                            showError('Patient data not found!');
                            setWarning(`This email is registered as a doctor, not as a patient. Please switch to the correct account type.`);
                        }
                        setProcessing(false);
                        return;
                    } else {
                        // Email doesn't exist in either collection
                        showError('Account not found!');
                        setWarning("Account not found. Please register first.");
                        setProcessing(false);
                        return;
                    }
                }

                // If we reach here, the email exists in the correct collection
                // Creating sessions
                localStorage.setItem("userEmail", email);
                localStorage.setItem("userType", userType);
                localStorage.setItem("userId", checkResult.id); // Store the user ID for future use

                if (patlogin) {
                    showSuccess('Doctor Login Successful!');
                    setTimeout(() => { navigate('/DoctorPanel', { state: { email } }) }, 1500);
                } else {
                    showSuccess('Patient Login Successful!');
                    setTimeout(() => { navigate('/PatientPanel', { state: { email } }) }, 1500);
                }
                setProcessing(false);
            } catch (error) {
                showError('Login failed!');
                setWarning(error.message);
                setProcessing(false);
            }
        } else {
            setProcessing(true);
            // Sign Up
            if (formData.password !== formData.confirmPassword) {
                showError('Passwords do not match!');
                setWarning("Passwords do not match!");
                setProcessing(false);
                return;
            }

            // Check if email already exists in either collection
            try {
                const doctorCheck = await checkEmailInCollection(formData.email, "doctor");
                const patientCheck = await checkEmailInCollection(formData.email, "patient");
                
                if (doctorCheck.exists || patientCheck.exists) {
                    showError('Email already registered!');
                    setWarning("This email is already registered. Please use a different email or try logging in.");
                    setProcessing(false);
                    return;
                }

                // Register user in Firebase Authentication
                const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
                const userId = userCredential.user.uid; // Firebase Auth User ID

                if (patlogin) {
                    // Validate hospitalId for doctor registration
                    if (!formData.hospitalId || formData.hospitalId.trim() === '') {
                        showError('Hospital ID required!');
                        setWarning("Hospital ID is required for doctor registration");
                        setProcessing(false);
                        return;
                    }

                    // Generate a 10-digit unique doctor ID
                    const doctorId = generateUniqueId();
                    const fileName = `${doctorId}.json`;

                    const doctor = {
                        firstname: formData.firstname,
                        lastname: formData.lastname,
                        email: formData.email,
                        contact: formData.contact,
                        specialisation: formData.specialisation,
                        fileName: fileName,
                        doctorid: doctorId,
                        hospitalId: formData.hospitalId, // Save hospital ID with doctor data
                        RecentPatients: [],
                        age: formData.age,
                        gender:formData.gender,
                        Ratting: [0, 0],
                    };

                    // Save doctor data
                    await set(ref(db, `doctor/${doctorId}`), doctor);

                    // Add doctor to hospital's doctors list as array element
                    const hospitalRef = ref(db, `Hospital/${formData.hospitalId}`);
                    const hospitalSnapshot = await get(hospitalRef);

                    if (hospitalSnapshot.exists()) {
                        const hospitalData = hospitalSnapshot.val();
                        if (hospitalData.Doctor && Array.isArray(hospitalData.Doctor)) {
                            const updatedDoctors = [...hospitalData.Doctor, doctorId];
                            await update(hospitalRef, { Doctor: updatedDoctors });
                        } else {
                            await update(hospitalRef, { Doctor: [doctorId] });
                        }
                    } else {
                        await set(hospitalRef, {
                            Doctor: [doctorId],
                        });
                    }

                    const email = doctor.email;

                    // Creating sessions
                    localStorage.setItem("userEmail", email);
                    localStorage.setItem("userType", 'doctor');
                    localStorage.setItem("userId", doctorId);
                    
                    showSuccess('Doctor Registration Successful!');
                    setTimeout(() => { navigate('/DoctorPanel', { state: { email } }); }, 1500);
                    setProcessing(false);
                } else {
                    const patientid = generateUniqueId();
                    const patient = {
                        firstname: formData.firstname,
                        lastname: formData.lastname,
                        email: formData.email,
                        age:formData.age,
                        gender:formData.gender,
                        contact: formData.contact,
                        disease: diseaselist,
                        appointments: [],
                        InsuranceInfo: {},
                        DoctorsAppointed: [],
                        patientid: patientid,
                        NextAppointment: [],
                    };
                    await set(ref(db, `patient/${patientid}`), patient);
                    const patientemail = patient.email;

                    // Creating sessions
                    localStorage.setItem("userEmail", patientemail);
                    localStorage.setItem("userType", 'patient');
                    localStorage.setItem("userId", patientid);
                    
                    showSuccess('Patient Registration Successful!');
                    setTimeout(() => { navigate('/PatientPanel', { state: { email: patientemail } }); }, 1500);
                    setProcessing(false);
                }
            } catch (error) {
                showError('Registration failed!');
                setWarning(error.message);
                setProcessing(false);
            }
        }
    };

    return (
        <>
            <Notification showToast={showToast} message={notification} />
            {/* Error notification toast */}
            <div className="error-notification" style={{
                position: 'fixed',
                top: '47%',
                left: '65%',
                transform: 'translateX(-50%)',
                backgroundColor: '#ff3333',
                color: 'white',
                padding: '10px 20px',
                borderRadius: '5px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                zIndex: 9999,
                opacity: showErrorToast ? 1 : 0,
                visibility: showErrorToast ? 'visible' : 'hidden',
                transition: 'opacity 0.3s, visibility 0.3s',
                fontWeight: 'bold'
            }}>
                {errorNotification}
            </div>
            <div className='account-container'>
                <div className='chose-type'>
                    <h2>{patlogin ? 'Doctor Account' : 'Patient Account'}</h2>
                    <a href='#' onClick={setAccount}>{patlogin ? 'Shift to Patient' : 'Shift to Doctor'}</a>
                </div>
                {patlogin ?
                    <div className='account-div'>
                        {login ?
                            <div className='login-div' id='login-div'>
                                <h3>Doctor Login</h3>
                                <form className='login-form' onSubmit={handleSubmit}>
                                    <label>Email</label>
                                    <input type='email' name='email' placeholder='Email' onChange={handleChange} />
                                    <label>Password</label>
                                    <input type='password' name='password' placeholder='Password' onChange={handleChange} />
                                    <button type='submit'>{processing ? 'Logging in...' : 'Login'}</button>
                                </form>
                                <span>Don't have an account? <a href='#' onClick={handleaccount}>Register</a></span>
                            </div>
                            :
                            <div className='register-div' id='register-div'>
                                <form className='register-form' onSubmit={handleSubmit}>
                                    <h3>Doctor Register</h3>
                                    <p>{warning}</p>
                                    <div className='special-register-container'>
                                        <div className='input-container'>
                                            <label>First Name*</label>
                                            <input type='text' placeholder='First Name' name='firstname' onChange={handleChange} required />
                                        </div>
                                        <div className='input-container'>
                                            <label>Last Name*</label>
                                            <input type='text' placeholder='Last Name' name='lastname' onChange={handleChange} required />
                                        </div>
                                        <div className='input-container'>
                                            <label>Email*</label>
                                            <input type='email' placeholder='Email' name='email' onChange={handleChange} required />
                                        </div>
                                        <div className='input-container'>
                                            <label>Phone No*</label>
                                            <input type='number' placeholder='Phone No' name='contact' onChange={handleChange} required />
                                        </div>
                                        <div className='input-container'>
                                            <label>Age*</label>
                                            <input type='number' placeholder='Age' name='age' onChange={handleChange} required />
                                        </div>
                                        <div className='input-container'>
                                            <label>Gender</label>
                                            <select name='gender' onChange={handleChange}>
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                        <div className='input-container'>
                                            <label>Password*</label>
                                            <input type='text' placeholder='Password' name='password' onChange={handleChange} required />
                                        </div>
                                        <div className='input-container'>
                                            <label>Confirm Password*</label>
                                            <input type='text' placeholder='Confirm Password' name='confirmPassword' onChange={handleChange} required />
                                        </div>
                                        <div className='input-container'>
                                            <label>Hospital ID*</label>
                                            <input type='text' placeholder='Hospital ID' name='hospitalId' onChange={handleChange} required />
                                        </div>
                                        <div className='input-container'>
                                            <label>Specialiesd In*</label>
                                            <select name='specialisation' onChange={handleChange}>
                                                <option value="">Select Specialization</option>
                                                <option value="cancer">Oncologist (Cancer Specialist)</option>
                                                <option value="dental">Dentist</option>
                                                <option value="cardiology">Cardiologist (Heart Specialist)</option>
                                                <option value="neurology">Neurologist (Brain & Nerve Specialist)</option>
                                                <option value="orthopedic">Orthopedic Surgeon (Bone & Joint Specialist)</option>
                                                <option value="pediatrics">Pediatrician (Child Specialist)</option>
                                                <option value="dermatology">Dermatologist (Skin Specialist)</option>
                                                <option value="psychiatry">Psychiatrist (Mental Health)</option>
                                                <option value="gynecology">Gynecologist (Women's Health)</option>
                                                <option value="endocrinology">Endocrinologist (Hormone Specialist)</option>
                                                <option value="ophthalmology">Ophthalmologist (Eye Specialist)</option>
                                                <option value="ent">ENT Specialist (Ear, Nose, Throat)</option>
                                                <option value="urology">Urologist (Urinary System & Male Reproductive Health)</option>
                                                <option value="nephrology">Nephrologist (Kidney Specialist)</option>
                                                <option value="pulmonology">Pulmonologist (Lung Specialist)</option>
                                                <option value="gastroenterology">Gastroenterologist (Digestive System)</option>
                                                <option value="rheumatology">Rheumatologist (Arthritis & Autoimmune Diseases)</option>
                                                <option value="radiology">Radiologist (Imaging & Scans)</option>
                                                <option value="anesthesiology">Anesthesiologist (Pain Management & Surgery Anesthesia)</option>
                                                <option value="hematology">Hematologist (Blood Disorders)</option>
                                                <option value="infectious_disease">Infectious Disease Specialist</option>
                                                <option value="plastic_surgery">Plastic Surgeon</option>
                                                <option value="vascular_surgery">Vascular Surgeon (Blood Vessels & Circulation)</option>
                                                <option value="proctology">Proctologist (Colon & Rectum Specialist)</option>
                                                <option value="geriatrics">Geriatrician (Elderly Care)</option>
                                                <option value="sports_medicine">Sports Medicine Specialist</option>
                                            </select>
                                        </div>
                                        <div className='input-container'>
                                            <label>Medical Degree Certificate</label>
                                            <input type='file' id='file-upload' className='file-upload' name='degree' required></input>
                                            <label htmlFor='file-upload' className='label-file'>Click here to add degree here</label>
                                        </div>
                                    </div>
                                    <button type='submit' id='rsubmit'>{processing ? 'Registering...' : 'Register'}</button>
                                </form>
                                <span>Already have an account? <a href='#' onClick={handleaccount}>Login</a></span>
                            </div>
                        }
                    </div>
                    :
                    <div className='account-div'>
                        {login ?
                            <div className='login-div' id='login-div'>
                                <h3>Patient login</h3>
                                <form className='login-form' onSubmit={handleSubmit}>
                                    <label>Email</label>
                                    <input type='email' name='email' placeholder='Email' onChange={handleChange} />
                                    <label>Password</label>
                                    <input type='password' name='password' placeholder='Password' onChange={handleChange} />
                                    <button type='submit'>{processing ? 'Logging in...' : 'Login'}</button>
                                </form>
                                <span>Don't have an account? <a href='#' onClick={handleaccount}>Register</a></span>
                            </div>
                            :
                            <div className='register-div' id='register-div'>
                                <form className='register-form' onSubmit={handleSubmit}>
                                    <h3>Patient Register</h3>
                                    <p>{warning}</p>
                                    <div className='special-register-container'>
                                        <div className='input-container'>
                                            <label>First Name*</label>
                                            <input type='text' placeholder='First Name' name='firstname' onChange={handleChange} required />
                                        </div>
                                        <div className='input-container'>
                                            <label>Last Name*</label>
                                            <input type='text' placeholder='Last Name' name='lastname' onChange={handleChange} required />
                                        </div>
                                        <div className='input-container'>
                                            <label>Email*</label>
                                            <input type='email' placeholder='Email' name='email' onChange={handleChange} required />
                                        </div>
                                        <div className='input-container'>
                                            <label>Phone No*</label>
                                            <input type='number' placeholder='Phone No' name='contact' onChange={handleChange} required />
                                        </div>
                                        <div className='input-container'>
                                            <label>Age*</label>
                                            <input type='number' placeholder='Age' name='age' onChange={handleChange} required />
                                        </div>
                                        <div className='input-container'>
                                            <label>Gender</label>
                                            <select name='gender' onChange={handleChange}>
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                        <div className='input-container'>
                                            <label>Password*</label>
                                            <input type='text' placeholder='Password' name='password' onChange={handleChange} required />
                                        </div>
                                        <div className='input-container'>
                                            <label>Confirm Password*</label>
                                            <input type='text' placeholder='Confirm Password' name='confirmPassword' onChange={handleChange} required />
                                        </div>
                                        <div className='input-container'>
                                            <label>Disease</label>
                                            <div className='add-disease'>
                                                <select name='specialisation' id='disease'>
                                                    <option>Cancer</option>
                                                    <option>Diabetes</option>
                                                    <option>Heart Disease</option>
                                                    <option>Stroke</option>
                                                    <option>Alzheimer's Disease</option>
                                                    <option>Parkinson's Disease</option>
                                                    <option>Asthma</option>
                                                    <option>Arthritis</option>
                                                    <option>Hypertension</option>
                                                    <option>Obesity</option>
                                                    <option>Tuberculosis</option>
                                                    <option>HIV/AIDS</option>
                                                    <option>COVID-19</option>
                                                    <option>Influenza</option>
                                                    <option>Pneumonia</option>
                                                    <option>Hepatitis</option>
                                                    <option>Kidney Disease</option>
                                                    <option>Liver Disease</option>
                                                    <option>Epilepsy</option>
                                                    <option>Multiple Sclerosis</option>
                                                    <option>Sickle Cell Disease</option>
                                                    <option>Cystic Fibrosis</option>
                                                    <option>Dengue</option>
                                                    <option>Malaria</option>
                                                    <option>Cholera</option>
                                                    <option>Typhoid</option>
                                                    <option>Leprosy</option>
                                                    <option>Lupus</option>
                                                    <option>Psoriasis</option>
                                                    <option>Gout</option>
                                                    <option>Endometriosis</option>
                                                    <option>Osteoporosis</option>
                                                    <option>Migraine</option>
                                                    <option>Depression</option>
                                                    <option>Anxiety Disorder</option>
                                                    <option>Schizophrenia</option>
                                                    <option>Bipolar Disorder</option>
                                                    <option>Autism Spectrum Disorder</option>
                                                    <option>ADHD</option>
                                                    <option>Glaucoma</option>
                                                    <option>Cataracts</option>
                                                    <option>Conjunctivitis</option>
                                                    <option>Measles</option>
                                                    <option>Mumps</option>
                                                    <option>Rubella</option>
                                                </select>
                                                <button onClick={addDisease} style={{width:'100px'}}>Add</button>
                                                <div className="disease-list">
                                                    {diseaselist.map((disease, index) => (
                                                        <div key={index} className="disease-item">
                                                            {disease}
                                                            <button onClick={() => removeDisease(disease)}>❌</button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <button type='submit' id='rsubmit'>{processing ? 'Registering...' : 'Register'}</button>
                                </form>
                                <span>Already have an account? <a href='#' onClick={handleaccount}>Login</a></span>
                            </div>
                        }
                    </div>
                }
            </div>
        </>
    );
};

export default Account;