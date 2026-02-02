/// Driver Provider
/// 
/// Manages state for drivers (online status, ride offers, active rides).

import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../models/ride.dart';
import '../models/ride_offer.dart';
import '../services/api_service.dart';
import '../config/flavor_config.dart';

/// Driver state
class DriverState {
  final bool isOnline;
  final bool isLoading;
  final RideOffer? pendingOffer;
  final int offerTimeRemaining;
  final Ride? currentRide;
  final String? rideStatus;
  final String? currentRoute;
  final int? etaMinutes;
  final double? todayEarnings;
  final int? todayRides;
  final double? rating;
  final double? acceptanceRate;
  final String? error;

  const DriverState({
    this.isOnline = false,
    this.isLoading = false,
    this.pendingOffer,
    this.offerTimeRemaining = 0,
    this.currentRide,
    this.rideStatus,
    this.currentRoute,
    this.etaMinutes,
    this.todayEarnings,
    this.todayRides,
    this.rating,
    this.acceptanceRate,
    this.error,
  });

  DriverState copyWith({
    bool? isOnline,
    bool? isLoading,
    RideOffer? pendingOffer,
    bool clearPendingOffer = false,
    int? offerTimeRemaining,
    Ride? currentRide,
    bool clearCurrentRide = false,
    String? rideStatus,
    String? currentRoute,
    int? etaMinutes,
    double? todayEarnings,
    int? todayRides,
    double? rating,
    double? acceptanceRate,
    String? error,
  }) {
    return DriverState(
      isOnline: isOnline ?? this.isOnline,
      isLoading: isLoading ?? this.isLoading,
      pendingOffer: clearPendingOffer ? null : (pendingOffer ?? this.pendingOffer),
      offerTimeRemaining: offerTimeRemaining ?? this.offerTimeRemaining,
      currentRide: clearCurrentRide ? null : (currentRide ?? this.currentRide),
      rideStatus: rideStatus ?? this.rideStatus,
      currentRoute: currentRoute ?? this.currentRoute,
      etaMinutes: etaMinutes ?? this.etaMinutes,
      todayEarnings: todayEarnings ?? this.todayEarnings,
      todayRides: todayRides ?? this.todayRides,
      rating: rating ?? this.rating,
      acceptanceRate: acceptanceRate ?? this.acceptanceRate,
      error: error,
    );
  }
}

/// Driver provider notifier
class DriverNotifier extends StateNotifier<DriverState> {
  final ApiService _apiService;
  Timer? _offerTimer;

  DriverNotifier(this._apiService) : super(const DriverState()) {
    _loadDriverStats();
  }

