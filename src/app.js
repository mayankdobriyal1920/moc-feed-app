const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/auth.routes');
const postRoutes = require('./routes/post.routes');
const { notFound, errorHandler } = require('./middleware/errors');

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/auth', authRoutes);
app.use('/', postRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;