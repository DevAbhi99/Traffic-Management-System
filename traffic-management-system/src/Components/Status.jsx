import React, { useState } from "react";
import { GoogleMap } from "@react-google-maps/api";
import { useMaps } from "./MapsContext";
import "./Status.css";

export default function Status() {
  const [bookingId, setBookingId] = useState("");
  const [statusInfo, setStatusInfo] = useState(null);
  const [showDialog, setShowDialog] = useState(false);

  const handleCheckStatus = async () => {
    if (!bookingId.trim()) {
      alert("Please enter Booking ID");
      return;
    }
  
    try {
      const response = await fetch(`http://192.168.118.5:8000/booking_status/${bookingId}`);
      const data = await response.json();
  
      if (response.status === 202) {
        console.log("Booking field (202):", data.booking);
      }
  
      if (!response.ok) {
        throw new Error("Booking not found or server error");
      }
  
      console.log("Response data:", data);
      setStatusInfo({ 
        status: data.status,
        // Include any additional booking details that might be needed
        details: data.details || {}
      });
    } catch (error) {
      console.error("Error fetching booking status:", error);
      setStatusInfo({
        status: "not-found",
        message: "ID not found or server error, please try again",
      });
    }
  
    setShowDialog(true);
  };
  
  const handleCloseDialog = () => {
    setShowDialog(false);
  };

  const { isLoaded } = useMaps();
  const center = { lat: 53.3498053, lng: -6.2603097 };

  return (
    <>
      <div className="status_main">
        <div className="status_settings">
          <div className="status_heading">Check Status</div>
          <div className="status_form">
            <div className="booking_id">
              <span id="booking_id_label">Booking ID</span>
              <span id="booking_id_field">
                <input
                  type="text"
                  placeholder="Please enter Booking ID"
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                />
              </span>
            </div>
            <div className="check_btn">
              <button id="check_btns" onClick={handleCheckStatus}>
                Check Status
              </button>
            </div>
          </div>
        </div>
        <div className="status_map">
          {isLoaded ? (
            <GoogleMap
              mapContainerClassName="map_container"
              center={center}
              zoom={9}
            />
          ) : (
            <p>Loading map...</p>
          )}
        </div>
      </div>
      {showDialog && statusInfo && (
        <div className="status-dialog-overlay">
          <div className="status-dialog">
            <div className="dialog-header">
              <h2>Booking Status</h2>
              <button className="close-btn" onClick={handleCloseDialog}>
                ×
              </button>
            </div>
            <div className="dialog-content">
              {statusInfo.status === "success" && (
                <>
                  <div className="status-badge success">Successful</div>
                  <p>Your booking has been successful.</p>
                </>
              )}
              {statusInfo.status === "failed" && (
                <>
                  <div className="status-badge failed">Failed</div>
                  <p>Booking failed, please try again.</p>
                </>
              )}
              {statusInfo.status === "cancelled" && (
                <>
                  <div className="status-badge cancelled">Cancelled</div>
                  <p>Your booking has been successfully cancelled.</p>
                </>
              )}
              {statusInfo.status === "not-found" && (
                <>
                  <div className="status-badge not-found">Not Found</div>
                  <p>{statusInfo.message}</p>
                </>
              )}
            </div>
            <div className="dialog-footer">
              <button className="primary-btn" onClick={handleCloseDialog}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}