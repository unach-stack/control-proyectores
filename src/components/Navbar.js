import React from 'react';
import { FaBell } from 'react-icons/fa';

function Navbar() {
  return (
    <div className="flex items-center justify-between p-4 bg-white shadow-md">
      <div>
        <input
          type="text"
          placeholder="Search..."
          className="px-4 py-2 border rounded-md focus:outline-none"
        />
      </div>
      <div className="flex items-center gap-4">
        <FaBell className="text-2xl text-gray-600" />
        <div className="flex items-center gap-2">
          <img
            src="https://via.placeholder.com/40"
            alt="User"
            className="w-10 h-10 rounded-full"
          />
          <span className="font-medium">Tom Cook</span>
        </div>
      </div>
    </div>
  );
}

export default Navbar;
