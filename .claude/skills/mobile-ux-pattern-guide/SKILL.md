# Mobile UX Pattern Guide

## Description
Provides platform-specific UX patterns for iOS and Android mobile applications. Use when designing mobile interfaces, implementing navigation patterns, or ensuring platform consistency.

## Instructions

### Navigation Patterns

**iOS:**
- Tab bars at bottom (3-5 destinations)
- Navigation bars with centered titles
- Swipe gesture for back navigation
- Modal presentations slide up

**Android:**
- Bottom navigation for primary destinations
- Navigation drawers for secondary navigation
- App bars (left-aligned titles)
- System back button support

### Component Guidelines

**iOS Standards:**
- Support Dynamic Type for text scaling
- Respect Reduce Motion settings
- Use system controls where possible
- Follow SF Symbols guidelines

**Android Standards:**
- Follow Material Design 3 principles
- Use elevation/shadow hierarchy
- Support predictive back gesture
- Implement edge-to-edge design

### Touch Target Sizes

- **iOS**: Minimum 44x44 points
- **Android**: Minimum 48x48 dp (density-independent pixels)

### Cross-Platform Patterns

Shared patterns that work on both:
- Pull-to-refresh
- Swipe actions on list items
- Search with filtering
- Floating action buttons (Android-primary, iOS-selective)

**Critical Difference:**
> Android has system back button. iOS uses swipe gesture from edge.

### Accessibility Requirements

- Support VoiceOver (iOS) and TalkBack (Android)
- Implement alternative input methods
- Support dynamic type scaling
- Provide haptic feedback appropriately
- Ensure sufficient color contrast (4.5:1 minimum)

## Best Practices

1. Follow platform conventions - don't fight the system
2. Test on real devices, not just simulators
3. Support both portrait and landscape orientations
4. Handle notches and safe areas properly
5. Respect system dark/light mode settings
