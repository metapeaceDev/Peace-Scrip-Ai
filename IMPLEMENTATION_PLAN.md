# Step5Output Restructuring Implementation Plan

## Current State
- Step5Output.tsx is at commit df276876a (i18n support foundation)
- 2-tier tab structure was previously deployed but not committed to git
- Need to reimplement based on user requirements

## User Requirements
1. **Psychology Timeline**: Move from modal/button to Simulation tab content
2. **Top Bar Buttons**: Move "Show Preview" and "Export" to main Step5Output top bar
3. **Structure**: Maintain 2-tier tab system (Scene Design / Simulation / Motion Editor)

## Implementation Steps

### Step 1: Find Psychology Timeline Modal Code
- Location: Around line 4250-4500 (based on previous reads)
- Contains character psychology cards with stats, timelines, changes
- Currently triggered by `showPsychologyTimeline` state

### Step 2: Find Simulation Tab Placeholder
- Should be in SceneItem component (around line 2035)
- Contains "Coming Soon" placeholder

### Step 3: Find Top Bar Buttons
- Show Preview button: Around line 3880
- Export button: Around line 3888
- Psychology Timeline button: Around line 3871

### Step 4: Implementation Order
1. Copy Psychology Timeline modal content
2. Replace Simulation tab placeholder with Psychology Timeline content
3. Remove Psychology Timeline button from scene-level bar
4. Add Show Preview and Export buttons to Step5Output main header
5. Remove old Psychology Timeline modal code
6. Test and deploy

## Key Files
- `/src/components/Step5Output.tsx` - Main component
- `/src/components/MotionEditor.tsx` - Already has 2-tier structure
