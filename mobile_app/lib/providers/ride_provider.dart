/// Ride Provider
/// 
/// Manages ride state for riders (booking, tracking, history).

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/fare_estimate.dart';
import '../models/ride.dart';
import '../services/api_service.dart';
import '../config/flavor_config.dart';

/// Ride state for riders
class RideState {
  final bool isLoading;
  final FareEstimate? fareEstimate;
  final Ride? currentRide;
  final List<Ride> rideHistory;
  final String? error;

  const RideState({
    this.isLoading = false,
    this.fareEstimate,
    this.currentRide,
    this.rideHistory = const [],
    this.error,
  });

  RideState copyWith({
    bool? isLoading,
    FareEstimate? fareEstimate,
    Ride? currentRide,
    List<Ride>? rideHistory,
    String? error,
  }) {
    return RideState(
      isLoading: isLoading ?? this.isLoading,
      fareEstimate: fareEstimate ?? this.fareEstimate,
      currentRide: currentRide,
      rideHistory: rideHistory ?? this.rideHistory,
      error: error,
    );
  }
}

/// Ride provider notifier
class RideNotifier extends StateNotifier<RideState> {
  final ApiService _apiService;

  RideNotifier(this._apiService) : super(const RideState());

  /// Get fare estimate for a route
  Future<void> getFareEstimate({
    required double pickupLat,
    required double pickupLng,
    required double dropoffLat,
    required double dropoffLng,
    String vehicleType = 'standard',
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final estimate = await _apiService.getFareEstimate(
        pickupLat: pickupLat,
        pickupLng: pickupLng,
        dropoffLat: dropoffLat,
        dropoffLng: dropoffLng,
        vehicleType: vehicleType,
      );
      state = state.copyWith(
        isLoading: false,
        fareEstimate: estimate,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Create a new ride request
  Future<void> createRide({
    required double pickupLat,
    required double pickupLng,
    required String pickupAddress,
    required double dropoffLat,
    required double dropoffLng,
    required String dropoffAddress,
    String vehicleType = 'standard',
    String paymentMethod = 'card',
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final ride = await _apiService.createRide(
        pickupLat: pickupLat,
        pickupLng: pickupLng,
        pickupAddress: pickupAddress,
        dropoffLat: dropoffLat,
        dropoffLng: dropoffLng,
        dropoffAddress: dropoffAddress,
        vehicleType: vehicleType,
        paymentMethod: paymentMethod,
      );
      state = state.copyWith(
        isLoading: false,
        currentRide: ride,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Cancel the current ride
  Future<void> cancelRide({String? reason}) async {
    if (state.currentRide == null) return;

    state = state.copyWith(isLoading: true, error: null);

    try {
      await _apiService.cancelRide(
        rideId: state.currentRide!.id,
        reason: reason,
      );
      state = state.copyWith(
        isLoading: false,
        currentRide: null,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Load ride history
  Future<void> loadRideHistory() async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final rides = await _apiService.getRideHistory();
      state = state.copyWith(
        isLoading: false,
        rideHistory: rides,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Clear fare estimate
  void clearFareEstimate() {
    state = state.copyWith(fareEstimate: null);
  }

  /// Update current ride from WebSocket event
  void updateCurrentRide(Ride ride) {
    state = state.copyWith(currentRide: ride);
  }

  /// Clear current ride
  void clearCurrentRide() {
    state = state.copyWith(currentRide: null);
  }
}

/// Provider for rider state
final rideProvider = StateNotifierProvider<RideNotifier, RideState>((ref) {
  final config = FlavorConfig.instance;
  final apiService = ApiService(
    baseUrl: config.apiEndpoint,
    tenantId: config.tenantId,
  );
  return RideNotifier(apiService);
});
