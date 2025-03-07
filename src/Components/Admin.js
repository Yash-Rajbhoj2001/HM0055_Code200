import { useEffect, useState } from 'react';
import '../App.css';
import '../Styles/Admin.css';
import db from '../firebase';
import { ref, get, update } from 'firebase/database';

const Admin = () => {
    const [appointmentData, setAppointmentData] = useState(null);
    const [appointCode, setAppointCode] = useState('');
    const [medicines, setMedicines] = useState([]);
    const [selectedMedicine, setSelectedMedicine] = useState('');
    const [quantity, setQuantity] = useState('');
    const [addedMedicines, setAddedMedicines] = useState([]);
    const [medicineStock, setMedicineStock] = useState({});

    useEffect(() => {
        fetchMedicines();
    }, []);

    const fetchMedicines = async () => {
        try {
            const inscode = localStorage.getItem('inscode');
            const medicineRef = ref(db, `Hospital/${inscode}/medicine/`);
            const snapshot = await get(medicineRef);
            if (snapshot.exists()) {
                const medData = snapshot.val();
                setMedicines(Object.keys(medData));
                
                // Store the stock information for each medicine
                const stockInfo = {};
                Object.entries(medData).forEach(([name, data]) => {
                    stockInfo[name] = data.quantity || 0;
                });
                setMedicineStock(stockInfo);
            }
        } catch (error) {
            console.error("Error fetching medicines:", error);
        }
    };

    const handleChange = (e) => {
        setAppointCode(e.target.value);
    };

    const fetchAppointment = async () => {
        if (appointCode.length > 1) {
            try {
                const appointmentRef = ref(db, `Appointment/${appointCode}`);
                const snapshot = await get(appointmentRef);
                if (snapshot.exists()) {
                    setAppointmentData(snapshot.val());
                    // Check if medicines exist and convert to array if they do
                    if (snapshot.val().medicines) {
                        const medicinesArray = Object.entries(snapshot.val().medicines).map(([name, data]) => ({
                            name,
                            ...data
                        }));
                        setAddedMedicines(medicinesArray);
                    } else {
                        setAddedMedicines([]);
                    }
                } else {
                    setAppointmentData(null);
                    setAddedMedicines([]);
                    alert("Appointment not found!");
                }
            } catch (error) {
                console.error("Error fetching appointment:", error);
                alert("Error fetching appointment data");
            }
        } else {
            alert("Please enter a valid appointment code");
        }
    };

    const handleAddMedicine = async () => {
        if (!appointmentData) {
            alert("Please fetch appointment details first");
            return;
        }
        
        if (!selectedMedicine || !quantity || quantity <= 0) {
            alert("Please select a medicine and enter a valid quantity.");
            return;
        }
        
        try {
            const inscode = localStorage.getItem('inscode');
            const medicineRef = ref(db, `Hospital/${inscode}/medicine/${selectedMedicine}`);
            const snapshot = await get(medicineRef);
            
            if (snapshot.exists()) {
                const medicineData = snapshot.val();
                const requestedQuantity = parseInt(quantity, 10);
                
                if (medicineData.quantity >= requestedQuantity) {
                    // Check if medicine already exists in the list
                    const existingIndex = addedMedicines.findIndex(med => med.name === selectedMedicine);
                    
                    if (existingIndex !== -1) {
                        // Update existing medicine
                        const updatedMedicines = [...addedMedicines];
                        const newQuantity = parseInt(updatedMedicines[existingIndex].quantity, 10) + requestedQuantity;
                        updatedMedicines[existingIndex].quantity = newQuantity;
                        setAddedMedicines(updatedMedicines);
                    } else {
                        // Add new medicine
                        setAddedMedicines([...addedMedicines, {
                            name: selectedMedicine,
                            quantity: requestedQuantity,
                            batchNumber: medicineData.batchNumber || 'N/A',
                            brand: medicineData.brand || 'N/A',
                            expiryDate: medicineData.expiryDate || 'N/A',
                            sellPrice: medicineData.sellPrice || 0
                        }]);
                    }
                    
                    // Reset selection after adding
                    setSelectedMedicine('');
                    setQuantity('');
                } else {
                    alert(`Insufficient stock! Only ${medicineData.quantity} available.`);
                }
            } else {
                alert("Medicine not found in database!");
            }
        } catch (error) {
            console.error("Error fetching medicine data:", error);
            alert("Error adding medicine: " + error.message);
        }
    };

    const handleDeleteMedicine = (index) => {
        const updatedMedicines = [...addedMedicines];
        updatedMedicines.splice(index, 1);
        setAddedMedicines(updatedMedicines);
    };

    const handleConfirmUpload = async () => {
        if (addedMedicines.length === 0) {
            alert("No medicines to upload.");
            return;
        }
    
        try {
            const inscode = localStorage.getItem("inscode");
            const updates = {};
    
            for (const med of addedMedicines) {
                const medicinePath = `Hospital/${inscode}/medicine/${med.name}`;
                const stockPath = `Hospital/${inscode}/StockReport/${med.name}`;
                const appointmentMedPath = `Appointment/${appointCode}/medicines/${med.name}`;
    
                // Get current medicine data
                const medicineRef = ref(db, medicinePath);
                const medicineSnapshot = await get(medicineRef);
                
                if (!medicineSnapshot.exists()) {
                    alert(`Medicine ${med.name} no longer exists in inventory!`);
                    continue;
                }
                
                const medicineData = medicineSnapshot.val();
                const currentQuantity = medicineData.quantity || 0;
                const requestedQuantity = parseInt(med.quantity, 10);
                
                if (currentQuantity < requestedQuantity) {
                    alert(`Not enough stock for ${med.name}. Only ${currentQuantity} available.`);
                    continue;
                }
                
                const newQuantity = Math.max(currentQuantity - requestedQuantity, 0);
                
                // Prepare batch updates
                updates[`${medicinePath}/quantity`] = newQuantity;
                updates[`${stockPath}/remainingQuantity`] = newQuantity;
                updates[`${stockPath}/lastUpdated`] = new Date().toISOString();
                updates[appointmentMedPath] = {
                    name: med.name,
                    quantity: requestedQuantity,
                    batchNumber: med.batchNumber || medicineData.batchNumber || 'N/A',
                    brand: med.brand || medicineData.brand || 'N/A',
                    expiryDate: med.expiryDate || medicineData.expiryDate || 'N/A',
                    sellPrice: med.sellPrice || medicineData.sellPrice || 0
                };
            }
            
            // Perform all updates in a single batch
            await update(ref(db), updates);
            
            // Update local state
            await fetchMedicines(); // Refresh medicine stock data
            setAddedMedicines([]); // Clear the added medicines list
            alert("Medicines updated successfully!");
            
            // Refresh appointment data to show updated medicines
            await fetchAppointment();
            
        } catch (error) {
            console.error("Error updating medicine data:", error);
            alert("Failed to update medicines: " + error.message);
        }
    };

    return (
        <>
            <div className="admin">
                <h2 style={{color: '#0ea5e9', fontSize: '1.75rem',marginLeft:'20px',paddingTop:'20px'}}>Issue Medicine</h2>
                <div className="medical-patient-search">
                    <p>Appointment Number</p>
                    <input
                        type="text"
                        placeholder="Appointment Number"
                        value={appointCode}
                        onChange={handleChange}
                    />
                    <button onClick={fetchAppointment}>Fetch</button>
                </div>
                {appointmentData && (
                    <div className="medical-data">
                        <h3>Appointment Details</h3>
                        <p><strong>Doctor ID:</strong> {appointmentData.doctorID}</p>
                        <p><strong>Patient ID:</strong> {appointmentData.patientID}</p>
                        <p><strong>Date:</strong> {appointmentData.date}</p>
                    </div>
                )}
                <div className='Add-medicine'>
                    <h3>Add Medicine to Appointment</h3>
                    <select 
                        value={selectedMedicine}
                        onChange={(e) => setSelectedMedicine(e.target.value)}
                        disabled={!appointmentData}
                    >
                        <option value="">Select Medicine</option>
                        {medicines.map((med) => (
                            <option key={med} value={med}>
                                {med} {medicineStock[med] !== undefined ? `(Stock: ${medicineStock[med]})` : ''}
                            </option>
                        ))}
                    </select>
                    <input
                        type="number"
                        placeholder="Quantity"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        disabled={!appointmentData}
                        min="1"
                    />
                    <button 
                        onClick={handleAddMedicine} 
                        disabled={!appointmentData}
                    >
                        Add
                    </button>
                </div>
                <div className='added-medicine'>
                    <h3>Added Medicines</h3>
                    {addedMedicines.length > 0 ? (
                        <>
                            <div className='entries'>
                                <p>Medicine Name</p>
                                <p>Quantity</p>
                                <p>Batch Number</p>
                                <p>Brand</p>
                                <p>Expiry Date</p>
                                <p>Sell Price</p>
                                <p>Actions</p>
                            </div>
                            {addedMedicines.map((med, index) => (
                                <div key={index} className='entries'>
                                    <p>{med.name}</p>
                                    <p>{med.quantity}</p>
                                    <p>{med.batchNumber || 'N/A'}</p>
                                    <p>{med.brand || 'N/A'}</p>
                                    <p>{med.expiryDate || 'N/A'}</p>
                                    <p>{med.sellPrice || 0}</p>
                                    <p>
                                        <button 
                                            onClick={() => handleDeleteMedicine(index)}
                                            className="delete-btn"
                                        >
                                            Delete
                                        </button>
                                    </p>
                                </div>
                            ))}
                        </>
                    ) : (
                        <p>No medicines added yet</p>
                    )}
                    {addedMedicines.length > 0 && 
                        <button 
                            onClick={handleConfirmUpload}
                            className="confirm-upload-btn"
                        >
                            Confirm Upload
                        </button>
                    }
                </div>
            </div>
        </>
    );
};

export default Admin;