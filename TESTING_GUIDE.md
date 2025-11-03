# Brain Dump Canvas - Testing Guide

**Date**: November 3, 2025

## 🚀 Quick Start

The development server is now running at **http://localhost:3000**

### Prerequisites Checklist

Before testing, ensure you have:
- ✅ `.env.local` file with Supabase credentials (see below)
- ✅ Supabase project configured and accessible
- ✅ Node.js and npm installed
- ✅ All dependencies installed (`npm install`)

---

## 🔑 Environment Setup

### Create `.env.local` File

**IMPORTANT**: You need to create this file for the app to work:

```bash
# In the project root, create .env.local
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_PROJECT_ID=qnrwfaroycqdlaruddfv
NEXT_PUBLIC_SUPABASE_URL=https://qnrwfaroycqdlaruddfv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFucndmYXJveWNxZGxhcnVkZGZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzAzODg5NjgsImV4cCI6MjA0NTk2NDk2OH0.VBOJGpfbPOqWGNMdlPfUlZNkDNVJCN1FqJEDMPCbGMQ
EOF
```

**Note**: The `.env.local` file is gitignored and won't be committed.

---

## 🧪 Testing Scenarios

### Scenario 1: Authentication Flow ✨

**Test**: Sign up and login functionality

1. **Navigate to** http://localhost:3000
2. **Expected**: Auto-redirect to `/login` (not authenticated)
3. **Test Sign Up**:
   - Enter email: `test@example.com`
   - Enter password: `testpassword123`
   - Click "Sign Up"
   - Check for success message or email verification prompt
4. **Test Sign In**:
   - Enter same credentials
   - Click "Sign In"
   - Should redirect to main canvas
5. **Test Google OAuth** (if configured):
   - Click "Google" button
   - Complete OAuth flow
   - Should return to canvas

**✅ Success Criteria**:
- Login page renders with liquid glass effect
- Email validation works
- Password minimum length enforced
- Successful auth redirects to canvas
- Session persists on refresh

---

### Scenario 2: Welcome Experience 🎉

**Test**: First-time user experience

1. **After Login**: Should see welcome brain dump with tutorial ideas
2. **Expected Elements**:
   - 6 welcome ideas on canvas
   - Ideas connected with edges
   - Side panel showing "Welcome to Brain Dump Canvas"
   - Canvas header with idea count
   - Input box at bottom

**✅ Success Criteria**:
- Welcome brain dump auto-created
- Ideas positioned in readable layout
- Edges connect related ideas
- All UI components visible

---

### Scenario 3: Canvas Interaction 🎨

**Test**: Pan, zoom, and navigation

1. **Pan Canvas**:
   - Click and drag on empty space
   - Canvas should move smoothly
2. **Zoom**:
   - Scroll mouse wheel up/down
   - Or pinch on trackpad
   - Zoom level displays in toolbar (top-right)
3. **Reset View**:
   - Click maximize icon in toolbar
   - Canvas resets to (0, 0) at 100% zoom
4. **Toggle Grid**:
   - Click grid icon in toolbar
   - Grid overlay appears/disappears

**✅ Success Criteria**:
- Pan is smooth, no lag
- Zoom centers on mouse position
- Zoom range: 10% - 300%
- Grid toggles correctly
- Reset works

---

### Scenario 4: Idea Management 💡

**Test**: Create, move, and select ideas

#### Create Ideas:
1. **Type in bottom input box**: "My first idea"
2. **Press Enter**
3. **Expected**: New idea appears near center in spiral pattern
4. **Repeat**: Add 3-4 more ideas

#### Move Ideas:
1. **Click and drag** an idea
2. **Expected**: Idea follows mouse, slightly scaled up
3. **Release**: Idea stays in new position

#### Select Ideas:
1. **Single Select**: Click one idea
   - Should have blue ring around it
2. **Multi-Select**: Cmd/Ctrl + Click other ideas
   - Multiple ideas selected
3. **Box Select**: 
   - Click empty space, drag to create box
   - All ideas in box get selected
4. **Clear Selection**: Click empty space or press Escape

#### Move Multiple Ideas:
1. **Select 2-3 ideas** (Cmd/Ctrl + Click)
2. **Drag one of them**
3. **Expected**: All selected ideas move together

**✅ Success Criteria**:
- Ideas appear instantly
- Drag is smooth
- Selection indicators clear
- Box selection works
- Multi-select move maintains relative positions

---

### Scenario 5: Edge Creation 🔗

**Test**: Connect ideas with relationships

