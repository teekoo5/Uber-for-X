/// LocationService - Client-side location tracking and WebSocket communication
/// 
/// This service handles:
/// - GPS location tracking with configurable update intervals
/// - WebSocket connection to the backend LocationService
/// - Real-time location streaming to Redis GEO index
/// - Background location updates for driver tracking
library;

import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

import '../config/flavor_config.dart';
import '../config/app_config.dart';
import '../models/location_update.dart';

/// Location service for real-time GPS tracking and WebSocket communication
class LocationService {
  static final LocationService _instance = LocationService._();
  factory LocationService() => _instance;
  LocationService._();

  // WebSocket connection
  WebSocketChannel? _channel;
  StreamSubscription? _wsSubscription;
  
  // Location tracking
  StreamSubscription<Position>? _positionSubscription;
  Position? _lastKnownPosition;
  
  // State
  bool _isInitialized = false;
  bool _isConnected = false;
  bool _isTracking = false;
  
  // Stream controllers for state updates
  final _connectionStateController = StreamController<bool>.broadcast();
  final _locationUpdateController = StreamController<Position>.broadcast();
  final _driverLocationsController = StreamController<List<DriverLocation>>.broadcast();
  
  // Reconnection
  Timer? _reconnectTimer;
  int _reconnectAttempts = 0;
  static const int _maxReconnectAttempts = 5;
  
  /// Stream of connection state changes
  Stream<bool> get connectionState => _connectionStateController.stream;
  
  /// Stream of location updates
  Stream<Position> get locationUpdates => _locationUpdateController.stream;
  
  /// Stream of nearby driver locations
  Stream<List<DriverLocation>> get driverLocations => _driverLocationsController.stream;
  
  /// Current connection status
  bool get isConnected => _isConnected;
  
  /// Current tracking status
  bool get isTracking => _isTracking;
  
  /// Last known position
  Position? get lastKnownPosition => _lastKnownPosition;

  /// Initialize the location service
  Future<bool> initialize() async {
    if (_isInitialized) return true;
    
    try {
      // Check location permissions
      final permission = await _checkPermissions();
      if (!permission) {
        debugPrint('LocationService: Permission denied');
        return false;
      }
      
      _isInitialized = true;
      debugPrint('LocationService: Initialized successfully');
      return true;
    } catch (e) {
      debugPrint('LocationService: Initialization error - $e');
      return false;
    }
  }

