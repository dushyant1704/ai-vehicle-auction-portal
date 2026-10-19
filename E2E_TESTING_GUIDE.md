# 🧪 END-TO-END TESTING GUIDE

**AI Vehicle Auction Portal - YOLO Damage Detection**  
**Date**: June 19, 2026  
**Purpose**: Complete testing workflow for damage detection feature

---

## 🎯 TESTING OBJECTIVES

1. Verify complete damage detection workflow
2. Test backward compatibility (vehicles without damage data)
3. Test error handling and edge cases
4. Verify UI/UX across browsers and devices
5. Confirm data persistence and retrieval

---

## 🚀 SETUP INSTRUCTIONS

### 1. Start All Services

```bash
cd "c:\Users\mohak\OneDrive\Desktop\AI auction portal 2\project"
START_ALL_SERVICES.bat
```

Wait 30-60 seconds for all services to initialize:
- ✅ MongoDB (port 27017)
- ✅ XGBoost ML Service (port 5001)
- ✅ YOLO Damage Service (port 5002)
- ✅ Node.js Backend (port 5000)
- ✅ React Frontend (port 5173)

### 2. Verify Services

Open browser and check:
- **Frontend**: http://localhost:5173 (should show homepage)
- **Backend Health**: http://localhost:5000/api/health
- **ML Service**: http://localhost:5001/health
- **Damage Service**: http://localhost:5002/health

All should return `200 OK` status.

---

## 📋 TEST CASES

### TEST 1: Happy Path - Vehicle with Damage

**Objective**: Test complete workflow with damage detection

#### Steps:

1. **Navigate to Add Vehicle**
   - Click "Add Vehicle" in navigation
   - Verify form loads correctly

2. **Upload Vehicle Images** (5 images required)
   - Click "Upload Images" button
   - Select 5 vehicle images from test folder
   - **Expected**: Preview thumbnails appear
   - **Expected**: All 5 images show in preview grid

3. **Validate Image Quality**
   - Click "Validate Image Quality" button
   - **Expected**: Loading spinner appears
   - **Expected**: Success message: "All images passed quality checks"
   - **Expected**: Quality check icons turn green

4. **Run Damage Detection**
   - Click "Run Damage Detection" button
   - **Expected**: Loading spinner appears (may take 30-60 seconds)
   - **Expected**: Success message appears
   - **Expected**: Damage results display:
     - Total damages count
     - Severity level
     - Damage categories
     - Individual damage list with confidence scores
     - Annotated images grid

5. **Review Damage Results**
   - Verify damage summary shows correct data
   - Verify each damage has:
     - Type (dent, scratch, crack, etc.)
     - Confidence score (0-100%)
     - Severity badge (minor/moderate/major)
   - Click on annotated images
   - **Expected**: Full-size image opens in new tab
   - **Expected**: Bounding boxes visible on images

6. **Fill Vehicle Details**
   - Brand: "Honda"
   - Model: "City"
   - Year: 2020
   - Mileage: 30000
   - Fuel: "Petrol"
   - Transmission: "Manual"
   - Engine: 1500
   - Max Power: 119
   - Seats: 5
   - Condition: "good"
   - Price: 800000

7. **Submit Vehicle**
   - Click "Create Vehicle" button
   - **Expected**: Loading spinner appears
   - **Expected**: Success message: "Vehicle created successfully"
   - **Expected**: Redirect to vehicle details page

8. **Verify Vehicle Details Page**
   - **Expected**: All vehicle information displays correctly
   - **Expected**: Images display in gallery
   - **Expected**: Damage report section appears
   - **Expected**: Damage summary shows:
     - Total damages
     - Severity level
     - Categories
   - **Expected**: Damage list shows all detected damages
   - **Expected**: Annotated images grid displays
   - **Expected**: Pricing breakdown shows:
     - XGBoost Base Price
     - Damage Penalty %
     - Damage Adjusted Price
     - Final Valuation (80/20)

9. **Test Annotated Images**
   - Click each annotated image
   - **Expected**: Opens full-size in new tab
   - **Expected**: Bounding boxes clearly visible
   - **Expected**: Damage labels and confidence scores visible

