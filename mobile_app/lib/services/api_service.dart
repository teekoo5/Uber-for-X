/// API Service
/// 
/// HTTP client for communicating with the Core API.

import 'dart:convert';
import 'package:http/http.dart' as http;

import '../models/fare_estimate.dart';
import '../models/ride.dart';

class ApiService {
  final String baseUrl;
  final String tenantId;
  String? _accessToken;

  ApiService({
    required this.baseUrl,
    required this.tenantId,
  });

  /// Set access token for authenticated requests
  void setAccessToken(String token) {
    _accessToken = token;
  }

  /// Get headers for requests
  Map<String, String> get _headers {
    final headers = {
      'Content-Type': 'application/json',
      'X-Tenant-ID': tenantId,
    };
    if (_accessToken != null) {
      headers['Authorization'] = 'Bearer $_accessToken';
    }
    return headers;
  }

  /// Get fare estimate
  Future<FareEstimate> getFareEstimate({
    required double pickupLat,
    required double pickupLng,
    required double dropoffLat,
    required double dropoffLng,
    String vehicleType = 'standard',
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/v1/rides/estimate'),
      headers: _headers,
      body: jsonEncode({
        'pickupLatitude': pickupLat,
        'pickupLongitude': pickupLng,
        'dropoffLatitude': dropoffLat,
        'dropoffLongitude': dropoffLng,
        'vehicleType': vehicleType,
      }),
    );

    if (response.statusCode != 200) {
      throw ApiException('Failed to get fare estimate', response.statusCode);
    }

    final json = jsonDecode(response.body);
    return FareEstimate.fromJson(json['data']);
  }

  /// Create a new ride
  Future<Ride> createRide({
    required double pickupLat,
    required double pickupLng,
    required String pickupAddress,
    required double dropoffLat,
    required double dropoffLng,
    required String dropoffAddress,
    String vehicleType = 'standard',
    String paymentMethod = 'card',
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/v1/rides'),
      headers: _headers,
      body: jsonEncode({
        'pickupLatitude': pickupLat,
        'pickupLongitude': pickupLng,
        'pickupAddress': pickupAddress,
        'dropoffLatitude': dropoffLat,
        'dropoffLongitude': dropoffLng,
        'dropoffAddress': dropoffAddress,
        'vehicleType': vehicleType,
        'paymentMethod': paymentMethod,
      }),
    );

    if (response.statusCode != 201) {
      throw ApiException('Failed to create ride', response.statusCode);
    }

    final json = jsonDecode(response.body);
    return Ride.fromJson(json['data']['ride']);
  }

  /// Get ride by ID
  Future<Ride> getRide(String rideId) async {
    final response = await http.get(
      Uri.parse('$baseUrl/api/v1/rides/$rideId'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw ApiException('Failed to get ride', response.statusCode);
    }

    final json = jsonDecode(response.body);
    return Ride.fromJson(json['data']);
  }

  /// Cancel a ride
  Future<void> cancelRide({
    required String rideId,
    String? reason,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/v1/rides/$rideId/cancel'),
      headers: _headers,
      body: jsonEncode({
        'reason': reason,
      }),
    );

    if (response.statusCode != 200) {
      throw ApiException('Failed to cancel ride', response.statusCode);
    }
  }

  /// Update ride status (driver)
  Future<Ride> updateRideStatus(String rideId, String status) async {
    final response = await http.patch(
      Uri.parse('$baseUrl/api/v1/rides/$rideId/status'),
      headers: _headers,
      body: jsonEncode({
        'status': status,
      }),
    );

    if (response.statusCode != 200) {
      throw ApiException('Failed to update ride status', response.statusCode);
    }

    final json = jsonDecode(response.body);
    return Ride.fromJson(json['data']);
  }

  /// Complete a ride (driver)
  Future<Ride> completeRide({
    required String rideId,
    required int actualDistanceMeters,
    required int actualDurationSeconds,
    double? taximeterFare,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/v1/rides/$rideId/complete'),
      headers: _headers,
      body: jsonEncode({
        'actualDistanceMeters': actualDistanceMeters,
        'actualDurationSeconds': actualDurationSeconds,
        'taximeterFare': taximeterFare,
      }),
    );

    if (response.statusCode != 200) {
      throw ApiException('Failed to complete ride', response.statusCode);
    }

    final json = jsonDecode(response.body);
    return Ride.fromJson(json['data']);
  }

  /// Get ride history
  Future<List<Ride>> getRideHistory({
    int limit = 20,
    int offset = 0,
    String? status,
  }) async {
    final queryParams = {
      'limit': limit.toString(),
      'offset': offset.toString(),
      if (status != null) 'status': status,
    };

    final uri = Uri.parse('$baseUrl/api/v1/rides')
        .replace(queryParameters: queryParams);

    final response = await http.get(uri, headers: _headers);

    if (response.statusCode != 200) {
      throw ApiException('Failed to get ride history', response.statusCode);
    }

    final json = jsonDecode(response.body);
    final List<dynamic> ridesJson = json['data'];
    return ridesJson.map((r) => Ride.fromJson(r)).toList();
  }

  /// Initialize payment
  Future<Map<String, dynamic>> initializePayment(String rideId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/v1/rides/$rideId/pay'),
      headers: _headers,
    );

    if (response.statusCode != 200) {
      throw ApiException('Failed to initialize payment', response.statusCode);
    }

    final json = jsonDecode(response.body);
    return json['data'];
  }

  /// Login
  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/v1/auth/login'),
      headers: _headers,
      body: jsonEncode({
        'email': email,
        'password': password,
        'tenantId': tenantId,
      }),
    );

    if (response.statusCode != 200) {
      throw ApiException('Login failed', response.statusCode);
    }

    final json = jsonDecode(response.body);
    _accessToken = json['data']['tokens']['accessToken'];
    return json['data'];
  }

  /// Register
  Future<Map<String, dynamic>> register({
    required String email,
    required String phone,
    required String password,
    required String firstName,
    required String lastName,
    required String userType,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/api/v1/auth/register'),
      headers: _headers,
      body: jsonEncode({
        'email': email,
        'phone': phone,
        'password': password,
        'firstName': firstName,
        'lastName': lastName,
        'userType': userType,
        'tenantId': tenantId,
      }),
    );

    if (response.statusCode != 201) {
      throw ApiException('Registration failed', response.statusCode);
    }

    final json = jsonDecode(response.body);
    _accessToken = json['data']['tokens']['accessToken'];
    return json['data'];
  }
}

class ApiException implements Exception {
  final String message;
  final int statusCode;

  ApiException(this.message, this.statusCode);

  @override
  String toString() => 'ApiException: $message (status: $statusCode)';
}
