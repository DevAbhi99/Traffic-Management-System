import React, { useState, useRef } from "react";
import { GoogleMap, Polyline, Marker, InfoWindow } from "@react-google-maps/api";
import { useMaps } from "./MapsContext";
import "./Capacity.css";

const center = {
  lat: 53.3498053,
  lng: -6.2603097,
};

export default function Capacity() {
  const { isLoaded } = useMaps();
  const [bookingId, setBookingId] = useState("");
  const [segments, setSegments] = useState([]);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [mapCenter, setMapCenter] = useState(center);
  const [mapZoom, setMapZoom] = useState(6);
  const mapRef = useRef(null);

  const computeSegmentStatus = (percentage) => {
    if (percentage >= 70) return "#FF0000"; // Red
    if (percentage >= 10) return "#FFFF00"; // Yellow
    return "#00FF00"; // Green
  };

  const handleCheckBooking = async () => {
    if (!bookingId.trim()) {
      alert("Please enter a booking ID.");
      return;
    }

    try {
      const response = await fetch(`http://192.168.118.5:8000/get_segments/${bookingId}`);
      if (response.status === 202) {
        const data = await response.json();
        console.log("Booking field:", data.booking); // Assuming `booking` is a top-level field
      } else if (!response.ok) throw new Error("Booking not found or server error");
      else{
      const data = await response.json();
      
      let allSegments = [];

      if (data.segments && typeof data.segments === 'object') {
        Object.values(data.segments).forEach(region => {
          region.segments.forEach(seg => {
            const percentage = (seg.current_load / seg.capacity) * 100;
            const path = seg.coordinates.map(coord => ({ lat: coord[1], lng: coord[0] }));

            allSegments.push({
              segment_id: seg.segment_id,
              name: seg.name && seg.name !== "Unnamed Road" ? seg.name : seg.segment_id,
              percentage: Math.round(percentage),
              color: computeSegmentStatus(percentage),
              path,
              start: path[0],
              end: path[path.length - 1],
              current_load: seg.current_load,
              capacity: seg.capacity
            });
          });
        });
      }

      setSegments(allSegments);

      if (allSegments.length > 0) {
        const first = allSegments[0].start;
        const last = allSegments[allSegments.length - 1].end;
        setMapCenter({
          lat: (first.lat + last.lat) / 2,
          lng: (first.lng + last.lng) / 2
        });
        setMapZoom(12);
      }
    }
    } catch (error) {
      console.error("Error fetching booking:", error);
      alert("Error fetching booking data.");
    }
  };

  return (
    <>
      <div className="capacity_main">
        <div className="capacity_settings">
          <div className="capacity_heading">Check Booking & Capacity</div>
          <div className="capacity_form">
            <div className="booking_id">
              <span id="booking_id_label">Booking ID</span>
              <span id="booking_id_field">
                <input
                  type="text"
                  placeholder="Enter your booking ID"
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                />
              </span>
            </div>
            <div className="check_btn">
              <button id="check_btns" onClick={handleCheckBooking}>
                Check Booking Status
              </button>
            </div>
          </div>
        </div>

        <div className="capacity_map">
          {isLoaded ? (
            <GoogleMap
              mapContainerClassName="map_container"
              center={mapCenter}
              zoom={mapZoom}
              onLoad={(map) => (mapRef.current = map)}
              options={{
                streetViewControl: false,
                mapTypeControl: false,
                zoomControl: true,
              }}
            >
              {segments.map((seg, idx) => (
                <React.Fragment key={idx}>
                  <Polyline
                    path={seg.path}
                    options={{
                      strokeColor: seg.color,
                      strokeOpacity: 0.8,
                      strokeWeight: 5,
                    }}
                    onClick={() => setSelectedSegment(seg)}
                  />
                  <Marker
                    position={seg.start}
                    icon={{
                      path: window.google.maps.SymbolPath.CIRCLE,
                      scale: 5,
                      fillColor: "#000000",
                      fillOpacity: 1,
                      strokeWeight: 0,
                    }}
                  />
                </React.Fragment>
              ))}

              {selectedSegment && (
                <InfoWindow
                  position={selectedSegment.start}
                  onCloseClick={() => setSelectedSegment(null)}
                >
                  <div className="segment-info">
                    <h3>{selectedSegment.name}</h3>
                    <p><strong>Load:</strong> {selectedSegment.current_load}</p>
                    <p><strong>Capacity:</strong> {selectedSegment.capacity}</p>
                    <p><strong>Utilization:</strong> {selectedSegment.percentage}%</p>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          ) : (
            <p>Loading map...</p>
          )}
        </div>
      </div>
    </>
  );
}
