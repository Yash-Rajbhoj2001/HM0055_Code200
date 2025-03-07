import { useState, useEffect } from 'react';
import db from '../firebase';
import { ref, set, get } from 'firebase/database';
import '../Styles/Administator.css';
import '../App.css';

const Administrator = () => {
    const [unitType, setUnitType] = useState('quantity');
    const [display, setDisplay] = useState(false);
    const [medicines, setMedicines] = useState([]);
    const [stockVisible, setStockVisible] = useState(false);
    const [stockData, setStockData] = useState([]);
    const [medicineData, setMedicineData] = useState({
        name: '',
        brand: '',
        type: 'Tablet',
        quantity: '',
        batchNumber: '',
        expiryDate: '',
        costPrice: '',
        sellPrice: ''
    });

    // Function to fetch stock data from Firebase
    const fetchStockData = async () => {
        try {
            const inscode = localStorage.getItem('inscode');
            const medicineRef = ref(db, `Hospital/${inscode}/medicine`);
            const snapshot = await get(medicineRef);
            
            if (snapshot.exists()) {
                const data = snapshot.val();
                const medicineArray = Object.values(data);
                setStockData(medicineArray);
            } else {
                setStockData([]);
            }
        } catch (error) {
            console.error("Error fetching stock data: ", error);
        }
    };

    // Function to handle medicine type selection and set unit type
    const checkType = (event) => {
        const selectedType = event.target.value;
        let unit = "quantity";

        switch (selectedType) {
            case "Tablet":
            case "Capsule":
                unit = "mg";
                break;
            case "Syrup":
            case "Injection":
                unit = "ml";
                break;
            default:
                unit = "quantity";
        }

        setUnitType(unit);
        setMedicineData({ ...medicineData, type: selectedType });
    };

    // Function to handle input changes
    const handleInputChange = (event) => {
        const { name, value } = event.target;
        setMedicineData({ ...medicineData, [name]: value });
    };

    // Function to add medicine to local list
    const addMedicine = (event) => {
        event.preventDefault();
        if (!medicineData.name || !medicineData.quantity || !medicineData.expiryDate) {
            alert("Please fill all required fields.");
            return;
        }

        setMedicines([...medicines, medicineData]);
        setMedicineData({
            name: '',
            brand: '',
            type: 'Tablet',
            quantity: '',
            batchNumber: '',
            expiryDate: '',
            costPrice: '',
            sellPrice: ''
        });

        setDisplay(false);
    };

    // Function to upload data to Firebase
    const uploadToFirebase = () => {
        if (medicines.length === 0) {
            alert("No medicines to upload!");
            return;
        }

        medicines.forEach((medicine) => {
            const inscode = localStorage.getItem("inscode");
            const medicineRef = ref(db, `Hospital/${inscode}/medicine/${medicine.name}`); // Store under medicine/{medicineName}
            const stockRef = ref(db, `Hospital/${inscode}/StockReport/${medicine.name}`); // Store stock report under StockReport/{medicineName}
        
            const stockData = {
                addedQuantity: medicine.quantity, // Quantity added
                remainingQuantity: medicine.quantity, // Initially, remaining = added
                dateAdded: new Date().toISOString() // Store timestamp
            };
        
            // Upload medicine details
            set(medicineRef, medicine)
                .then(() => {
                    console.log(`Medicine ${medicine.name} uploaded successfully!`);
        
                    // Upload stock report
                    set(stockRef, stockData)
                        .then(() => {
                            console.log(`Stock report updated for ${medicine.name}!`);
                            fetchStockData(); // Refresh stock data after upload
                        })
                        .catch((error) => console.error("Stock report update failed: ", error));
                })
                .catch((error) => console.error("Upload failed: ", error));
        });
        

        alert("Medicines uploaded successfully!");
        setMedicines([]); // Clear local medicines after upload
    };

    // Function to toggle stock display
    const toggleStockDisplay = () => {
        if (!stockVisible) {
            fetchStockData();
        }
        setStockVisible(!stockVisible);
    };

    return (
        <>
            <div className='Inventory'>
                <h2>Inventory Management</h2>

                <div className="added-medicine">
                    <div className='entries'>
                        <p>Medicine Name</p>
                        <p>Brand</p>
                        <p>Type</p>
                        <p>Quantity</p>
                        <p>Batch Number</p>
                        <p>Expiry Date</p>
                        <p>Cost Price</p>
                        <p>Sell Price</p>
                    </div>

                    {medicines.map((med, index) => (
                        <div className='entries' key={index}>
                            <p>{med.name}</p>
                            <p>{med.brand}</p>
                            <p>{med.type}</p>
                            <p>{med.quantity} {unitType}</p>
                            <p>{med.batchNumber}</p>
                            <p>{med.expiryDate}</p>
                            <p>{med.costPrice}</p>
                            <p>{med.sellPrice}</p>
                        </div>
                    ))}
                </div>

                <button className="Add-entry" onClick={() => setDisplay(true)}>Add Medicine Entry</button>
                <button className="Add-entry" onClick={uploadToFirebase}>Update</button>
                <button className="Add-entry view-stock" onClick={toggleStockDisplay}>
                    {stockVisible ? 'Hide Current Stock' : 'View Current Stock'}
                </button>
            </div>

            {stockVisible && (
                <div className='stock-container'>
                    <div className='stock-content'>
                        <h3>Current Medicine Stock</h3>
                        {stockData.length === 0 ? (
                            <p className="no-stock-message">No medicines in stock</p>
                        ) : (
                            <div className="stock-table">
                                <div className='stock-header'>
                                    <p>Medicine Name</p>
                                    <p>Brand</p>
                                    <p>Type</p>
                                    <p>Quantity</p>
                                    <p>Expiry Date</p>
                                    <p>Sell Price</p>
                                </div>
                                {stockData.map((med, index) => (
                                    <div className='stock-row' key={index}>
                                        <p>{med.name}</p>
                                        <p>{med.brand}</p>
                                        <p>{med.type}</p>
                                        <p>{med.quantity} {med.type === 'Tablet' || med.type === 'Capsule' ? 'mg' : 
                                             med.type === 'Syrup' || med.type === 'Injection' ? 'ml' : 'quantity'}</p>
                                        <p>{med.expiryDate}</p>
                                        <p>{med.sellPrice}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button className="close-stock-btn" onClick={toggleStockDisplay}>Close</button>
                    </div>
                </div>
            )}

            {display && (
                <div className='medicine-form-container'>
                    <form className='medicine-form' onSubmit={addMedicine}>
                        <p>Add Medicine Data</p>

                        <div className='medicine-input-cont'>
                            <label>Medicine Name: </label>
                            <input type='text' name="name" placeholder='Medicine Name' value={medicineData.name} onChange={handleInputChange} required />
                        </div>

                        <div className='medicine-input-cont'>
                            <label>Brand: </label>
                            <input type='text' name="brand" placeholder='Brand' value={medicineData.brand} onChange={handleInputChange} />
                        </div>

                        <div className='medicine-input-cont'>
                            <label>Type: </label>
                            <select name="type" onChange={checkType} value={medicineData.type}>
                                <option>Tablet</option>
                                <option>Syrup</option>
                                <option>Injection</option>
                                <option>Capsule</option>
                            </select>
                        </div>

                        <div className='medicine-input-cont'>
                            <label>Quantity: </label>
                            <input type='number' name="quantity" placeholder='Quantity' value={medicineData.quantity} onChange={handleInputChange} required />
                            <span><p>/{unitType}</p></span>
                        </div>

                        <div className='medicine-input-cont'>
                            <label>Batch Number: </label>
                            <input type='text' name="batchNumber" placeholder='Batch Number' value={medicineData.batchNumber} onChange={handleInputChange} />
                        </div>

                        <div className='medicine-input-cont'>
                            <label>Expiry Date: </label>
                            <input type='date' name="expiryDate" value={medicineData.expiryDate} onChange={handleInputChange} required />
                        </div>

                        <div className='medicine-input-cont'>
                            <label>Cost Price: </label>
                            <input type='number' name="costPrice" placeholder='Cost Price' value={medicineData.costPrice} onChange={handleInputChange} />
                        </div>

                        <div className='medicine-input-cont'>
                            <label>Sell Price: </label>
                            <input type='number' name="sellPrice" placeholder='Sell Price' value={medicineData.sellPrice} onChange={handleInputChange} />
                        </div>

                        <div style={{ display: 'flex' }}>
                            <button type="submit">Add</button>
                            <button type="button" onClick={() => setDisplay(false)}>Close</button>
                        </div>
                    </form>
                </div>
            )}
        </>
    );
};

export default Administrator;