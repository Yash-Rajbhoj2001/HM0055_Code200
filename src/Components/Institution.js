import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ref, get, onValue, set, push } from "firebase/database";
import db, { auth } from "../firebase";
import "../Styles/institution.css";
import Admin from "./Admin";
import '../App.css'
import Administrator from "./Administrator";
import logo from '../Assets/logo-main.png';

const Institute = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [predictedStock, setPredictedStock] = useState([]);
  const [predictedResources, setPredictedResources] = useState([]);
  
  // Get hospital code from location state
  const hospitalCode = location.state?.foundHospitalCode;
  
  const [hospitalData, setHospitalData] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // State for resource management
  const [resources, setResources] = useState([]);
  const [newResource, setNewResource] = useState({
    name: "",
    quantity: "",
    condition: "Good",
    lastMaintenance: "",
    nextMaintenance: ""
  });
  const [showResourceForm, setShowResourceForm] = useState(false);

  const [grantedTokens, setGrantedTokens] = useState([]);
  const [viewMode, setViewMode] = useState('received');


  useEffect(() => {
    if (hospitalCode) {
      const grantedTokensRef = ref(db, `Hospital/${hospitalCode}/GrantedToken`);
      onValue(grantedTokensRef, (snapshot) => {
        if (snapshot.exists()) {
          const tokensData = snapshot.val();
          const tokensList = Object.entries(tokensData).map(([id, data]) => ({
            id,
            ...data,
            // Add a flag to determine if this hospital is the sender or receiver
            isSender: data.hasOwnProperty('toHospitalId')
          }));
          setGrantedTokens(tokensList);
        } else {
          setGrantedTokens([]);
        }
      });
    }
  }, [hospitalCode]);

  const updateTokenStatus = async (tokenId, isSent) => {
    try {
      const tokenRef = ref(db, `Hospital/${hospitalCode}/GrantedToken/${tokenId}`);
      await set(tokenRef, {
        ...grantedTokens.find(token => token.id === tokenId),
        status: 'completed'
      });
      alert(`Token marked as ${isSent ? 'sent' : 'received'} successfully!`);
    } catch (error) {
      console.error("Error updating token status:", error);
      alert("Failed to update status. Please try again.");
    }
  };

  const renderRequestsSection = () => {
    return (
      <div className="requests-section">
        <div className="section-header">
          <h2>Requests</h2>
          <div className="view-toggle">
            <button 
              className={`toggle-button ${viewMode === 'received' ? 'active' : ''}`}
              onClick={() => setViewMode('received')}
            >
              Received
            </button>
            <button 
              className={`toggle-button ${viewMode === 'sent' ? 'active' : ''}`}
              onClick={() => setViewMode('sent')}
            >
              Sent
            </button>
          </div>
        </div>
  
        {grantedTokens.length === 0 ? (
          <div className="no-tokens-message">
            <p>No {viewMode} requests available.</p>
          </div>
        ) : (
          <div className="tokens-table-container">
            <table className="tokens-table">
              <thead>
                <tr>
                  <th>{viewMode === 'sent' ? 'To Hospital' : 'From Hospital'}</th>
                  <th>Product Name</th>
                  <th>Quantity</th>
                  <th>Status</th>
                  <th>Timestamp</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {grantedTokens
                  .filter(token => (viewMode === 'sent' ? token.isSender : !token.isSender))
                  .map((token) => (
                    <tr key={token.id}>
                      <td>{viewMode === 'sent' ? token.toHospitalId : token.fromHospitalId}</td>
                      <td>{token.productName}</td>
                      <td>{token.quantity}</td>
                      <td>
                        <span className={`status-badge ${token.status}`}>
                          {token.status}
                        </span>
                      </td>
                      <td>{new Date(token.timestamp).toLocaleString()}</td>
                      <td>
                        {token.status !== 'completed' && (
                          <button 
                            className="action-button"
                            onClick={() => updateTokenStatus(token.id, viewMode === 'sent')}
                          >
                            {viewMode === 'sent' ? 'Mark as Sent' : 'Mark as Received'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };
  
  useEffect(() => {
    const fetchPredictions = async () => {
        try {
            const predictedRef = ref(db, `Hospital/${hospitalCode}/PredictedStock`);
            const snapshot = await get(predictedRef);

            if (snapshot.exists()) {
                setPredictedStock(snapshot.val().predictions || []);
            } else {
                console.warn("No predicted stock data available.");
            }
        } catch (error) {
            console.error("Error fetching predicted stock:", error);
        }
    };

    fetchPredictions();
  }, [hospitalCode]);

  // Fetch resources
  useEffect(() => {
    if (hospitalCode) {
      const resourcesRef = ref(db, `Hospital/${hospitalCode}/Resources`);
      onValue(resourcesRef, (snapshot) => {
        if (snapshot.exists()) {
          const resourcesData = snapshot.val();
          const resourcesList = Object.entries(resourcesData).map(([id, data]) => ({
            id,
            ...data
          }));
          setResources(resourcesList);
        } else {
          setResources([]);
        }
      });
    }
  }, [hospitalCode]);

  useEffect(() => {
    // Redirect if no hospital code is found
    if (!hospitalCode) {
      navigate("/");
      return;
    }

    const fetchHospitalData = async () => {
      try {
        // Get hospital data
        const hospitalRef = ref(db, `Hospital/${hospitalCode}`);
        onValue(hospitalRef, (snapshot) => {
          if (snapshot.exists()) {
            setHospitalData(snapshot.val());
            // Call this function when needed (e.g., on dashboard load)
            checkStockAndPredict(); 
            checkEquipmentAndPredict();
          } else {
            setError("Hospital not found");
            navigate("/");
          }
        });

        // Get doctors associated with this hospital
        const hospitalDoctorsRef = ref(db, `Hospital/${hospitalCode}/Doctor`);
        onValue(hospitalDoctorsRef, async (snapshot) => {
          if (snapshot.exists()) {
            const doctorIds = snapshot.val();
            const doctorPromises = Object.values(doctorIds).map(async (doctorId) => {
              const doctorRef = ref(db, `doctor/${doctorId}`);
              const doctorSnapshot = await get(doctorRef);
              if (doctorSnapshot.exists()) {
                return { id: doctorId, ...doctorSnapshot.val() };
              }
              return null;
            });

            const doctorsList = await Promise.all(doctorPromises);
            setDoctors(doctorsList.filter(doctor => doctor !== null));
          }
          setLoading(false);
        }, {
          onError: (error) => {
            console.error("Error fetching doctors:", error);
            setLoading(false);
            // If no doctors are found, just continue with empty array
          }
        });
      } catch (error) {
        console.error("Error fetching data:", error);
        setError("Error fetching data");
        setLoading(false);
      }
    };

    fetchHospitalData();

    // Check authentication
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        navigate("/");
      }
    });

    return () => unsubscribe();
  }, [hospitalCode, navigate]);

  const predictMedicineDemand = async (hospitalCode) => {
    try {
        const stockRef = ref(db, `Hospital/${hospitalCode}/StockReport`);
        const stockSnapshot = await get(stockRef);

        if (!stockSnapshot.exists()) {
            console.warn("No stock data available.");
            return;
        }

        const stockData = stockSnapshot.val();
        const currentDate = new Date();

        let medicineUsage = [];

        for (const [medicineName, data] of Object.entries(stockData)) {
            if (!data.dateAdded || !data.remainingQuantity || !data.addedQuantity) {
                console.warn(`Missing data for ${medicineName}`);
                continue;
            }

            const purchaseDate = new Date(data.dateAdded);
            const daysPassed = Math.max((currentDate - purchaseDate) / (1000 * 60 * 60 * 24), 1);
            const dailyUsage = (data.addedQuantity - data.remainingQuantity) / daysPassed;

            medicineUsage.push({
                name: medicineName,
                dailyUsage: dailyUsage.toFixed(2),
                remainingStock: data.remainingQuantity,
            });
        }

        if (medicineUsage.length === 0) {
            console.warn("No valid medicine usage data available.");
            return;
        }

        // **Improved AI Prompt**
        const aiPrompt = `
        Analyze the medicine stock trends and predict future demand for the next 30 days.
        Ensure the response is **strictly** valid JSON with this structure:
        {
            "predictions": [
                { "medicine": "Medicine Name", "predictedQuantity": 50 },
                { "medicine": "Another Medicine", "predictedQuantity": 20 }
            ]
        }
        Do not include any explanations or extra text.
        Here is the medicine usage data:
        ${JSON.stringify(medicineUsage, null, 2)}
        `;

        // Call Google Gemini API
        const response = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyCBMuRcsjTaJXsZ01MtRZh8yHtVXmUuMSw",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ role: "user", parts: [{ text: aiPrompt }] }]
                })
            }
        );

        const data = await response.json();
        if (!data?.candidates?.[0]?.content?.parts?.[0]?.text) {
            throw new Error("No prediction received from Gemini.");
        }

        // **Ensure Safe JSON Parsing**
        let rawResponse = data.candidates[0].content.parts[0].text;

        // **Fix Possible Invalid Formatting**
        rawResponse = rawResponse.replace(/```json|```/g, '').trim(); // Remove Markdown JSON formatting if present

        let predictedStock;
        try {
            predictedStock = JSON.parse(rawResponse);
        } catch (jsonError) {
            console.error("Invalid JSON response from Gemini:", rawResponse);
            throw new Error("Gemini response is not valid JSON.");
        }

        // **Fallback: Ensure Predictions Exist**
        if (!predictedStock.predictions || predictedStock.predictions.length === 0) {
            console.warn("No valid predictions from Gemini. Generating fallback predictions.");
            predictedStock = {
                predictions: medicineUsage.map((med) => ({
                    medicine: med.name,
                    predictedQuantity: Math.max(Math.ceil(med.dailyUsage * 30), 1), // Rough estimate
                })),
            };
        }

        // Store predictions in Firebase
        const predictedRef = ref(db, `Hospital/${hospitalCode}/PredictedStock`);
        await set(predictedRef, predictedStock);

        console.log("Predicted stock updated:", predictedStock);
        return predictedStock;

    } catch (error) {
        console.error("Error predicting medicine demand:", error);
        return null;
    }
  };

  const checkStockAndPredict = async () => {
    const inscode = localStorage.getItem("inscode");
    const predictions = await predictMedicineDemand(inscode);

    if (!predictions) return;

    const lowStockMedicines = Object.entries(predictions).filter(([_, qty]) => qty < 5); // Example: Alert for low stock

    if (lowStockMedicines.length > 0) {
        alert(`⚠️ Low stock alert for: ${lowStockMedicines.map(([name]) => name).join(", ")}`);
    }
  };

  const predictEquipmentDemand = async (hospitalCode) => {
    try {
      const resourcesRef = ref(db, `Hospital/${hospitalCode}/Resources`);
      const snapshot = await get(resourcesRef);
  
      if (!snapshot.exists()) {
        console.warn("No resource data available.");
        setPredictedResources([]); // Set to empty array if no data
        return null;
      }
  
      const resourcesData = snapshot.val();
      const currentDate = new Date();
  
      let resourceUsage = [];
  
      for (const [resourceId, data] of Object.entries(resourcesData)) {
        if (!data.name || !data.quantity) {
          console.warn(`Missing required data for resource ${resourceId}`);
          continue;
        }
  
        // Use default values for missing data points
        const addedDate = data.dateAdded ? new Date(data.dateAdded) : new Date(currentDate - 30*24*60*60*1000); // Default to 30 days ago
        const daysPassed = Math.max((currentDate - addedDate) / (1000 * 60 * 60 * 24), 1);
        
        // Simplified usage calculation with fallback values
        const dailyUsage = 1; // Default daily usage assumption
  
        resourceUsage.push({
          id: resourceId,
          name: data.name,
          dailyUsage: dailyUsage.toFixed(2),
          remainingQuantity: data.quantity,
          condition: data.condition || "Good"
        });
      }
  
      if (resourceUsage.length === 0) {
        console.warn("No valid resource usage data available.");
        setPredictedResources([]); // Set to empty array if no valid data
        return null;
      }
  
      // Create fallback predictions directly if no valid usage data
      const generatedPredictions = {
        predictions: resourceUsage.map((res) => ({
          resource: res.name,
          predictedQuantity: Math.max(Math.ceil(res.dailyUsage * 30), 1)
        }))
      };
  
      try {
        // **Simplified AI Prompt**
        const aiPrompt = `
        Analyze this medical equipment data and predict quantities needed for 30 days.
        Return only valid JSON in this format:
        {"predictions":[{"resource":"Name","predictedQuantity":50}]}
        Data: ${JSON.stringify(resourceUsage, null, 2)}
        `;
  
        // Add timeout to the fetch request
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
  
        // Call Google Gemini API with timeout
        const response = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyCBMuRcsjTaJXsZ01MtRZh8yHtVXmUuMSw",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: aiPrompt }] }]
            }),
            signal: controller.signal
          }
        );
  
        clearTimeout(timeoutId);
  
        if (!response.ok) {
          throw new Error(`API response not OK: ${response.status} ${response.statusText}`);
        }
  
        const data = await response.json();
        
        // Check if we have a valid response structure
        if (!data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          console.warn("Incomplete response from Gemini, using fallback predictions");
          throw new Error("Invalid response structure from Gemini");
        }
  
        // **Parse the response more carefully**
        let rawResponse = data.candidates[0].content.parts[0].text;
        rawResponse = rawResponse.replace(/```json|```/g, '').trim();
  
        // More robust JSON extraction (find the first { and last })
        const jsonStartIndex = rawResponse.indexOf('{');
        const jsonEndIndex = rawResponse.lastIndexOf('}') + 1;
        
        if (jsonStartIndex === -1 || jsonEndIndex === 0) {
          throw new Error("Cannot find valid JSON in response");
        }
        
        const jsonString = rawResponse.substring(jsonStartIndex, jsonEndIndex);
        let predictedResources = JSON.parse(jsonString);
  
        // Validate the structure
        if (!predictedResources.predictions || !Array.isArray(predictedResources.predictions)) {
          throw new Error("Response missing predictions array");
        }
  
        // Store predictions in Firebase
        const predictedRef = ref(db, `Hospital/${hospitalCode}/PredictedResources`);
        await set(predictedRef, predictedResources);
  
        // Update state with predicted resources
        setPredictedResources(predictedResources.predictions);
  
        console.log("Predicted resources updated:", predictedResources);
        return predictedResources;
  
      } catch (apiError) {
        console.warn("Error with Gemini API, using fallback predictions:", apiError);
        
        // Store fallback predictions in Firebase
        const predictedRef = ref(db, `Hospital/${hospitalCode}/PredictedResources`);
        await set(predictedRef, generatedPredictions);
        
        // Update state with fallback predictions
        setPredictedResources(generatedPredictions.predictions);
        
        console.log("Using fallback predictions:", generatedPredictions);
        return generatedPredictions;
      }
  
    } catch (error) {
      console.error("Error predicting resource demand:", error);
      setPredictedResources([]); // Set to empty array on error
      return null;
    }
  };

