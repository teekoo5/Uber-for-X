/// FlavorConfig - Multi-flavor configuration for white-label mobility platform
/// 
/// This class handles compile-time environment configuration via --dart-define flags.
/// Each white-label client (taxi company) has its own flavor with unique branding,
/// API endpoints, and tenant identification.
/// 
/// Usage:
/// ```bash
/// # Helsinki Taxi flavor
/// flutter run --dart-define=FLAVOR=helsinki_taxi \
///   --dart-define=API_ENDPOINT=https://api.helsinkitaxi.fi \
///   --dart-define=TENANT_ID=helsinki_001 \
///   --dart-define=WS_ENDPOINT=wss://ws.helsinkitaxi.fi \
///   --dart-define=APP_NAME="Helsinki Taxi" \
///   --dart-define=MAPS_API_KEY=your_google_maps_key
/// 
/// # White Label Base (development)
/// flutter run --dart-define=FLAVOR=white_label_base \
///   --dart-define=API_ENDPOINT=http://localhost:3000 \
///   --dart-define=TENANT_ID=dev_tenant \
///   --dart-define=WS_ENDPOINT=ws://localhost:3001
/// ```
library;

import 'package:flutter/material.dart';

/// Supported flavor types for the white-label platform
enum FlavorType {
  helsinkiTaxi,
  whiteLabelBase,
}

/// Immutable configuration class for flavor-specific settings
class FlavorConfig {
  // Singleton instance
  static FlavorConfig? _instance;
  
  // Compile-time constants from --dart-define
  static const String _flavor = String.fromEnvironment('FLAVOR', defaultValue: 'white_label_base');
  static const String _apiEndpoint = String.fromEnvironment('API_ENDPOINT', defaultValue: 'http://localhost:3000');
  static const String _wsEndpoint = String.fromEnvironment('WS_ENDPOINT', defaultValue: 'ws://localhost:3001');
  static const String _tenantId = String.fromEnvironment('TENANT_ID', defaultValue: 'dev_tenant');
  static const String _appName = String.fromEnvironment('APP_NAME', defaultValue: 'Mobility App');
  static const String _mapsApiKey = String.fromEnvironment('MAPS_API_KEY', defaultValue: '');
  static const String _stripePublishableKey = String.fromEnvironment('STRIPE_PUBLISHABLE_KEY', defaultValue: '');
  static const bool _enableTaximeter = bool.fromEnvironment('ENABLE_TAXIMETER', defaultValue: true);
  static const String _veroApiEndpoint = String.fromEnvironment('VERO_API_ENDPOINT', defaultValue: '');
  
  /// Flavor identification
  final FlavorType flavorType;
  final String flavorName;
  
  /// API Configuration
  final String apiEndpoint;
  final String wsEndpoint;
  final String tenantId;
  
  /// App Branding
  final String appName;
  final String assetPath;
  
  /// Third-party APIs
  final String mapsApiKey;
  final String stripePublishableKey;
  
  /// Finnish Market Features
  final bool enableTaximeter;
  final String veroApiEndpoint;
  
  /// Theme Configuration
  final FlavorTheme theme;

  FlavorConfig._({
    required this.flavorType,
    required this.flavorName,
    required this.apiEndpoint,
    required this.wsEndpoint,
    required this.tenantId,
    required this.appName,
    required this.assetPath,
    required this.mapsApiKey,
    required this.stripePublishableKey,
    required this.enableTaximeter,
    required this.veroApiEndpoint,
    required this.theme,
  });

  /// Get the singleton instance of FlavorConfig
  static FlavorConfig get instance {
    _instance ??= _createFromEnvironment();
    return _instance!;
  }

