/// MobilityApp - Root widget for the white-labeled mobility platform
/// 
/// Handles theme configuration, accessibility settings, and routing
/// based on the current flavor configuration.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'config/flavor_config.dart';
import 'config/app_config.dart';

/// Root application widget
class MobilityApp extends ConsumerStatefulWidget {
  final FlavorConfig flavorConfig;

  const MobilityApp({
    super.key,
    required this.flavorConfig,
  });

  @override
  ConsumerState<MobilityApp> createState() => _MobilityAppState();
}

class _MobilityAppState extends ConsumerState<MobilityApp> {
  bool _highContrastMode = false;

  @override
  void initState() {
    super.initState();
    _highContrastMode = AppConfig.highContrastMode;
  }

  void _toggleHighContrast() {
    setState(() {
      _highContrastMode = !_highContrastMode;
      AppConfig.highContrastMode = _highContrastMode;
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = widget.flavorConfig.theme;

    return MaterialApp(
      title: widget.flavorConfig.appName,
      debugShowCheckedModeBanner: false,
      
      // Theme configuration
      theme: theme.toMaterialTheme(highContrast: _highContrastMode),
      darkTheme: theme.toDarkTheme(highContrast: _highContrastMode),
      themeMode: ThemeMode.system,
      
      // Accessibility support (EN 301 549 compliance)
      builder: (context, child) {
        return MediaQuery(
          // Limit text scaling for layout stability while supporting accessibility
          data: MediaQuery.of(context).copyWith(
            textScaler: TextScaler.linear(
              MediaQuery.of(context).textScaler.scale(1.0).clamp(1.0, AppConfig.maxTextScaleFactor),
            ),
          ),
          child: child ?? const SizedBox.shrink(),
        );
      },
      
      // Localization
      supportedLocales: const [
        Locale('en', 'US'),
        Locale('fi', 'FI'),
        Locale('sv', 'SE'), // Swedish (official language in Finland)
      ],
      
      // Home screen
      home: const HomeScreen(),
    );
  }
}

/// Temporary home screen placeholder
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final config = FlavorConfig.instance;
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: Text(config.appName),
        actions: [
          // Accessibility: High contrast toggle
          Semantics(
            label: 'Toggle high contrast mode',
            button: true,
            child: IconButton(
              icon: const Icon(Icons.contrast),
              onPressed: () {
                // Toggle high contrast mode
              },
              tooltip: 'High Contrast Mode',
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Logo placeholder
                Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    color: theme.colorScheme.primary.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: Icon(
                    Icons.local_taxi,
                    size: 64,
                    color: theme.colorScheme.primary,
                    semanticLabel: '${config.appName} logo',
                  ),
                ),
                const SizedBox(height: 32),
                
                // App title
                Text(
                  config.appName,
                  style: theme.textTheme.headlineLarge,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                
                // Flavor info
                Text(
                  'Flavor: ${config.flavorName}',
                  style: theme.textTheme.bodyMedium,
                ),
                const SizedBox(height: 4),
                Text(
                  'Tenant: ${config.tenantId}',
                  style: theme.textTheme.bodyMedium,
                ),
                const SizedBox(height: 48),
                
                // Book a ride button
                Semantics(
                  label: 'Book a ride',
                  button: true,
                  child: SizedBox(
                    width: double.infinity,
                    height: AppConfig.minTouchTargetSize + 12,
                    child: ElevatedButton.icon(
                      onPressed: () {
                        // Navigate to booking screen
                      },
                      icon: const Icon(Icons.search),
                      label: const Text('Book a Ride'),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                
                // Driver mode button (if applicable)
                Semantics(
                  label: 'Switch to driver mode',
                  button: true,
                  child: SizedBox(
                    width: double.infinity,
                    height: AppConfig.minTouchTargetSize + 12,
                    child: OutlinedButton.icon(
                      onPressed: () {
                        // Navigate to driver mode
                      },
                      icon: const Icon(Icons.drive_eta),
                      label: const Text('Driver Mode'),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