// Implement exponential backoff for API calls
const callWithBackoff = async (apiFunction, params, maxRetries = 3) => {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      return await apiFunction(params);
    } catch (error) {
      if (error.message.includes('429') || error.message.includes('Too Many Requests')) {
        retries++;
        // Exponential backoff: wait longer with each retry
        const delay = 2 ** retries * 1000;
        console.log(`Rate limited. Retrying in ${delay}ms (${retries}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error; // If it's not a rate limit error, pass it up
      }
    }
  }
  throw new Error("Maximum retries exceeded for API call");
};

// Modified check function with better error handling
const checkEquipmentAndPredict = async () => {
  const inscode = localStorage.getItem("inscode");
  try {
    // Use a queue system by running predictions sequentially
    // First predict medicines
    try {
      const medicinePredictions = await callWithBackoff(predictMedicineDemand, inscode);
      if (medicinePredictions) {
        const lowStockMedicines = Object.entries(medicinePredictions)
          .filter(([_, qty]) => qty < 5);
        
        if (lowStockMedicines.length > 0) {
          // Use a more graceful notification system instead of alerts
          displayNotification(`Low stock alert for: ${lowStockMedicines.map(([name]) => name).join(", ")}`);
        }
      }
    } catch (error) {
      console.error("Medicine prediction failed:", error);
      // Continue with equipment prediction even if medicine prediction fails
    }
    
    // Then predict equipment
    try {
      const equipmentPredictions = await callWithBackoff(predictEquipmentDemand, inscode);
      if (equipmentPredictions) {
        const lowStockResources = Object.entries(equipmentPredictions)
          .filter(([_, qty]) => qty < 5);
        
        if (lowStockResources.length > 0) {
          displayNotification(`Low stock alert for resources: ${lowStockResources.map(([name]) => name).join(", ")}`);
        }
      }
    } catch (error) {
      console.error("Equipment prediction failed:", error);
    }
  } catch (error) {
    console.error("Error in prediction system:", error);
    // Handle the error gracefully - perhaps show a small error notification
    displayErrorNotification("Prediction system temporarily unavailable");
  }
};

// Replace alerts with a more user-friendly notification system
const displayNotification = (message) => {
  // Implement a toast or in-app notification instead of alert
  console.log("NOTIFICATION:", message);
  // Example: toast.warning(message);
};

const displayErrorNotification = (message) => {
  console.log("ERROR:", message);
  // Example: toast.error(message);
};

  // Handle adding a new resource
  const handleAddResource = async (e) => {
    e.preventDefault();
    try {
      const resourcesRef = ref(db, `Hospital/${hospitalCode}/Resources`);
      const newResourceData = {
        ...newResource,
        dateAdded: new Date().toISOString(),
      };
      
      await push(resourcesRef, newResourceData);
      
      // Reset form
      setNewResource({
        name: "",
        quantity: "",
        condition: "Good",
        lastMaintenance: "",
        nextMaintenance: ""
      });
      
      setShowResourceForm(false);
      alert("Resource added successfully!");
    } catch (error) {
      console.error("Error adding resource:", error);
      alert("Failed to add resource. Please try again.");
    }
  };

  // Handle updating resource
  const handleUpdateResource = async (resourceId, updatedData) => {
    try {
      const resourceRef = ref(db, `Hospital/${hospitalCode}/Resources/${resourceId}`);
      await set(resourceRef, {
        ...updatedData,
        lastUpdated: new Date().toISOString(),
      });
      alert("Resource updated successfully!");
    } catch (error) {
      console.error("Error updating resource:", error);
      alert("Failed to update resource. Please try again.");
    }
  };

  const handleLogout = () => {
    auth.signOut();
    navigate("/");
  };
  const handleMarket =() => {
    navigate('/Market');
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading hospital information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>{error}</p>
        <button onClick={() => navigate("/")}>Go Back</button>
      </div>
    );
  }
  const handleRequest = async (resourceName, predictedQuantity) => {
    const inscode = localStorage.getItem("inscode");
    if (!inscode) {
      alert("Hospital code not found. Please log in again.");
      return;
    }
  
    try {
      const requirementRef = ref(db, `Hospital/${inscode}/Requirement/${resourceName}`);
      await set(requirementRef, {
        name: resourceName,
        quantity: predictedQuantity,
        dateRequested: new Date().toISOString(),
      });
      alert(`Request for ${resourceName} added successfully!`);
    } catch (error) {
      console.error("Error adding request:", error);
      alert("Failed to add request. Please try again.");
    }
  };

  const handleDelete = async (resourceName) => {
    const inscode = localStorage.getItem("inscode");
    if (!inscode) {
      alert("Hospital code not found. Please log in again.");
      return;
    }
  
    try {
      const requirementRef = ref(db, `Hospital/${inscode}/Requirement/${resourceName}`);
      await set(requirementRef, null); // Set to null to delete the entry
      alert(`Request for ${resourceName} deleted successfully!`);
    } catch (error) {
      console.error("Error deleting request:", error);
      alert("Failed to delete request. Please try again.");
    }
  };

  const handleRequestMedicine = async (medicineName, predictedQuantity) => {
    const inscode = localStorage.getItem("inscode");
    if (!inscode) {
      alert("Hospital code not found. Please log in again.");
      return;
    }
  
    try {
      const requirementRef = ref(db, `Hospital/${inscode}/Requirement/${medicineName}`);
      await set(requirementRef, {
        name: medicineName,
        quantity: predictedQuantity,
        dateRequested: new Date().toISOString(),
      });
      alert(`Request for ${medicineName} added successfully!`);
    } catch (error) {
      console.error("Error adding medicine request:", error);
      alert("Failed to add medicine request. Please try again.");
    }
  };

  const handleDeleteMedicine = async (medicineName) => {
    const inscode = localStorage.getItem("inscode");
    if (!inscode) {
      alert("Hospital code not found. Please log in again.");
      return;
    }
  
    try {
      const requirementRef = ref(db, `Hospital/${inscode}/Requirement/${medicineName}`);
      await set(requirementRef, null); // Set to null to delete the entry
      alert(`Request for ${medicineName} deleted successfully!`);
    } catch (error) {
      console.error("Error deleting medicine request:", error);
      alert("Failed to delete medicine request. Please try again.");
    }
  };

  return (
    <div className="institution-container">
      <header className="institution-header">
      <div className='logo-div'>
          <img src={logo} className='App-logo' alt='logo' />
          <h1>MEDILOG</h1>
        </div>
        <div className="institution-header-content">
          {/* <h1>{hospitalData?.hospitalName}</h1> */}
          <h1>{hospitalData.hospitalName}</h1>
        </div>
        <div>
        <button className="logout-button" style={{marginRight:'20px'}}  onClick={handleLogout}>
            Logout
        </button>
        <button className="logout-button"style={{marginRight:'20px'}}  onClick={handleMarket}>
          Market
        </button>
        </div>
      </header>

      <div className="institution-content">
        <div className="institution-info-card">
          <h2>Hospital Information</h2>
          <div className="institution-details">
            <div className="detail-item">
              <span className="detail-label">Hospital Code:</span>
              <span className="detail-value">{hospitalCode}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Phone:</span>
              <span className="detail-value">{hospitalData?.phone}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Email:</span>
              <span className="detail-value">{hospitalData?.email}</span>
            </div>
          </div>
        </div>
        <div className="doctors-section">
          <div className="doctors-header">
            <h2>Doctors</h2>
            <span className="doctor-count">{doctors.length} doctors</span>
          </div>

          {doctors.length === 0 ? (
            <div className="no-doctors-message">
              <p>No doctors are currently associated with this hospital.</p>
            </div>
          ) : (
            <div className="doctors-grid">
              {doctors.map((doctor) => (
                <div key={doctor.id} className="doctor-card">
                  <div className="doctor-avatar">
                    <span>{doctor.firstname?.charAt(0) || "D"}</span>
                  </div>
                  <div className="doctor-info">
                    <h3>{doctor.firstname}</h3>
                    <p className="doctor-specialty">{doctor.specialisation || "General Practitioner"} </p>
                    <p className="doctor-specialty">Doctor Id :{doctor.doctorid}</p>
                    <p className="doctor-details">Email : {doctor.email}</p>
                    <p className="doctor-details">Contact : {doctor.contact}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {renderRequestsSection()}
      {/* Resource Management Section */}
      <div className="resource-management-section">
        <div className="resource-header">
          <h2>Medical Equipment & Resources</h2>
          <button 
            className="add-resource-button"
            onClick={() => setShowResourceForm(!showResourceForm)}
          >
            {showResourceForm ? 'Cancel' : 'Add New Resource'}
          </button>
        </div>

        {showResourceForm && (
          <div className="resource-form-container">
            <form onSubmit={handleAddResource} className="resource-form">
              <div className="form-group">
                <label>Resource Name:</label>
                <input
                  type="text"
                  value={newResource.name}
                  onChange={(e) => setNewResource({...newResource, name: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Quantity:</label>
                <input
                  type="number"
                  value={newResource.quantity}
                  onChange={(e) => setNewResource({...newResource, quantity: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Condition:</label>
                <select
                  value={newResource.condition}
                  onChange={(e) => setNewResource({...newResource, condition: e.target.value})}
                >
                  <option value="Excellent">Excellent</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                  <option value="Poor">Poor</option>
                  <option value="Needs Replacement">Needs Replacement</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Last Maintenance Date:</label>
                <input
                  type="date"
                  value={newResource.lastMaintenance}
                  onChange={(e) => setNewResource({...newResource, lastMaintenance: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>Next Maintenance Date:</label>
                <input
                  type="date"
                  value={newResource.nextMaintenance}
                  onChange={(e) => setNewResource({...newResource, nextMaintenance: e.target.value})}
                />
              </div>
              
              <button type="submit" className="submit-resource-button">Add Resource</button>
            </form>
          </div>
        )}

        {resources.length === 0 ? (
          <div className="no-resources-message">
            <p>No medical equipment or resources have been added yet.</p>
          </div>
        ) : (
          <div className="resources-table-container">
            <table className="resources-table">
              <thead>
                <tr>
                  <th>Resource Name</th>
                  <th>Quantity</th>
                  <th>Condition</th>
                  <th>Last Maintenance</th>
                  <th>Next Maintenance</th>
                  <th>Request Resource</th>
                </tr>
              </thead>
              <tbody>
                {resources.map((resource) => (
                  <tr key={resource.id}>
                    <td>{resource.name}</td>
                    <td>{resource.quantity}</td>
                    <td>
                      <span className={`condition-badge ${resource.condition.toLowerCase().replace(/\s+/g, '-')}`}>
                        {resource.condition}
                      </span>
                    </td>
                    <td>{resource.lastMaintenance || 'N/A'}</td>
                    <td>{resource.nextMaintenance || 'N/A'}</td>
                    <td>
                      <button 
                        className="update-resource-button"
                        onClick={() => {
                          const newQuantity = prompt("Enter new quantity:", resource.quantity);
                          if (newQuantity !== null) {
                            handleUpdateResource(resource.id, {
                              ...resource,
                              quantity: newQuantity
                            });
                          }
                        }}
                      >
                        Update
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="Institutuion-actions">
      </div>
      <div style={{paddingBottom:'20px'}}>
            <Admin/>
            <Administrator/>
      </div>
      <div className="ResourcePrediction" style={{display:'flex',justifyContent:'center'}}>
          <div className="medicinePrediction">
              <div className="prediction-container">
                <h2 className="prediction-title">Predicted Medicine Demand</h2>
                {predictedStock.length === 0 ? (
                    <p className="text-gray-600 text-center">No predictions available.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="prediction-table">
                          <thead>
                            <tr>
                              <th>Medicine Name</th>
                              <th>Predicted Quantity</th>
                              <th>Actions</th> {/* New column for buttons */}
                            </tr>
                          </thead>
                          <tbody>
                            {predictedStock.map((item, index) => (
                              <tr key={index}>
                                <td>{item.medicine}</td>
                                <td className="predicted-quantity">{item.predictedQuantity}</td>
                                <td>
                                  <button 
                                    className="request-button"
                                    onClick={() => handleRequestMedicine(item.medicine, item.predictedQuantity)}
                                  >
                                    Request
                                  </button>
                                  <button 
                                    className="delete-button"
                                    onClick={() => handleDeleteMedicine(item.medicine)}
                                  >
                                    Delete
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                    </div>
                )}
            </div>
          </div>
      </div>
      <div className="resourcePrediction">
        <div className="prediction-container">
          <h2 className="prediction-title">Predicted Equipment Demand</h2>
          {predictedResources?.length === 0 ? ( // Use optional chaining
            <p className="text-gray-600 text-center">No predictions available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="prediction-table">
              <thead>
                <tr>
                  <th>Resource Name</th>
                  <th>Predicted Quantity</th>
                  <th>Actions</th> {/* New column for buttons */}
                </tr>
              </thead>
              <tbody>
                {(predictedResources || []).map((item, index) => (
                  <tr key={index}>
                    <td>{item.resource}</td>
                    <td className="predicted-quantity">{item.predictedQuantity}</td>
                    <td>
                      <button 
                        className="request-button"
                        onClick={() => handleRequest(item.resource, item.predictedQuantity)}
                      >
                        Request
                      </button>
                      <button 
                        className="delete-button"
                        onClick={() => handleDelete(item.resource)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Institute;