#### Create Edge:
1. **Hover over an idea**
2. **Expected**: Blue connection handle appears on right side
3. **Click handle** and drag toward another idea
4. **Expected**: Dashed line follows mouse
5. **Release over target idea**
6. **Expected**: Curved edge appears with "relates-to" label

#### Delete Edge:
1. **Start creating a new edge** from an idea
2. **Drag over an existing edge** between the same ideas
3. **Expected**: Line turns red, shows "Delete Edge"
4. **Release**: Edge is deleted

#### Select and Delete:
1. **Click an edge** directly
2. **Expected**: Edge turns blue (selected)
3. **Press Delete or Backspace**
4. **Expected**: Edge removed

**✅ Success Criteria**:
- Connection handle visible on hover
- Edge creation is intuitive
- Curved edges look professional
- Delete by crossing works
- Labels display correctly

---

### Scenario 6: Theme System 🎨

**Test**: Switch between themes

1. **Click palette icon** in toolbar (top-right)
2. **Try each theme**:
   - Light
   - Purple Dreams
   - Ocean Depths
   - Sunset Glow
   - Forest Mist
   - Dotted Light
   - Dotted Dark
   - Wave Pattern
3. **Expected**: Background changes, UI adapts

**✅ Success Criteria**:
- All 8 themes render correctly
- Liquid glass effect visible on all themes
- Text color adjusts for readability
- Grid color adapts to theme
- Theme persists on refresh

---

### Scenario 7: Brain Dump Management 📚

**Test**: Multiple brain dumps

#### Create New:
1. **Click "New Brain Dump"** in side panel
2. **Expected**: New brain dump created
3. **Name appears selected** for editing
4. **Type name**: "Project Ideas"
5. **Press Enter**

#### Switch Between:
1. **Click different brain dump** in sidebar
2. **Expected**: Canvas switches immediately
3. **Ideas from that brain dump load**

#### Rename:
1. **Click edit icon** next to brain dump name
2. **Type new name**
3. **Press Enter or click outside**

#### Delete:
1. **Click trash icon** next to brain dump
2. **Expected**: Confirmation dialog
3. **Confirm**: Brain dump deleted
4. **Expected**: Switches to another brain dump

**✅ Success Criteria**:
- Can create unlimited brain dumps
- Switching is instant
- Each brain dump isolated
- Rename works inline
- Delete requires confirmation

---

### Scenario 8: Toolbar Features ⚙️

**Test**: Zoom controls and bulk actions

1. **Zoom In/Out**: Click +/- buttons
2. **Zoom Display**: Shows current zoom %
3. **Grid Toggle**: Shows/hides grid
4. **Theme Picker**: Opens theme menu
5. **Bulk Delete**:
   - Select multiple ideas
   - Trash icon appears in toolbar
   - Click to delete all selected

**✅ Success Criteria**:
- All buttons responsive
- Zoom increments by 10%
- Icons clear and intuitive
- Bulk delete works correctly

---

### Scenario 9: Keyboard Shortcuts ⌨️

**Test**: Keyboard navigation

| Action | Shortcut | Expected Result |
|--------|----------|----------------|
| Delete selected | Delete/Backspace | Ideas or edges removed |
| Clear selection | Escape | All selections cleared |
| Cancel connection | Escape | Connection mode exits |

**✅ Success Criteria**:
- Shortcuts work globally
- No conflicts with browser shortcuts
- Visual feedback for actions

---

### Scenario 10: Side Panel Interactions 📁

**Test**: Collapsible sidebar

1. **Click collapse arrow** (chevron icon)
2. **Expected**: Panel collapses to icon-only
3. **Icons show**: Create, brain dumps, logout
4. **Hover**: Tooltips appear
5. **Click expand**: Panel expands again

**✅ Success Criteria**:
- Smooth collapse animation
- Icons remain functional
- Canvas resizes automatically
- State persists

---

## 🐛 Known Issues to Watch For

### Current Limitations:

1. **Backend Not Connected**:
   - Brain dumps stored in memory only
   - Data lost on refresh (until API integration)
   - No persistence to Supabase yet

2. **Missing Modals**:
   - Double-click on idea doesn't open detail modal (not implemented)
   - Settings modal placeholder only
   - Keyboard shortcuts modal missing

3. **Mobile**:
   - Touch gestures need optimization
   - Some UI elements may be small on mobile

4. **Performance**:
   - Test with 50+ ideas to check performance
   - May need viewport culling for very large canvases

---

## 🔍 Browser Console Testing

### Check for Errors:

1. **Open DevTools**: Press F12 or Right-click → Inspect
2. **Console Tab**: Should see no red errors
3. **Network Tab**: Check API calls (will fail until backend connected)

