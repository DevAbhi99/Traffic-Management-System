import React, { useEffect, useRef } from 'react';
import { DirectionsRenderer, Polyline, Marker, InfoWindow } from '@react-google-maps/api';
import './RouteSegments.css';

// Route Legend Component - shows the meaning of different colors and symbols on the map
const RouteLegend = ({ statusColors }) => {
  return (
    <div className="route-legend">
      <div className="legend-header">Route Segment Capacity Legend</div>
      <div className="legend-item">
        <div className="legend-color" style={{ backgroundColor: statusColors.available }}></div>
        <div className="legend-title">Available Segment</div>
      </div>
      <div className="legend-item">
        <div className="legend-color" style={{ backgroundColor: statusColors.limited }}></div>
        <div className="legend-title">Limited Capacity</div>
      </div>
      <div className="legend-item">
        <div className="legend-color" style={{ backgroundColor: statusColors.full }}></div>
        <div className="legend-title">Full Segment</div>
      </div>
      <div className="legend-item">
        <div className="legend-color" style={{ backgroundColor: '#3F51B5', height: '10px', width: '10px', borderRadius: '50%' }}></div>
        <div className="legend-title">Gateway Node</div>
      </div>
      <div className="legend-item">
        <div className="legend-color" style={{ backgroundColor: '#FFC107', height: '5px', border: '1px dashed #FFC107' }}></div>
        <div className="legend-title">Alternative Route</div>
      </div>
    </div>
  );
};

