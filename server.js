require('dotenv').config(); // ← MUST be first, before anything else

const connectDB = require('./src/config/dbConfig');
const app = require('./src/app');
const cors = require('cors');

const PORT = process.env.PORT || 10000; // ← change 3000 to 10000

app.use(cors());
connectDB();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});