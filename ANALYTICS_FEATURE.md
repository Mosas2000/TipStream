# Analytics Dashboard Feature

## Overview

The Analytics Dashboard provides comprehensive visualization and insights into tip statistics, trends, and platform activity. It includes interactive charts, date range filtering, and data export capabilities.

## Features

### Summary Cards

Four key metrics displayed prominently:
- **Total Tips**: Total number of tips sent on the platform
- **Total Volume**: Aggregate STX volume across all tips
- **Average Tip**: Mean tip amount in STX
- **Unique Users**: Combined count of unique senders and recipients

### Tip Volume Chart

Interactive time-series visualization showing:
- Number of tips per day
- Volume (STX) per day
- Dual Y-axis for tips count and volume
- Toggle between line and bar chart views
- Responsive design for mobile and desktop

### Top Senders

Horizontal bar chart and detailed rankings showing:
- Top 10 senders by volume
- Number of tips sent
- Total volume sent
- Abbreviated addresses with full address on hover

### Top Recipients

Horizontal bar chart and detailed rankings showing:
- Top 10 recipients by volume
- Number of tips received
- Total volume received
- Abbreviated addresses with full address on hover

### Date Range Filter

Flexible date filtering with:
- Custom start and end date selection
- Quick preset buttons (7, 30, 90 days)
- Apply and reset functionality
- Real-time data updates

### Data Export

Export analytics data in multiple formats:
- **CSV**: Time-series data for spreadsheet analysis
- **JSON**: Complete analytics data including all metrics

## API Endpoints

### GET /api/analytics

Returns comprehensive analytics data with optional date filtering.

**Query Parameters:**
- `startDate` (optional): ISO 8601 date string for range start
- `endDate` (optional): ISO 8601 date string for range end

**Response:**
```json
{
  "summary": {
    "totalTips": 1234,
    "totalVolume": 5000000000,
    "totalFees": 50000000,
    "avgTipAmount": 4048582,
    "uniqueSenders": 456,
    "uniqueRecipients": 789
  },
  "topSenders": [
    {
      "address": "SP1ABC...",
      "count": 50,
      "volume": 250000000
    }
  ],
  "topRecipients": [
    {
      "address": "SP2DEF...",
      "count": 75,
      "volume": 300000000
    }
  ],
  "timeSeriesData": [
    {
      "date": "2024-01-15",
      "count": 25,
      "volume": 100000000
    }
  ]
}
```

## Components

### Analytics.jsx
Main dashboard component that orchestrates all sub-components and manages state.

### AnalyticsSummary.jsx
Displays summary statistics in card format with icons.

### TipVolumeChart.jsx
Line/bar chart showing tip volume over time using Recharts.

### TopSendersChart.jsx
Horizontal bar chart and rankings for top senders.

### TopRecipientsChart.jsx
Horizontal bar chart and rankings for top recipients.

### DateRangeFilter.jsx
Date range selection with presets and custom dates.

### ExportData.jsx
Dropdown menu for exporting data in CSV or JSON format.

## Services

### analytics.js

Utility functions for:
- `fetchAnalytics(startDate, endDate)`: Fetch analytics data from API
- `fetchStats()`: Fetch basic statistics
- `formatAmount(amount)`: Format microSTX to STX
- `formatAddress(address)`: Abbreviate Stacks addresses
- `exportToCSV(data, filename)`: Export data as CSV
- `exportToJSON(data, filename)`: Export data as JSON

## Styling

### Responsive Design

- Mobile-first approach
- Grid layouts adapt to screen size
- Charts scale appropriately
- Touch-friendly controls

### Color Scheme

- Blue: Primary actions and tip counts
- Green: Volume and financial metrics
- Purple: Recipients
- Orange: User metrics

### Animations

- Smooth transitions on hover
- Loading states with pulse animation
- Slide-down menu animations
- Fade-in tooltips

## Usage

### Accessing the Dashboard

Navigate to `/analytics` or click "Analytics" in the main navigation.

### Filtering Data

1. Click on the date inputs to select custom dates
2. Or use preset buttons for common ranges
3. Click "Apply" to update the dashboard
4. Click "Reset" to clear filters

### Exporting Data

1. Click the "Export Data" button
2. Select CSV or JSON format
3. File downloads automatically with timestamp

### Chart Interactions

- Hover over data points for detailed tooltips
- Toggle between line and bar views
- Charts are fully responsive

## Technical Details

### Dependencies

- **recharts**: Chart library for data visualization
- **lucide-react**: Icon library
- **react-router-dom**: Routing

### Performance

- Lazy loading of chart components
- Efficient data aggregation on backend
- Memoized calculations
- Optimized re-renders

### Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Responsive down to 320px width

## Testing

Run analytics tests:
```bash
npm test -- analytics.test.js
```

Tests cover:
- API endpoint responses
- Date filtering
- Data structure validation
- Top senders/recipients limits
- Summary calculations

## Future Enhancements

Potential improvements:
- Real-time updates via WebSocket
- More chart types (pie, scatter)
- Advanced filtering (by address, amount range)
- Comparison views (period over period)
- Downloadable PDF reports
- Scheduled email reports
- Custom dashboard layouts
- Saved filter presets

## Troubleshooting

### Charts not displaying

- Check browser console for errors
- Verify API endpoint is accessible
- Ensure data is being returned

### Date filter not working

- Verify date format is correct
- Check that dates are within valid range
- Ensure API supports date parameters

### Export not downloading

- Check browser download settings
- Verify popup blocker is not interfering
- Ensure data exists to export

## Contributing

When adding new analytics features:
1. Update API endpoint if needed
2. Add corresponding tests
3. Update this documentation
4. Ensure responsive design
5. Add appropriate error handling
