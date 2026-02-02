/// Location Search Bar Widget
/// 
/// Input fields for pickup and dropoff locations with
/// autocomplete suggestions.

import 'package:flutter/material.dart';

class LocationSearchBar extends StatelessWidget {
  final String? pickupAddress;
  final String? dropoffAddress;
  final VoidCallback? onPickupTap;
  final VoidCallback? onDropoffTap;
  final void Function(String address, double lat, double lng)? onPickupSelected;
  final void Function(String address, double lat, double lng)? onDropoffSelected;

  const LocationSearchBar({
    super.key,
    this.pickupAddress,
    this.dropoffAddress,
    this.onPickupTap,
    this.onDropoffTap,
    this.onPickupSelected,
    this.onDropoffSelected,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Pickup field
          Semantics(
            label: 'Pickup location',
            textField: true,
            child: InkWell(
              onTap: onPickupTap,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Row(
                  children: [
                    Container(
                      width: 12,
                      height: 12,
                      decoration: const BoxDecoration(
                        color: Colors.green,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        pickupAddress ?? 'Pickup location',
                        style: theme.textTheme.bodyLarge?.copyWith(
                          color: pickupAddress != null 
                              ? theme.textTheme.bodyLarge?.color
                              : Colors.grey,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (pickupAddress != null)
                      IconButton(
                        icon: const Icon(Icons.close, size: 18),
                        onPressed: () {
                          // Clear pickup
                        },
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                  ],
                ),
              ),
            ),
          ),

          // Divider with dots
          Padding(
            padding: const EdgeInsets.only(left: 22),
            child: Row(
              children: [
                Column(
                  children: List.generate(
                    3,
                    (index) => Container(
                      width: 2,
                      height: 4,
                      margin: const EdgeInsets.symmetric(vertical: 1),
                      decoration: BoxDecoration(
                        color: Colors.grey[400],
                        borderRadius: BorderRadius.circular(1),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Divider(color: Colors.grey[300], height: 1),
                ),
              ],
            ),
          ),

          // Dropoff field
          Semantics(
            label: 'Dropoff location',
            textField: true,
            child: InkWell(
              onTap: onDropoffTap,
              borderRadius: const BorderRadius.vertical(bottom: Radius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Row(
                  children: [
                    Container(
                      width: 12,
                      height: 12,
                      decoration: BoxDecoration(
                        color: Colors.red,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        dropoffAddress ?? 'Where to?',
                        style: theme.textTheme.bodyLarge?.copyWith(
                          color: dropoffAddress != null 
                              ? theme.textTheme.bodyLarge?.color
                              : Colors.grey,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (dropoffAddress != null)
                      IconButton(
                        icon: const Icon(Icons.close, size: 18),
                        onPressed: () {
                          // Clear dropoff
                        },
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
