const axios = require('axios');
async function run() {
  try {
    const auth = await axios.post('http://127.0.0.1:3000/auth/login', { username: "admin", password: "admin123" });
    const token = auth.data.accessToken;
    const prods = await axios.get('http://127.0.0.1:3000/products?limit=1', { headers: { Authorization: `Bearer ${token}` } });
    const prodId = prods.data.products[0].id;
    console.log("Updating product", prodId);
    
    // Send invalid update to test crash
    await axios.patch(`http://127.0.0.1:3000/products/${prodId}`, { 
      type: "FOOD",
      portions: [] 
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Update success");
  } catch (e) {
    if (e.response) {
      console.log("HTTP Error:", e.response.status, typeof e.response.data === 'string' ? "String response" : e.response.data);
    } else {
      console.log("Network Error:", e.message);
    }
  }
}
run();
