const express = require('express');
const { validate, mockAuthSchema } = require('../validation');

const router = express.Router();

router.post('/mock', (req, res, next) => {
  try {
    const body = validate(mockAuthSchema, req.body);
    return res.json({ token: `mock-${body.userId}` });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;