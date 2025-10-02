# Calendar Custom Styles

## Overview
Custom CSS styles for React Big Calendar to improve visual appearance and event display capacity.

## Features

### 1. **Improved Visual Design**
- Modern, clean interface with Tailwind-inspired colors
- Subtle shadows and borders
- Smooth transitions and hover effects
- Better focus states for accessibility

### 2. **Enhanced Event Display**
- **Increased row height**: `140px` minimum per row
- **Compact event spacing**: Events are closer together to fit more
- **Better event styling**: Color-coded by status (blue=scheduled, green=completed, red=canceled)
- **Improved hover effects**: Events lift slightly on hover with enhanced shadow

### 3. **More Events Per Cell**
The calendar is configured to show more events before showing the "show more" button:
- Increased `min-height` for month rows to `140px`
- Compact event padding and margins
- Optimized event line-height for better space utilization
- Popup overlay for viewing all events in a day

### 4. **Vietnamese Localization**
- All calendar labels translated to Vietnamese
- Custom "show more" message: `+ Xem thêm ${total} buổi học`
- Vietnamese month and day names

### 5. **Responsive Design**
- Mobile-friendly toolbar that stacks vertically on small screens
- Adjusted event sizes for mobile devices
- Maintains readability across all screen sizes

## Configuration

### Calendar Height
```tsx
<div className="h-[700px]">
  <Calendar ... />
</div>
```

### Event Display Settings
- `popup={true}` - Enable popup for overflow events
- `popupOffset={{ x: 10, y: 10 }}` - Position popup offset
- `showMultiDayTimes` - Show times for multi-day events
- Custom `eventPropGetter` for status-based colors

### Color Scheme
- **Scheduled**: `#3b82f6` (blue-500)
- **Completed**: `#10b981` (green-500)
- **Canceled**: `#ef4444` (red-500)
- **Today**: `#eff6ff` (blue-50 background)

## Usage

Import the custom CSS after the default React Big Calendar CSS:

```tsx
import "react-big-calendar/lib/css/react-big-calendar.css";
import "../../styles/calendar-custom.css";
```

## Customization

To show even more events, you can adjust these values in `calendar-custom.css`:

```css
/* Increase row height */
.rbc-month-row {
  min-height: 160px !important; /* Increase from 140px */
}

/* Make events even more compact */
.rbc-event {
  min-height: 20px; /* Decrease from 22px */
  padding: 2px 6px; /* Decrease from 4px 8px */
}
```

## Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- IE11 not supported (uses CSS Grid and modern flexbox)
