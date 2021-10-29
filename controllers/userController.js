const User = require('../models/userModel');

exports.signup = async (req, res) => {
  try {
    const { name, email, password, passwordConfirm } = req.body;

    const user = await User.create({
      name,
      email,
      password,
      passwordConfirm,
    });
    res.status(201).json({
      status: 'succcess',
      data: {
        user,
      },
    });
  } catch (error) {
    console.log(error);
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });

    res.locals.user = user;
    req.user = user;

    res.status(200).json({
      status: 'success',
      data: {
        user,
      },
    });
  } catch (error) {
    console.log(error);
  }
};