const RouteSegments = ({ directions, routeNotPossible, startCoords, endCoords, showLegend = false }) => {
  // Colors for different segment statuses
  const statusColors = {
    available: '#4CAF50', // Green
    limited: '#FFC107',   // Yellow
    full: '#F44336'       // Red
  };

  // State management for segments and routes
  const [routeSegments, setRouteSegments] = React.useState([]);
  const [segmentCoordinates, setSegmentCoordinates] = React.useState([]);
  const [polylinePaths, setPolylinePaths] = React.useState([]); // Store actual path points for each segment
  const [gatewayNodes, setGatewayNodes] = React.useState([]);
  const [alternativeRoutes, setAlternativeRoutes] = React.useState([]);
  const [selectedSegment, setSelectedSegment] = React.useState(null);
  const [showAlternativeRoutes, setShowAlternativeRoutes] = React.useState(false);
  const [selectedAltRoute, setSelectedAltRoute] = React.useState(null);
  
  // Track previous directions and coordinates to detect changes
  const prevDirectionsRef = useRef(null);
  const prevStartCoordsRef = useRef(null);
  const prevEndCoordsRef = useRef(null);

  // Process directions result to extract the route segments
  // In a real implementation, this would be replaced by API calls to the backend
  useEffect(() => {
    // Check if route has actually changed by comparing with previous values
    const directionsChanged = prevDirectionsRef.current !== directions;
    const startCoordsChanged = prevStartCoordsRef.current && startCoords && 
      (prevStartCoordsRef.current.lat !== startCoords.lat || 
       prevStartCoordsRef.current.lng !== startCoords.lng);
    const endCoordsChanged = prevEndCoordsRef.current && endCoords && 
      (prevEndCoordsRef.current.lat !== endCoords.lat || 
       prevEndCoordsRef.current.lng !== endCoords.lng);
    
    // Update refs for next comparison
    prevDirectionsRef.current = directions;
    prevStartCoordsRef.current = startCoords;
    prevEndCoordsRef.current = endCoords;
    
    // Force clear data when route changes or is cleared
    if (directionsChanged || startCoordsChanged || endCoordsChanged) {
      console.log("Route changed, clearing previous route data");
      // Clear all route data
      clearRouteData();
    }

    if (!directions && !routeNotPossible) {
      // Clear data when directions are cleared
      clearRouteData();
      return;
    }

    if (directions) {
      // Process Google Directions result to extract waypoints
      processDirectionsToSegments(directions);
    } else if (routeNotPossible && startCoords && endCoords) {
      // Generate fallback segments for routes that can't be calculated by Google
      generateFallbackSegments(startCoords, endCoords);
    }
  }, [directions, routeNotPossible, startCoords, endCoords]);

  // Helper function to clear all route data
  const clearRouteData = () => {
    setRouteSegments([]);
    setSegmentCoordinates([]);
    setPolylinePaths([]);
    setGatewayNodes([]);
    setAlternativeRoutes([]);
    setSelectedSegment(null);
    setSelectedAltRoute(null);
    setShowAlternativeRoutes(false);
  };

  // Determine if we should show alternative routes when a segment is full
  useEffect(() => {
    const hasFullSegment = routeSegments.some(segment => segment.status === 'full');
    setShowAlternativeRoutes(hasFullSegment);
  }, [routeSegments]);

  // Process Google Directions to create route segments
  const processDirectionsToSegments = (directions) => {
    try {
      const route = directions.routes[0];
      const leg = route.legs[0];
      
      // Generate a unique route identifier to make sure we're not reusing old data
      const routeId = `${leg.start_location.lat()},${leg.start_location.lng()}-${leg.end_location.lat()},${leg.end_location.lng()}`;
      console.log(`Processing new route: ${routeId}`);
      
      // Extract the actual path of the route from Google's response
      // This ensures we use exactly the same path points that Google calculated
      let allPathPoints = [];
      
      // Collect all points from each step's path
      leg.steps.forEach(step => {
        // Each step has a path of lat/lng points
        if (step.path && step.path.length > 0) {
          // Convert to our format
          const pathPoints = step.path.map(point => ({
            lat: point.lat(),
            lng: point.lng()
          }));
          
          // Add to our collection, avoiding duplicating the connecting points
          if (allPathPoints.length === 0) {
            allPathPoints = [...pathPoints];
          } else {
            // Skip the first point of the next segment as it's the same as the last point of the previous segment
            allPathPoints = [...allPathPoints, ...pathPoints.slice(1)];
          }
        }
      });
      
      console.log(`Route has ${allPathPoints.length} total path points`);
      
      // Now we'll divide the path into segments
      // For this demo, we'll create 3 segments of roughly equal point count
      const segmentCount = 3;
      const pointsPerSegment = Math.floor(allPathPoints.length / segmentCount);
      
      // Create segment waypoints (the connection points between segments)
      const segmentWaypoints = [];
      
      // Always include the start point
      segmentWaypoints.push(allPathPoints[0]);
      
      // Add intermediate segment points
      for (let i = 1; i < segmentCount; i++) {
        const index = i * pointsPerSegment;
        segmentWaypoints.push(allPathPoints[index]);
      }
      
      // Always include the end point
      if (!segmentWaypoints.includes(allPathPoints[allPathPoints.length - 1])) {
        segmentWaypoints.push(allPathPoints[allPathPoints.length - 1]);
      }
      
      // Store the waypoint coordinates for reference (mainly used for markers)
      setSegmentCoordinates(segmentWaypoints);
      
      // Now create polyline paths for each segment to ensure we follow the exact Google route
      const segmentPaths = [];
      
      for (let i = 0; i < segmentWaypoints.length - 1; i++) {
        // Find the indexes of the waypoints in the original path
        const startIndex = allPathPoints.findIndex(
          point => point.lat === segmentWaypoints[i].lat && point.lng === segmentWaypoints[i].lng
        );
        
        const endIndex = allPathPoints.findIndex(
          point => point.lat === segmentWaypoints[i + 1].lat && point.lng === segmentWaypoints[i + 1].lng
        );
        
        // Extract the sub-path for this segment
        const segmentPath = allPathPoints.slice(startIndex, endIndex + 1);
        segmentPaths.push(segmentPath);
      }
      
      // Store the exact paths for each segment
      setPolylinePaths(segmentPaths);
      
      // Determine gateway nodes (start and end points)
      // In a real implementation, these would be identified by the backend
      setGatewayNodes([
        { 
          location: { lat: segmentWaypoints[0].lat, lng: segmentWaypoints[0].lng }, 
          name: leg.start_address.split(',')[0], 
          country: getCountryFromAddress(leg.start_address) 
        },
        { 
          location: { lat: segmentWaypoints[segmentWaypoints.length - 1].lat, lng: segmentWaypoints[segmentWaypoints.length - 1].lng }, 
          name: leg.end_address.split(',')[0], 
          country: getCountryFromAddress(leg.end_address) 
        }
      ]);
      
      // Create segments (in a real app, status would come from the backend)
      // Here we're randomly assigning statuses for demonstration
      const segments = [];
      for (let i = 0; i < segmentWaypoints.length - 1; i++) {
        // Randomly assign a status for demonstration
        // In a real application, this would come from backend data
        const statuses = ['available', 'limited', 'full'];
        const randomStatus = statuses[Math.floor(Math.random() * (i === segmentCount - 1 ? 3 : 2))]; // Make the last segment more likely to be full
        
        segments.push({
          id: i + 1,
          name: `Segment ${i + 1}`, // Segment name
          startIndex: i,
          endIndex: i + 1,
          status: randomStatus,
          pathIndex: i // Reference to the corresponding path in polylinePaths
        });
      }
      
      setRouteSegments(segments);
      
      // Generate alternative routes using Google Directions API
      generateAlternativeRoutes(segmentWaypoints);
      
    } catch (error) {
      console.error("Error processing directions:", error);
    }
  };
  
  // Helper to extract country from address
  const getCountryFromAddress = (address) => {
    const parts = address.split(',');
    return parts[parts.length - 1].trim();
  };
  
  // Generate fallback segments when directions API can't provide a route
  const generateFallbackSegments = (start, end) => {
    // Generate a unique route identifier
    const routeId = `${start.lat},${start.lng}-${end.lat},${end.lng}`;
    console.log(`Generating fallback for route: ${routeId}`);
    
    // For demonstration purposes - create a direct route with intermediate points
    // In a real implementation, these would come from the backend
    
    // Create midpoints for the route
    const midpoint1 = {
      lat: start.lat + (end.lat - start.lat) * 0.3,
      lng: start.lng + (end.lng - start.lng) * 0.3
    };
    
    const midpoint2 = {
      lat: start.lat + (end.lat - start.lat) * 0.6,
      lng: start.lng + (end.lng - start.lng) * 0.6
    };
    
    const coordinates = [start, midpoint1, midpoint2, end];
    setSegmentCoordinates(coordinates);
    
    // For fallback routes, we'll create simple straight-line paths between waypoints
    const paths = [
      [start, midpoint1],
      [midpoint1, midpoint2],
      [midpoint2, end]
    ];
    setPolylinePaths(paths);
    
    // Create dummy gateway nodes
    setGatewayNodes([
      { location: start, name: "Starting Point", country: "Origin Country" },
      { location: end, name: "Destination", country: "Destination Country" }
    ]);
    
    // Create segments with random statuses for demonstration
    const segments = [];
    for (let i = 0; i < coordinates.length - 1; i++) {
      const statuses = ['available', 'limited', 'full'];
      // Make last segment more likely to be full for demonstration
      const randomStatus = statuses[Math.floor(Math.random() * (i === 2 ? 3 : 2))];
      
      segments.push({
        id: i + 1,
        name: `Segment ${i + 1}`,
        startIndex: i,
        endIndex: i + 1,
        status: randomStatus,
        pathIndex: i
      });
    }
    
    setRouteSegments(segments);
    
    // Generate alternative routes
    generateAlternativeRoutes(coordinates);
  };
  
  // Generate alternative routes using Google Directions API
  const generateAlternativeRoutes = (coordinates) => {
    if (coordinates.length < 2) return;
    
    const start = coordinates[0];
    const end = coordinates[coordinates.length - 1];
    
    // Clear any existing alternative routes while we fetch the new ones
    setAlternativeRoutes([]);
    
    // Create a new DirectionsService for fetching routes
    const directionsService = new window.google.maps.DirectionsService();
    
    // First alternative route with FEWER_TRANSFERS preference
    directionsService.route(
      {
        origin: start,
        destination: end,
        travelMode: window.google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: true,
        avoidHighways: true,  // Avoid highways to get a different route
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK && result.routes.length > 0) {
          // Process the alternative routes from Google API
          const googleAltRoutes = [];
          
          // Limit to maximum 2 alternative routes (if available)
          const numRoutes = Math.min(2, result.routes.length);
          
          for (let i = 0; i < numRoutes; i++) {
            // Skip the first route (index 0) as it's the main route we already display
            if (i === 0 && result.routes.length > 1) continue;
            
            const route = result.routes[i];
            if (!route.legs || !route.legs[0] || !route.legs[0].steps) {
              continue; // Skip if route data is incomplete
            }
            
            // Create a path from the route's overview_path
            const path = route.overview_path.map(point => ({
              lat: point.lat(),
              lng: point.lng()
            }));
            
            // Randomly assign status (in real app would come from backend)
            // But make it more likely to be available than the main route
            const statuses = ['available', 'limited'];
            const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
            
            googleAltRoutes.push({
              name: `Alternative Route ${googleAltRoutes.length + 1}`,
              path: path,
              status: randomStatus,
              distance: route.legs[0].distance.text,
              duration: route.legs[0].duration.text
            });
          }
          
          // If Google didn't return alternative routes or only returned one (our main route),
          // create a manual alternative route as fallback
          if (googleAltRoutes.length === 0) {
            googleAltRoutes.push({
              name: 'Alternative Route 1',
              path: [
                start,
                { 
                  lat: (start.lat + end.lat) / 2 + 0.3, 
                  lng: (start.lng + end.lng) / 2 + 0.3 
                },
                end
              ],
              status: 'available',
              distance: 'Unknown',
              duration: 'Unknown'
            });
          }
          
          // Set the alternative routes
          setAlternativeRoutes(googleAltRoutes);
        } else {
          // Fallback to our manual routes if the API didn't return any
          const fallbackRoutes = [
            {
              name: 'Alternative Route 1',
              path: [
                start,
                { 
                  lat: (start.lat + end.lat) / 2 + 0.3, 
                  lng: (start.lng + end.lng) / 2 + 0.3 
                },
                end
              ],
              status: 'available',
              distance: 'Unknown',
              duration: 'Unknown'
            }
          ];
          
          setAlternativeRoutes(fallbackRoutes);
          console.log("Could not get alternative routes from Google Directions API. Status:", status);
        }
      }
    );
    
    // Add a second alternative route try using a different avoidance strategy
    directionsService.route(
      {
        origin: start,
        destination: end,
        travelMode: window.google.maps.TravelMode.DRIVING,
        avoidTolls: true,      // Avoid toll roads
        avoidHighways: false,  // Don't avoid highways this time
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK && result.routes.length > 0) {
          // Only add this as an alternative if it's different enough from our main route
          // Get the route
          const route = result.routes[0];
          
          if (!route.legs || !route.legs[0] || !route.legs[0].steps) {
            return; // Skip if route data is incomplete
          }
          
          // Create a path from the route's overview_path
          const path = route.overview_path.map(point => ({
            lat: point.lat(),
            lng: point.lng()
          }));
          
          // Add to alternatives if we don't already have enough
          setAlternativeRoutes(prevRoutes => {
            if (prevRoutes.length < 2) {
              return [
                ...prevRoutes, 
                {
                  name: `Alternative Route ${prevRoutes.length + 1}`,
                  path: path,
                  status: 'limited', // This route avoids tolls but might be longer
                  distance: route.legs[0].distance.text,
                  duration: route.legs[0].duration.text
                }
              ];
            }
            return prevRoutes;
          });
        }
      }
    );
  };

  // Handle segment click to show information
  const handleSegmentClick = (segment) => {
    setSelectedSegment(segment);
    setSelectedAltRoute(null); // Clear selected alternative route
  };

  // Handle alternative route click to show information
  const handleAltRouteClick = (route) => {
    setSelectedAltRoute(route);
    setSelectedSegment(null); // Clear selected segment
  };

  // Render custom segments, alternative routes, and gateway nodes
  const renderCustomSegments = () => {
    return (
      <>
        {/* Hide the default DirectionsRenderer with a really low opacity if we're using our custom segments */}
        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={{
              suppressMarkers: true, // Hide default markers
              polylineOptions: {
                strokeColor: '#4285F4',
                strokeWeight: 5,
                strokeOpacity: 0.0 // Invisible, we'll render our own polylines that follow the exact path
              }
            }}
          />
        )}
        
        {/* Render each segment with appropriate color based on status */}
        {routeSegments.map((segment) => {
          // Get the polyline path for this segment
          const pathPoints = polylinePaths[segment.pathIndex];
          
          // Get the start and end coordinates for markers
          const start = segmentCoordinates[segment.startIndex];
          const end = segmentCoordinates[segment.endIndex];
          
          // Calculate midpoint for the status indicator
          const midpointIndex = Math.floor(pathPoints.length / 2);
          const midpoint = pathPoints[midpointIndex] || {
            lat: (start.lat + end.lat) / 2,
            lng: (start.lng + end.lng) / 2
          };
          
          return (
            <React.Fragment key={segment.id}>
              <Polyline
                path={pathPoints}
                options={{
                  strokeColor: statusColors[segment.status],
                  strokeWeight: 5,
                  strokeOpacity: 0.8,
                  clickable: true,
                }}
                onClick={() => handleSegmentClick(segment)}
              />
              
              {/* Status indicator in the middle of the segment */}
              <Marker
                position={midpoint}
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 7,
                  fillColor: statusColors[segment.status],
                  fillOpacity: 1,
                  strokeWeight: 2,
                  strokeColor: '#FFFFFF'
                }}
                onClick={() => handleSegmentClick(segment)}
              />
            </React.Fragment>
          );
        })}
        
        {/* Display gateway nodes (border connection points) */}
        {gatewayNodes.map((node, index) => (
          <Marker
            key={`gateway-${index}`}
            position={node.location}
            icon={{
              path: window.google.maps.SymbolPath.STAR,
              scale: 10,
              fillColor: '#3F51B5',
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: '#FFFFFF'
            }}
            title={`Gateway: ${node.name}, ${node.country}`}
          />
        ))}
        
        {/* Show alternative routes when a segment is full */}
        {showAlternativeRoutes && alternativeRoutes.map((route, index) => (
          <Polyline
            key={`alt-route-${index}`}
            path={route.path}
            options={{
              strokeColor: statusColors[route.status],
              strokeWeight: 3,
              strokeOpacity: 0.6,
              strokePattern: [10, 5], // Dashed line style
              clickable: true,
            }}
            onClick={() => handleAltRouteClick(route)}
          />
        ))}
        
        {/* Information window for selected segment */}
        {selectedSegment && segmentCoordinates.length > 0 && polylinePaths.length > 0 && (
          <InfoWindow
            position={{
              lat: polylinePaths[selectedSegment.pathIndex][Math.floor(polylinePaths[selectedSegment.pathIndex].length / 2)].lat,
              lng: polylinePaths[selectedSegment.pathIndex][Math.floor(polylinePaths[selectedSegment.pathIndex].length / 2)].lng
            }}
            onCloseClick={() => setSelectedSegment(null)}
          >
            <div className="segment-info">
              <h3>{selectedSegment.name}</h3>
              <p className={`status status-${selectedSegment.status}`}>
                Status: {selectedSegment.status === 'available' ? 'Available' : 
                        selectedSegment.status === 'limited' ? 'Limited' : 'Full'}
              </p>
              {selectedSegment.status === 'full' && (
                <p className="alternative-message">This segment is full. Please check alternative routes.</p>
              )}
            </div>
          </InfoWindow>
        )}

        {/* Information window for selected alternative route */}
        {selectedAltRoute && (
          <InfoWindow
            position={{
              lat: selectedAltRoute.path[Math.floor(selectedAltRoute.path.length / 2)].lat,
              lng: selectedAltRoute.path[Math.floor(selectedAltRoute.path.length / 2)].lng
            }}
            onCloseClick={() => setSelectedAltRoute(null)}
          >
            <div className="segment-info">
              <h3>{selectedAltRoute.name}</h3>
              <p className={`status status-${selectedAltRoute.status}`}>
                Status: {selectedAltRoute.status === 'available' ? 'Available' : 
                        selectedAltRoute.status === 'limited' ? 'Limited' : 'Full'}
              </p>
              <p>This alternative route avoids full segments.</p>
              {selectedAltRoute.distance && selectedAltRoute.duration && (
                <div className="route-details">
                  <p><strong>Distance:</strong> {selectedAltRoute.distance}</p>
                  <p><strong>Est. Time:</strong> {selectedAltRoute.duration}</p>
                </div>
              )}
            </div>
          </InfoWindow>
        )}

        {/* Display the legend */}
        {(routeSegments.length > 0 || showLegend) && <RouteLegend statusColors={statusColors} />}
      </>
    );
  };

  // Render our custom segments for any route type
  if (directions || (routeNotPossible && startCoords && endCoords)) {
    return renderCustomSegments();
  }
  
  // Default case - don't render anything
  return null;
};

export default RouteSegments; 