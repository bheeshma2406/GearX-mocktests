'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState } from 'react';

const InstructionsPage = () => {
  const router = useRouter();
  const params = useParams();
  const { type, id } = params;
  const [agreed, setAgreed] = useState(false);

  const handleStart = () => {
    if (agreed) {
      router.push(`/test/${type}/${id}/start`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-4">General Instructions</h1>
      <ol className="list-decimal list-inside mb-4">
        <li className="mb-2">The timer will begin as soon as you start the test.</li>
        <li className="mb-2">Ensure stable internet connectivity throughout the test.</li>
        <li>Questions will appear in sequence, and you can revisit them.</li>
      </ol>
      <div className="flex items-center mt-4">
        <input
          type="checkbox"
          id="agree"
          onChange={() => setAgreed(!agreed)}
        />
        <label htmlFor="agree" className="ml-2">
          I have read all the instructions
        </label>
      </div>
      <button
        onClick={handleStart}
        disabled={!agreed}
        className={`mt-6 px-4 py-2 text-white rounded-lg ${agreed ? 'bg-blue-600' : 'bg-gray-400 cursor-not-allowed'}`}
      >
        Start Test
      </button>
    </div>
  );
};

export default InstructionsPage;

