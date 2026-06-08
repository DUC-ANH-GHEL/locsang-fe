// src/components/products/SpecificationFields.tsx
import { useState, useEffect } from 'react';
import React from "react";


interface Specification {
  key: string;
  value: string;
}

interface SpecificationFieldsProps {
  specs: Specification[];
  onSpecsUpdate: (specs: Specification[]) => void;
}

const SpecificationFields = ({ specs, onSpecsUpdate }: SpecificationFieldsProps) => {
  const [specifications, setSpecifications] = useState<Specification[]>(specs);

  // Gửi specs ra ngoài khi có thay đổi
  // useEffect(() => {
  //   onSpecsUpdate(specifications);
  // }, [specifications, onSpecsUpdate]);

    // ⚡ Khi props.specs thay đổi, cập nhật lại state nội bộ
    useEffect(() => {
      setSpecifications(specs);
    }, [specs]);

    // Gửi specs ra ngoài khi có thay đổi specifications
    useEffect(() => {
      onSpecsUpdate(specifications);
    }, [specifications, onSpecsUpdate]);

  const handleSpecChange = (index: number, field: 'key' | 'value', value: string) => {
    const updatedSpecs = [...specifications];
    updatedSpecs[index][field] = value;
    setSpecifications(updatedSpecs);
  };

  const addSpec = () => {
    setSpecifications(prev => [...prev, { key: '', value: '' }]);
  };

  const removeSpec = (index: number) => {
    if (specifications.length > 1) {
      const updatedSpecs = [...specifications];
      updatedSpecs.splice(index, 1);
      setSpecifications(updatedSpecs);
    }
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Thông số kỹ thuật
      </label>
      {specifications.map((spec, index) => (
        <div key={index} className="flex items-center gap-2 mb-2">
          <input
            type="text"
            className="flex-1 border border-gray-300 rounded px-3 py-2 focus:ring-teal-500 focus:border-teal-500"
            placeholder="Tên thông số (VD: Áp suất)"
            value={spec.key}
            onChange={e => handleSpecChange(index, 'key', e.target.value)}
          />
          <input
            type="text"
            className="flex-1 border border-gray-300 rounded px-3 py-2 focus:ring-teal-500 focus:border-teal-500"
            placeholder="Giá trị (VD: 16 MPa)"
            value={spec.value}
            onChange={e => handleSpecChange(index, 'value', e.target.value)}
          />
          <button
            type="button"
            className="text-red-500 hover:text-red-700"
            onClick={() => removeSpec(index)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      ))}
      <button
        type="button"
        className="text-teal-600 hover:text-teal-800 font-medium flex items-center"
        onClick={addSpec}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
        Thêm thông số
      </button>
    </div>
  );
};

export default SpecificationFields;
