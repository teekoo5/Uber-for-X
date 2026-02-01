/// AppConfig - Application-wide configuration and constants
/// 
/// Contains configuration for API endpoints, timeouts, feature flags,
/// and Finnish market-specific settings.
library;

import 'flavor_config.dart';

/// Application configuration singleton
class AppConfig {
  static final AppConfig _instance = AppConfig._();
  static AppConfig get instance => _instance;
  
  AppConfig._();

  /// Get flavor-specific configuration
  FlavorConfig get flavor => FlavorConfig.instance;

  // ============================================
  // API Configuration
  // ============================================
  
  /// Base API endpoint from flavor config
  String get apiBaseUrl => flavor.apiEndpoint;
  
  /// WebSocket endpoint for real-time communication
  String get wsEndpoint => flavor.wsEndpoint;
  
  /// API version
  static const String apiVersion = 'v1';
  
  /// Full API URL with version
  String get apiUrl => '$apiBaseUrl/api/$apiVersion';

  // ============================================
  // Timeout Configuration
  // ============================================
  
  /// HTTP request timeout
  static const Duration httpTimeout = Duration(seconds: 30);
  
  /// WebSocket ping interval
  static const Duration wsPingInterval = Duration(seconds: 30);
  
  /// WebSocket reconnect delay
  static const Duration wsReconnectDelay = Duration(seconds: 5);
  
  /// Location update interval (seconds)
  static const int locationUpdateIntervalSeconds = 5;
  
  /// Driver location stream timeout
  static const Duration driverLocationTimeout = Duration(seconds: 10);

  // ============================================
  // Geolocation Configuration
  // ============================================
  
  /// Minimum distance (meters) before location update
  static const double locationDistanceFilter = 10.0;
  
  /// Location accuracy preference
  static const String locationAccuracy = 'high';
  
  /// Default search radius for drivers (meters)
  static const double defaultSearchRadius = 5000.0;
  
  /// Maximum search radius for drivers (meters)
  static const double maxSearchRadius = 50000.0;

  // ============================================
  // Finnish Market Configuration
  // ============================================
  
  /// VAT rate for passenger transport (13.5% as of 2026)
  static const double vatRatePassengerTransport = 0.135;
  
  /// VAT rate for other services (25.5%)
  static const double vatRateOther = 0.255;
  
  /// Currency code
  static const String currencyCode = 'EUR';
  
  /// Currency symbol
  static const String currencySymbol = '€';
  
  /// Default country code
  static const String defaultCountryCode = 'FI';
  
  /// Phone number prefix
  static const String phonePrefix = '+358';
  
  /// Traficom API for taxi license verification
  static const String traficomApiUrl = 'https://api.traficom.fi';
  
  /// Enable taximeter integration (2026 mandate)
  bool get enableTaximeter => flavor.enableTaximeter;
  
  /// Vero API endpoint for fiscal reporting
  String get veroApiEndpoint => flavor.veroApiEndpoint;

  // ============================================
  // Payment Configuration
  // ============================================
  
  /// Stripe publishable key
  String get stripePublishableKey => flavor.stripePublishableKey;
  
  /// Supported payment methods
  static const List<String> supportedPaymentMethods = [
    'card',
    'mobilepay',
    'bank_transfer',
  ];
  
  /// Minimum fare amount (EUR)
  static const double minimumFare = 5.0;

  // ============================================
  // Driver Configuration
  // ============================================
  
  /// Maximum concurrent ride offers to a driver
  static const int maxConcurrentOffers = 1;
  
  /// Time to accept ride offer (seconds)
  static const int rideOfferTimeoutSeconds = 30;
  
  /// Driver rating threshold for premium rides
  static const double premiumRatingThreshold = 4.5;

  // ============================================
  // Accessibility Configuration (EN 301 549)
  // ============================================
  
  /// Minimum touch target size (dp) - WCAG 2.1 AA
  static const double minTouchTargetSize = 44.0;
  
  /// Minimum contrast ratio for text
  static const double minContrastRatio = 4.5;
  
  /// Large text contrast ratio
  static const double largeTextContrastRatio = 3.0;
  
  /// Enable high contrast mode
  static bool highContrastMode = false;
  
  /// Text scale factor limit
  static const double maxTextScaleFactor = 2.0;

  // ============================================
  // Cache Configuration
  // ============================================
  
  /// Cache duration for user profile
  static const Duration profileCacheDuration = Duration(hours: 1);
  
  /// Cache duration for trip history
  static const Duration tripHistoryCacheDuration = Duration(minutes: 30);

  // ============================================
  // Feature Flags
  // ============================================
  
  /// Enable surge pricing
  static const bool enableSurgePricing = true;
  
  /// Enable scheduled rides
  static const bool enableScheduledRides = true;
  
  /// Enable ride sharing
  static const bool enableRideSharing = false;
  
  /// Enable in-app chat
  static const bool enableChat = true;
  
  /// Enable SOS emergency button
  static const bool enableSOS = true;
  
  /// Enable driver ratings
  static const bool enableRatings = true;
}

/// Environment types
enum Environment {
  development,
  staging,
  production,
}

/// Get current environment based on API endpoint
Environment getCurrentEnvironment() {
  final apiUrl = AppConfig.instance.apiBaseUrl;
  if (apiUrl.contains('localhost') || apiUrl.contains('127.0.0.1')) {
    return Environment.development;
  } else if (apiUrl.contains('staging')) {
    return Environment.staging;
  }
  return Environment.production;
}
