# Card Component Patterns

## Description
Designs card components for content display in applications. Use when creating card layouts, content cards, or when the user asks about card-based UI patterns.

## Instructions

### Card Anatomy

Standard card structure:
```
┌─────────────────────────────┐
│ HEADER (title, icon, actions)│
├─────────────────────────────┤
│ MEDIA (image, video)        │
├─────────────────────────────┤
│ BODY (main content)         │
├─────────────────────────────┤
│ ACTIONS (buttons, links)    │
├─────────────────────────────┤
│ FOOTER (metadata, tags)     │
└─────────────────────────────┘
```

### Card Types

**Basic Card:**
- Simple content container
- Title + description + optional actions

**Media Card:**
- Image/video as hero
- Optional overlay text
- Good for visual content

**Interactive Card:**
- Entire surface clickable
- Hover/focus states
- Indicates actionability

**List Item Card:**
- Horizontal layout
- Thumbnail + content side by side
- Compact for lists

### Layout Patterns

| Pattern | Description | Use Case |
|---------|-------------|----------|
| **Grid** | Equal-sized cards | Gallery, products |
| **List** | Horizontal cards | Search results, feeds |
| **Masonry** | Variable heights | Pinterest-style |
| **Carousel** | Horizontal scroll | Featured items |

### Responsive Design

**Mobile (< 768px):**
- Single column layout
- Full-width cards
- Larger touch targets
- Truncate long text

**Tablet (768px - 1024px):**
- 2-column grid
- Maintain aspect ratios

**Desktop (> 1024px):**
- 3-4 column grid
- Hover states visible

### Interactive States

```css
/* Visual feedback */
hover:   elevation increase, subtle scale
focus:   visible outline (accessibility)
active:  pressed/depressed state
selected: highlighted border/background
disabled: reduced opacity (0.5)
```

### Job Card Specific Patterns

For job listing cards:
```
┌──┬────────────────────────────┐
│색│ 기관명              D-3 🔥 │
│상│ 공고 제목 (전문상담, 초등) │
│바│ 📍 위치  💰 급여          │
│  │ 📅 마감일                  │
└──┴────────────────────────────┘
```

- Left color bar indicates school level
- Urgent badge for deadline < 3 days
- Key info scannable at glance
- Tags for quick filtering

## Accessibility

1. Use semantic HTML (article, heading)
2. Provide alt text for images
3. Ensure keyboard navigation
4. Visible focus states
5. Sufficient touch target size (44x44 minimum)
6. Descriptive link/button text

## Best Practices

1. Keep cards focused (single purpose)
2. Consistent card sizes in grids
3. Limit actions to 2-3 per card
4. Use whitespace effectively
5. Test with real content (avoid lorem ipsum)
