import { useState, useEffect } from 'react';
import { ref, get, set, push } from 'firebase/database';
import db from '../firebase';
import '../Styles/Market.css';

const Market = () => {
  const [nearbyHospitals, setNearbyHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const hospitalId = localStorage.getItem('inscode');
  
  // Function to calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const d = R * c; // Distance in km
    return d;
  };
  
  const deg2rad = (deg) => {
    return deg * (Math.PI/180);
  };
  
  // Format date function
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };
  
  // Fetch current hospital location and nearby hospitals with requirements
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch the current hospital's location
        const hospitalRef = ref(db, `Hospital/${hospitalId}`);
        const hospitalSnapshot = await get(hospitalRef);
        
        if (!hospitalSnapshot.exists()) {
          console.error('Hospital not found');
          setLoading(false);
          return;
        }
        
        const hospitalData = hospitalSnapshot.val();
        const currentLocation = hospitalData.location || {};
        
        if (!currentLocation.latitude || !currentLocation.longitude) {
          console.error('Hospital location not found');
          setLoading(false);
          return;
        }
        
        // Fetch all hospitals
        const allHospitalsRef = ref(db, 'Hospital');
        const allHospitalsSnapshot = await get(allHospitalsRef);
        
        if (!allHospitalsSnapshot.exists()) {
          setLoading(false);
          return;
        }
        
        const hospitals = allHospitalsSnapshot.val();
        // console.log(hospitals);
        const nearbyHospitalsData = [];
        
        // Filter hospitals that are nearby (within 50km for example)
        // and have requirements
        const MAX_DISTANCE = 50; // in km
        
        for (const [id, hospital] of Object.entries(hospitals)) {
          // Skip the current hospital
          if (id === hospitalId) continue;
          
          // Skip hospitals without location
          if (!hospital.location?.latitude || !hospital.location?.longitude) continue;
          
          // Calculate distance
          const distance = calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            hospital.location.latitude,
            hospital.location.longitude
          );
          console.log(distance,hospital);
          // Check if within range and has requirements
          if (distance <= MAX_DISTANCE && hospital.Requirement) {
            const requirements = [];
            
            // Extract detailed requirements
            for (const [productName, reqData] of Object.entries(hospital.Requirement)) {
                console.log("Requirements for hospital", id, ":", hospital.Requirement);
              // The structure is Hospital/hospitalid/Requirement/Productname1/quantity/name/dateRequested
              console.log(productName);
              requirements.push({
                productName,
                quantity: reqData.quantity || 0,
                name: reqData.name || 'Not specified',
                dateRequested: reqData.dateRequested || null
              });
            }
            
            if (requirements.length > 0) {
              nearbyHospitalsData.push({
                id,
                name: hospital.name || `Hospital ${id}`,
                distance,
                requirements
              });
            }
          }
        }
        
        // Sort by distance
        nearbyHospitalsData.sort((a, b) => a.distance - b.distance);
        setNearbyHospitals(nearbyHospitalsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (hospitalId) {
      fetchData();
    }
  }, [hospitalId]);
  
  // Handle grant button click
  const handleGrant = async (hospitalId, productName, quantity) => {
    try {
      // Create a token with status false
      const tokenData = {
        fromHospitalId: localStorage.getItem('inscode'),
        productName,
        quantity,
        status: false,
        timestamp: Date.now()
      };
      
      // Create token in both hospitals
      const sourceTokenRef = ref(db, `Hospital/${localStorage.getItem('inscode')}/GrantedToken`);
      const sourceTokenKey = push(sourceTokenRef).key;
      
      const targetTokenRef = ref(db, `Hospital/${hospitalId}/GrantedToken`);
      
      // Use the same key for both locations
      await set(ref(db, `Hospital/${localStorage.getItem('inscode')}/GrantedToken/${sourceTokenKey}`), {
        ...tokenData,
        toHospitalId: hospitalId
      });
      
      await set(ref(db, `Hospital/${hospitalId}/GrantedToken/${sourceTokenKey}`), {
        ...tokenData,
        fromHospitalId: localStorage.getItem('inscode')
      });
      
      alert('Grant request submitted successfully!');
      
      // Refresh the data after granting
      window.location.reload();
    } catch (error) {
      console.error('Error granting request:', error);
      alert('Failed to grant request. Please try again.');
    }
  };
  
  return (
    <>
      <div>
        <div className='marketHeader'><p>Market</p></div>
        {loading ? (
          <div className='loading'>Loading nearby hospitals...</div>
        ) : nearbyHospitals.length === 0 ? (
          <div className='noData'>No nearby hospitals with requirements found</div>
        ) : (
          <div className='hospitalList'>
            {nearbyHospitals.map((hospital) => (
              <div key={hospital.id} className='hospitalRequest'>
                <div className='hospitalListData'>
                  <p>{hospital.id}</p>
                  <p>{hospital.name}</p>
                  <p className='distance'>{hospital.distance.toFixed(2)} km away</p>
                </div>
                <p style={{margin:'0px', marginLeft:'20px', marginTop:'10px', fontWeight:'bold', fontSize:'20px'}}>
                  Requirements
                </p>
                {hospital.requirements.map((req, index) => (
                  <div key={index} className='requirements'>
                    <div className='requirementDetails'>
                      <p style={{marginLeft:'10px'}}><strong>{req.productName}</strong></p>
                      <p>Quantity: {req.quantity}</p>
                      <p>Date: {formatDate(req.dateRequested)}</p>
                    </div>
                    <button onClick={() => handleGrant(hospital.id, req.productName, req.quantity)}>
                      Grant
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default Market;