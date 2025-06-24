import React from 'react';
import { Link } from 'react-router-dom';
import { GoogleMap } from '@react-google-maps/api';
import { useMaps } from './MapsContext';
import './Home.css';

const center = {
  lat: 53.3498053,
  lng: -6.2603097
};

export default function Home() {
  const { isLoaded } = useMaps();
  
  return (
    <div className="home-container">
      <div className="home-content">
        <h1>Traffic Management System</h1>
        
        <div className="home-map-section">
          <div className="home-map-container">
            {isLoaded ? (
              <GoogleMap
                mapContainerClassName="home-map"
                center={center}
                zoom={9}
              />
            ) : (
              <div className="home-map-placeholder">Loading map...</div>
            )}
          </div>
        </div>
        
        <div className="features">
          <div className="feature">
            <div className="feature-icon">🚗</div>
            <h3>Book a Journey</h3>
            <Link to="/booking" className="action-button">Book Now</Link>
          </div>
          
          <div className="feature">
            <div className="feature-icon">❌</div>
            <h3>Cancel a Journey</h3>
            <Link to="/cancel" className="action-button cancel">Cancel Journey</Link>
          </div>
          
          <div className="feature">
            <div className="feature-icon">📊</div>
            <h3>Check Capacity</h3>
            <Link to="/capacity" className="action-button capacity">Check Status</Link>
          </div>
        </div>
      </div>
    </div>
  );
}