  /// Check and request location permissions
  Future<bool> _checkPermissions() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      debugPrint('LocationService: Location services disabled');
      return false;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return false;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      debugPrint('LocationService: Permission permanently denied');
      return false;
    }

    return true;
  }

  /// Connect to the WebSocket location server
  Future<void> connect({required String userId, required String userType}) async {
    if (_isConnected) return;
    
    final config = FlavorConfig.instance;
    final wsUrl = '${config.wsEndpoint}/location?userId=$userId&userType=$userType&tenantId=${config.tenantId}';
    
    try {
      debugPrint('LocationService: Connecting to $wsUrl');
      
      _channel = WebSocketChannel.connect(Uri.parse(wsUrl));
      
      _wsSubscription = _channel!.stream.listen(
        _handleWebSocketMessage,
        onError: _handleWebSocketError,
        onDone: _handleWebSocketDone,
      );
      
      _isConnected = true;
      _reconnectAttempts = 0;
      _connectionStateController.add(true);
      
      debugPrint('LocationService: Connected successfully');
      
      // Start ping timer to keep connection alive
      _startPingTimer();
    } catch (e) {
      debugPrint('LocationService: Connection error - $e');
      _scheduleReconnect(userId: userId, userType: userType);
    }
  }

  /// Disconnect from the WebSocket server
  Future<void> disconnect() async {
    _reconnectTimer?.cancel();
    _wsSubscription?.cancel();
    await _channel?.sink.close();
    
    _isConnected = false;
    _connectionStateController.add(false);
    
    debugPrint('LocationService: Disconnected');
  }

  /// Start tracking location and streaming updates to the server
  Future<void> startTracking({required String driverId}) async {
    if (_isTracking) return;
    if (!_isInitialized) {
      await initialize();
    }
    
    _isTracking = true;
    
    // Configure location settings
    const locationSettings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 10, // Minimum distance (meters) before update
    );
    
    _positionSubscription = Geolocator.getPositionStream(
      locationSettings: locationSettings,
    ).listen((Position position) {
      _lastKnownPosition = position;
      _locationUpdateController.add(position);
      
      // Send location update to server
      _sendLocationUpdate(
        driverId: driverId,
        latitude: position.latitude,
        longitude: position.longitude,
        heading: position.heading,
        speed: position.speed,
        accuracy: position.accuracy,
      );
    });
    
    debugPrint('LocationService: Started tracking for driver $driverId');
  }

  /// Stop location tracking
  Future<void> stopTracking() async {
    _positionSubscription?.cancel();
    _positionSubscription = null;
    _isTracking = false;
    
    debugPrint('LocationService: Stopped tracking');
  }

  /// Send location update to the server
  void _sendLocationUpdate({
    required String driverId,
    required double latitude,
    required double longitude,
    required double heading,
    required double speed,
    required double accuracy,
  }) {
    if (!_isConnected || _channel == null) return;
    
    final update = LocationUpdate(
      driverId: driverId,
      latitude: latitude,
      longitude: longitude,
      heading: heading,
      speed: speed,
      accuracy: accuracy,
      timestamp: DateTime.now(),
      tenantId: FlavorConfig.instance.tenantId,
    );
    
    _channel!.sink.add(jsonEncode({
      'type': 'location_update',
      'payload': update.toJson(),
    }));
  }

  /// Request nearby drivers for a given location
  void requestNearbyDrivers({
    required double latitude,
    required double longitude,
    double radius = 5000.0, // Default 5km
  }) {
    if (!_isConnected || _channel == null) return;
    
    _channel!.sink.add(jsonEncode({
      'type': 'nearby_drivers',
      'payload': {
        'latitude': latitude,
        'longitude': longitude,
        'radius': radius,
        'tenantId': FlavorConfig.instance.tenantId,
      },
    }));
  }

  /// Get current position
  Future<Position?> getCurrentPosition() async {
    if (!_isInitialized) {
      final initialized = await initialize();
      if (!initialized) return null;
    }
    
    try {
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      );
      _lastKnownPosition = position;
      return position;
    } catch (e) {
      debugPrint('LocationService: Error getting current position - $e');
      return null;
    }
  }

  /// Calculate distance between two points using Haversine formula
  static double calculateDistance(
    double lat1, double lon1,
    double lat2, double lon2,
  ) {
    return Geolocator.distanceBetween(lat1, lon1, lat2, lon2);
  }

  /// Handle incoming WebSocket messages
  void _handleWebSocketMessage(dynamic message) {
    try {
      final data = jsonDecode(message as String);
      final type = data['type'] as String?;
      final payload = data['payload'];
      
      switch (type) {
        case 'nearby_drivers':
          final drivers = (payload as List)
              .map((d) => DriverLocation.fromJson(d))
              .toList();
          _driverLocationsController.add(drivers);
          break;
          
        case 'driver_location':
          // Single driver location update (for tracking assigned driver)
          final driver = DriverLocation.fromJson(payload);
          _driverLocationsController.add([driver]);
          break;
          
        case 'pong':
          // Connection alive confirmation
          break;
          
        case 'error':
          debugPrint('LocationService: Server error - ${payload['message']}');
          break;
          
        default:
          debugPrint('LocationService: Unknown message type - $type');
      }
    } catch (e) {
      debugPrint('LocationService: Error parsing message - $e');
    }
  }

  /// Handle WebSocket errors
  void _handleWebSocketError(dynamic error) {
    debugPrint('LocationService: WebSocket error - $error');
    _isConnected = false;
    _connectionStateController.add(false);
  }

  /// Handle WebSocket connection close
  void _handleWebSocketDone() {
    debugPrint('LocationService: WebSocket connection closed');
    _isConnected = false;
    _connectionStateController.add(false);
  }

  /// Schedule reconnection attempt
  void _scheduleReconnect({required String userId, required String userType}) {
    if (_reconnectAttempts >= _maxReconnectAttempts) {
      debugPrint('LocationService: Max reconnect attempts reached');
      return;
    }
    
    _reconnectAttempts++;
    final delay = Duration(seconds: AppConfig.wsReconnectDelay.inSeconds * _reconnectAttempts);
    
    debugPrint('LocationService: Scheduling reconnect in ${delay.inSeconds}s (attempt $_reconnectAttempts)');
    
    _reconnectTimer = Timer(delay, () {
      connect(userId: userId, userType: userType);
    });
  }

  /// Start ping timer to keep connection alive
  void _startPingTimer() {
    Timer.periodic(AppConfig.wsPingInterval, (timer) {
      if (_isConnected && _channel != null) {
        _channel!.sink.add(jsonEncode({'type': 'ping'}));
      } else {
        timer.cancel();
      }
    });
  }

  /// Dispose of resources
  void dispose() {
    _reconnectTimer?.cancel();
    _positionSubscription?.cancel();
    _wsSubscription?.cancel();
    _channel?.sink.close();
    _connectionStateController.close();
    _locationUpdateController.close();
    _driverLocationsController.close();
  }
}

/// Model for driver location data
class DriverLocation {
  final String driverId;
  final double latitude;
  final double longitude;
  final double heading;
  final double speed;
  final double distance; // Distance from rider
  final int eta; // Estimated time of arrival in seconds
  final String? vehicleType;
  final double? rating;

  DriverLocation({
    required this.driverId,
    required this.latitude,
    required this.longitude,
    required this.heading,
    required this.speed,
    required this.distance,
    required this.eta,
    this.vehicleType,
    this.rating,
  });

  factory DriverLocation.fromJson(Map<String, dynamic> json) {
    return DriverLocation(
      driverId: json['driverId'] as String,
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      heading: (json['heading'] as num?)?.toDouble() ?? 0.0,
      speed: (json['speed'] as num?)?.toDouble() ?? 0.0,
      distance: (json['distance'] as num?)?.toDouble() ?? 0.0,
      eta: (json['eta'] as num?)?.toInt() ?? 0,
      vehicleType: json['vehicleType'] as String?,
      rating: (json['rating'] as num?)?.toDouble(),
    );
  }
}
