// import React from 'react';
// import { CheckCircle } from 'lucide-react';

// const StepIndicator = ({ currentStep }: { currentStep: number }) => (
//   <div className="flex items-center mb-8">
//     {[1, 2, 3, 4, 5].map(step => (
//       <div key={step} className="flex items-center">
//         <div
//           className={`rounded-full h-8 w-8 flex items-center justify-center \${step === currentStep ? 'bg-emerald-600 text-white' : step < currentStep ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-600'}`}
//         >
//           {step < currentStep ? <CheckCircle className="h-5 w-5" /> : <span>{step}</span>}
//         </div>
//         {step < 5 && <div className={`h-1 w-8 \${step < currentStep ? 'bg-emerald-600' : 'bg-gray-200'}`} />}
//       </div>
//     ))}
//   </div>
// );

// export default StepIndicator;


import React from 'react';
import { CheckCircle } from 'lucide-react';

const StepIndicator = ({ currentStep }: { currentStep: number }) => (
  <div className="flex items-center mb-8">
    {[1, 2, 3, 4, 5].map(step => (
      <div key={step} className="flex items-center">
        <div
          className={`rounded-full h-8 w-8 flex items-center justify-center ${
            step === currentStep
              ? 'bg-emerald-600 text-white'
              : step < currentStep
              ? 'bg-emerald-100 text-emerald-600'
              : 'bg-gray-200 text-gray-600'
          }`}
        >
          {step < currentStep ? <CheckCircle className="h-5 w-5" /> : <span>{step}</span>}
        </div>
        {step < 5 && <div className={`h-1 w-8 ${step < currentStep ? 'bg-emerald-600' : 'bg-gray-200'}`} />}
      </div>
    ))}
  </div>
);

export default StepIndicator;