10. **Verify Database Storage**
    - Check MongoDB database
    - **Expected**: Vehicle document contains:
      - `damages` array with damage objects
      - `damage_summary` object
      - `annotated_images` array with Cloudinary URLs
      - `xgboost_base_price`
      - `damage_penalty_percent`
      - `damage_adjusted_price`
      - `final_valuation`

#### Expected Results:
✅ All steps complete without errors  
✅ Damage data persists correctly  
✅ UI displays all damage information  
✅ Pricing reflects damage adjustment  

---

### TEST 2: Backward Compatibility - Vehicle Without Damage

**Objective**: Ensure existing functionality works without damage data

#### Steps:

1. **Navigate to Add Vehicle**
2. **Upload 3 Images Only** (less than minimum)
   - **Expected**: Error message: "Please upload at least 5 vehicle images"
3. **Upload 5 Images**
   - Preview appears
4. **Skip Damage Detection**
   - Do NOT click "Run Damage Detection"
5. **Fill Vehicle Details** (same as Test 1)
6. **Submit Vehicle**
   - **Expected**: Success (damage is optional)
   - **Expected**: Redirect to vehicle details
7. **Verify Vehicle Details Page**
   - **Expected**: All vehicle info displays
   - **Expected**: Damage section does NOT appear
   - **Expected**: Pricing shows XGBoost price only (no damage adjustment)

#### Expected Results:
✅ Vehicle creation works without damage data  
✅ No errors or crashes  
✅ Damage section hidden when no damage data  
✅ Pricing works with XGBoost only  

---

### TEST 3: Error Handling - Damage Service Unavailable

**Objective**: Test fallback behavior when damage service fails

#### Steps:

1. **Stop Damage Service**
   ```bash
   # In damage-service terminal
   Ctrl+C
   ```

2. **Navigate to Add Vehicle**
3. **Upload 5 Images**
4. **Click "Run Damage Detection"**
   - **Expected**: Error message: "Damage detection service unavailable"
   - **Expected**: Suggestion: "You can still create the vehicle without damage analysis"

5. **Fill Vehicle Details and Submit**
   - **Expected**: Success
   - **Expected**: Vehicle created without damage data

6. **Restart Damage Service**
   ```bash
   cd "ai auction portal backend\damage-service"
   venv\Scripts\activate
   python app.py
   ```

#### Expected Results:
✅ Graceful error handling  
✅ User-friendly error messages  
✅ System continues working  
✅ Vehicle creation not blocked  

---

### TEST 4: Edge Cases

#### Test 4a: Exactly 5 Images
- Upload exactly 5 images
- **Expected**: Accepted, damage detection works

#### Test 4b: More Than 5 Images
- Upload 7 images
- **Expected**: Warning message: "Only first 5 images will be used"
- **Expected**: Damage detection uses first 5 images

#### Test 4c: Poor Quality Images
- Upload 5 low-resolution or blurry images
- Click "Validate Image Quality"
- **Expected**: Warning messages for failed quality checks
- **Expected**: Option to re-upload failed images

#### Test 4d: No Damage Detected
- Upload 5 pristine vehicle images (no visible damage)
- Run damage detection
- **Expected**: Message: "No damage detected"
- **Expected**: Severity level: "Pristine"
- **Expected**: Damage penalty: 0%
- **Expected**: Final price = XGBoost price

#### Test 4e: Severe Damage
- Upload 5 images with major damage
- Run damage detection
- **Expected**: High damage count (5-10 damages)
- **Expected**: Severity level: "Major" or "Severe"
- **Expected**: Damage penalty: 30-50%
- **Expected**: Significant price reduction visible

---

### TEST 5: UI/UX Testing

#### Test 5a: Responsive Design
1. **Desktop (1920x1080)**
   - Verify all sections display correctly
   - Check damage grid layout (3 columns)
   - Check annotated images grid (5 columns)

2. **Tablet (768x1024)**
   - Verify responsive grid adjustments
   - Check damage grid (2 columns)
   - Check annotated images grid (3 columns)

3. **Mobile (375x667)**
   - Verify single column layout
   - Check damage list readability
   - Check annotated images grid (2 columns)

#### Test 5b: Loading States
- Verify loading spinners appear during:
  - Image quality validation
  - Damage detection
  - Vehicle creation
  - Page fetching

