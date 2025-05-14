// src/components/PatientDeleteDialog.tsx
import React, { useState } from 'react';
import { IPatient } from '@/interfaces';

interface PatientDeleteDialogProps {
  patient: IPatient;
  isOpen: boolean;
  onConfirm: (forceDelete: boolean) => Promise<void>;
  onCancel: () => void;
}

export const PatientDeleteDialog: React.FC<PatientDeleteDialogProps> = ({
  patient,
  isOpen,
  onConfirm,
  onCancel
}) => {
  const [step, setStep] = useState<'initial' | 'confirmation' | 'processing'>('initial');
  const [forceDelete, setForceDelete] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{
    success: boolean;
    filesDeleted?: number;
    filesNotDeleted?: number;
    error?: string;
  } | null>(null);

  if (!isOpen) return null;

  // Count total documents
  const totalDocuments = patient.history?.reduce((total, record) => 
    total + (record.document_urls?.length || 0), 0) || 0;

  const handleConfirm = async () => {
    setStep('processing');
    try {
      await onConfirm(forceDelete);
      setStep('initial');
    } catch (error: any) {
      setDeleteResult({
        success: false,
        error: error.message
      });
      setStep('confirmation');
    }
  };

  const handleCancel = () => {
    setStep('initial');
    setForceDelete(false);
    setDeleteResult(null);
    onCancel();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 shadow-xl">
        {step === 'initial' && (
          <>
            <h3 className="text-xl font-bold text-red-600 mb-4">
              Delete Patient
            </h3>
            <div className="mb-6">
              <p className="text-gray-700 mb-4">
              คุณแน่ใจว่าต้องการลบถาวร <strong>{patient.name}</strong> หรือไม่?
              </p>
              
              {totalDocuments > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start">
                    <span className="text-yellow-500 text-lg mr-2">⚠️</span>
                    <div>
                      <p className="text-yellow-800 font-medium">คำเตือน: การลบเอกสาร</p>
                      <p className="text-yellow-700 text-sm mt-1">
                        This patient has {totalDocuments} attached document{totalDocuments > 1 ? 's' : ''} 
                        that will be permanently deleted from cloud storage.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-2">ข้อมูลผู้ป่วย:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li><span className="font-medium">HN Code:</span> {patient.HN_code}</li>
                  <li><span className="font-medium">รหัสประชาชน:</span> {patient.ID_code || 'N/A'}</li>
                  <li><span className="font-medium">บันทึกการเข้ารับบริการ:</span> {patient.history?.length || 0}</li>
                  <li><span className="font-medium">เอกสารทั้งหมด:</span> {totalDocuments}</li>
                </ul>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleCancel}
                className="flex-1 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => setStep('confirmation')}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                Continue
              </button>
            </div>
          </>
        )}

        {step === 'confirmation' && (
          <>
            <h3 className="text-xl font-bold text-red-600 mb-4">
            การยืนยันขั้นสุดท้าย
            </h3>
            
            {deleteResult?.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-start">
                  <span className="text-red-500 text-lg mr-2">❌</span>
                  <div>
                    <p className="text-red-800 font-medium">Previous attempt failed</p>
                    <p className="text-red-700 text-sm mt-1">{deleteResult.error}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-6">
              <p className="text-gray-700 mb-4">
              กรุณาพิมพ์ชื่อผู้ป่วยเพื่อยืนยัน: <strong>{patient.name}</strong>
              </p>
              
              <input
                type="text"
                placeholder="พิมพ์ชื่อผู้ป่วยที่นี่"
                className="w-full px-3 py-2 border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                onChange={(e) => {
                  // You could add name verification here
                }}
              />

              <div className="mt-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={forceDelete}
                    onChange={(e) => setForceDelete(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">
                  บังคับลบแม้ว่าบางไฟล์จะไม่สามารถลบออกจากที่จัดเก็บได้
                  </span>
                </label>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setStep('initial')}
                className="flex-1 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition"
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Delete Permanently
              </button>
            </div>
          </>
        )}

        {step === 'processing' && (
          <div className="text-center py-8">
            <div className="text-5xl mb-4 animate-spin">🔄</div>
            <h3 className="text-xl font-bold text-blue-600 mb-2">Deleting Patient...</h3>
            <p className="text-gray-600">
              {totalDocuments > 0 
                ? `Removing ${totalDocuments} document${totalDocuments > 1 ? 's' : ''} from storage...`
                : 'Removing patient from database...'
              }
            </p>
            <p className="text-sm text-gray-500 mt-2">This may take a moment.</p>
          </div>
        )}
      </div>
    </div>
  );
};