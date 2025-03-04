import axios, { AxiosError } from 'axios';

const BASE_URL = 'http://localhost:7321/api';
const NUM_USERS = 300; // More than the available inventory 300
const CONCURRENT_REQUESTS = 50; // Number of concurrent requests 50
let TxCount = 0

// Create an array of user IDs
const userIds = Array.from({ length: NUM_USERS }, (_, i) => `user_${i + 1}`);
let dbIDs = []


async function createUsers(name: string, email: string): Promise<any>{
  try {
    const response = await axios.post(`${BASE_URL}/auth/register`, {
      name,
      email,
      password: 'password123'
    })
    return { data: response.data}
  } catch (error: any) {
    return { error: error.response?.data || error.message }
  }
}
async function runCreateUsers(): Promise<any[]> {
  const prom = userIds.map((userID, i)=> createUsers(userID, `${(Math.random() + 1).toString(36).substring(7)}+${i}@gmail.com`))
  return Promise.all(prom);
}

function getRandomQuantity() {
  const rand = Math.floor(Math. random() * (8 - 1) + 1)
  TxCount+= rand
  return rand
}

// Function to simulate a purchase
async function purchase(userId: string): Promise<any> {
  try {
    const response = await axios.post(`${BASE_URL}/purchase`, {
      user_id: userId,
      sale_id: '67c6229af3aacb324d59745b', // replace with your own id
      quantity: getRandomQuantity()
    });
    return { user_id: userId, success: true, data: response.data };
  } catch (error: any) {
    return { 
      user_id: userId, 
      success: false, 
      error: error.response?.data || error.message 
    };
  }
}

// Function to run concurrent purchases
async function runConcurrentPurchases(batch: string[]): Promise<any[]> {
  const promises = batch.map(userId => purchase(userId));
  return Promise.all(promises);
}

// Main test function
async function runLoadTest() {
  console.log(`Starting load test with ${NUM_USERS} users...`);

  const db = await runCreateUsers()
  dbIDs = db.map(dt => {
   
    return dt.data.data._id
  })
  
  // Split users into batches for concurrent requests
  const batches = [];
  for (let i = 0; i < dbIDs.length; i += CONCURRENT_REQUESTS) {
    batches.push(dbIDs.slice(i, i + CONCURRENT_REQUESTS));
  }
  
  let successCount = 0;
  let failCount = 0;
  let totalItemsPurchased = 0
  
  // Process each batch
  for (const batch of batches) {
    const results = await runConcurrentPurchases(batch);
    
    // Count successes and failures
    results.forEach(result => {
      if (result.success) successCount++;
      else failCount++;
    });

    totalItemsPurchased  += results
  .filter(result => result.success)
  .reduce((total, result) => total + (result?.data?.quantity || 0), 0);
    
    // Small delay between batches to simulate realistic user behavior
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`Test completed: ${successCount} successful purchases, ${failCount} failed purchases`);
  
  // Verify final inventory
  try {
    const response = await axios.get(`${BASE_URL}/flash-sales/67c6229af3aacb324d59745b`); //replace with your own id
    console.log(`Final inventory: ${response.data.data.currentInventory}`);
    console.log(`Expected TxCount: ${totalItemsPurchased}`)
    if (totalItemsPurchased === 200 && response.data.data.currentInventory == 0) {
      console.log('✅ Test PASSED: Exact inventory sold, no overbuying or underbuying');
    } else if (totalItemsPurchased > 200) {
      console.log('❌ Test FAILED: Overbuying detected');
    } else if (totalItemsPurchased < 200 && response.data.data.currentInventory === 0) {
      console.log('❌ Test FAILED: Underbuying detected - not all inventory was sold');
    } else if (totalItemsPurchased < 200 && response.data.data.currentInventory > 0) {
      console.log('❌ Test FAILED: Inventory not fully utilized');
    } else {
      console.log('❌ Test FAILED: Unexpected inventory state');
    }
  } catch (error) {
    console.error('Error verifying final inventory:', error);
  }
}

// Verify the flash sale is active before starting the test
async function verifyFlashSaleActive() {
  try {
    const response = await axios.get(`${BASE_URL}/flash-sales/67c6229af3aacb324d59745b`);
    if (response.data.data.status !== 'active') {
      console.log('Flash sale is not active. Please start the flash sale first.');
      process.exit(1);
    }
    console.log('Flash sale starting inventory')
    return true;
  } catch (error) {
    console.error('Error verifying flash sale status:', error);
    process.exit(1);
  }
}

// Run the test
verifyFlashSaleActive().then(() => {
  runLoadTest();
});