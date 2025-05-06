import { IAdmin, IClinic, IPatient } from "@/interfaces";
import { Types } from "mongoose";

// Direct data initialization without functions
const admin: IAdmin = {
  _id: new Types.ObjectId("68077f7e0261ab38a39afe65"),
  username: "admin@clinic.com",
  password: "", // not actually used in UI
  managedClinics: [
    new Types.ObjectId("68077f7e9261ab38a39afe66"),
    new Types.ObjectId("680785e6fe1277f0a2798790"),
  ],
};

// Mock clinics data
const clinics: IClinic[] = [
  {
    _id: new Types.ObjectId("6571234567891234567890ab"), // Convert string ID to ObjectId
    name: "Sunshine Medical Center",
    address: "123 Healing Way, Wellness City",
    phone: ["(555) 123-4567"], // This is already an array as defined in the interface
    managerId: [new Types.ObjectId("6571234567891234567890cd")], // Convert string ID to ObjectId
  },
  {
    _id: new Types.ObjectId("6571234567891234567890ef"), // Convert string ID to ObjectId
    name: "Tranquil Health Clinic",
    address: "456 Serenity Avenue, Calm Town",
    phone: ["(555) 987-6543"], // This is already an array as defined in the interface
    managerId: [new Types.ObjectId("6571234567891234567890cd")], // Convert string ID to ObjectId
  },
];

// Mock patients data
const patients: IPatient[] = [
  {
    _id: new Types.ObjectId("68077f7e9261ab38a39afe65"),
    name: "Jane Smith",
    HN_code: "HN001",
    ID_code: "1234567890",
    history: [],
    createdAt: new Date("2025-04-15"),
    updatedAt: new Date("2025-04-15"),
  },
  {
    _id: new Types.ObjectId("68077f7e9261ab38a39afe69"),
    name: "John Doe",
    HN_code: "HN002",
    ID_code: "0987654321",
    history: [],
    createdAt: new Date("2025-04-10"),
    updatedAt: new Date("2025-04-10"),
  },
  {
    _id: new Types.ObjectId("68077f7e9261ab38a39afe62"),
    name: "Emily Johnson",
    HN_code: "HN003",
    ID_code: "5678901234",
    history: [],
    createdAt: new Date("2025-04-18"),
    updatedAt: new Date("2025-04-18"),
  },
  {
    _id: new Types.ObjectId("68077f7e9261ab38a39afe45"),
    name: "Michael Brown",
    HN_code: "HN004",
    ID_code: "4321098765",
    history: [],
    createdAt: new Date("2025-04-05"),
    updatedAt: new Date("2025-04-05"),
  },
  {
    _id: new Types.ObjectId("68077f7e9261ab38a39ace65"),
    name: "Sarah Williams",
    HN_code: "HN005",
    ID_code: "6789012345",
    history: [],
    createdAt: new Date("2025-04-20"),
    updatedAt: new Date("2025-04-20"),
  },
];

export {admin, clinics, patients}