import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from './AuthContext';

export const BusinessContext = createContext();

export const BusinessProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const currentUserId = user?.id || user?._id || null;
  const [businesses, setBusinesses] = useState([]);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [loadingBusinesses, setLoadingBusinesses] = useState(true);
  const [loadedUserId, setLoadedUserId] = useState(null);

  const fetchBusinesses = useCallback(async () => {
    const uid = user?.id || user?._id || null;
    if (!uid || user?.role !== 'business_owner') {
      setBusinesses([]);
      setIsOnboarded(false);
      setLoadedUserId(uid);
      setLoadingBusinesses(false);
      return;
    }

    try {
      setLoadingBusinesses(true);
      const { data } = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/businesses`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const list = Array.isArray(data) ? data : [];
      setBusinesses(list);
      setIsOnboarded(list.length > 0);
      setLoadedUserId(uid);
    } catch (error) {
      console.error('Failed to fetch businesses', error);
      setBusinesses([]);
      setIsOnboarded(false);
      setLoadedUserId(uid);
    } finally {
      setLoadingBusinesses(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      if (user.role === 'business_owner' && loadedUserId !== currentUserId) {
        setBusinesses([]);
        setIsOnboarded(false);
        setLoadingBusinesses(true);
      }
      fetchBusinesses();
    } else {
      setBusinesses([]);
      setIsOnboarded(false);
      setLoadedUserId(null);
      setLoadingBusinesses(false);
    }
  }, [currentUserId, user?.role, fetchBusinesses]); // eslint-disable-line react-hooks/exhaustive-deps

  // Guard against a single stale render right after login/register switches users
  const isStaleForCurrentUser = Boolean(
    currentUserId && user?.role === 'business_owner' && loadedUserId !== currentUserId
  );

  return (
    <BusinessContext.Provider value={{
      businesses: isStaleForCurrentUser ? [] : businesses,
      isOnboarded: isStaleForCurrentUser ? false : isOnboarded,
      loadingBusinesses: isStaleForCurrentUser ? true : loadingBusinesses,
      refreshBusinesses: fetchBusinesses
    }}>
      {children}
    </BusinessContext.Provider>
  );
};
