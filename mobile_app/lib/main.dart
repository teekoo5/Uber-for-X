/// Main entry point for the Mobility Platform Flutter application
/// 
/// This app supports multi-flavor architecture for white-labeling.
/// Run with flavor-specific configuration:
/// 
/// ```bash
/// # Helsinki Taxi
/// flutter run --dart-define=FLAVOR=helsinki_taxi \
///   --dart-define=API_ENDPOINT=https://api.helsinkitaxi.fi \
///   --dart-define=TENANT_ID=helsinki_001
/// 
/// # White Label Base (development)
/// flutter run --dart-define=FLAVOR=white_label_base
/// ```
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'config/flavor_config.dart';
import 'config/app_config.dart';
import 'services/location_service.dart';
import 'app.dart';

void main() async {
  // Ensure Flutter bindings are initialized
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize flavor configuration
  final flavorConfig = FlavorConfig.instance;
  debugPrint('Starting app with flavor: ${flavorConfig.flavorName}');
  debugPrint('API Endpoint: ${flavorConfig.apiEndpoint}');
  debugPrint('Tenant ID: ${flavorConfig.tenantId}');
  
  // Set preferred orientations
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);
  
  // Set system UI overlay style based on theme
  SystemChrome.setSystemUIOverlayStyle(SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.dark,
    systemNavigationBarColor: flavorConfig.theme.backgroundColor,
    systemNavigationBarIconBrightness: Brightness.dark,
  ));
  
  // Initialize services
  await _initializeServices();
  
  // Run the app with Riverpod for state management
  runApp(
    ProviderScope(
      child: MobilityApp(flavorConfig: flavorConfig),
    ),
  );
}

/// Initialize app services
Future<void> _initializeServices() async {
  // Initialize location service
  final locationService = LocationService();
  await locationService.initialize();
  
  // Additional service initialization can be added here:
  // - Analytics
  // - Push notifications
  // - Crash reporting
  // - etc.
}
