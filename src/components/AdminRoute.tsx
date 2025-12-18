/**
 * Admin Route Component
 * 
 * Protected route สำหรับ admin เท่านั้น
 */

import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { checkIsAdmin } from '../services/adminAuthService';
import { auth } from '../config/firebase';

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        // Check if user is logged in
        const user = auth.currentUser;
        
        if (!user) {
          setIsAuthenticated(false);
          setIsAdmin(false);
          setLoading(false);
          return;
        }

        setIsAuthenticated(true);

        // Check if user is admin
        const admin = await checkIsAdmin();
        setIsAdmin(admin);
        setLoading(false);
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
        setLoading(false);
      }
    }

    checkAuth();

    // Listen to auth state changes
    const unsubscribe = auth.onAuthStateChanged(() => {
      checkAuth();
    });

    return () => unsubscribe();
  }, []);

  // Loading state
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #007bff',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem',
          }}></div>
          <p>Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Not admin - show access denied
  if (!isAdmin) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
      }}>
        <div style={{
          textAlign: 'center',
          padding: '3rem',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 2px 16px rgba(0, 0, 0, 0.1)',
          maxWidth: '600px',
        }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</h1>
          <h2>Access Denied</h2>
          <p style={{ color: '#666', margin: '1rem 0' }}>
            You don't have permission to access the admin dashboard.
          </p>
          <p style={{ color: '#999', fontSize: '0.9rem' }}>
            Please contact a system administrator if you believe this is an error.
          </p>
          <button
            style={{
              marginTop: '2rem',
              padding: '0.75rem 2rem',
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
            onClick={() => window.location.href = '/'}
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // Admin access granted
  return <>{children}</>;
};
