import React, { useState, useRef } from "react";
import axios from "axios";
import {
  GoogleMap,
  useJsApiLoader,
  Autocomplete,
  Marker,
} from "@react-google-maps/api";
import "./Booking.css";
import DataConfig from "./utils/Dataconfig";

const center = {
  lat: 53.3498053, // Dublin, Ireland as center
  lng: -6.2603097,
};

export default function Booking() {
  // State for form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [license, setLicense] = useState("");

  // State for location inputs
  const [startAutocomplete, setStartAutocomplete] = useState(null);
  const [endAutocomplete, setEndAutocomplete] = useState(null);
  const [startLocation, setStartLocation] = useState("");
  const [endLocation, setEndLocation] = useState("");

  // State for map interaction
  const [startCoords, setStartCoords] = useState(null);
  const [endCoords, setEndCoords] = useState(null);
  const [selectionMode, setSelectionMode] = useState("start"); // "start" or "end"
  const [currentZoom, setCurrentZoom] = useState(6); // Track the current zoom level

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);

  const mapRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: DataConfig.GOOGLE_API_KEY,
    libraries: ["places"],
  });

  // Handle manual changes to the Autocomplete inputs
  const handleStartPlaceChanged = () => {
    if (startAutocomplete) {
      const place = startAutocomplete.getPlace();
      if (place && place.geometry) {
        const location = place.geometry.location;
        setStartLocation(place.formatted_address || place.name);
        setStartCoords({ lat: location.lat(), lng: location.lng() });
      }
    }
  };

  const handleEndPlaceChanged = () => {
    if (endAutocomplete) {
      const place = endAutocomplete.getPlace();
      if (place && place.geometry) {
        const location = place.geometry.location;
        setEndLocation(place.formatted_address || place.name);
        setEndCoords({ lat: location.lat(), lng: location.lng() });
      }
    }
  };

  // Handle changes to input fields, clearing map selections if input is emptied
  const handleStartLocationChange = (e) => {
    const value = e.target.value;
    setStartLocation(value);

    if (!value.trim()) {
      setStartCoords(null);
    }
  };

  const handleEndLocationChange = (e) => {
    const value = e.target.value;
    setEndLocation(value);

    if (!value.trim()) {
      setEndCoords(null);
    }
  };

  // Handle clicks on POIs (Points of Interest) such as city names
  const handlePoiClick = (e) => {
    if (e && e.placeId) {
      e.stop(); // Prevent the default info window

      const service = new window.google.maps.places.PlacesService(mapRef.current);
      service.getDetails(
        {
          placeId: e.placeId,
          fields: ["name", "geometry", "formatted_address", "types", "address_components"],
        },
        (place, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK) {
            let locationName = place.name;

            // Add country info if available
            if (place.address_components) {
              const countryComponent = place.address_components.find((component) =>
                component.types.includes("country")
              );
              if (countryComponent && !locationName.includes(countryComponent.short_name)) {
                locationName += ", " + countryComponent.short_name;
              }
            }

            const coords = {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
            };

            // If both start and end are set, reset them and pick new start
            if (startCoords && endCoords) {
              setEndCoords(null);
              setEndLocation("");

              setStartCoords(coords);
              setStartLocation(locationName);
              setSelectionMode("end");
            } else {
              if (selectionMode === "start") {
                setStartCoords(coords);
                setStartLocation(locationName);
                setSelectionMode("end");
              } else {
                setEndCoords(coords);
                setEndLocation(locationName);
                setSelectionMode("start");
              }
            }
          }
        }
      );
    }
  };

  // Helper to find a specific type of address component
  const findAddressComponent = (components, type) => {
    return components.find((component) => component.types.includes(type));
  };

  // Handle map clicks for selecting start/end points
  const handleMapClick = async (e) => {
    const clickedLat = e.latLng.lat();
    const clickedLng = e.latLng.lng();
    const coords = { lat: clickedLat, lng: clickedLng };

    try {
      const geocoder = new window.google.maps.Geocoder();
      const response = await geocoder.geocode({ location: coords });

      if (response.results && response.results.length > 0) {
        let locationName = "";
        let selectedCoords = coords;

        // If zoomed out, prefer city-level info
        if (currentZoom < 8) {
          const cityComponent = findAddressComponent(
            response.results[0].address_components,
            "locality"
          );
          const districtComponent = findAddressComponent(
            response.results[0].address_components,
            "administrative_area_level_2"
          );
          const adminComponent = findAddressComponent(
            response.results[0].address_components,
            "administrative_area_level_1"
          );

          if (cityComponent) {
            locationName = cityComponent.long_name;
            const countryComponent = findAddressComponent(
              response.results[0].address_components,
              "country"
            );
            if (countryComponent) {
              locationName += ", " + countryComponent.short_name;
            }

            // Possibly refine coords to city center
            const cityResult = response.results.find((r) => r.types.includes("locality"));
            if (cityResult) {
              selectedCoords = {
                lat: cityResult.geometry.location.lat(),
                lng: cityResult.geometry.location.lng(),
              };
            }
          } else if (districtComponent) {
            locationName = districtComponent.long_name;
            const countryComponent = findAddressComponent(
              response.results[0].address_components,
              "country"
            );
            if (countryComponent) {
              locationName += ", " + countryComponent.short_name;
            }
          } else if (adminComponent) {
            locationName = adminComponent.long_name;
            const countryComponent = findAddressComponent(
              response.results[0].address_components,
              "country"
            );
            if (
              countryComponent &&
              countryComponent.short_name !== adminComponent.long_name
            ) {
              locationName += ", " + countryComponent.short_name;
            }
          } else {
            locationName = response.results[0].formatted_address;
          }
        } else {
          // If zoomed in
          locationName = response.results[0].formatted_address;
        }

        // If both set, reset end
        if (startCoords && endCoords) {
          setEndCoords(null);
          setEndLocation("");

          setStartCoords(selectedCoords);
          setStartLocation(locationName);
          setSelectionMode("end");
        } else {
          if (selectionMode === "start") {
            setStartCoords(selectedCoords);
            setStartLocation(locationName);
            setSelectionMode("end");
          } else {
            setEndCoords(selectedCoords);
            setEndLocation(locationName);
            setSelectionMode("start");
          }
        }
      }
    } catch (error) {
      console.error("Geocoding error:", error);
    }
  };

  // Clear all
  const clearAllLocations = () => {
    setName("");
    setEmail("");
    setLicense("");
    setStartLocation("");
    setStartCoords(null);
    setEndLocation("");
    setEndCoords(null);
    setSelectionMode("start");
  };

  // Close the dialog
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setBookingResult(null);
  };

  // Helper function to check if any segment has failed
  const checkSegmentFailures = (results) => {
    if (!results) return null;
    
    const failedSegments = [];
    
    // Iterate through each segment in the results
    for (const segmentKey in results) {
      try {
        // Parse the JSON string in each result
        const segmentResult = JSON.parse(results[segmentKey]);
        
        // Check for failure indicators
        if (
          segmentResult.detail || 
          (segmentResult.status && segmentResult.status !== "success") ||
          segmentResult.error
        ) {
          failedSegments.push({
            segmentKey,
            message: segmentResult.detail || segmentResult.message || segmentResult.error || "Unknown error"
          });
        }
      } catch (error) {
        console.error(`Error parsing segment result for ${segmentKey}:`, error);
        // If we can't parse the result, consider it a failure
        failedSegments.push({
          segmentKey,
          message: "Invalid segment data"
        });
      }
    }
    
    return failedSegments.length > 0 ? failedSegments : null;
  };

  // Send data to backend & retrieve segments (POST via axios)
  const handleBooking = async () => {
    // Form validation
    if (
      !name.trim() ||
      !email.trim() ||
      !startLocation.trim() ||
      !endLocation.trim() ||
      !license.trim()
    ) {
      alert("All fields are required, and driving license is mandatory.");
      return;
    }

    if (!startCoords || !endCoords) {
      alert("Please select both start and end locations on the map.");
      return;
    }

    setIsDialogOpen(true);
    setIsLoading(true);
    setBookingResult(null);

    // Prepare data in the required JSON format
    const bookingData = {
      name: name.trim(),
      email: email.trim(),
      license: license.trim(),
      start_coordinates: `${startCoords.lat},${startCoords.lng}`,
      destination_coordinates: `${endCoords.lat},${endCoords.lng}`,
      start_time: new Date().toISOString(),
    };

    try {
      // POST the data to /send_request via axios
      const response = await axios.post(
        "http://192.168.118.5:8000/send_request",
        bookingData
      );
      
      console.log("Response from /send_request:", response.data);
      
      // Check for segment failures
      const failedSegments = checkSegmentFailures(response.data.results);
      
      if (failedSegments) {
        // At least one segment has failed
        setBookingResult({
          success: false,
          bookingId: response.data.booking_id,
          failedSegments: failedSegments,
          message: "Unable to book your journey due to insufficient capacity on one or more road segments."
        });
      } else {
        // All segments successful
        setBookingResult({
          success: true,
          bookingId: response.data.booking_id,
          segments: response.data.results
        });
      }
    } catch (error) {
      console.error("Booking error:", error);
      setBookingResult({
        success: false,
        message:
          error?.response?.data?.message ||
          error.message ||
          "Booking failed. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to render segment details
  const renderSegmentDetails = () => {
    if (!bookingResult || !bookingResult.segments) return null;
    
    return (
      <div className="segment-info">
        <h3>Journey Segments:</h3>
        {Object.entries(bookingResult.segments).map(([key, value]) => {
          try {
            const segmentData = JSON.parse(value);
            return (
              <div key={key} className="segment-item">
                <p><strong>{key.replace('_', ' ').toUpperCase()}</strong>: {segmentData.message}</p>
              </div>
            );
          } catch (e) {
            return (
              <div key={key} className="segment-item">
                <p><strong>{key.replace('_', ' ').toUpperCase()}</strong>: Failed to process segment</p>
              </div>
            );
          }
        })}
      </div>
    );
  };

  // Helper function to render failure details
  const renderFailureDetails = () => {
    if (!bookingResult || !bookingResult.failedSegments) return null;
    
    return (
      <div className="failed-segments">
        <h3>Failed Segments:</h3>
        {bookingResult.failedSegments.map((segment, index) => (
          <div key={index} className="failed-segment-item">
            <p>
              <strong>{segment.segmentKey.replace('_', ' ').toUpperCase()}</strong>: {segment.message}
            </p>
          </div>
        ))}
        <p className="segment-note">Please consider trying a different route or time.</p>
      </div>
    );
  };

  return (
    <>
      <div className="booking_main">
        <div className="booking_settings">
          <div className="booking_heading">Booking</div>
          <div className="booking_form">
            <div className="name">
              <span id="name">Name</span>
              <span id="name_field">
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </span>
            </div>

            <div className="email">
              <span id="email">Email</span>
              <span id="email_field">
                <input
                  type="email"
                  placeholder="Enter your Email Id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </span>
            </div>

            {isLoaded && (
              <>
                <div className="startlocation">
                  <span id="start">Start Location</span>
                  <span id="start_field">
                    <Autocomplete
                      onLoad={setStartAutocomplete}
                      onPlaceChanged={handleStartPlaceChanged}
                    >
                      <input
                        type="text"
                        placeholder="Search or click on map"
                        value={startLocation}
                        onChange={handleStartLocationChange}
                      />
                    </Autocomplete>
                  </span>
                </div>

                <div className="endlocation">
                  <span id="end">End Location</span>
                  <span id="end_field">
                    <Autocomplete
                      onLoad={setEndAutocomplete}
                      onPlaceChanged={handleEndPlaceChanged}
                    >
                      <input
                        type="text"
                        placeholder="Search or click on map"
                        value={endLocation}
                        onChange={handleEndLocationChange}
                      />
                    </Autocomplete>
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={clearAllLocations} className="clear-btn">
                    Clear All
                  </button>
                </div>

                {/* Selection mode indicator */}
                <div className="selection-mode">
                  Currently selecting:{" "}
                  <strong>{selectionMode === "start" ? "Start" : "End"}</strong> location
                  {startCoords && endCoords && " (Click on map again to restart selection)"}
                </div>
              </>
            )}

            <div className="drivinglicense">
              <span id="driving">Driving Licence</span>
              <span id="driving_field">
                <input
                  type="text"
                  placeholder="Enter your driving license number"
                  value={license}
                  onChange={(e) => setLicense(e.target.value)}
                />
              </span>
            </div>

            <div className="book_btn">
              <button id="book_btns" onClick={handleBooking}>
                Book Journey
              </button>
            </div>
          </div>
        </div>

        <div className="booking_map">
          {isLoaded ? (
            <GoogleMap
              mapContainerClassName="map_container"
              center={center}
              zoom={6}
              onLoad={(map) => (mapRef.current = map)}
              onClick={handleMapClick}
              onPoiClick={handlePoiClick} // For POI clicks (city names)
              onZoomChanged={() => {
                if (mapRef.current) {
                  setCurrentZoom(mapRef.current.getZoom());
                }
              }}
              options={{
                clickableIcons: true, // Allow clicking on POIs
                streetViewControl: false,
                mapTypeControl: false,
                zoomControl: true,
              }}
            >
              {/* Display markers for start and end points */}
              {startCoords && <Marker position={startCoords} label="A" />}
              {endCoords && <Marker position={endCoords} label="B" />}
            </GoogleMap>
          ) : (
            <p>Loading map...</p>
          )}
        </div>
      </div>

      {isDialogOpen && (
        <div className="booking-dialog-overlay">
          <div className="booking-dialog">
            <div className="dialog-header">
              <h2>
                {isLoading
                  ? "Processing"
                  : bookingResult?.success
                  ? "Booking Successful"
                  : "Booking Failed"}
              </h2>
              {!isLoading && (
                <button className="close-btn" onClick={handleCloseDialog}>
                  ×
                </button>
              )}
            </div>

            <div className="dialog-content">
              {isLoading ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p>Processing your booking request...</p>
                </div>
              ) : (
                <>
                  {bookingResult?.success ? (
                    <>
                      <div className="status-badge success">Successfully Booked</div>
                      <div className="booking-details">
                        <p>
                          <strong>Booking ID:</strong> {bookingResult.bookingId}
                        </p>
                        <p>Your journey has been successfully booked. Please keep your booking ID.</p>
                        {renderSegmentDetails()}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="status-badge failed">Booking Failed</div>
                      <p>
                        {bookingResult?.message ||
                          "An error occurred during the booking process. Please try again."}
                      </p>
                      {renderFailureDetails()}
                    </>
                  )}
                </>
              )}
            </div>

            {!isLoading && (
              <div className="dialog-footer">
                <button className="primary-btn" onClick={handleCloseDialog}>
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}