require('dotenv').config();
const mongoose = require('mongoose');
const { Complaint } = require('../src/models/Complaint');
const IssueCluster = require('../src/models/IssueCluster');
const { processForClustering, enrichComplaintWithEmbedding } = require('../src/services/deduplicationService');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/civicsense';

async function runTests() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.');

  const testCitizenId = new mongoose.Types.ObjectId();
  const createdComplaintIds = [];
  const createdClusterIds = [];

  let passed = 0;
  let failed = 0;

  const assert = (condition, message) => {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  };

  try {
    console.log('\n--- Test 1 (Base Case) ---');
    const c1 = new Complaint({
      citizenId: testCitizenId,
      category: 'POTHOLE',
      description: 'Deep Pothole at Main Entrance',
      location: { type: 'Point', coordinates: [78.4868, 17.3852] }
    });
    await enrichComplaintWithEmbedding(c1);
    createdComplaintIds.push(c1._id);

    const cluster1 = new IssueCluster({
      title: 'Deep Pothole at Main Entrance',
      category: 'POTHOLE',
      location: c1.location,
      severity: 'MEDIUM',
      complaints: [c1._id]
    });
    await cluster1.save();
    createdClusterIds.push(cluster1._id);
    
    c1.clusterId = cluster1._id;
    await c1.save();
    
    assert(cluster1._id != null, 'New IssueCluster created and saved.');


    console.log('\n--- Test 2 (AUTO_LINK) ---');
    // ~1 meter away to ensure score >= 0.80
    const c2 = new Complaint({
      citizenId: testCitizenId,
      category: 'POTHOLE',
      description: 'Deep Pothole at Main Entrance',
      location: { type: 'Point', coordinates: [78.48681, 17.3852] }
    });
    
    const result2 = await processForClustering(c2);
    assert(result2.action === 'AUTO_LINK', `Action should be AUTO_LINK, got ${result2.action}`);
    assert(result2.score >= 0.80, `Score should be >= 0.80, got ${result2.score}`);
    
    // Add to cluster for Test 3
    if (result2.action === 'AUTO_LINK') {
      c2.clusterId = result2.clusterId;
      await enrichComplaintWithEmbedding(c2);
      createdComplaintIds.push(c2._id);
      cluster1.complaints.push(c2._id);
      await cluster1.save();
    }


    console.log('\n--- Test 3 (OFFICER_REVIEW) ---');
    // ~15 meters away to ensure score between 0.50 and 0.79
    const c3 = new Complaint({
      citizenId: testCitizenId,
      category: 'POTHOLE',
      description: 'Road is damaged here',
      location: { type: 'Point', coordinates: [78.4868, 17.3853] }
    });
    
    const result3 = await processForClustering(c3);
    assert(result3.action === 'OFFICER_REVIEW', `Action should be OFFICER_REVIEW, got ${result3.action}`);
    assert(result3.score >= 0.50 && result3.score < 0.80, `Score should be between 0.50 and 0.79, got ${result3.score}`);

    // Add to cluster for Test 5
    if (result3.action === 'OFFICER_REVIEW') {
      c3.clusterId = result3.clusterId;
      await enrichComplaintWithEmbedding(c3);
      createdComplaintIds.push(c3._id);
      cluster1.complaints.push(c3._id);
      await cluster1.save();
    }


    console.log('\n--- Test 4 (NEW_CLUSTER) ---');
    // ~150 meters away
    const c4 = new Complaint({
      citizenId: testCitizenId,
      category: 'POTHOLE',
      description: 'Huge crater on the road',
      location: { type: 'Point', coordinates: [78.4882, 17.3852] }
    });
    
    const result4 = await processForClustering(c4);
    assert(result4.action === 'NEW_CLUSTER', `Action should be NEW_CLUSTER, got ${result4.action}`);
    createdComplaintIds.push(c4._id);


    console.log('\n--- Test 5 (Audit History) ---');
    // Remove c3 from cluster1, create new cluster, add audit log
    const updatedCluster1 = await IssueCluster.findById(cluster1._id);
    updatedCluster1.complaints = updatedCluster1.complaints.filter(id => !id.equals(c3._id));
    updatedCluster1.auditHistory.push({
      action: 'SPLIT',
      reason: 'Manual rejection of potential duplicate'
    });
    await updatedCluster1.save();
    
    const cluster2 = new IssueCluster({
      title: 'Road is damaged here',
      category: 'POTHOLE',
      location: c3.location,
      severity: 'LOW',
      complaints: [c3._id]
    });
    await cluster2.save();
    createdClusterIds.push(cluster2._id);
    
    const fetchedCluster1 = await IssueCluster.findById(cluster1._id);
    const hasAuditLog = fetchedCluster1.auditHistory.some(a => a.action === 'SPLIT');
    assert(hasAuditLog, 'Audit history contains the manual rejection action (SPLIT).');

  } catch (error) {
    console.error('Test execution failed:', error);
  } finally {
    console.log('\n--- Cleaning up ---');
    await Complaint.deleteMany({ _id: { $in: createdComplaintIds } });
    await IssueCluster.deleteMany({ _id: { $in: createdClusterIds } });
    console.log('Cleanup complete.');
    
    console.log(`\n=== Summary ===`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total: ${passed + failed}`);
    
    await mongoose.disconnect();
  }
}

runTests();
