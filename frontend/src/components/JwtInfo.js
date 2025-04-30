// JwtInfo.js - A debugging component to view JWT token information
import React, { useState, useEffect } from 'react';
import AuthService from '../services/AuthService';

const JwtInfo = () => {
  const [tokenInfo, setTokenInfo] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  
  useEffect(() => {
    if (AuthService.isLoggedIn()) {
      const token = AuthService.getToken();
      const parsedToken = AuthService.parseJwt(token);
      setTokenInfo(parsedToken);
    } else {
      setTokenInfo(null);
    }
  }, []);
  
  // Format expiration time
  const formatExpTime = (exp) => {
    if (!exp) return 'Unknown';
    
    const expDate = new Date(exp * 1000); // Convert seconds to milliseconds
    return expDate.toLocaleString();
  };
  
  // Calculate time remaining
  const getTimeRemaining = (exp) => {
    if (!exp) return 'Unknown';
    
    const now = Date.now() / 1000; // Convert to seconds
    const remaining = exp - now;
    
    if (remaining <= 0) return 'Expired';
    
    // Convert to days, hours, minutes
    const days = Math.floor(remaining / 86400);
    const hours = Math.floor((remaining % 86400) / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    
    return `${days}d ${hours}h ${minutes}m`;
  };
  
  if (!tokenInfo) return null;
  
  return (
    <div className="fixed bottom-6 left-6">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded shadow"
      >
        {isOpen ? 'Hide Token Info' : 'Show Token Info'}
      </button>
      
      {isOpen && (
        <div className="absolute bottom-12 left-0 w-80 bg-white p-4 rounded-lg shadow-lg border border-gray-300">
          <h3 className="font-semibold text-lg mb-2">JWT Token Information</h3>
          
          <div className="text-sm">
            <p><strong>Username:</strong> {tokenInfo.username}</p>
            <p><strong>User ID:</strong> {tokenInfo.id}</p>
            {tokenInfo.email && <p><strong>Email:</strong> {tokenInfo.email}</p>}
            {tokenInfo.role && <p><strong>Role:</strong> {tokenInfo.role}</p>}
            <p><strong>Expires:</strong> {formatExpTime(tokenInfo.exp)}</p>
            <p><strong>Time Remaining:</strong> {getTimeRemaining(tokenInfo.exp)}</p>
            {tokenInfo.iss && <p><strong>Issuer:</strong> {tokenInfo.iss}</p>}
            {tokenInfo.sub && <p><strong>Subject:</strong> {tokenInfo.sub}</p>}
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-200">
            <details>
              <summary className="cursor-pointer text-blue-600 hover:text-blue-800">View Full Token</summary>
              <pre className="mt-2 bg-gray-100 p-2 rounded overflow-x-auto text-xs max-h-40">
                {JSON.stringify(tokenInfo, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      )}
    </div>
  );
};

export default JwtInfo;