const User = require('../models/userModel');
const Report = require('../models/reportModel');
const {
  default: strictTransportSecurity,
} = require('helmet/dist/middlewares/strict-transport-security');

const generateReport = (category, correct, wrong) => {
  let reports = [];

  if (typeof category === 'object') {
    const corrects = correct.map(el => +el);
    const wrongs = wrong.map(el => +el);
    category.forEach((el, i) => {
      report = {
        category: el,
        correct: corrects[i],
        wrong: wrong[i],
        total: corrects[i] + wrongs[i],
      };
      report.correctPercentage = (100 * corrects[i]) / report.total;

      if (report.correctPercentage <= 25) {
        report.difficulty = 'Difficult';
      } else if (
        report.correctPercentage >= 26 &&
        report.correctPercentage <= 50
      ) {
        report.difficulty = 'Hard';
      } else if (
        report.correctPercentage >= 51 &&
        report.correctPercentage <= 75
      ) {
        report.difficulty = 'Medium';
      } else {
        report.difficulty = 'Easy';
      }
      reports.push(report);
    });
  } else {
    report = {
      category,
      correct,
      wrong,
      total: +correct + +wrong,
    };
    report.correctPercentage = (100 * +correct) / report.total;

    if (report.correctPercentage <= 25) {
      report.difficulty = 'Difficult';
    } else if (
      report.correctPercentage >= 26 &&
      report.correctPercentage <= 50
    ) {
      report.difficulty = 'Hard';
    } else if (
      report.correctPercentage >= 51 &&
      report.correctPercentage <= 75
    ) {
      report.difficulty = 'Medium';
    } else {
      report.difficulty = 'Easy';
    }
    reports.push(report);
  }

  return reports;
};

exports.home = async (req, res) => {
  const id = req.user._id.toString();
  const user = await User.findById(id);
  res.locals.user = user;
  const { sort, search } = req.query;
  let sortBy = '-createdAt';
  let searchFor = { user: id };

  const regex = new RegExp(`${search}`);
  if (search) {
    searchFor.title = { $regex: regex };
  }

  if (sort) {
    sortBy = sort === 'oldest' ? 'createdAt' : '-createdAt';
  }

  const reports = await Report.find(searchFor).populate('user', 'name');

  if (search && reports.length === 0) {
    req.flash('warning_msg', 'No report found with that title');
    res.redirect('/home');
    return;
  }

  res.render('home', {
    title: 'Home',
    path: 'home',
    reports,
    userId: req.user._id.toString(),
    user,
    role: user.role,
  });
};

exports.manageReports = async (req, res) => {
  const id = req.user._id.toString();
  const user = await User.findById(id);
  const { sort, search } = req.query;
  let sortBy = '-createdAt';
  let searchFor = {};

  const regex = new RegExp(`${search}`);
  if (search) {
    searchFor.title = { $regex: regex };
  }

  if (sort) {
    sortBy = sort === 'oldest' ? 'createdAt' : '-createdAt';
  }
  const reports = await Report.find(searchFor).populate('user', 'name');

  if (search && reports.length === 0) {
    req.flash('warning_msg', 'No report found with that title');
    res.redirect('/home');
    return;
  }

  res.render('home', {
    title: 'Reports',
    path: 'manage',
    reports,
    userId: req.user._id.toString(),
    user,
    role: user.role,
  });
};

exports.create = (req, res) => {
  const user = req.user;
  res.render('create', {
    title: 'Create',
    path: 'create',
    user,
    role: user.role,
  });
};

exports.createPost = async (req, res) => {
  const user = req.user._id.toString();
  const { title, level, subject, description, category, correct, wrong } =
    req.body;
  if (typeof category === 'object') {
    const error = [];
    category.forEach((el, i) => {
      if (el === '' || correct[i] === '' || wrong[i] === '') {
        error.push('error');
      }
    });
    if (error.length > 0 || !title || !level || !description || !subject) {
      req.flash(
        'error_msg',
        'Every field is required, please complete all fields or remove extra table to create reports'
      );
      res.redirect('/create');
    }
  } else {
    if (
      !title ||
      category.length === 0 ||
      correct.length === 0 ||
      wrong.length === 0 ||
      !level ||
      !description ||
      !subject
    ) {
      req.flash(
        'error_msg',
        'Every field is required, please complete all fields or remove extra table to create reports'
      );
      res.redirect('/create');
    }
  }

  const reports = generateReport(category, correct, wrong);
  const newReport = await Report.create({
    title: title.toLowerCase(),
    level,
    subject: subject.toLowerCase(),
    description: description.toLowerCase(),
    reports,
    user,
  });
  req.flash(
    'success_msg',
    'Report created you can look at your reports section'
  );
  res.redirect('/create');
};