  /// Load driver statistics
  Future<void> _loadDriverStats() async {
    try {
      // In production, fetch from API
      state = state.copyWith(
        todayEarnings: 125.50,
        todayRides: 8,
        rating: 4.92,
        acceptanceRate: 0.95,
      );
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  /// Toggle online/offline status
  Future<void> toggleOnlineStatus() async {
    state = state.copyWith(isLoading: true);

    try {
      final newStatus = !state.isOnline;
      
      // In production, call API to update status
      // await _apiService.setDriverStatus(online: newStatus);
      
      state = state.copyWith(
        isOnline: newStatus,
        isLoading: false,
      );

      // If going online, start listening for ride offers
      if (newStatus) {
        _startListeningForOffers();
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Start listening for ride offers (mock implementation)
  void _startListeningForOffers() {
    // In production, this would connect to WebSocket
    // For demo, simulate a ride offer after 5 seconds
    Future.delayed(const Duration(seconds: 5), () {
      if (state.isOnline && state.currentRide == null) {
        _simulateRideOffer();
      }
    });
  }

  /// Simulate receiving a ride offer (for demo)
  void _simulateRideOffer() {
    final offer = RideOffer(
      rideId: 'demo-ride-${DateTime.now().millisecondsSinceEpoch}',
      pickupAddress: 'Helsinki Central Station, Kaivokatu 1',
      pickupLat: 60.1719,
      pickupLng: 24.9414,
      dropoffAddress: 'Helsinki-Vantaa Airport, Terminal 2',
      dropoffLat: 60.3172,
      dropoffLng: 24.9633,
      estimatedFare: 45.50,
      distanceMeters: 22000,
      etaMinutes: 8,
      vehicleType: 'standard',
      riderName: 'Matti V.',
      riderRating: 4.8,
      expiresAt: DateTime.now().add(const Duration(seconds: 30)),
    );

    state = state.copyWith(
      pendingOffer: offer,
      offerTimeRemaining: 30,
    );

    // Start countdown timer
    _startOfferCountdown();
  }

  /// Start countdown timer for ride offer
  void _startOfferCountdown() {
    _offerTimer?.cancel();
    _offerTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (state.offerTimeRemaining > 0) {
        state = state.copyWith(
          offerTimeRemaining: state.offerTimeRemaining - 1,
        );
      } else {
        // Offer expired
        timer.cancel();
        state = state.copyWith(clearPendingOffer: true);
        
        // Look for next offer
        if (state.isOnline) {
          _startListeningForOffers();
        }
      }
    });
  }

  /// Accept the current ride offer
  Future<void> acceptCurrentOffer() async {
    if (state.pendingOffer == null) return;

    _offerTimer?.cancel();
    state = state.copyWith(isLoading: true);

    try {
      final offer = state.pendingOffer!;
      
      // In production, call API to accept ride
      // final ride = await _apiService.acceptRide(offer.rideId);
      
      // Simulate successful accept
      final ride = Ride(
        id: offer.rideId,
        tenantId: FlavorConfig.instance.tenantId,
        riderId: 'rider-123',
        status: 'driver_assigned',
        pickupLat: offer.pickupLat,
        pickupLng: offer.pickupLng,
        pickupAddress: offer.pickupAddress,
        dropoffLat: offer.dropoffLat,
        dropoffLng: offer.dropoffLng,
        dropoffAddress: offer.dropoffAddress,
        vehicleType: offer.vehicleType,
        estimatedFare: offer.estimatedFare,
        currency: 'EUR',
        riderName: offer.riderName,
        rating: offer.riderRating,
        requestedAt: DateTime.now(),
        driverAssignedAt: DateTime.now(),
      );

      state = state.copyWith(
        isLoading: false,
        clearPendingOffer: true,
        currentRide: ride,
        rideStatus: 'driver_assigned',
        etaMinutes: offer.etaMinutes,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Decline the current ride offer
  void declineCurrentOffer() {
    _offerTimer?.cancel();
    state = state.copyWith(clearPendingOffer: true);
    
    // Look for next offer
    if (state.isOnline) {
      _startListeningForOffers();
    }
  }

  /// Mark as arrived at pickup
  Future<void> arrivedAtPickup() async {
    if (state.currentRide == null) return;

    state = state.copyWith(isLoading: true);

    try {
      // In production, call API
      // await _apiService.updateRideStatus(state.currentRide!.id, 'arrived');
      
      state = state.copyWith(
        isLoading: false,
        rideStatus: 'arrived',
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Start the ride
  Future<void> startRide() async {
    if (state.currentRide == null) return;

    state = state.copyWith(isLoading: true);

    try {
      // In production, call API
      // await _apiService.updateRideStatus(state.currentRide!.id, 'in_progress');
      
      state = state.copyWith(
        isLoading: false,
        rideStatus: 'in_progress',
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  /// Complete the ride
  Future<void> completeRide() async {
    if (state.currentRide == null) return;

    state = state.copyWith(isLoading: true);

    try {
      // In production, call API with actual distance/duration
      // await _apiService.completeRide(state.currentRide!.id, ...);
      
      // Update stats
      final newEarnings = (state.todayEarnings ?? 0) + 
          (state.currentRide!.estimatedFare ?? 0);
      final newRides = (state.todayRides ?? 0) + 1;

      state = state.copyWith(
        isLoading: false,
        clearCurrentRide: true,
        rideStatus: null,
        todayEarnings: newEarnings,
        todayRides: newRides,
      );

      // Look for next offer
      if (state.isOnline) {
        _startListeningForOffers();
      }
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  @override
  void dispose() {
    _offerTimer?.cancel();
    super.dispose();
  }
}

/// Provider for driver state
final driverProvider = StateNotifierProvider<DriverNotifier, DriverState>((ref) {
  final config = FlavorConfig.instance;
  final apiService = ApiService(
    baseUrl: config.apiEndpoint,
    tenantId: config.tenantId,
  );
  return DriverNotifier(apiService);
});
