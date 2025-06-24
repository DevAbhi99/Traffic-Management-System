import React, { createContext, useContext } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';

// Include all libraries needed across the app
const libraries = ['places'];

// Create the context
const MapsContext = createContext(null);

// Create the provider component
export const MapsProvider = ({ children }) => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: "AIzaSyBo-mXQolZZnHe2jxg1FDm8m-ViYP9_AaY",
    libraries,
  });

  return (
    <MapsContext.Provider value={{ isLoaded, loadError }}>
      {children}
    </MapsContext.Provider>
  );
};

// Custom hook to use the maps context
export const useMaps = () => {
  const context = useContext(MapsContext);
  if (context === null) {
    throw new Error('useMaps must be used within a MapsProvider');
  }
  return context;
};