### Expected Console Messages:

```
✅ "Loading your brain dumps..." (on login)
✅ "Welcome to Brain Dump Canvas" (first user)
⚠️  "Failed to load brain dumps" (API not connected - EXPECTED)
```

---

## 📊 Performance Testing

### Test with Many Ideas:

1. **Create 20+ ideas** rapidly
2. **Check**:
   - Pan/zoom still smooth?
   - Drag performance?
   - Selection speed?
3. **Monitor**: DevTools Performance tab

**Target**: 60 FPS during all interactions

---

## 🎥 Visual Testing

### UI Elements to Check:

- [ ] Liquid glass effect visible on cards
- [ ] Gradient borders on selected items
- [ ] Smooth transitions on hover
- [ ] Connection handles appear on hover
- [ ] Edge curves look natural
- [ ] Labels readable on all themes
- [ ] Icons clear and aligned
- [ ] Responsive layout on resize

---

## 🚨 Error Scenarios to Test

### Test Error Handling:

1. **No Network**: Disconnect internet
   - Should show error message
   - UI remains functional

2. **Invalid Credentials**: Try wrong password
   - Should show error
   - Doesn't crash

3. **Empty Brain Dump**: Delete all ideas
   - Canvas shows empty state
   - Input still works

4. **Rapid Actions**: Create ideas quickly
   - No duplicate IDs
   - All appear correctly

---

## 📝 Test Checklist

Copy this checklist and mark as you test:

```
AUTHENTICATION:
[ ] Sign up works
[ ] Sign in works
[ ] Google OAuth works
[ ] Session persists
[ ] Logout works

CANVAS:
[ ] Pan works smoothly
[ ] Zoom works smoothly
[ ] Grid toggles
[ ] Reset viewport works
[ ] Box selection works

IDEAS:
[ ] Create via input box
[ ] Drag and move
[ ] Single select
[ ] Multi-select
[ ] Delete selected
[ ] Spiral placement works

EDGES:
[ ] Create by dragging
[ ] Delete by crossing
[ ] Select and delete
[ ] Curved paths render
[ ] Labels display

THEMES:
[ ] All 8 themes work
[ ] Liquid glass renders
[ ] Text color adapts
[ ] Theme persists

BRAIN DUMPS:
[ ] Create new
[ ] Switch between
[ ] Rename inline
[ ] Delete with confirm
[ ] List displays

UI:
[ ] Toolbar functional
[ ] Sidebar collapsible
[ ] Header editable
[ ] Input box works
[ ] All icons visible

KEYBOARD:
[ ] Delete key works
[ ] Escape clears selection
[ ] No conflicts

PERFORMANCE:
[ ] Smooth with 20+ ideas
[ ] 60 FPS maintained
[ ] No memory leaks
```

---

## 🎯 Next Steps After Testing

Once you've tested the frontend:

1. **Report Issues**: Note any bugs or UX issues
2. **Backend Integration**: Connect to Supabase API
3. **Add Missing Modals**: Detail, Settings, Shortcuts
4. **Optimize Mobile**: Touch gestures and responsive UI
5. **Add Persistence**: Save/load from database
6. **Implement Attachments**: File upload feature
7. **Add AI Features**: Idea summarization

---

## 💡 Tips for Best Testing Experience

1. **Use Chrome DevTools**: Best for debugging React apps
2. **Test in Multiple Browsers**: Chrome, Firefox, Safari
3. **Try Different Screen Sizes**: Resize browser window
4. **Test with Real Data**: Create meaningful ideas, not just "test 1, test 2"
5. **Explore Edge Cases**: What if you delete everything? Create 100 ideas?
6. **Check Mobile**: Use DevTools device emulation
7. **Monitor Console**: Keep DevTools open while testing

---

## 🎉 What Success Looks Like

**Perfect Test Run**:
- ✅ No console errors
- ✅ All features work smoothly
- ✅ UI is responsive and beautiful
- ✅ Liquid glass effects visible
- ✅ All 8 themes gorgeous
- ✅ Pan/zoom buttery smooth
- ✅ Ideas and edges intuitive
- ✅ Multi-select and bulk actions work
- ✅ Brain dump switching instant

---

## 📞 Need Help?

If you encounter issues:

1. Check the console for error messages
2. Verify `.env.local` exists and is correct
3. Make sure Supabase project is accessible
4. Try restarting the dev server
5. Clear browser cache and localStorage
6. Check that port 3000 is not in use

---

**Happy Testing! 🚀**

The dev server is running at: **http://localhost:3000**

Open it in your browser and explore!

