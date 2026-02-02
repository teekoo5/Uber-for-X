/// Ride Model
/// 
/// Represents a ride/trip in the system.

class Ride {
  final String id;
  final String tenantId;
  final String riderId;
  final String? driverId;
  final String status;
  final double pickupLat;
  final double pickupLng;
  final String? pickupAddress;
  final double dropoffLat;
  final double dropoffLng;
  final String? dropoffAddress;
  final String vehicleType;
  final double? estimatedFare;
  final double? finalFare;
  final String currency;
  final int? estimatedDistanceMeters;
  final int? actualDistanceMeters;
  final int? estimatedDurationSeconds;
  final int? actualDurationSeconds;
  final String? riderName;
  final double? rating;
  final DateTime requestedAt;
  final DateTime? driverAssignedAt;
  final DateTime? driverArrivedAt;
  final DateTime? rideStartedAt;
  final DateTime? rideCompletedAt;

  const Ride({
    required this.id,
    required this.tenantId,
    required this.riderId,
    this.driverId,
    required this.status,
    required this.pickupLat,
    required this.pickupLng,
    this.pickupAddress,
    required this.dropoffLat,
    required this.dropoffLng,
    this.dropoffAddress,
    required this.vehicleType,
    this.estimatedFare,
    this.finalFare,
    required this.currency,
    this.estimatedDistanceMeters,
    this.actualDistanceMeters,
    this.estimatedDurationSeconds,
    this.actualDurationSeconds,
    this.riderName,
    this.rating,
    required this.requestedAt,
    this.driverAssignedAt,
    this.driverArrivedAt,
    this.rideStartedAt,
    this.rideCompletedAt,
  });

  factory Ride.fromJson(Map<String, dynamic> json) {
    return Ride(
      id: json['id'] as String,
      tenantId: json['tenantId'] as String,
      riderId: json['riderId'] as String,
      driverId: json['driverId'] as String?,
      status: json['status'] as String,
      pickupLat: double.parse(json['pickupLatitude'].toString()),
      pickupLng: double.parse(json['pickupLongitude'].toString()),
      pickupAddress: json['pickupAddress'] as String?,
      dropoffLat: double.parse(json['dropoffLatitude'].toString()),
      dropoffLng: double.parse(json['dropoffLongitude'].toString()),
      dropoffAddress: json['dropoffAddress'] as String?,
      vehicleType: json['vehicleTypeRequested'] as String? ?? 'standard',
      estimatedFare: json['estimatedFare'] != null 
          ? double.parse(json['estimatedFare'].toString()) 
          : null,
      finalFare: json['finalFare'] != null 
          ? double.parse(json['finalFare'].toString()) 
          : null,
      currency: json['currency'] as String? ?? 'EUR',
      estimatedDistanceMeters: json['estimatedDistanceMeters'] as int?,
      actualDistanceMeters: json['actualDistanceMeters'] as int?,
      estimatedDurationSeconds: json['estimatedDurationSeconds'] as int?,
      actualDurationSeconds: json['actualDurationSeconds'] as int?,
      riderName: json['rider']?['firstName'] as String?,
      rating: json['rider']?['averageRating'] != null
          ? double.parse(json['rider']['averageRating'].toString())
          : null,
      requestedAt: DateTime.parse(json['requestedAt'] as String),
      driverAssignedAt: json['driverAssignedAt'] != null
          ? DateTime.parse(json['driverAssignedAt'] as String)
          : null,
      driverArrivedAt: json['driverArrivedAt'] != null
          ? DateTime.parse(json['driverArrivedAt'] as String)
          : null,
      rideStartedAt: json['rideStartedAt'] != null
          ? DateTime.parse(json['rideStartedAt'] as String)
          : null,
      rideCompletedAt: json['rideCompletedAt'] != null
          ? DateTime.parse(json['rideCompletedAt'] as String)
          : null,
    );
  }

  bool get isActive => [
    'requested',
    'searching',
    'driver_assigned',
    'driver_arriving',
    'arrived',
    'in_progress',
  ].contains(status);

  bool get isCompleted => status == 'completed';

  bool get isCancelled => status.startsWith('cancelled');
}
