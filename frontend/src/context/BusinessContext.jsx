import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';

export const BusinessContext = createContext();

export const BusinessProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [businesses, setBusinesses] = useState([]);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [loadingBusinesses, setLoadingBusinesses] = useState(true);

  const fetchBusinesses = async () => {
    if (user?.role !== 'business_owner') {
      setLoadingBusinesses(false);
      return;
    }
    
    try {
      setLoadingBusinesses(true);
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/businesses`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      setBusinesses(data || []);
      setIsOnboarded(Array.isArray(data) && data.length > 0);
    } catch (error) {
      console.error('Failed to fetch businesses', error);
      setBusinesses([]);
      setIsOnboarded(false);
    } finally {
      setLoadingBusinesses(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchBusinesses();
    } else {
      setBusinesses([]);
      setIsOnboarded(false);
      setLoadingBusinesses(false);
    }
  }, [user]);

  return (
    <BusinessContext.Provider value={{ businesses, isOnboarded, loadingBusinesses, refreshBusinesses: fetchBusinesses }}>
      {children}
    </BusinessContext.Provider>
  );
};
