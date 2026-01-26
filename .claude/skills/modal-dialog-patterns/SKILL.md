# Modal Dialog Patterns

## Description
Guides on implementing modals, dialogs, and overlays for web and mobile applications. Use when creating modal dialogs, confirmation prompts, or when the user asks about overlay patterns and accessibility.

## Instructions

### Types of Modals

| Type | Use Case | Dismissal |
|------|----------|-----------|
| **Alert Dialog** | Important messages | Requires action |
| **Confirmation** | Confirm user actions | Yes/No buttons |
| **Form Modal** | Data input in overlay | Submit/Cancel |
| **Full-Screen** | Complex tasks (mobile) | Close button |
| **Drawer/Slide-in** | Side panel content | Swipe/click outside |
| **Bottom Sheet** | Mobile action sheets | Swipe down |

### Accessibility Requirements

Essential ARIA attributes:
```html
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
>
  <h2 id="modal-title">제목</h2>
  <p id="modal-description">설명</p>
</div>
```

Requirements:
- Use `role="dialog"` or `role="alertdialog"`
- Set `aria-modal="true"`
- Provide `aria-labelledby` and `aria-describedby`
- Trap focus within modal
- Return focus to trigger on close
- Close on Escape key
- Announce to screen readers

### Focus Management

1. Focus first focusable element on open
2. Or focus modal title if no focusables
3. Trap tab navigation within modal
4. Handle Shift+Tab correctly
5. Restore focus to trigger element on close
6. Handle dynamically added content

### Backdrop and Dismissal

- Click outside to close (optional, not for forms)
- Escape key to close (always)
- Close button always visible
- Prevent background scrolling (`body { overflow: hidden }`)
- Handle multiple modal layers (z-index stacking)
- Animate open/close transitions

### Content Guidelines

- Clear, concise titles
- Focused, single-purpose content
- Clear action buttons (Cancel | Confirm)
- Primary action on right (web convention)
- Destructive actions require explicit confirmation
- Don't nest modals

### Mobile Adaptations

**Bottom Sheet Pattern:**
```
┌────────────────────────────┐
│ ═══ (drag handle)          │
│                            │
│ 상세 정보                   │
│ 내용...                     │
│                            │
│ [액션 버튼]                 │
└────────────────────────────┘

States:
- Collapsed: 150px (preview)
- Half: 50% screen
- Full: 90% screen
```

Mobile considerations:
- Full-screen for complex modals
- Bottom sheets for action lists
- Swipe to dismiss
- Safe area padding (notch, home indicator)
- Handle keyboard appearance

### Job Detail Modal Pattern

For this project's job detail:
```
┌────────────────────────────┐
│ [색상바] 학교급 배지        │  ← 학교급별 색상
├────────────────────────────┤
│ 기관명                      │
│ 공고 제목                   │
├────────────────────────────┤
│ 📍 위치                     │
│ 💰 보수                     │
│ 📅 마감일                   │
│ 📞 연락처                   │
├────────────────────────────┤
│ 태그들                      │
├────────────────────────────┤
│ [지원하기] [공유]           │
└────────────────────────────┘
```

## Best Practices

1. Use modals sparingly - consider alternatives
2. Always provide escape route
3. Test with screen readers
4. Handle fast double-clicks
5. Consider non-modal alternatives (inline expand)
