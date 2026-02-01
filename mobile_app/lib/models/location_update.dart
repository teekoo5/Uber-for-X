/// LocationUpdate - Model for location data sent to the backend
/// 
/// Contains GPS coordinates, heading, speed, and metadata for
/// real-time driver tracking and Redis GEO index updates.
library;

/// Location update data model
class LocationUpdate {
  final String driverId;
  final double latitude;
  final double longitude;
  final double heading;
  final double speed;
  final double accuracy;
  final DateTime timestamp;
  final String tenantId;

  LocationUpdate({
    required this.driverId,
    required this.latitude,
    required this.longitude,
    required this.heading,
    required this.speed,
    required this.accuracy,
    required this.timestamp,
    required this.tenantId,
  });

  Map<String, dynamic> toJson() {
    return {
      'driverId': driverId,
      'latitude': latitude,
      'longitude': longitude,
      'heading': heading,
      'speed': speed,
      'accuracy': accuracy,
      'timestamp': timestamp.toIso8601String(),
      'tenantId': tenantId,
    };
  }

  factory LocationUpdate.fromJson(Map<String, dynamic> json) {
    return LocationUpdate(
      driverId: json['driverId'] as String,
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      heading: (json['heading'] as num?)?.toDouble() ?? 0.0,
      speed: (json['speed'] as num?)?.toDouble() ?? 0.0,
      accuracy: (json['accuracy'] as num?)?.toDouble() ?? 0.0,
      timestamp: DateTime.parse(json['timestamp'] as String),
      tenantId: json['tenantId'] as String,
    );
  }

  @override
  String toString() {
    return 'LocationUpdate(driver: $driverId, lat: $latitude, lng: $longitude)';
  }
}

/// Rider location for booking requests
class RiderLocation {
  final String riderId;
  final double pickupLatitude;
  final double pickupLongitude;
  final double? destinationLatitude;
  final double? destinationLongitude;
  final String? pickupAddress;
  final String? destinationAddress;
  final DateTime timestamp;
  final String tenantId;

  RiderLocation({
    required this.riderId,
    required this.pickupLatitude,
    required this.pickupLongitude,
    this.destinationLatitude,
    this.destinationLongitude,
    this.pickupAddress,
    this.destinationAddress,
    required this.timestamp,
    required this.tenantId,
  });

  Map<String, dynamic> toJson() {
    return {
      'riderId': riderId,
      'pickupLatitude': pickupLatitude,
      'pickupLongitude': pickupLongitude,
      'destinationLatitude': destinationLatitude,
      'destinationLongitude': destinationLongitude,
      'pickupAddress': pickupAddress,
      'destinationAddress': destinationAddress,
      'timestamp': timestamp.toIso8601String(),
      'tenantId': tenantId,
    };
  }

  factory RiderLocation.fromJson(Map<String, dynamic> json) {
    return RiderLocation(
      riderId: json['riderId'] as String,
      pickupLatitude: (json['pickupLatitude'] as num).toDouble(),
      pickupLongitude: (json['pickupLongitude'] as num).toDouble(),
      destinationLatitude: (json['destinationLatitude'] as num?)?.toDouble(),
      destinationLongitude: (json['destinationLongitude'] as num?)?.toDouble(),
      pickupAddress: json['pickupAddress'] as String?,
      destinationAddress: json['destinationAddress'] as String?,
      timestamp: DateTime.parse(json['timestamp'] as String),
      tenantId: json['tenantId'] as String,
    );
  }
}

/// Vehicle type enumeration for Finnish market
enum VehicleType {
  standard,    // Normal taxi
  premium,     // Premium/luxury vehicle
  accessible,  // Wheelchair accessible
  large,       // Minivan/large vehicle
  electric,    // Electric vehicle
}

extension VehicleTypeExtension on VehicleType {
  String get displayName {
    switch (this) {
      case VehicleType.standard:
        return 'Standard';
      case VehicleType.premium:
        return 'Premium';
      case VehicleType.accessible:
        return 'Accessible';
      case VehicleType.large:
        return 'Large';
      case VehicleType.electric:
        return 'Electric';
    }
  }

  String get finnishName {
    switch (this) {
      case VehicleType.standard:
        return 'Tavallinen';
      case VehicleType.premium:
        return 'Premium';
      case VehicleType.accessible:
        return 'Esteetön';
      case VehicleType.large:
        return 'Tilataksi';
      case VehicleType.electric:
        return 'Sähkötaksi';
    }
  }
}
