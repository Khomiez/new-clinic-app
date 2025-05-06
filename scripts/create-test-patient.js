// This script creates a test patient in a specified clinic
require('dotenv').config();
const mongoose = require('mongoose');

// Configuration - replace with your actual MongoDB URI and clinic ID
const MONGODB_URI = 'mongodb+srv://judzuii:%40devjudzuii@cluster.ybq4tyw.mongodb.net/clinic-dev?retryWrites=true&w=majority&appName=cluster';
const CLINIC_ID = '6807f7e9261ab38a39afe66'; // Use your actual clinic ID

// Define a simple Patient Schema (instead of importing)
const PatientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    HN_code: { type: String, required: true },
    ID_code: { type: String },
    history: [
      {
        timestamp: { type: Date },
        document_urls: [{ type: String }],
      },
    ],
    lastVisit: { type: Date }
  },
  { timestamps: true }
);

// Get the proper model for the specific clinic
function getPatientModel(clinicId) {
  const modelName = `Patient_${clinicId}`;
  return mongoose.models[modelName] || 
         mongoose.model(modelName, PatientSchema, `patients_clinic_${clinicId}`);
}

async function createTestPatient() {
  try {
    // Connect to the database
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Get the patient model for this clinic
    const Patient = getPatientModel(CLINIC_ID);
    
    // Create a test patient
    const testPatient = {
      name: 'Test Patient',
      HN_code: 'HN' + Math.floor(10000 + Math.random() * 90000), // Random HN code
      ID_code: 'ID' + Math.floor(10000 + Math.random() * 90000), // Random ID code
      history: [
        {
          timestamp: new Date(),
          document_urls: ['https://example.com/document1.pdf']
        }
      ],
      lastVisit: new Date()
    };
    
    // Save the patient to the database
    console.log('Creating test patient...');
    const result = await Patient.create(testPatient);
    console.log('Test patient created successfully:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Error creating test patient:', error);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  }
}

// Run the function
createTestPatient();