  /// Create configuration from compile-time environment variables
  static FlavorConfig _createFromEnvironment() {
    final flavorType = _parseFlavorType(_flavor);
    final theme = _getThemeForFlavor(flavorType);
    
    return FlavorConfig._(
      flavorType: flavorType,
      flavorName: _flavor,
      apiEndpoint: _apiEndpoint,
      wsEndpoint: _wsEndpoint,
      tenantId: _tenantId,
      appName: _appName,
      assetPath: 'assets/$_flavor/',
      mapsApiKey: _mapsApiKey,
      stripePublishableKey: _stripePublishableKey,
      enableTaximeter: _enableTaximeter,
      veroApiEndpoint: _veroApiEndpoint,
      theme: theme,
    );
  }

  /// Parse flavor string to FlavorType enum
  static FlavorType _parseFlavorType(String flavor) {
    switch (flavor.toLowerCase()) {
      case 'helsinki_taxi':
        return FlavorType.helsinkiTaxi;
      case 'white_label_base':
      default:
        return FlavorType.whiteLabelBase;
    }
  }

  /// Get theme configuration for a specific flavor
  static FlavorTheme _getThemeForFlavor(FlavorType type) {
    switch (type) {
      case FlavorType.helsinkiTaxi:
        return FlavorTheme.helsinkiTaxi();
      case FlavorType.whiteLabelBase:
        return FlavorTheme.whiteLabelBase();
    }
  }

  /// Check if running in production mode
  bool get isProduction => !apiEndpoint.contains('localhost');

  /// Check if this is the Helsinki Taxi flavor
  bool get isHelsinkiTaxi => flavorType == FlavorType.helsinkiTaxi;

  /// Get the full asset path for a flavor-specific resource
  String getAsset(String assetName) => '$assetPath$assetName';

  /// Get common asset path
  String getCommonAsset(String assetName) => 'assets/common/$assetName';

  @override
  String toString() {
    return 'FlavorConfig(flavor: $flavorName, tenant: $tenantId, api: $apiEndpoint)';
  }
}

/// Theme configuration for each white-label flavor
class FlavorTheme {
  final Color primaryColor;
  final Color secondaryColor;
  final Color accentColor;
  final Color backgroundColor;
  final Color surfaceColor;
  final Color errorColor;
  final Color onPrimaryColor;
  final Color onSecondaryColor;
  final Color textPrimaryColor;
  final Color textSecondaryColor;
  
  /// Accessibility - High contrast mode colors
  final Color highContrastPrimary;
  final Color highContrastBackground;
  final Color highContrastText;
  
  /// Logo paths
  final String logoPath;
  final String logoLightPath;
  final String splashPath;
  final String appIconPath;
  
  /// Typography
  final String fontFamily;
  final double headlineFontSize;
  final double bodyFontSize;
  
  const FlavorTheme({
    required this.primaryColor,
    required this.secondaryColor,
    required this.accentColor,
    required this.backgroundColor,
    required this.surfaceColor,
    required this.errorColor,
    required this.onPrimaryColor,
    required this.onSecondaryColor,
    required this.textPrimaryColor,
    required this.textSecondaryColor,
    required this.highContrastPrimary,
    required this.highContrastBackground,
    required this.highContrastText,
    required this.logoPath,
    required this.logoLightPath,
    required this.splashPath,
    required this.appIconPath,
    required this.fontFamily,
    required this.headlineFontSize,
    required this.bodyFontSize,
  });

  /// Helsinki Taxi - Blue and Gold theme (Finnish national colors inspired)
  factory FlavorTheme.helsinkiTaxi() {
    return const FlavorTheme(
      primaryColor: Color(0xFF003580), // Finnish Blue
      secondaryColor: Color(0xFFD4AF37), // Gold
      accentColor: Color(0xFF00A8E8),
      backgroundColor: Color(0xFFF5F7FA),
      surfaceColor: Color(0xFFFFFFFF),
      errorColor: Color(0xFFDC3545),
      onPrimaryColor: Color(0xFFFFFFFF),
      onSecondaryColor: Color(0xFF1A1A1A),
      textPrimaryColor: Color(0xFF1A1A1A),
      textSecondaryColor: Color(0xFF6B7280),
      highContrastPrimary: Color(0xFF000000),
      highContrastBackground: Color(0xFFFFFFFF),
      highContrastText: Color(0xFF000000),
      logoPath: 'images/logo.png',
      logoLightPath: 'images/logo_light.png',
      splashPath: 'images/splash.png',
      appIconPath: 'images/app_icon.png',
      fontFamily: 'Inter',
      headlineFontSize: 24.0,
      bodyFontSize: 16.0,
    );
  }

