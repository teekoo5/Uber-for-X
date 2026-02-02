/// Fare Estimate Card Widget
/// 
/// Displays the estimated fare breakdown for a ride request.

import 'package:flutter/material.dart';

import '../models/fare_estimate.dart';

class FareEstimateCard extends StatelessWidget {
  final FareEstimate estimate;

  const FareEstimateCard({
    super.key,
    required this.estimate,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header with total
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Estimated Fare',
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                ),
              ),
              Text(
                '${estimate.total.toStringAsFixed(2)} ${estimate.currency}',
                style: theme.textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: theme.colorScheme.primary,
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),
          Divider(color: Colors.grey[200]),
          const SizedBox(height: 12),

          // Distance and duration
          Row(
            children: [
              _buildInfoChip(
                context,
                icon: Icons.route,
                label: '${(estimate.estimatedDistanceMeters / 1000).toStringAsFixed(1)} km',
              ),
              const SizedBox(width: 12),
              _buildInfoChip(
                context,
                icon: Icons.schedule,
                label: '${(estimate.estimatedDurationSeconds / 60).round()} min',
              ),
            ],
          ),

          const SizedBox(height: 12),

          // Fare breakdown (expandable)
          ExpansionTile(
            title: Text(
              'Fare Breakdown',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.primary,
              ),
            ),
            tilePadding: EdgeInsets.zero,
            childrenPadding: EdgeInsets.zero,
            children: [
              _buildFareRow(context, 'Base fare', estimate.baseFare, estimate.currency),
              _buildFareRow(context, 'Distance', estimate.distanceFare, estimate.currency),
              _buildFareRow(context, 'Time', estimate.timeFare, estimate.currency),
              _buildFareRow(context, 'Booking fee', estimate.bookingFee, estimate.currency),
              if (estimate.surgeMultiplier > 1.0)
                _buildFareRow(
                  context,
                  'Surge (${estimate.surgeMultiplier}x)',
                  estimate.surgeAmount,
                  estimate.currency,
                  isHighlight: true,
                ),
              const Divider(),
              _buildFareRow(
                context,
                'Subtotal',
                estimate.subtotal,
                estimate.currency,
                isBold: true,
              ),
              _buildFareRow(
                context,
                'VAT (13.5%)',
                estimate.vatAmount,
                estimate.currency,
                isSubtle: true,
              ),
            ],
          ),

          // Surge warning
          if (estimate.surgeMultiplier > 1.0) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.orange.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.orange.withOpacity(0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.flash_on, color: Colors.orange, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'High demand - prices are ${estimate.surgeMultiplier}x higher than usual',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: Colors.orange[800],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],

          // Note about taximeter
          const SizedBox(height: 12),
          Text(
            'Final fare is determined by the taximeter',
            style: theme.textTheme.bodySmall?.copyWith(
              color: Colors.grey,
              fontStyle: FontStyle.italic,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoChip(
    BuildContext context, {
    required IconData icon,
    required String label,
  }) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: Colors.grey[600]),
          const SizedBox(width: 6),
          Text(
            label,
            style: theme.textTheme.bodySmall?.copyWith(
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFareRow(
    BuildContext context,
    String label,
    double amount,
    String currency, {
    bool isBold = false,
    bool isSubtle = false,
    bool isHighlight = false,
  }) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
              color: isSubtle
                  ? Colors.grey
                  : isHighlight
                      ? Colors.orange
                      : null,
            ),
          ),
          Text(
            '${amount.toStringAsFixed(2)} $currency',
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
              color: isSubtle
                  ? Colors.grey
                  : isHighlight
                      ? Colors.orange
                      : null,
            ),
          ),
        ],
      ),
    );
  }
}
