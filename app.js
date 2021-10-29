const express = require('express');

const path = require('path');

const morgan = require('morgan');

const session = require('express-session');

const passport = require('passport');

const flash = require('connect-flash');

const app = express();

// MIDDLEWARE

// PASSPORT CONFIG
require('./config/passport')(passport);

// SERVING STATIC FILES
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, '/public')));

// MORGAN
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// BODY PARSER
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

//  EXPRESS SESSION
app.use(
  session({
    secret: 'secret',
    resave: true,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

// Global variables
app.use(function (req, res, next) {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.warning_msg = req.flash('warning_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});

// ROUTERS
const mainRoutes = require('./routes/mainRoutes');
const userRoutes = require('./routes/userRoutes');
const reportRoutes = require('./routes/reportRoutes');

app.use('/', mainRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/reports', reportRoutes);

app.all('*', (req, res) => {
  res.render('404', {
    title: '404',
  });
});

module.exports = app;
