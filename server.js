const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const helmet = require('helmet');
const cors = require('cors');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log('Connected to MongoDB Atlas');
}).catch(err => {
  console.error('Error connecting to MongoDB Atlas:', err);
});

// Import routes
const userRoutes = require('./routes/user');
const paymentRoutes = require('./routes/payment');
app.use('/api/user', userRoutes);
app.use('/api/payment', paymentRoutes);

app.use("/", (req, res) => {
  res.send("Socify Running...");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
