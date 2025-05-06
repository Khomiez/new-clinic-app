import { IPatient } from "@/interfaces";
import React from "react";

type Props = {
  setShowAddModal: (toShow: boolean) => void;
  editPatient: IPatient | null;
  patientFormData: { name: string, HN_code: string, ID_code: string };
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

const PatientModal = ({
  editPatient,
  setShowAddModal,
  patientFormData,
  handleInputChange,
}: Props) => {
  return (
    <div className="fixed inset-0 bg-blue-900 bg-opacity-30 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 border border-blue-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-blue-800">
            {editPatient ? "Edit Patient" : "Add New Patient"}
          </h3>
          <button
            onClick={() => setShowAddModal(false)}
            className="text-blue-400 hover:text-blue-600"
          >
            ❌
          </button>
        </div>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
          }}
        >
          <div>
            <label
              className="block text-sm font-medium text-blue-700 mb-1"
              htmlFor="name"
            >
              Patient Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              className="block w-full px-3 py-2 border border-blue-200 rounded-lg bg-blue-50 focus:ring-2 focus:ring-blue-300 focus:border-blue-300 focus:outline-none"
              placeholder="Full Name"
              value={patientFormData.name}
              onChange={handleInputChange}
              required
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium text-blue-700 mb-1"
              htmlFor="HN_code"
            >
              HN Code
            </label>
            <input
              id="HN_code"
              name="HN_code"
              type="text"
              className="block w-full px-3 py-2 border border-blue-200 rounded-lg bg-blue-50 focus:ring-2 focus:ring-blue-300 focus:border-blue-300 focus:outline-none"
              placeholder="HN Code"
              value={patientFormData.HN_code}
              onChange={handleInputChange}
              required
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium text-blue-700 mb-1"
              htmlFor="ID_code"
            >
              ID Code (Optional)
            </label>
            <input
              id="ID_code"
              name="ID_code"
              type="text"
              className="block w-full px-3 py-2 border border-blue-200 rounded-lg bg-blue-50 focus:ring-2 focus:ring-blue-300 focus:border-blue-300 focus:outline-none"
              placeholder="ID Code"
              value={patientFormData.ID_code}
              onChange={handleInputChange}
            />
          </div>

          <div className="pt-4 flex space-x-3">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="flex-1 py-2 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              {editPatient ? "Update Patient" : "Add Patient"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PatientModal;
