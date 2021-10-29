const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './config.env' });

const app = require('./app');

const DB = process.env.DB;

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('DB CONNCTION SUCCESSFUL!');
  });

const port = process.env.PORT || 8000;
const server = app.listen(port, () =>
  console.log(`Example app listening on port ${port}!`)
);
