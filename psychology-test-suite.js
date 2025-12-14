/**
 * Psychology Timeline System Test
 * Run this in Browser Console to verify system functionality
 */

// ======================================
// Test Suite for Psychology Evolution
// ======================================

console.log('🧪 Starting Psychology Timeline System Test...\n');

// Test 1: Check if psychologyTimelines exists
function testPsychologyTimelinesExist() {
  console.log('Test 1: Checking psychologyTimelines...');

  if (typeof scriptData === 'undefined') {
    console.error('❌ FAIL: scriptData is not defined. Not in app context.');
    return false;
  }

  if (!scriptData.psychologyTimelines) {
    console.warn('⚠️ WARNING: psychologyTimelines is undefined');
    console.log('   This is normal for old projects. Try reopening the project.');
    return false;
  }

  console.log('✅ PASS: psychologyTimelines exists');
  console.log(
    '   Number of character timelines:',
    Object.keys(scriptData.psychologyTimelines).length
  );
  return true;
}

// Test 2: Verify timeline structure
function testTimelineStructure() {
  console.log('\nTest 2: Verifying timeline structure...');

  if (!scriptData.psychologyTimelines) {
    console.error('❌ FAIL: Cannot test - psychologyTimelines is undefined');
    return false;
  }

  const timelines = scriptData.psychologyTimelines;
  const firstCharId = Object.keys(timelines)[0];

  if (!firstCharId) {
    console.error('❌ FAIL: No timelines found');
    return false;
  }

  const timeline = timelines[firstCharId];
  const requiredFields = ['characterId', 'characterName', 'snapshots', 'changes', 'overallArc'];
  const missingFields = requiredFields.filter(field => !(field in timeline));

  if (missingFields.length > 0) {
    console.error('❌ FAIL: Timeline missing fields:', missingFields);
    return false;
  }

  console.log('✅ PASS: Timeline structure is correct');
  console.log('   Character:', timeline.characterName);
  console.log('   Snapshots:', timeline.snapshots.length);
  console.log('   Changes:', timeline.changes.length);
  return true;
}

// Test 3: Check initial state
function testInitialState() {
  console.log('\nTest 3: Checking initial state...');

  const timelines = scriptData.psychologyTimelines;
  const firstCharId = Object.keys(timelines)[0];
  const timeline = timelines[firstCharId];

  if (timeline.snapshots.length === 0) {
    console.error('❌ FAIL: No snapshots found');
    return false;
  }

  const initialSnapshot = timeline.snapshots[0];

  if (initialSnapshot.sceneNumber !== 0) {
    console.error('❌ FAIL: First snapshot should be scene 0');
    return false;
  }

  if (!initialSnapshot.consciousness || !initialSnapshot.defilement) {
    console.error('❌ FAIL: Missing consciousness or defilement data');
    return false;
  }

  console.log('✅ PASS: Initial state is correct');
  console.log('   Scene 0 Mental Balance:', initialSnapshot.mentalBalance.toFixed(1));
  console.log('   Dominant Emotion:', initialSnapshot.dominantEmotion);
  return true;
}

// Test 4: Check if scenes trigger updates
function testSceneUpdates() {
  console.log('\nTest 4: Checking scene-based updates...');

  const timelines = scriptData.psychologyTimelines;
  const firstCharId = Object.keys(timelines)[0];
  const timeline = timelines[firstCharId];

  if (timeline.snapshots.length === 1) {
    console.warn('⚠️ INFO: Only initial snapshot found');
    console.log('   This is expected if no scenes have been generated yet.');
    console.log('   Generate a scene to test psychology updates.');
    return 'SKIP';
  }

  if (timeline.changes.length === 0) {
    console.error('❌ FAIL: No changes recorded despite multiple snapshots');
    return false;
  }

  console.log('✅ PASS: Scene updates are working');
  console.log('   Total snapshots:', timeline.snapshots.length);
  console.log('   Total changes:', timeline.changes.length);

  // Show last change details
  const lastChange = timeline.changes[timeline.changes.length - 1];
  console.log('\n   Last change details:');
  console.log('   - Scene:', lastChange.sceneTitle);
  console.log('   - Karma Type:', lastChange.karmaType);
  console.log('   - กาย:', lastChange.actions.กาย.length, 'actions');
  console.log('   - วาจา:', lastChange.actions.วาจา.length, 'speeches');
  console.log('   - ใจ:', lastChange.actions.ใจ.length, 'thoughts');

  return true;
}

// Test 5: Verify overall arc calculation
function testOverallArc() {
  console.log('\nTest 5: Verifying overall arc...');

  const timelines = scriptData.psychologyTimelines;
  const firstCharId = Object.keys(timelines)[0];
  const timeline = timelines[firstCharId];
  const arc = timeline.overallArc;

  if (!arc) {
    console.error('❌ FAIL: overallArc is undefined');
    return false;
  }

  const requiredArcFields = [
    'startingBalance',
    'endingBalance',
    'totalChange',
    'direction',
    'interpretation',
  ];
  const missingArcFields = requiredArcFields.filter(field => !(field in arc));

  if (missingArcFields.length > 0) {
    console.error('❌ FAIL: overallArc missing fields:', missingArcFields);
    return false;
  }

  const validDirections = ['กุศลขึ้น', 'กุศลลง', 'คงที่'];
  if (!validDirections.includes(arc.direction)) {
    console.error('❌ FAIL: Invalid direction:', arc.direction);
    return false;
  }

  console.log('✅ PASS: Overall arc is valid');
  console.log('   Direction:', arc.direction);
  console.log('   Change:', arc.totalChange.toFixed(1), 'points');
  console.log('   Balance:', arc.startingBalance.toFixed(1), '→', arc.endingBalance.toFixed(1));

  return true;
}

