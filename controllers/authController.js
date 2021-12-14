const User = require('../models/userModel');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const sendEmail = require('../config/email');

exports.restrict = async (req, res, next) => {
  try {
    const user = await User.findById({ _id: req.user._id.toString() });
    if (user.role != 'admin') {
      req.flash('error_msg', 'Only admin have access to that routes');
      res.redirect('/home');
    } else {
      next();
    }
  } catch (error) {
    console.log(error);
  }
};

exports.login = (req, res) => {
  try {
    const { fail } = req.query;

    if (fail) {
      let errors = [];
      errors.push({ msg: fail });
      return res.render('login', {
        path: 'login',
        title: 'Login',
        errors,
      });
    }
    res.render('login', {
      path: 'login',
      title: 'Login',
    });
  } catch (error) {
    console.log(error);
  }
};

exports.signup = (req, res) => {
  try {
    res.render('signup', {
      path: 'signup',
      title: 'Sign Up',
    });
  } catch (error) {
    console.log(error);
  }
};

exports.loginPost = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      req.flash('error_msg', 'Please fill in all fields to login');
      res.redirect('/');
      return;
    }
    const user = await User.findOne({ email });
    if (!user) {
      req.flash('error_msg', 'No user exist with that email, please sign up');
      res.redirect('/');
      return;
    }

    if (!user.verified) {
      req.flash(
        'error_msg',
        'Please verify your email, we sent an verification token to your email'
      );
      res.redirect('/');
      return;
    }

    if (user.status === 'disable') {
      req.flash('error_msg', 'Your account is disabled');
      res.redirect('/');
      return;
    }

    if (!(await bcrypt.compare(password, user.password))) {
      req.flash('error_msg', 'Password incorrect please try again');
      res.redirect('/');
      return;
    }
    passport.authenticate('local', {
      successRedirect: '/home',
      failureRedirect: `/`,
      failureFlash: true,
    })(req, res, next);
  } catch (error) {
    console.log(error);
  }
};

exports.logout = (req, res) => {
  req.logout();
  req.flash('success_msg', 'You are logged out');
  res.redirect('/');
};

exports.createUser = (req, res) => {
  res.render('create-user', {
    title: 'create-user',
    path: 'users',
    role: 'admin',
  });
};

exports.createUserPost = async (req, res) => {
  try {
    const { name, email, password, passwordConfirm } = req.body;

    let errors = [];

    if (!email || !name || !password || !passwordConfirm) {
      errors.push({ msg: 'Please fill in all fields' });
    }

    if (password !== passwordConfirm) {
      errors.push({ msg: 'Password do not match' });
    }

    if (password.length < 6) {
      errors.push({ msg: 'Password should be at least 6 characters' });
    }

    if (errors.length > 0) {
      return res.render('create-user', {
        title: 'create-user',
        path: 'users',
        role: 'admin',
        errors,
        name: name.toLowerCase(),
        email,
        password,
        passwordConfirm,
      });
    }

    const user = await User.findOne({ email });
    if (user) {
      errors.push({ msg: 'User email already exist' });
      return res.render('create-user', {
        title: 'create-user',
        path: 'users',
        role: 'admin',
        errors,
        name: name.toLowerCase(),
        email,
        password,
        passwordConfirm,
      });
    }

    const newUser = await User.create({
      name,
      email,
      password,
      passwordConfirm,
    });

    req.flash('success_msg', 'Verify your email first before login');
    res.redirect('/users');
  } catch (error) {}
};

exports.signupPost = async (req, res) => {
  try {
    const token = crypto.randomBytes(32).toString('hex');
    const hashToken = crypto.createHash('sha256').update(token).digest('hex');

    const { name, email, password, passwordConfirm } = req.body;

    let errors = [];

    if (!email || !name || !password || !passwordConfirm) {
      errors.push({ msg: 'Please fill in all fields' });
    }

    if (password !== passwordConfirm) {
      errors.push({ msg: 'Password do not match' });
    }

    if (password.length < 6) {
      errors.push({ msg: 'Password should be at least 6 characters' });
    }

    if (errors.length > 0) {
      return res.render('signup', {
        errors,
        name: name.toLowerCase(),
        email,
        password,
        passwordConfirm,
      });
    }

    const user = await User.findOne({ email });
    if (user) {
      errors.push({ msg: 'User email already exist' });
      return res.render('signup', {
        errors,
      });
    }

    const newUser = await User.create({
      name,
      email,
      password,
      passwordConfirm,
      verificationToken: hashToken,
    });

    const html = `<div style="text-align:center; font-family: Arial, sans-serif;">
    <h2>THANK YOU FOR SIGNING UP TO TCC EXAM MONITORING</h2>
    <h3> PLEASE VERIFY YOUR EMAIL FIRST BEFORE LOGIN </h3>
    <a style="background-color: #4CAF50; border: none; color: white;   padding: 15px 32px;  text-align: center; text-decoration: none; display: inline-block;  font-size: 16px;" href="localhost:3000/verify/${hashToken}">VERIFY</a></div>`;

    await sendEmail({
      email: email,
      subject: 'Thanks For signing up',
      message:
        'SIGN UP SUCCESSFULL PLEASE VERIFY YOUR EMAIL FIRST BEFORE LOGIN.',
      html,
    });

    req.flash(
      'success_msg',
      'You are now registered please verify your email before login'
    );
    res.redirect('/');
  } catch (error) {
    console.log(error);
  }
};

