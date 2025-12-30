# Debugging Click to View Holdings

## Steps to Debug:

1. Open browser console (F12 or Cmd+Option+I)
2. Click on any filing item
3. Check console for:
   - "Filing item clicked: ..." message
   - "fetchHoldings called with filing: ..." message
   - "Fetching from URL: ..." message
   - "Response status: ..." message

## Expected Behavior:

When you click a filing:
1. Console should show "Filing item clicked"
2. The filing item should highlight (selected class)
3. Holdings section should appear below timeline
4. Loading message should show
5. Then either holdings table or error message

## Common Issues:

1. **No console messages** = Click handler not firing
   - Check if React dev server is running
   - Check browser console for JavaScript errors
   - Try hard refresh (Cmd+Shift+R)

2. **Console shows error** = API or network issue
   - Check backend is running on port 5001
   - Check network tab in browser dev tools

3. **Holdings section doesn't appear** = State update issue
   - Check React DevTools to see component state
   - Verify selectedFiling state is being set



