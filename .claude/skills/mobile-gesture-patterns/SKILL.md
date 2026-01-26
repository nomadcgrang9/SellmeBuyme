# Mobile Gesture Patterns

## Description
Guides on implementing mobile gesture interactions for touch devices. Use when designing touch interactions, implementing swipe actions, or when the user asks about gesture handling best practices.

## Instructions

### Standard Gesture Types

| Gesture | Use Case | Notes |
|---------|----------|-------|
| **Tap** | Selection, activation | Primary interaction |
| **Double-tap** | Zoom, quick actions | Avoid for critical actions |
| **Long-press** | Context menus, selection mode | Provide haptic feedback |
| **Swipe** | Navigation, actions, dismissal | Consider direction |
| **Pinch** | Scale/zoom content | Maintain aspect ratio |
| **Drag** | Move items, reorder | Show drop targets |
| **Pan** | Viewport navigation | Smooth momentum |

### Gesture Recognition Guidelines

1. Set appropriate touch thresholds (typically 10-15px)
2. Manage multi-touch scenarios properly
3. Distinguish between gesture types (tap vs drag)
4. Handle incomplete/cancelled gestures gracefully
5. Capture velocity for momentum-based animations

### Swipe Patterns

**Horizontal Swipes:**
- Reveal action buttons (edit, delete, archive)
- Page/card navigation
- Item dismissal (with undo option)

**Vertical Swipes:**
- Pull-to-refresh (top)
- Expand/collapse (bottom sheets)
- Scroll content

### User Feedback

Always provide feedback:
- Show progress during gesture
- Indicate available actions visually
- Animate based on gesture velocity
- Provide haptic responses at key points
- Confirm completion or cancellation

### Conflict Management

Handle overlapping gestures:
- Prioritize based on direction
- Support gesture cancellation
- Differentiate scroll vs swipe
- Integrate with system gestures
- Test edge cases thoroughly

### Bottom Sheet Gestures

For draggable bottom sheets:
```
collapsed (접힘) → half (반) → full (전체)

Velocity thresholds:
- Fast swipe up: Jump to next state
- Fast swipe down: Jump to previous state
- Slow drag: Follow finger, snap to nearest state
```

## Accessibility

- Provide alternative actions for all gestures
- Avoid complex multi-finger sequences
- Support assistive technology gestures
- Allow gesture customization when possible
- Document gesture interactions clearly

## Best Practices

1. Follow platform conventions first
2. Make gestures discoverable
3. Always provide undo for destructive actions
4. Test on actual touch devices
5. Support single-handed operation where possible
