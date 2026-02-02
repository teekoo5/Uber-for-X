/// Map View Widget
/// 
/// Displays a map with current location, pickup/dropoff markers,
/// and route visualization.

import 'package:flutter/material.dart';

class MapView extends StatelessWidget {
  final double initialLatitude;
  final double initialLongitude;
  final double? pickupLatitude;
  final double? pickupLongitude;
  final double? dropoffLatitude;
  final double? dropoffLongitude;
  final bool showCurrentLocation;
  final String? routePolyline;
  final List<DriverMarker>? nearbyDrivers;
  final void Function(double lat, double lng)? onMapTap;

  const MapView({
    super.key,
    required this.initialLatitude,
    required this.initialLongitude,
    this.pickupLatitude,
    this.pickupLongitude,
    this.dropoffLatitude,
    this.dropoffLongitude,
    this.showCurrentLocation = true,
    this.routePolyline,
    this.nearbyDrivers,
    this.onMapTap,
  });

  @override
  Widget build(BuildContext context) {
    // In production, this would use google_maps_flutter or flutter_map
    // For now, we'll show a placeholder with simulated markers

    return Container(
      color: Colors.grey[200],
      child: Stack(
        children: [
          // Map placeholder - in production use GoogleMap widget
          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.map,
                  size: 64,
                  color: Colors.grey[400],
                ),
                const SizedBox(height: 16),
                Text(
                  'Map View',
                  style: TextStyle(
                    color: Colors.grey[600],
                    fontSize: 18,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  '${initialLatitude.toStringAsFixed(4)}, ${initialLongitude.toStringAsFixed(4)}',
                  style: TextStyle(
                    color: Colors.grey[500],
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),

          // Marker indicators at bottom
          if (pickupLatitude != null || dropoffLatitude != null)
            Positioned(
              bottom: 150,
              left: 16,
              right: 16,
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 8,
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (pickupLatitude != null)
                      Row(
                        children: [
                          const Icon(Icons.circle, color: Colors.green, size: 12),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Pickup: ${pickupLatitude!.toStringAsFixed(4)}, ${pickupLongitude!.toStringAsFixed(4)}',
                              style: const TextStyle(fontSize: 12),
                            ),
                          ),
                        ],
                      ),
                    if (dropoffLatitude != null) ...[
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          const Icon(Icons.location_on, color: Colors.red, size: 12),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'Dropoff: ${dropoffLatitude!.toStringAsFixed(4)}, ${dropoffLongitude!.toStringAsFixed(4)}',
                              style: const TextStyle(fontSize: 12),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ),

          // Nearby drivers indicator
          if (nearbyDrivers != null && nearbyDrivers!.isNotEmpty)
            Positioned(
              top: 100,
              right: 16,
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.1),
                      blurRadius: 4,
                    ),
                  ],
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.local_taxi, size: 16, color: Colors.amber),
                    const SizedBox(width: 4),
                    Text(
                      '${nearbyDrivers!.length} drivers nearby',
                      style: const TextStyle(fontSize: 12),
                    ),
                  ],
                ),
              ),
            ),

          // Tap handler overlay
          if (onMapTap != null)
            Positioned.fill(
              child: GestureDetector(
                onTapUp: (details) {
                  // Simulate converting tap to coordinates
                  // In production, use map controller to convert screen to geo
                  final box = context.findRenderObject() as RenderBox;
                  final localPosition = box.globalToLocal(details.globalPosition);
                  final width = box.size.width;
                  final height = box.size.height;

                  // Simple mapping for demo
                  final lat = initialLatitude + (0.5 - localPosition.dy / height) * 0.02;
                  final lng = initialLongitude + (localPosition.dx / width - 0.5) * 0.04;

                  onMapTap!(lat, lng);
                },
                child: Container(color: Colors.transparent),
              ),
            ),
        ],
      ),
    );
  }
}

/// Marker for nearby driver on map
class DriverMarker {
  final String driverId;
  final double latitude;
  final double longitude;
  final double heading;
  final String vehicleType;

  const DriverMarker({
    required this.driverId,
    required this.latitude,
    required this.longitude,
    required this.heading,
    required this.vehicleType,
  });
}