exports.users = async (req, res) => {
  try {
    const { sort, search } = req.query;
    let sortBy = '-createdAt';
    let searchFor = { role: { $ne: 'admin' } };
    if (sort) {
      sortBy = sort === 'oldest' ? 'createdAt' : '-createdAt';
    }

    if (search) {
      const regex = new RegExp(`${search}`);
      searchFor.name = { $regex: regex };
    }

    const allUser = await User.find(searchFor).sort(sortBy);

    const promises = allUser.map(async el => {
      return await Report.find({ user: el._id.toString() });
    });
    let totals = [];
    await Promise.all(promises).then(values => {
      values.forEach(el => totals.push(el.length));
    });
    const users = [];

    allUser.forEach((el, i) => {
      user = {
        name: el.name,
        status: el.status,
        role: el.role,
        total: totals[i],
        id: el._id.toString(),
      };
      users.push(user);
    });

    if (search && users.length === 0) {
      req.flash('warning_msg', 'No User found with that name');
      res.redirect('/users');
      return;
    }

    res.render('manage-user', {
      title: 'User Management',
      path: 'users',
      users,
      user: true,
      role: 'admin',
    });
  } catch (error) {
    console.log(error);
  }
};

exports.editReport = async (req, res) => {
  try {
    const { id } = req.params;

    const userId = req.user._id.toString();
    const user = await User.findById(userId);
    const report = await Report.findById(id);

    res.render('edit-report', {
      title: 'Edit report',
      report,
      user,
      role: user.role,
    });
  } catch (error) {
    console.log(error);
  }
};

exports.editReportPost = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, level, subject, description, category, correct, wrong } =
      req.body;
    let reports = [];

    if (typeof category === 'object') {
      const corrects = correct.map(el => +el);
      const wrongs = wrong.map(el => +el);
      category.forEach((el, i) => {
        report = {
          category: el,
          correct: corrects[i],
          wrong: wrong[i],
          total: corrects[i] + wrongs[i],
        };
        report.correctPercentage = (100 * corrects[i]) / report.total;

        if (report.correctPercentage <= 25) {
          report.difficulty = 'Difficult';
        } else if (
          report.correctPercentage >= 26 &&
          report.correctPercentage <= 50
        ) {
          report.difficulty = 'Hard';
        } else if (
          report.correctPercentage >= 51 &&
          report.correctPercentage <= 75
        ) {
          report.difficulty = 'Medium';
        } else {
          report.difficulty = 'Easy';
        }
        reports.push(report);
      });
    } else {
      report = {
        category,
        correct,
        wrong,
        total: +correct + +wrong,
      };
      report.correctPercentage = (100 * +correct) / report.total;

      if (report.correctPercentage <= 25) {
        report.difficulty = 'Difficult';
      } else if (
        report.correctPercentage >= 26 &&
        report.correctPercentage <= 50
      ) {
        report.difficulty = 'Hard';
      } else if (
        report.correctPercentage >= 51 &&
        report.correctPercentage <= 75
      ) {
        report.difficulty = 'Medium';
      } else {
        report.difficulty = 'Easy';
      }
      reports.push(report);
    }
    const updatedReport = await Report.findByIdAndUpdate(
      id,
      {
        title: title.toLowerCase(),
        level: level.toLowerCase(),
        subject: subject.toLowerCase(),
        description: description.toLowerCase(),
        reports,
        updatedAt: Date.now(),
      },
      {
        new: true,
        runValidators: false,
      }
    );
    req.flash('success_msg', 'Report updated');
    res.redirect(`/edit-report/${id}`);
  } catch (error) {
    console.log(error);
  }
};

exports.deleteReport = async (req, res) => {
  try {
    const { id } = req.params;
    await Report.findByIdAndDelete(id);
    req.flash('success_msg', 'Report successfully deleted');
    res.redirect('/home');
  } catch (error) {
    console.log(error);
  }
};

exports.account = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    const report = await Report.find({ user: req.params.id });
    res.render('accounts', {
      title: 'Profile',
      user,
      total: report.length ?? 0,
      role: req.user.role,
      path: 'users',
    });
  } catch (error) {
    console.log(error);
  }
};

exports.updateAccount = async (req, res) => {
  try {
    const { name, email, status, role } = req.body;

    const { id } = req.params;

    const user = await User.findByIdAndUpdate(
      id,
      { name, email, status, role },
      {
        new: true,
        runValidators: false,
      }
    );

    req.flash('success_msg', 'User successfully updated');
    if (user.role === 'admin') {
      res.redirect('/users');
    } else {
      res.redirect(`/account/${user._id.toString()}`);
    }
  } catch (error) {
    console.log(error);
  }
};

exports.report = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id).populate(
      'user',
      'name'
    );
    res.render('report', {
      title: 'Report',
      path: 'home',
      role: req.user.role,
      user: req.user,
      report,
    });
  } catch (error) {
    console.log(error);
  }
};
