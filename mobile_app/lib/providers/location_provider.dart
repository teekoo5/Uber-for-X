/// Location Provider
/// 
/// Manages device location and location streaming to the backend.

import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

import '../services/location_service.dart';

/// Location state
class LocationState {
  final double? latitude;
  final double? longitude;
  final double? heading;
  final double? speed;
  final double? accuracy;
  final bool isTracking;
  final bool isConnected;
  final String? error;

  const LocationState({
    this.latitude,
    this.longitude,
    this.heading,
    this.speed,
    this.accuracy,
    this.isTracking = false,
    this.isConnected = false,
    this.error,
  });

  LocationState copyWith({
    double? latitude,
    double? longitude,
    double? heading,
    double? speed,
    double? accuracy,
    bool? isTracking,
    bool? isConnected,
    String? error,
  }) {
    return LocationState(
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      heading: heading ?? this.heading,
      speed: speed ?? this.speed,
      accuracy: accuracy ?? this.accuracy,
      isTracking: isTracking ?? this.isTracking,
      isConnected: isConnected ?? this.isConnected,
      error: error,
    );
  }
}

/// Location provider notifier
class LocationNotifier extends StateNotifier<LocationState> {
  final LocationService _locationService;
  StreamSubscription<Position>? _locationSubscription;
  StreamSubscription<bool>? _connectionSubscription;

  LocationNotifier(this._locationService) : super(const LocationState()) {
    _init();
  }

  Future<void> _init() async {
    await _locationService.initialize();
    
    // Listen to connection state
    _connectionSubscription = _locationService.connectionState.listen((connected) {
      state = state.copyWith(isConnected: connected);
    });
    
    // Listen to location updates
    _locationSubscription = _locationService.locationUpdates.listen((position) {
      state = state.copyWith(
        latitude: position.latitude,
        longitude: position.longitude,
        heading: position.heading,
        speed: position.speed,
        accuracy: position.accuracy,
        error: null,
      );
    });
  }

  /// Get current location once
  Future<void> getCurrentLocation() async {
    try {
      final position = await _locationService.getCurrentPosition();
      if (position != null) {
        state = state.copyWith(
          latitude: position.latitude,
          longitude: position.longitude,
          heading: position.heading,
          speed: position.speed,
          accuracy: position.accuracy,
          error: null,
        );
      }
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  /// Connect to WebSocket
  Future<void> connect({required String userId, required String userType}) async {
    await _locationService.connect(userId: userId, userType: userType);
  }

  /// Start continuous location updates (for drivers)
  Future<void> startLocationUpdates({String? driverId}) async {
    if (state.isTracking) return;

    try {
      state = state.copyWith(isTracking: true);
      await _locationService.startTracking(driverId: driverId ?? 'unknown');
    } catch (e) {
      state = state.copyWith(isTracking: false, error: e.toString());
    }
  }

  /// Stop location updates
  Future<void> stopLocationUpdates() async {
    await _locationService.stopTracking();
    state = state.copyWith(isTracking: false);
  }

  /// Request nearby drivers
  void requestNearbyDrivers({double radius = 5000}) {
    if (state.latitude != null && state.longitude != null) {
      _locationService.requestNearbyDrivers(
        latitude: state.latitude!,
        longitude: state.longitude!,
        radius: radius,
      );
    }
  }

  @override
  void dispose() {
    _locationSubscription?.cancel();
    _connectionSubscription?.cancel();
    _locationService.dispose();
    super.dispose();
  }
}

/// Provider for location state
final locationProvider = StateNotifierProvider<LocationNotifier, LocationState>((ref) {
  return LocationNotifier(LocationService());
});
