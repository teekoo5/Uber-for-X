/// Rider Home Screen
/// 
/// Main screen for riders to book rides, view nearby drivers,
/// and access their ride history.

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../config/flavor_config.dart';
import '../../config/app_config.dart';
import '../../widgets/map_view.dart';
import '../../widgets/location_search_bar.dart';
import '../../widgets/vehicle_type_selector.dart';
import '../../widgets/fare_estimate_card.dart';
import '../../providers/ride_provider.dart';
import '../../providers/location_provider.dart';

class RiderHomeScreen extends ConsumerStatefulWidget {
  const RiderHomeScreen({super.key});

  @override
  ConsumerState<RiderHomeScreen> createState() => _RiderHomeScreenState();
}

class _RiderHomeScreenState extends ConsumerState<RiderHomeScreen> {
  bool _showBookingSheet = false;
  String? _pickupAddress;
  String? _dropoffAddress;
  double? _pickupLat;
  double? _pickupLng;
  double? _dropoffLat;
  double? _dropoffLng;
  String _selectedVehicleType = 'standard';

  @override
  void initState() {
    super.initState();
    // Get current location on init
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(locationProvider.notifier).getCurrentLocation();
    });
  }

  void _onPickupSelected(String address, double lat, double lng) {
    setState(() {
      _pickupAddress = address;
      _pickupLat = lat;
      _pickupLng = lng;
      _showBookingSheet = true;
    });
  }

  void _onDropoffSelected(String address, double lat, double lng) {
    setState(() {
      _dropoffAddress = address;
      _dropoffLat = lat;
      _dropoffLng = lng;
    });
    // Calculate fare estimate when dropoff is selected
    if (_pickupLat != null && _pickupLng != null) {
      _getFareEstimate();
    }
  }

  Future<void> _getFareEstimate() async {
    if (_pickupLat == null || _dropoffLat == null) return;
    
    await ref.read(rideProvider.notifier).getFareEstimate(
      pickupLat: _pickupLat!,
      pickupLng: _pickupLng!,
      dropoffLat: _dropoffLat!,
      dropoffLng: _dropoffLng!,
      vehicleType: _selectedVehicleType,
    );
  }

  Future<void> _requestRide() async {
    if (_pickupLat == null || _dropoffLat == null) return;
    
    await ref.read(rideProvider.notifier).createRide(
      pickupLat: _pickupLat!,
      pickupLng: _pickupLng!,
      pickupAddress: _pickupAddress ?? '',
      dropoffLat: _dropoffLat!,
      dropoffLng: _dropoffLng!,
      dropoffAddress: _dropoffAddress ?? '',
      vehicleType: _selectedVehicleType,
    );
  }

  @override
  Widget build(BuildContext context) {
    final config = FlavorConfig.instance;
    final theme = Theme.of(context);
    final currentLocation = ref.watch(locationProvider);
    final rideState = ref.watch(rideProvider);

    return Scaffold(
      body: Stack(
        children: [
          // Map View
          MapView(
            initialLatitude: currentLocation.latitude ?? 60.1699,
            initialLongitude: currentLocation.longitude ?? 24.9384,
            pickupLatitude: _pickupLat,
            pickupLongitude: _pickupLng,
            dropoffLatitude: _dropoffLat,
            dropoffLongitude: _dropoffLng,
            onMapTap: (lat, lng) {
              if (_pickupAddress == null) {
                _onPickupSelected('Dropped Pin', lat, lng);
              } else if (_dropoffAddress == null) {
                _onDropoffSelected('Dropped Pin', lat, lng);
              }
            },
          ),

          // Top Search Bar
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  // App Bar with menu and profile
                  Row(
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
                      // App name
                      Text(
                        config.appName,
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const Spacer(),
                      // Profile button
                      Semantics(
                        label: 'Open profile',
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
                            icon: const Icon(Icons.person_outline),
                            onPressed: () {
                              // Navigate to profile
                            },
                            tooltip: 'Profile',
                          ),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 16),

                  // Location Search Bar
                  LocationSearchBar(
                    pickupAddress: _pickupAddress,
                    dropoffAddress: _dropoffAddress,
                    onPickupTap: () {
                      // Show pickup search
                    },
                    onDropoffTap: () {
                      // Show dropoff search
                    },
                    onPickupSelected: _onPickupSelected,
                    onDropoffSelected: _onDropoffSelected,
                  ),
                ],
              ),
            ),
          ),

          // Bottom Booking Sheet
          if (_showBookingSheet)
            DraggableScrollableSheet(
              initialChildSize: 0.35,
              minChildSize: 0.2,
              maxChildSize: 0.6,
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

                          const SizedBox(height: 24),

                          // Vehicle Type Selector
                          Text(
                            'Select Ride Type',
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 12),
                          VehicleTypeSelector(
                            selectedType: _selectedVehicleType,
                            onTypeSelected: (type) {
                              setState(() => _selectedVehicleType = type);
                              _getFareEstimate();
                            },
                          ),

                          const SizedBox(height: 24),

                          // Fare Estimate
                          if (rideState.fareEstimate != null)
                            FareEstimateCard(
                              estimate: rideState.fareEstimate!,
                            ),

                          const SizedBox(height: 24),

                          // Book Ride Button
                          Semantics(
                            label: 'Request ride',
                            button: true,
                            child: SizedBox(
                              width: double.infinity,
                              height: AppConfig.minTouchTargetSize + 12,
                              child: ElevatedButton(
                                onPressed: _dropoffAddress != null && !rideState.isLoading
                                    ? _requestRide
                                    : null,
                                child: rideState.isLoading
                                    ? const SizedBox(
                                        width: 24,
                                        height: 24,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          color: Colors.white,
                                        ),
                                      )
                                    : const Text('Request Ride'),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),

          // Quick Actions FAB (when no booking sheet)
          if (!_showBookingSheet)
            Positioned(
              bottom: 100,
              right: 16,
              child: Column(
                children: [
                  // Current location button
                  Semantics(
                    label: 'Go to current location',
                    button: true,
                    child: FloatingActionButton(
                      heroTag: 'location',
                      onPressed: () {
                        ref.read(locationProvider.notifier).getCurrentLocation();
                      },
                      backgroundColor: theme.colorScheme.surface,
                      foregroundColor: theme.colorScheme.primary,
                      child: const Icon(Icons.my_location),
                    ),
                  ),
                ],
              ),
            ),

          // Where to? Button (when not booking)
          if (!_showBookingSheet)
            Positioned(
              bottom: 24,
              left: 16,
              right: 16,
              child: Semantics(
                label: 'Where do you want to go?',
                button: true,
                child: GestureDetector(
                  onTap: () {
                    setState(() => _showBookingSheet = true);
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 16,
                    ),
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
                    child: Row(
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: theme.colorScheme.primary,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Text(
                          'Where to?',
                          style: theme.textTheme.titleMedium?.copyWith(
                            color: Colors.grey[600],
                          ),
                        ),
                        const Spacer(),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 6,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.grey[200],
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.schedule, size: 16),
                              const SizedBox(width: 4),
                              Text(
                                'Now',
                                style: theme.textTheme.bodySmall,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
      drawer: _buildDrawer(context),
    );
  }

  Widget _buildDrawer(BuildContext context) {
    final config = FlavorConfig.instance;
    final theme = Theme.of(context);

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
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Guest User',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        'View Profile',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.colorScheme.primary,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const Divider(),

            // Menu items
            _buildDrawerItem(
              context,
              icon: Icons.history,
              title: 'Your Rides',
              onTap: () {
                Navigator.pop(context);
                // Navigate to ride history
              },
            ),
            _buildDrawerItem(
              context,
              icon: Icons.payment,
              title: 'Payment Methods',
              onTap: () {
                Navigator.pop(context);
              },
            ),
            _buildDrawerItem(
              context,
              icon: Icons.local_offer,
              title: 'Promotions',
              onTap: () {
                Navigator.pop(context);
              },
            ),
            _buildDrawerItem(
              context,
              icon: Icons.settings,
              title: 'Settings',
              onTap: () {
                Navigator.pop(context);
              },
            ),
            _buildDrawerItem(
              context,
              icon: Icons.help_outline,
              title: 'Help',
              onTap: () {
                Navigator.pop(context);
              },
            ),

            const Spacer(),

            // Driver mode toggle
            if (config.flavorType == FlavorType.whiteLabelBase)
              Padding(
                padding: const EdgeInsets.all(16),
                child: OutlinedButton.icon(
                  onPressed: () {
                    Navigator.pop(context);
                    // Switch to driver mode
                  },
                  icon: const Icon(Icons.drive_eta),
                  label: const Text('Switch to Driver'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: Size(double.infinity, AppConfig.minTouchTargetSize),
                  ),
                ),
              ),

            // App version
            Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                '${config.appName} v1.0.0',
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

  Widget _buildDrawerItem(
    BuildContext context, {
    required IconData icon,
    required String title,
    required VoidCallback onTap,
  }) {
    return ListTile(
      leading: Icon(icon),
      title: Text(title),
      onTap: onTap,
      minLeadingWidth: 24,
    );
  }
}