exports.verifyUser = async (req, res) => {
  const { hashToken } = req.params;
  try{
    const user = await User.findOne({verificationToken:hashToken});
    console.log(user)
    user.verified = true;
    user.verificationToken = undefined;
    await user.save({validateBeforeSave:false});
    req.flash('success_msg', 'Account verified you can now login')
    res.redirect('/');
  }catch(error){
    console.log(error)
  }
  
};

exports.notFound = (req, res) => {
  try {
    res.render('404', {
      title: '404',
    });
  } catch (error) {
    console.log(error);
  }
};

exports.forgot = (req, res) => {
  try {
    res.render('forgot', {
      title: 'Reset Password',
    });
  } catch (error) {
    console.log(error);
  }
};

exports.forgotPost = async (req, res) => {
  try {
    const token = crypto.randomBytes(32).toString('hex');
    const hashToken = crypto.createHash('sha256').update(token).digest('hex');
    const inputEmail = req.body.email;
    const html = `<div style="text-align:center; font-family: Arial, sans-serif;">
    <h2>RESET PASSWORD </h2>
    <p>Clink the link to change your password.</p>
    <a style="background-color: #4CAF50; border: none; color: white;   padding: 15px 32px;  text-align: center; text-decoration: none; display: inline-block;  font-size: 16px;" href="localhost:3000/reset-password/${hashToken}">VERIFY</a></div>`;

    if (!inputEmail) {
      req.flash('error_msg', 'Please input your Email');
      res.redirect('/forgot-password');
    }

    const email = await User.findOne({ email: inputEmail });
    console.log(email);
    if (!email) {
      req.flash('error_msg', 'No user found with that email');
      res.redirect('/forgot-password');
    }

    email.passwordChangeToken = hashToken;
    await email.save({validateBeforeSave:false});

    await sendEmail({
      email:email.email,
      subject: 'Reset password',
      html
    })

    req.flash('success_msg', 'Please check your email, we sent an email token to reset your password.');
    res.redirect(`/forgot-password`);
  } catch (error) {
    console.log(error);
  }
};

exports.reset = (req, res) => {
  try {
    const { hashToken } = req.params;
    res.render('reset', {
      title: 'Reset Password',
      hashToken
    });
  } catch (error) {
    console.log(error);
  }
};

exports.resetPost = async (req, res) => {
  try {
    const { hashToken } = req.params;
    const { password, passwordConfirm } = req.body;
    const user = await User.findOne({ passwordChangeToken:hashToken });
    if (!password || !passwordConfirm) {
      req.flash('error_msg', 'Please fill up all fields to proceed');
      res.redirect(`/reset-password/${hashToken}`);
    }
    
    if (password !== passwordConfirm) {
      req.flash('error_msg', 'Password does not match');
      res.redirect(`/reset-password/${hashToken}`);
    }

    user.password = password;
    user.passwordChangeAt = Date.now();
    user.passwordChangeToken = undefined;

    await user.save({ validateBeforeSave: false });
    req.flash('success_msg', 'Password update successful, you can now login');
    res.redirect('/');
  } catch (error) {
    console.log(error);
  }
};

exports.userStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    let status = 'active';
    if (user.status === 'active') {
      status = 'disable';
    }

    const updateStatus = await User.findByIdAndUpdate(
      id,
      { status: status },
      {
        new: true,
        runValidators: false,
      }
    );
    req.flash('success_msg', `User status changed to ${status}`);
    res.redirect('/users');
  } catch (error) {
    console.log(error);
  }
};

exports.changePassword = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    console.log(user);
    res.render('change-pass', {
      title: 'Change password',
      path: 'users',
      user,
      role: req.user.role,
    });
  } catch (error) {
    console.log(error);
  }
};

exports.changePasswordPost = async (req, res) => {
  try {
    const { newPassword, passwordConfirm } = req.body;

    const user = await User.findById(req.params.id);
    let errors = [];

    if (!newPassword || !passwordConfirm) {
      errors.push({ msg: 'please fill in all fields' });
    }

    if (newPassword.length < 7) {
      errors.push({
        msg: 'password too short, password must be ^6 characters',
      });
    }

    if (newPassword !== passwordConfirm) {
      errors.push({ msg: 'Password does not match' });
    }

    if (errors.length > 0) {
      res.render('change-pass', {
        title: 'Change password',
        path: 'users',
        user,
        role: req.user.role,
        errors,
        password: newPassword,
        passwordConfirm,
      });
      return;
    }

    user.password = newPassword;
    user.passwordConfirm = passwordConfirm;
    user.passwordChangeAt = Date.now();
    await user.save({ validateBeforeSave: false });
    req.flash('success_msg', 'Password successfully updated');
    res.redirect(`/account/${user._id.toString()}`);
  } catch (error) {
    console.log(error);
  }
};
