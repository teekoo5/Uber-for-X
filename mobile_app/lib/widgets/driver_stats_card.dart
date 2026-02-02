/// Driver Stats Card Widget
/// 
/// Displays driver statistics including earnings, rides,
/// rating, and acceptance rate.

import 'package:flutter/material.dart';

class DriverStatsCard extends StatelessWidget {
  final double? todayEarnings;
  final int? todayRides;
  final double? rating;
  final double? acceptanceRate;

  const DriverStatsCard({
    super.key,
    this.todayEarnings,
    this.todayRides,
    this.rating,
    this.acceptanceRate,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            'Today\'s Summary',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _buildStatItem(
                  context,
                  icon: Icons.euro,
                  iconColor: Colors.green,
                  value: todayEarnings?.toStringAsFixed(2) ?? '0.00',
                  label: 'Earnings',
                ),
              ),
              _buildDivider(),
              Expanded(
                child: _buildStatItem(
                  context,
                  icon: Icons.directions_car,
                  iconColor: theme.colorScheme.primary,
                  value: '${todayRides ?? 0}',
                  label: 'Rides',
                ),
              ),
              _buildDivider(),
              Expanded(
                child: _buildStatItem(
                  context,
                  icon: Icons.star,
                  iconColor: Colors.amber,
                  value: rating?.toStringAsFixed(2) ?? '5.00',
                  label: 'Rating',
                ),
              ),
              _buildDivider(),
              Expanded(
                child: _buildStatItem(
                  context,
                  icon: Icons.check_circle,
                  iconColor: Colors.blue,
                  value: '${((acceptanceRate ?? 1.0) * 100).toInt()}%',
                  label: 'Accept',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatItem(
    BuildContext context, {
    required IconData icon,
    required Color iconColor,
    required String value,
    required String label,
  }) {
    final theme = Theme.of(context);

    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: iconColor.withOpacity(0.1),
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: iconColor, size: 20),
        ),
        const SizedBox(height: 8),
        Text(
          value,
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          label,
          style: theme.textTheme.bodySmall?.copyWith(
            color: Colors.grey,
          ),
        ),
      ],
    );
  }

  Widget _buildDivider() {
    return Container(
      height: 50,
      width: 1,
      color: Colors.grey[200],
    );
  }
}