// Test 6: Validate Buddhist principles
function testBuddhistPrinciples() {
  console.log('\nTest 6: Validating Buddhist principles...');

  const timelines = scriptData.psychologyTimelines;
  const firstCharId = Object.keys(timelines)[0];
  const timeline = timelines[firstCharId];

  if (timeline.changes.length === 0) {
    console.log('⚠️ SKIP: No changes to validate');
    return 'SKIP';
  }

  let violations = 0;

  // Check for unrealistic jumps
  for (let i = 1; i < timeline.snapshots.length; i++) {
    const prev = timeline.snapshots[i - 1];
    const curr = timeline.snapshots[i];
    const change = curr.mentalBalance - prev.mentalBalance;

    if (Math.abs(change) > 20) {
      console.warn('⚠️ WARNING: Large mental balance change detected');
      console.log(`   Scene ${curr.sceneNumber}: ${change.toFixed(1)} points`);
      violations++;
    }
  }

  // Check karma type consistency
  timeline.changes.forEach((change, idx) => {
    if (change.karmaType === 'กุศลกรรม') {
      const hasPositiveChange = Object.values(change.consciousnessChange).some(v => v > 0);
      const hasNegativeDefilement = Object.values(change.defilementChange).some(v => v < 0);

      if (!hasPositiveChange && !hasNegativeDefilement) {
        console.warn(
          '⚠️ WARNING: Wholesome karma should increase consciousness or decrease defilement'
        );
        console.log(`   Change #${idx + 1}:`, change.sceneTitle);
        violations++;
      }
    }
  });

  if (violations === 0) {
    console.log('✅ PASS: Buddhist principles are followed');
  } else {
    console.log(`⚠️ PARTIAL PASS: ${violations} potential issue(s) found`);
  }

  return true;
}

// Run all tests
function runAllTests() {
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
  };

  const tests = [
    testPsychologyTimelinesExist,
    testTimelineStructure,
    testInitialState,
    testSceneUpdates,
    testOverallArc,
    testBuddhistPrinciples,
  ];

  tests.forEach(test => {
    results.total++;
    const result = test();

    if (result === true) {
      results.passed++;
    } else if (result === 'SKIP') {
      results.skipped++;
    } else {
      results.failed++;
    }
  });

  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total Tests:  ${results.total}`);
  console.log(`✅ Passed:    ${results.passed}`);
  console.log(`❌ Failed:    ${results.failed}`);
  console.log(`⏭️  Skipped:   ${results.skipped}`);
  console.log('='.repeat(50));

  if (results.failed === 0) {
    console.log('🎉 ALL TESTS PASSED!');
  } else {
    console.log('⚠️ Some tests failed. Check output above for details.');
  }

  return results;
}

// Export test results
window.psychologyTestResults = runAllTests();

// Additional utility functions
console.log('\n💡 Utility Functions Available:');
console.log('   - window.psychologyTestResults: Test results');
console.log('   - window.inspectTimeline(charName): Inspect specific character');
console.log('   - window.showAllTimelines(): Show all timelines summary');

window.inspectTimeline = function (charName) {
  const char = scriptData.characters.find(c => c.name === charName);
  if (!char) {
    console.error('Character not found:', charName);
    return;
  }

  const timeline = scriptData.psychologyTimelines[char.id];
  if (!timeline) {
    console.error('Timeline not found for:', charName);
    return;
  }

  console.log('\n📊 Timeline for', charName);
  console.log('='.repeat(50));
  console.log('Initial Balance:', timeline.snapshots[0].mentalBalance.toFixed(1));
  console.log(
    'Current Balance:',
    timeline.snapshots[timeline.snapshots.length - 1].mentalBalance.toFixed(1)
  );
  console.log('Total Change:', timeline.overallArc.totalChange.toFixed(1));
  console.log('Direction:', timeline.overallArc.direction);
  console.log('\nSnapshots:', timeline.snapshots.length);
  console.log('Changes:', timeline.changes.length);
  console.log('\nFull Data:');
  console.log(JSON.stringify(timeline, null, 2));
};

window.showAllTimelines = function () {
  if (!scriptData.psychologyTimelines) {
    console.error('No timelines available');
    return;
  }

  console.log('\n📊 All Character Timelines');
  console.log('='.repeat(50));

  Object.values(scriptData.psychologyTimelines).forEach(timeline => {
    const startBalance = timeline.snapshots[0].mentalBalance;
    const endBalance = timeline.snapshots[timeline.snapshots.length - 1].mentalBalance;
    const change = endBalance - startBalance;

    console.log(`\n${timeline.characterName}:`);
    console.log(
      `  Balance: ${startBalance.toFixed(1)} → ${endBalance.toFixed(1)} (${change > 0 ? '+' : ''}${change.toFixed(1)})`
    );
    console.log(`  Direction: ${timeline.overallArc.direction}`);
    console.log(`  Scenes: ${timeline.snapshots.length - 1}`); // Exclude initial
  });
};

console.log('\n✅ Test suite loaded successfully!');
console.log('📝 Copy and paste this entire script into your browser console at:');
console.log('   https://peace-script-ai.web.app');
