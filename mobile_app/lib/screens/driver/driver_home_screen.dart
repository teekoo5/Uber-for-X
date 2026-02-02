/// Driver Home Screen
/// 
/// Main screen for drivers to go online, receive ride offers,
/// and navigate to passengers.

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../config/flavor_config.dart';
import '../../config/app_config.dart';
import '../../widgets/map_view.dart';
import '../../widgets/ride_offer_card.dart';
import '../../widgets/driver_stats_card.dart';
import '../../providers/driver_provider.dart';
import '../../providers/location_provider.dart';

class DriverHomeScreen extends ConsumerStatefulWidget {
  const DriverHomeScreen({super.key});

  @override
  ConsumerState<DriverHomeScreen> createState() => _DriverHomeScreenState();
}

class _DriverHomeScreenState extends ConsumerState<DriverHomeScreen> {
  @override
  void initState() {
    super.initState();
    // Start location updates when screen loads
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(locationProvider.notifier).startLocationUpdates();
    });
  }

  @override
  void dispose() {
    // Stop location updates when leaving screen
    ref.read(locationProvider.notifier).stopLocationUpdates();
    super.dispose();
  }

  void _toggleOnlineStatus() {
    ref.read(driverProvider.notifier).toggleOnlineStatus();
  }

  void _acceptRide() {
    ref.read(driverProvider.notifier).acceptCurrentOffer();
  }

  void _declineRide() {
    ref.read(driverProvider.notifier).declineCurrentOffer();
  }

  void _arrivedAtPickup() {
    ref.read(driverProvider.notifier).arrivedAtPickup();
  }

  void _startRide() {
    ref.read(driverProvider.notifier).startRide();
  }

  void _completeRide() {
    ref.read(driverProvider.notifier).completeRide();
  }

  @override
  Widget build(BuildContext context) {
    final config = FlavorConfig.instance;
    final theme = Theme.of(context);
    final currentLocation = ref.watch(locationProvider);
    final driverState = ref.watch(driverProvider);

    return Scaffold(
      body: Stack(
        children: [
          // Map View
          MapView(
            initialLatitude: currentLocation.latitude ?? 60.1699,
            initialLongitude: currentLocation.longitude ?? 24.9384,
            showCurrentLocation: true,
            pickupLatitude: driverState.currentRide?.pickupLat,
            pickupLongitude: driverState.currentRide?.pickupLng,
            dropoffLatitude: driverState.currentRide?.dropoffLat,
            dropoffLongitude: driverState.currentRide?.dropoffLng,
            routePolyline: driverState.currentRoute,
          ),

          // Top Bar
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  // Menu button
                  Semantics(
                    label: 'Open menu',
                    button: true,
                    child: Container(
                      decoration: BoxDecoration(
                        color: theme.colorScheme.surface,
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.1),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: IconButton(
                        icon: const Icon(Icons.menu),
                        onPressed: () {
                          Scaffold.of(context).openDrawer();
                        },
                        tooltip: 'Menu',
                      ),
                    ),
                  ),
                  const Spacer(),
                  // Online status indicator
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    decoration: BoxDecoration(
                      color: theme.colorScheme.surface,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.1),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 10,
                          height: 10,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: driverState.isOnline
                                ? Colors.green
                                : Colors.grey,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          driverState.isOnline ? 'Online' : 'Offline',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Spacer(),
                  // Earnings button
                  Semantics(
                    label: 'View earnings',
                    button: true,
                    child: Container(
                      decoration: BoxDecoration(
                        color: theme.colorScheme.surface,
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.1),
                            blurRadius: 8,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: IconButton(
                        icon: const Icon(Icons.account_balance_wallet_outlined),
                        onPressed: () {
                          // Show earnings
                        },
                        tooltip: 'Earnings',
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Ride Offer Popup
          if (driverState.pendingOffer != null)
            Positioned.fill(
              child: Container(
                color: Colors.black54,
                child: Center(
                  child: RideOfferCard(
                    offer: driverState.pendingOffer!,
                    onAccept: _acceptRide,
                    onDecline: _declineRide,
                    remainingSeconds: driverState.offerTimeRemaining,
                  ),
                ),
              ),
            ),

          // Active Ride Bottom Sheet
          if (driverState.currentRide != null)
            DraggableScrollableSheet(
              initialChildSize: 0.3,
              minChildSize: 0.15,
              maxChildSize: 0.5,
              builder: (context, scrollController) {
                return Container(
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surface,
                    borderRadius: const BorderRadius.vertical(
                      top: Radius.circular(24),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.1),
                        blurRadius: 16,
                        offset: const Offset(0, -4),
                      ),
                    ],
                  ),
                  child: SingleChildScrollView(
                    controller: scrollController,
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Handle
                          Center(
                            child: Container(
                              width: 40,
                              height: 4,
                              decoration: BoxDecoration(
                                color: Colors.grey[300],
                                borderRadius: BorderRadius.circular(2),
                              ),
                            ),
                          ),

                          const SizedBox(height: 16),

                          // Ride status
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 6,
                                ),
                                decoration: BoxDecoration(
                                  color: _getStatusColor(driverState.rideStatus)
                                      .withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Text(
                                  _getStatusText(driverState.rideStatus),
                                  style: theme.textTheme.labelMedium?.copyWith(
                                    color: _getStatusColor(driverState.rideStatus),
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              const Spacer(),
                              // ETA
                              if (driverState.etaMinutes != null)
                                Text(
                                  '${driverState.etaMinutes} min',
                                  style: theme.textTheme.titleMedium?.copyWith(
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                            ],
                          ),

                          const SizedBox(height: 16),

                          // Passenger info
                          Row(
                            children: [
                              CircleAvatar(
                                radius: 24,
                                backgroundColor: theme.colorScheme.primary.withOpacity(0.1),
                                child: Icon(
                                  Icons.person,
                                  color: theme.colorScheme.primary,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      driverState.currentRide!.riderName ?? 'Passenger',
                                      style: theme.textTheme.titleMedium?.copyWith(
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    if (driverState.currentRide!.rating != null)
                                      Row(
                                        children: [
                                          const Icon(Icons.star, size: 16, color: Colors.amber),
                                          const SizedBox(width: 4),
                                          Text(
                                            driverState.currentRide!.rating!.toStringAsFixed(1),
                                            style: theme.textTheme.bodySmall,
                                          ),
                                        ],
                                      ),
                                  ],
                                ),
                              ),
                              // Call button
                              Semantics(
                                label: 'Call passenger',
                                button: true,
                                child: IconButton(
                                  icon: const Icon(Icons.phone),
                                  onPressed: () {
                                    // Call passenger
                                  },
                                  style: IconButton.styleFrom(
                                    backgroundColor: Colors.green.withOpacity(0.1),
                                    foregroundColor: Colors.green,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              // Message button
                              Semantics(
                                label: 'Message passenger',
                                button: true,
                                child: IconButton(
                                  icon: const Icon(Icons.message),
                                  onPressed: () {
                                    // Message passenger
                                  },
                                  style: IconButton.styleFrom(
                                    backgroundColor: theme.colorScheme.primary.withOpacity(0.1),
                                    foregroundColor: theme.colorScheme.primary,
                                  ),
                                ),
                              ),
                            ],
                          ),

                          const SizedBox(height: 16),
                          const Divider(),
                          const SizedBox(height: 16),

                          // Pickup/Dropoff addresses
                          _buildLocationRow(
                            context,
                            icon: Icons.radio_button_checked,
                            iconColor: Colors.green,
                            title: 'Pickup',
                            address: driverState.currentRide!.pickupAddress ?? '',
                          ),
                          const SizedBox(height: 12),
                          _buildLocationRow(
                            context,
                            icon: Icons.location_on,
                            iconColor: Colors.red,
                            title: 'Dropoff',
                            address: driverState.currentRide!.dropoffAddress ?? '',
                          ),

                          const SizedBox(height: 24),

                          // Action button based on status
                          _buildActionButton(context, driverState.rideStatus),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),

          // Go Online/Offline Button (when no active ride)
          if (driverState.currentRide == null && driverState.pendingOffer == null)
            Positioned(
              bottom: 24,
              left: 16,
              right: 16,
              child: Semantics(
                label: driverState.isOnline ? 'Go offline' : 'Go online',
                button: true,
                child: SizedBox(
                  height: AppConfig.minTouchTargetSize + 16,
                  child: ElevatedButton(
                    onPressed: _toggleOnlineStatus,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: driverState.isOnline
                          ? Colors.red
                          : theme.colorScheme.primary,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(driverState.isOnline ? Icons.stop : Icons.play_arrow),
                        const SizedBox(width: 8),
                        Text(
                          driverState.isOnline ? 'Go Offline' : 'Go Online',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),

          // Stats when offline
          if (!driverState.isOnline && driverState.currentRide == null)
            Positioned(
              bottom: 100,
              left: 16,
              right: 16,
              child: DriverStatsCard(
                todayEarnings: driverState.todayEarnings,
                todayRides: driverState.todayRides,
                rating: driverState.rating,
                acceptanceRate: driverState.acceptanceRate,
              ),
            ),
        ],
      ),
      drawer: _buildDrawer(context),
    );
  }

  Widget _buildLocationRow(
    BuildContext context, {
    required IconData icon,
    required Color iconColor,
    required String title,
    required String address,
  }) {
    final theme = Theme.of(context);

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, color: iconColor, size: 20),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: theme.textTheme.labelSmall?.copyWith(
                  color: Colors.grey,
                ),
              ),
              Text(
                address,
                style: theme.textTheme.bodyMedium,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
        // Navigate button
        IconButton(
          icon: const Icon(Icons.navigation),
          onPressed: () {
            // Open in maps
          },
          tooltip: 'Navigate',
        ),
      ],
    );
  }

  Widget _buildActionButton(BuildContext context, String? status) {
    switch (status) {
      case 'driver_assigned':
      case 'driver_arriving':
        return SizedBox(
          width: double.infinity,
          height: AppConfig.minTouchTargetSize + 12,
          child: ElevatedButton.icon(
            onPressed: _arrivedAtPickup,
            icon: const Icon(Icons.location_on),
            label: const Text('Arrived at Pickup'),
          ),
        );
      case 'arrived':
        return SizedBox(
          width: double.infinity,
          height: AppConfig.minTouchTargetSize + 12,
          child: ElevatedButton.icon(
            onPressed: _startRide,
            icon: const Icon(Icons.play_arrow),
            label: const Text('Start Ride'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green,
            ),
          ),
        );
      case 'in_progress':
        return SizedBox(
          width: double.infinity,
          height: AppConfig.minTouchTargetSize + 12,
          child: ElevatedButton.icon(
            onPressed: _completeRide,
            icon: const Icon(Icons.check),
            label: const Text('Complete Ride'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green,
            ),
          ),
        );
      default:
        return const SizedBox.shrink();
    }
  }

  Color _getStatusColor(String? status) {
    switch (status) {
      case 'driver_assigned':
      case 'driver_arriving':
        return Colors.blue;
      case 'arrived':
        return Colors.orange;
      case 'in_progress':
        return Colors.green;
      default:
        return Colors.grey;
    }
  }

  String _getStatusText(String? status) {
    switch (status) {
      case 'driver_assigned':
        return 'Heading to Pickup';
      case 'driver_arriving':
        return 'Arriving Soon';
      case 'arrived':
        return 'Waiting for Passenger';
      case 'in_progress':
        return 'Trip in Progress';
      default:
        return 'Unknown';
    }
  }

  Widget _buildDrawer(BuildContext context) {
    final config = FlavorConfig.instance;
    final theme = Theme.of(context);
    final driverState = ref.watch(driverProvider);

    return Drawer(
      child: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.all(24),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 30,
                    backgroundColor: theme.colorScheme.primary.withOpacity(0.1),
                    child: Icon(
                      Icons.person,
                      size: 32,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Driver Name',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Row(
                          children: [
                            const Icon(Icons.star, size: 16, color: Colors.amber),
                            const SizedBox(width: 4),
                            Text(
                              driverState.rating?.toStringAsFixed(2) ?? '5.00',
                              style: theme.textTheme.bodySmall,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const Divider(),

            // Menu items
            ListTile(
              leading: const Icon(Icons.account_balance_wallet),
              title: const Text('Earnings'),
              onTap: () => Navigator.pop(context),
            ),
            ListTile(
              leading: const Icon(Icons.history),
              title: const Text('Ride History'),
              onTap: () => Navigator.pop(context),
            ),
            ListTile(
              leading: const Icon(Icons.directions_car),
              title: const Text('Vehicle'),
              subtitle: const Text('Manage your vehicle'),
              onTap: () => Navigator.pop(context),
            ),
            if (config.enableTaximeter)
              ListTile(
                leading: const Icon(Icons.speed),
                title: const Text('Taximeter'),
                subtitle: const Text('Connect MID meter'),
                onTap: () => Navigator.pop(context),
              ),
            ListTile(
              leading: const Icon(Icons.settings),
              title: const Text('Settings'),
              onTap: () => Navigator.pop(context),
            ),
            ListTile(
              leading: const Icon(Icons.help_outline),
              title: const Text('Help'),
              onTap: () => Navigator.pop(context),
            ),

            const Spacer(),

            // Switch to rider mode
            Padding(
              padding: const EdgeInsets.all(16),
              child: OutlinedButton.icon(
                onPressed: () {
                  Navigator.pop(context);
                  // Switch to rider mode
                },
                icon: const Icon(Icons.hail),
                label: const Text('Switch to Rider'),
                style: OutlinedButton.styleFrom(
                  minimumSize: Size(double.infinity, AppConfig.minTouchTargetSize),
                ),
              ),
            ),

            // App version
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                '${config.appName} Driver v1.0.0',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: Colors.grey,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
