/// Ride Offer Card Widget
/// 
/// Displays a ride offer to drivers with countdown timer
/// and accept/decline actions.

import 'package:flutter/material.dart';

import '../config/app_config.dart';
import '../models/ride_offer.dart';

class RideOfferCard extends StatelessWidget {
  final RideOffer offer;
  final VoidCallback onAccept;
  final VoidCallback onDecline;
  final int remainingSeconds;

  const RideOfferCard({
    super.key,
    required this.offer,
    required this.onAccept,
    required this.onDecline,
    required this.remainingSeconds,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final progress = remainingSeconds / 30.0; // Assuming 30 second timeout

    return Container(
      margin: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.2),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Countdown timer bar
          ClipRRect(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            child: LinearProgressIndicator(
              value: progress,
              backgroundColor: Colors.grey[200],
              valueColor: AlwaysStoppedAnimation<Color>(
                progress > 0.3 ? theme.colorScheme.primary : Colors.red,
              ),
              minHeight: 6,
            ),
          ),

          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header with timer
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.primary.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.local_taxi,
                            size: 16,
                            color: theme.colorScheme.primary,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            'New Ride',
                            style: theme.textTheme.labelMedium?.copyWith(
                              color: theme.colorScheme.primary,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Spacer(),
                    // Countdown
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: remainingSeconds > 10 ? Colors.grey[200] : Colors.red.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        '${remainingSeconds}s',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                          color: remainingSeconds > 10 ? Colors.grey[700] : Colors.red,
                        ),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 20),

                // Fare and distance
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${offer.estimatedFare.toStringAsFixed(2)} €',
                            style: theme.textTheme.headlineMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            'Estimated fare',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: Colors.grey,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      height: 40,
                      width: 1,
                      color: Colors.grey[300],
                    ),
                    Expanded(
                      child: Column(
                        children: [
                          Text(
                            '${(offer.distanceMeters / 1000).toStringAsFixed(1)} km',
                            style: theme.textTheme.titleLarge?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            '~${offer.etaMinutes} min away',
                            style: theme.textTheme.bodySmall?.copyWith(
                              color: Colors.grey,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 20),
                Divider(color: Colors.grey[200]),
                const SizedBox(height: 16),

                // Pickup location
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: Colors.green.withOpacity(0.1),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.radio_button_checked,
                        color: Colors.green,
                        size: 16,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'PICKUP',
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: Colors.grey,
                              letterSpacing: 1,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            offer.pickupAddress,
                            style: theme.textTheme.bodyMedium?.copyWith(
                              fontWeight: FontWeight.w500,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                // Connection line
                Padding(
                  padding: const EdgeInsets.only(left: 15),
                  child: Container(
                    width: 2,
                    height: 20,
                    color: Colors.grey[300],
                  ),
                ),

                // Dropoff location
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 32,
                      height: 32,
                      decoration: BoxDecoration(
                        color: Colors.red.withOpacity(0.1),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.location_on,
                        color: Colors.red,
                        size: 16,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'DROPOFF',
                            style: theme.textTheme.labelSmall?.copyWith(
                              color: Colors.grey,
                              letterSpacing: 1,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            offer.dropoffAddress,
                            style: theme.textTheme.bodyMedium?.copyWith(
                              fontWeight: FontWeight.w500,
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 24),

                // Action buttons
                Row(
                  children: [
                    // Decline button
                    Expanded(
                      child: Semantics(
                        label: 'Decline ride',
                        button: true,
                        child: SizedBox(
                          height: AppConfig.minTouchTargetSize + 8,
                          child: OutlinedButton(
                            onPressed: onDecline,
                            style: OutlinedButton.styleFrom(
                              foregroundColor: Colors.red,
                              side: const BorderSide(color: Colors.red),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            child: const Text('Decline'),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 16),
                    // Accept button
                    Expanded(
                      flex: 2,
                      child: Semantics(
                        label: 'Accept ride',
                        button: true,
                        child: SizedBox(
                          height: AppConfig.minTouchTargetSize + 8,
                          child: ElevatedButton(
                            onPressed: onAccept,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.green,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            child: const Text(
                              'Accept',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