#### Test 5c: Color-Coded Severity
- **Minor**: Green badge
- **Moderate**: Amber/yellow badge
- **Major**: Red badge
- **Severe**: Dark red badge

#### Test 5d: Interactive Elements
- Annotated images: Hover effect (border color change)
- Annotated images: Click opens new tab
- Back button: Returns to previous page
- Place Bid button: Opens modal

---

### TEST 6: Browser Compatibility

Test in multiple browsers:

- ✅ **Chrome** (latest)
- ✅ **Firefox** (latest)
- ✅ **Edge** (latest)
- ✅ **Safari** (if available on Mac)

Verify:
- UI renders consistently
- Images load correctly
- Damage detection works
- No console errors

---

### TEST 7: Performance Testing

#### Test 7a: Damage Detection Speed
- Upload 5 images
- Run damage detection
- **Expected**: Completes within 60 seconds
- **Acceptable**: 30-90 seconds (depends on hardware)

#### Test 7b: Image Upload Speed
- Upload 5 high-resolution images (2-5 MB each)
- **Expected**: Previews appear within 2 seconds
- **Expected**: Upload completes within 10 seconds

#### Test 7c: Page Load Speed
- Navigate to vehicle details page
- **Expected**: Page loads within 2 seconds
- **Expected**: Images load progressively

---

### TEST 8: Data Integrity

#### Test 8a: Refresh Page
1. Create vehicle with damage
2. On vehicle details page, refresh browser
3. **Expected**: All damage data persists
4. **Expected**: Annotated images still accessible

#### Test 8b: Navigate Away and Return
1. View vehicle details with damage
2. Navigate to auctions list
3. Return to same vehicle details
4. **Expected**: Damage section still displays
5. **Expected**: Data unchanged

#### Test 8c: MongoDB Persistence
1. Create vehicle with damage
2. Stop and restart backend server
3. View vehicle details
4. **Expected**: All damage data still present

---

## 🐛 BUG REPORTING TEMPLATE

If you encounter issues, use this template:

```markdown
## Bug Report

**Test Case**: [Test number and name]
**Browser**: [Chrome/Firefox/Safari/Edge]
**Date**: [Date and time]

**Steps to Reproduce**:
1. 
2. 
3. 

**Expected Behavior**:
[What should happen]

**Actual Behavior**:
[What actually happened]

**Screenshots**:
[Attach screenshots if applicable]

**Console Errors**:
[Copy any errors from browser console]

**Severity**: [Critical/High/Medium/Low]
```

---

## ✅ TEST COMPLETION CHECKLIST

### Functional Tests
- [ ] Test 1: Happy Path - Vehicle with Damage
- [ ] Test 2: Backward Compatibility
- [ ] Test 3: Error Handling - Service Unavailable
- [ ] Test 4a: Exactly 5 Images
- [ ] Test 4b: More Than 5 Images
- [ ] Test 4c: Poor Quality Images
- [ ] Test 4d: No Damage Detected
- [ ] Test 4e: Severe Damage

### UI/UX Tests
- [ ] Test 5a: Responsive Design (Desktop/Tablet/Mobile)
- [ ] Test 5b: Loading States
- [ ] Test 5c: Color-Coded Severity
- [ ] Test 5d: Interactive Elements

### Browser Tests
- [ ] Chrome
- [ ] Firefox
- [ ] Edge
- [ ] Safari

### Performance Tests
- [ ] Test 7a: Damage Detection Speed
- [ ] Test 7b: Image Upload Speed
- [ ] Test 7c: Page Load Speed

### Data Integrity Tests
- [ ] Test 8a: Refresh Page
- [ ] Test 8b: Navigate Away and Return
- [ ] Test 8c: MongoDB Persistence

---

## 📊 TEST RESULTS SUMMARY

**Total Tests**: 20  
**Tests Passed**: ___  
**Tests Failed**: ___  
**Bugs Found**: ___  
**Critical Bugs**: ___  

**Overall Status**: [Pass/Fail]  
**Production Ready**: [Yes/No]  

---

## 🎯 SIGN-OFF

**Tested By**: _______________  
**Date**: _______________  
**Status**: [Approved/Needs Fixes]  

**Notes**:
_________________________________
_________________________________
_________________________________

---

**Testing Time Estimate**: 4-6 hours for complete testing  
**Priority**: HIGH - Required before production deployment
