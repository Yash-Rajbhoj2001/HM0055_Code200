import '../Styles/Home.css';
import { motion } from 'framer-motion';
import { Link, useNavigate  } from 'react-router-dom';
import '../App.css';
import LearnMore from './LearnMore';
import React, { useEffect, useState } from 'react';
import CountUp from 'react-countup';
import axios from 'axios';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Home = () => {
  const navigate = useNavigate();
  const [patientCount, setPatientCount] = useState(0);

  // Increment patient count when the page loads
//   useEffect(() => {
//   const fetchPatientCount = async () => {
//     try {
//       const response = await axios.get('https://your-backend-api.com/patientCount');
//       setPatientCount(response.data.count); // Example: { count: 200 }
//     } catch (error) {
//       console.error('Error fetching patient count:', error);
//     }
//   };

//   fetchPatientCount();
// }, []);
  useEffect(() => {
    const storedCount = localStorage.getItem('patientCount');
    const count = storedCount ? parseInt(storedCount) + 1 : 1;
    setPatientCount(count);
    localStorage.setItem('patientCount', count);
  }, []);

  
    // Sample data - you would replace this with your actual patient data
    const [patientData] = useState({
      demographics: [
        { name: '0-18', value: 124 },
        { name: '19-35', value: 257 },
        { name: '36-50', value: 186 },
        { name: '51-65', value: 203 },
        { name: '65+', value: 165 }
      ],
      genderDistribution: [
        { name: 'Male', value: 450 },
        { name: 'Female', value: 470 },
        { name: 'Other', value: 15 }
      ],
      monthlyAdmissions: [
        { month: 'Jan', count: 45 },
        { month: 'Feb', count: 52 },
        { month: 'Mar', count: 38 },
        { month: 'Apr', count: 41 },
        { month: 'May', count: 47 },
        { month: 'Jun', count: 53 },
        { month: 'Jul', count: 58 },
        { month: 'Aug', count: 63 },
        { month: 'Sep', count: 49 },
        { month: 'Oct', count: 45 },
        { month: 'Nov', count: 43 },
        { month: 'Dec', count: 51 }
      ],
      diagnosticCategories: [
        { category: 'Cardiovascular', count: 145 },
        { category: 'Respiratory', count: 87 },
        { category: 'Digestive', count: 63 },
        { category: 'Endocrine', count: 42 },
        { category: 'Neurological', count: 39 },
        { category: 'Orthopedic', count: 56 },
        { category: 'Psychiatric', count: 28 },
        { category: 'Other', count: 45 }
      ],
      averageStayDuration: [
        { department: 'ICU', days: 5.2 },
        { department: 'Surgery', days: 3.8 },
        { department: 'Internal Medicine', days: 2.7 },
        { department: 'Pediatrics', days: 1.9 },
        { department: 'Oncology', days: 4.1 },
        { department: 'Neurology', days: 3.5 },
        { department: 'Cardiology', days: 3.2 }
      ],
      patientSatisfaction: [
        { month: 'Jan', score: 8.1 },
        { month: 'Feb', score: 8.3 },
        { month: 'Mar', score: 7.9 },
        { month: 'Apr', score: 8.5 },
        { month: 'May', score: 8.7 },
        { month: 'Jun', score: 8.2 },
        { month: 'Jul', score: 8.4 },
        { month: 'Aug', score: 8.6 },
        { month: 'Sep', score: 8.8 },
        { month: 'Oct', score: 8.3 },
        { month: 'Nov', score: 8.5 },
        { month: 'Dec', score: 8.7 }
      ]
    });


  const LearnMore = () => {
    navigate('/LearnMore');
  }
  

  return (
    <>
      <div className="hero-banner">
        <div className="hero-information-div">
          <motion.h1 
            className='medilog'
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.5 }}
          >
            WELCOME TO MEDILOG
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ delay: 0.3, duration: 0.5 }}>
            A seamless and efficient platform for managing medical data, ensuring accuracy, security, and easy access.
          </motion.p>

          <div className="features-container">
            <motion.div 
              className="feature-box blue-box"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <h2>Why Choose MEDILOG?</h2>
              <p>MediLog simplifies medical data management, enhances patient record-keeping, and ensures real-time access to critical information.</p>
              <button  onClick={LearnMore} className="learn-more-btn">Learn More</button>
            </motion.div>

            {/* 🔄 REPLACED BOX */}
            <motion.div 
              className="feature-box"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7, duration: 1.5 }}
            >
              <div className="count-number">
                <CountUp  start = {100} end={patientCount + 200 } duration={4} />+
              <h3>Total Patients Visited</h3>
              </div>
              <p>Connecting patients to better health through MediLog's innovative platform.</p>
            </motion.div>


            <motion.div 
              className="feature-box"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.5 }}
            >
              <span className="icon">🔒</span>
              <h3>Secure & Compliant</h3>
              <p>Ensuring data privacy and compliance with healthcare regulations through advanced encryption.</p>
            </motion.div>

            <motion.div 
              className="feature-box"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 0.5 }}
            >
              <span className="icon">⏳</span>
              <h3>Efficient Record Management</h3>
              <p>Quick access to medical records, prescriptions, and reports, reducing paperwork and saving time.</p>
            </motion.div>

            <motion.div
            className="features-c"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 0.5 }}
            >
            <h3>Monthly Patient Admissions</h3>
            <ResponsiveContainer width={1130} height={250}>
              <LineChart
                data={patientData.monthlyAdmissions}
                margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#8884d8" activeDot={{ r: 8}} />
              </LineChart>
            </ResponsiveContainer>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;