  /// White Label Base - Neutral theme for customization
  factory FlavorTheme.whiteLabelBase() {
    return const FlavorTheme(
      primaryColor: Color(0xFF6366F1), // Indigo
      secondaryColor: Color(0xFF8B5CF6), // Purple
      accentColor: Color(0xFF10B981), // Emerald
      backgroundColor: Color(0xFFF9FAFB),
      surfaceColor: Color(0xFFFFFFFF),
      errorColor: Color(0xFFEF4444),
      onPrimaryColor: Color(0xFFFFFFFF),
      onSecondaryColor: Color(0xFFFFFFFF),
      textPrimaryColor: Color(0xFF111827),
      textSecondaryColor: Color(0xFF6B7280),
      highContrastPrimary: Color(0xFF000000),
      highContrastBackground: Color(0xFFFFFFFF),
      highContrastText: Color(0xFF000000),
      logoPath: 'images/logo.png',
      logoLightPath: 'images/logo_light.png',
      splashPath: 'images/splash.png',
      appIconPath: 'images/app_icon.png',
      fontFamily: 'Inter',
      headlineFontSize: 24.0,
      bodyFontSize: 16.0,
    );
  }

  /// Generate Material ThemeData from flavor theme
  ThemeData toMaterialTheme({bool highContrast = false}) {
    final primary = highContrast ? highContrastPrimary : primaryColor;
    final background = highContrast ? highContrastBackground : backgroundColor;
    final textColor = highContrast ? highContrastText : textPrimaryColor;

    return ThemeData(
      useMaterial3: true,
      fontFamily: fontFamily,
      colorScheme: ColorScheme(
        brightness: Brightness.light,
        primary: primary,
        onPrimary: onPrimaryColor,
        secondary: secondaryColor,
        onSecondary: onSecondaryColor,
        error: errorColor,
        onError: Colors.white,
        surface: surfaceColor,
        onSurface: textColor,
      ),
      scaffoldBackgroundColor: background,
      appBarTheme: AppBarTheme(
        backgroundColor: primary,
        foregroundColor: onPrimaryColor,
        elevation: 0,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: onPrimaryColor,
          minimumSize: const Size(double.infinity, 56),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: TextStyle(
            fontFamily: fontFamily,
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: surfaceColor,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: textSecondaryColor.withOpacity(0.2)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: textSecondaryColor.withOpacity(0.2)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: primary, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      ),
      textTheme: TextTheme(
        headlineLarge: TextStyle(
          fontSize: headlineFontSize,
          fontWeight: FontWeight.bold,
          color: textColor,
        ),
        bodyLarge: TextStyle(
          fontSize: bodyFontSize,
          color: textColor,
        ),
        bodyMedium: TextStyle(
          fontSize: bodyFontSize - 2,
          color: textSecondaryColor,
        ),
      ),
    );
  }

  /// Generate dark theme variant
  ThemeData toDarkTheme({bool highContrast = false}) {
    return toMaterialTheme(highContrast: highContrast).copyWith(
      brightness: Brightness.dark,
      scaffoldBackgroundColor: const Color(0xFF121212),
      colorScheme: ColorScheme(
        brightness: Brightness.dark,
        primary: primaryColor,
        onPrimary: onPrimaryColor,
        secondary: secondaryColor,
        onSecondary: onSecondaryColor,
        error: errorColor,
        onError: Colors.white,
        surface: const Color(0xFF1E1E1E),
        onSurface: Colors.white,
      ),
    );
  }
}

/// Extension for easy theme access
extension FlavorConfigThemeExtension on BuildContext {
  FlavorConfig get flavorConfig => FlavorConfig.instance;
  FlavorTheme get flavorTheme => FlavorConfig.instance.theme;
}
