require('dotenv').config();

const app = require('./app');
const { waitForDb } = require('./config/db');

const port = Number(process.env.PORT || 3000);

async function start() {
  try {
    await waitForDb();
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

start();