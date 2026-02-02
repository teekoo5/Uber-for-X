/// Ride Offer Model
/// 
/// Represents a ride offer sent to drivers.

class RideOffer {
  final String rideId;
  final String pickupAddress;
  final double pickupLat;
  final double pickupLng;
  final String dropoffAddress;
  final double dropoffLat;
  final double dropoffLng;
  final double estimatedFare;
  final int distanceMeters;
  final int etaMinutes;
  final String vehicleType;
  final String? riderName;
  final double? riderRating;
  final DateTime expiresAt;

  const RideOffer({
    required this.rideId,
    required this.pickupAddress,
    required this.pickupLat,
    required this.pickupLng,
    required this.dropoffAddress,
    required this.dropoffLat,
    required this.dropoffLng,
    required this.estimatedFare,
    required this.distanceMeters,
    required this.etaMinutes,
    required this.vehicleType,
    this.riderName,
    this.riderRating,
    required this.expiresAt,
  });

  factory RideOffer.fromJson(Map<String, dynamic> json) {
    return RideOffer(
      rideId: json['rideId'] as String,
      pickupAddress: json['pickupAddress'] as String,
      pickupLat: (json['pickupLat'] as num).toDouble(),
      pickupLng: (json['pickupLng'] as num).toDouble(),
      dropoffAddress: json['dropoffAddress'] as String,
      dropoffLat: (json['dropoffLat'] as num).toDouble(),
      dropoffLng: (json['dropoffLng'] as num).toDouble(),
      estimatedFare: (json['estimatedFare'] as num).toDouble(),
      distanceMeters: json['distanceMeters'] as int,
      etaMinutes: json['etaMinutes'] as int,
      vehicleType: json['vehicleType'] as String,
      riderName: json['riderName'] as String?,
      riderRating: (json['riderRating'] as num?)?.toDouble(),
      expiresAt: DateTime.parse(json['expiresAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'rideId': rideId,
      'pickupAddress': pickupAddress,
      'pickupLat': pickupLat,
      'pickupLng': pickupLng,
      'dropoffAddress': dropoffAddress,
      'dropoffLat': dropoffLat,
      'dropoffLng': dropoffLng,
      'estimatedFare': estimatedFare,
      'distanceMeters': distanceMeters,
      'etaMinutes': etaMinutes,
      'vehicleType': vehicleType,
      'riderName': riderName,
      'riderRating': riderRating,
      'expiresAt': expiresAt.toIso8601String(),
    };
  }
}
