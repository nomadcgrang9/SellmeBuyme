# Geolocation Patterns

## Description
Guides on implementing location-based features. Use when adding location services, maps, or when the user asks about geolocation UX patterns.

## Instructions

### Permission Management

- Request location access contextually (when user needs it)
- Explain why location is needed before requesting
- Handle permission denials gracefully
- Provide fallback for users who decline
- Respect user preferences (don't re-ask repeatedly)

### Location Accuracy Levels

| Type | Accuracy | Battery | Use Case |
|------|----------|---------|----------|
| **GPS** | ~10m | High | Navigation, tracking |
| **Network** | ~100m | Medium | Store finder, nearby |
| **IP-based** | City-level | None | Content localization |

### Common Use Cases

1. **Store/Location Finder** - Find nearest locations
2. **Delivery/ETA** - Estimate arrival times
3. **Weather/Local Content** - Location-based info
4. **Check-in** - Verify user presence
5. **Navigation** - Turn-by-turn directions

### Map Implementation

**Provider Selection:**
- Kakao Maps (Korea - recommended for this project)
- Google Maps (global coverage)
- Mapbox (customization)
- Native platform maps

**Essential Features:**
- Custom markers with clustering
- Info windows/tooltips
- User location indicator
- Zoom controls
- Mobile gesture support (pinch, pan)

### Privacy Safeguards

1. Clear privacy policy disclosure
2. Collect minimum necessary data
3. Use encrypted transmission (HTTPS)
4. Allow users to delete location history
5. Define data retention periods

### Error Handling

Handle these scenarios:
- Position unavailable (no GPS signal)
- Timeout (slow response)
- Permission denied
- Browser/device not supported
- Offline/network errors

**Fallback Strategy:**
```
Try GPS → Network → IP-based → Manual input
```

### Mobile Map UX

- Full-screen map as primary view
- Bottom sheet for location details
- Floating action button for "my location"
- Cluster markers when zoomed out
- Smooth animations on interactions

## Best Practices

1. Request permission at point of need, not app launch
2. Cache location data appropriately
3. Show loading states during geolocation
4. Provide manual location entry option
5. Test in various network conditions
