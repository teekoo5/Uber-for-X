/// Fare Estimate Model
/// 
/// Represents a fare estimate returned from the API.

class FareEstimate {
  final double baseFare;
  final double distanceFare;
  final double timeFare;
  final double bookingFee;
  final double surgeMultiplier;
  final double surgeAmount;
  final double subtotal;
  final double vatAmount;
  final double total;
  final String currency;
  final int estimatedDistanceMeters;
  final int estimatedDurationSeconds;

  const FareEstimate({
    required this.baseFare,
    required this.distanceFare,
    required this.timeFare,
    required this.bookingFee,
    required this.surgeMultiplier,
    required this.surgeAmount,
    required this.subtotal,
    required this.vatAmount,
    required this.total,
    required this.currency,
    required this.estimatedDistanceMeters,
    required this.estimatedDurationSeconds,
  });

  factory FareEstimate.fromJson(Map<String, dynamic> json) {
    return FareEstimate(
      baseFare: (json['baseFare'] as num).toDouble(),
      distanceFare: (json['distanceFare'] as num).toDouble(),
      timeFare: (json['timeFare'] as num).toDouble(),
      bookingFee: (json['bookingFee'] as num).toDouble(),
      surgeMultiplier: (json['surgeMultiplier'] as num).toDouble(),
      surgeAmount: (json['surgeAmount'] as num).toDouble(),
      subtotal: (json['subtotal'] as num).toDouble(),
      vatAmount: (json['vatAmount'] as num).toDouble(),
      total: (json['total'] as num).toDouble(),
      currency: json['currency'] as String,
      estimatedDistanceMeters: json['estimatedDistanceMeters'] as int,
      estimatedDurationSeconds: json['estimatedDurationSeconds'] as int,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'baseFare': baseFare,
      'distanceFare': distanceFare,
      'timeFare': timeFare,
      'bookingFee': bookingFee,
      'surgeMultiplier': surgeMultiplier,
      'surgeAmount': surgeAmount,
      'subtotal': subtotal,
      'vatAmount': vatAmount,
      'total': total,
      'currency': currency,
      'estimatedDistanceMeters': estimatedDistanceMeters,
      'estimatedDurationSeconds': estimatedDurationSeconds,
    };
  }
}
