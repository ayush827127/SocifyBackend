const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const { body, validationResult } = require('express-validator');

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Create an order
router.post('/order', 
  body('product_id').notEmpty().withMessage('Product ID is required'),
  body('quantity').isInt({ gt: 0 }).withMessage('Quantity should be a positive integer'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { product_id, quantity, user_id } = req.body;

    try {
      const product = await Product.findById(product_id);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const amount = product.price * quantity;
      const newOrder = new Order({
        product: product_id,
        quantity,
        user: user_id,
        amount,
        status: 'pending'
      });
      await newOrder.save();

      const options = {
        amount: amount * 100, // amount in paise
        currency: 'INR',
        receipt: `order_rcptid_${newOrder._id}`
      };

      const order = await razorpay.orders.create(options);
      res.status(201).json({ order, newOrder });
    } catch (error) {
      res.status(500).json({ error: 'Error creating order' });
    }
  });

// Verify payment
router.post('/verify', async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, order_id } = req.body;

  const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
  shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
  const digest = shasum.digest('hex');

  if (digest !== razorpay_signature) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    const order = await Order.findById(order_id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    order.status = 'completed';
    await order.save();

    const transaction = new Transaction({
      order: order._id,
      razorpay_payment_id,
      razorpay_order_id,
      status: 'completed'
    });
    await transaction.save();

    res.status(200).json({ message: 'Payment verified successfully', transaction });
  } catch (error) {
    res.status(500).json({ error: 'Error verifying payment' });
  }
});

module.exports = router;
