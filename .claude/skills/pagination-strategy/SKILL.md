# Pagination Strategy

## Description
Designs pagination strategies for lists and data tables. Use when implementing pagination, infinite scroll, or when the user asks about handling large data sets in the UI.

## Instructions

### Pagination Types

| Type | Pros | Cons | Best For |
|------|------|------|----------|
| **Offset** | Simple, familiar | Consistency issues | Static data |
| **Cursor** | Consistent, scalable | Complex implementation | Real-time data |
| **Infinite Scroll** | Seamless browsing | Hard to reach items | Social feeds |
| **Load More** | User controlled | Extra clicks | Search results |

### Offset Pagination

Traditional page numbers:
```
┌────────────────────────────────────┐
│ 결과 1-12 / 총 156개               │
├────────────────────────────────────┤
│ [카드] [카드] [카드] [카드]        │
│ [카드] [카드] [카드] [카드]        │
│ [카드] [카드] [카드] [카드]        │
├────────────────────────────────────┤
│ « ‹ 1 2 [3] 4 5 ... 13 › »         │
└────────────────────────────────────┘
```

API: `?page=3&limit=12`

### Cursor-Based Pagination

Better for dynamic data:
```
Request: ?cursor=abc123&limit=12
Response: {
  data: [...],
  nextCursor: "def456",
  hasMore: true
}
```

### Infinite Scroll

For mobile-optimized lists:
```
┌────────────────────────────────────┐
│ [카드]                             │
│ [카드]                             │
│ [카드]                             │
│ [카드]                             │
│ ↓ 스크롤하면 자동 로드             │
│ ● ● ● (로딩 인디케이터)            │
└────────────────────────────────────┘
```

Implementation:
```javascript
// IntersectionObserver로 구현
const observer = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting && hasMore) {
    loadMore();
  }
}, { threshold: 0.1 });

observer.observe(sentinelRef.current);
```

### Load More Button

User-controlled loading:
```
┌────────────────────────────────────┐
│ 검색 결과 36개 중 12개 표시        │
├────────────────────────────────────┤
│ [카드] [카드] [카드]               │
│ [카드] [카드] [카드]               │
├────────────────────────────────────┤
│      [더 보기 +12개]               │
└────────────────────────────────────┘
```

### API Design

**Request Parameters:**
- `page` or `cursor`: Position indicator
- `limit`: Items per page (default: 12)
- `sort`: Sort field and direction
- `filters`: Applied filters

**Response Structure:**
```json
{
  "data": [...],
  "pagination": {
    "total": 156,
    "page": 3,
    "limit": 12,
    "hasMore": true,
    "nextCursor": "abc123"
  }
}
```

### Performance Optimization

1. Index database columns used for sorting/filtering
2. Cache common queries
3. Set reasonable max page size (50-100)
4. Implement efficient cursor queries
5. Use `count` queries sparingly

### UI/UX Considerations

- Show current position in results
- Implement "jump to page" for offset
- Preserve scroll position on back navigation
- Handle loading states clearly
- Show total count when available

### Edge Cases

Handle these scenarios:
- Empty results
- Single page of results
- Data changes between page loads
- Very large result sets
- Network errors during load

### Mobile Pattern (Recommended)

For job listing mobile view:
```
┌────────────────────────────────────┐
│ 바텀시트 (드래그 가능)              │
├────────────────────────────────────┤
│ 공고 목록          23개 ▲         │
├────────────────────────────────────┤
│ [카드] 스크롤                       │
│ [카드] ↓                           │
│ [카드]                             │
│ [로딩...]                          │
└────────────────────────────────────┘

- Infinite scroll within bottom sheet
- Pull up to expand sheet
- Skeleton loading for new items
```

## Best Practices

1. Default to sensible page size (12-20 items)
2. Show loading state clearly
3. Handle "no more results" gracefully
4. Preserve scroll position
5. Consider SEO (offset better for crawlers)
