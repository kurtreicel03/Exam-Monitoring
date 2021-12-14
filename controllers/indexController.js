const User = require('../models/userModel');
const Report = require('../models/reportModel');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const {
  default: strictTransportSecurity,
} = require('helmet/dist/middlewares/strict-transport-security');
const { fontSize } = require('pdfkit');


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
      report.wrongPercentage = (100 * wrongs[i]) / report.total;

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
    report.wrongPercentage = (100 * +wrong) / report.total;

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
    

    const percentage = report.reports.map(rep => {
      return rep.correctPercentage;
    })

    const most = Math.max(...percentage);
    const least = Math.min(...percentage);


    const mostCorrect = report.reports.find(rep => rep.correctPercentage === most);
    
    const leastCorrect = report.reports.find(rep => rep.correctPercentage === least);
  
   

    res.render('report', {
      title: 'Report',
      path: 'home',
      role: req.user.role,
      user: req.user,
      report,
      mostCorrect,
      leastCorrect,
    });
  } catch (error) {
    console.log(error);
  }
};

function generateHr(doc, y) {
  doc.strokeColor('#aaaaaa').lineWidth(1).moveTo(20, y).lineTo(700, y).stroke();
}

function generateTableRow(doc, y, c1, c2, c3, c4, c5,c6) {
  doc
    .font('Helvetica')
    .fontSize(11)
    .text(c1, 50, y)
    .text(c2, 150, y)
    .text(c3, 250, y)
    .text(c4, 350, y)
    .text(c5, 450, y)
    .text(c6, 550, y);
}


function generateFindings(doc,findings,position){
  doc.fontSize(11).font('Helvetica').text(findings,50,position);
}


exports.exportReport =  async (req, res) => {
  try {
    const {id} = req.params;
   
    const invoiceName = `invoice-${id}.pdf`;
    const invoicePath = path.join('data', 'invoice', invoiceName);

    const report = await Report.findById({ _id: id }).populate('user', 'name');
    const percentage = report.reports.map(rep => {
      return rep.correctPercentage;
    });

    const most = Math.max(...percentage);
    const least = Math.min(...percentage);

    const mostCorrect = report.reports.find(
      rep => rep.correctPercentage === most
    );

    const leastCorrect = report.reports.find(
      rep => rep.correctPercentage === least
    );
    
    
    if(!report){
      req.flash('error_msg', ' Oops! Something Went Wrong');
      res.redirect(`/report/${id}`)
  }

    const pdfDoc = new PDFDocument({ margin: 50, size: 'B4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="'${invoiceName}'"`);

    pdfDoc.pipe(fs.createWriteStream(invoicePath));
    pdfDoc.pipe(res);

    pdfDoc
      .image('images/cs.jpg', 50, 45, { width: 80 })
      .fontSize(17)
      .font('Times-Roman')
      .text('TOMAS CLAUDIO COLLEGES',220,50)
      .fontSize(15)
      .text('COLLEGE OF COMPUTER STUDIES',215,70)
      .fontSize(14)
      .text("EXAM MONITORING",280,90)
      .image('images/tcc.jpeg',550,45, { width: 80 });


       generateHr(pdfDoc, 150);

       pdfDoc
         .fontSize(11)
         .font('Helvetica-Bold')
         .text('Report Title:', 50, 160)
         .font('Helvetica')
         .underline(117, 170, 120, 2, { color: 'black' })
         .text(`${report.title.toUpperCase()}`, 120, 160)
         .font('Helvetica-Bold')
         .underline(340, 170, 70, 2, { color: 'black' })
         .text('Student Level:', 260, 160)
         .font('Helvetica')
         .text(`   ${report.level}`, 340, 160)
         .font('Helvetica-Bold')
         .underline(517, 170, 80, 2, { color: 'black' })
         .text('Created At:', 460, 160)
         .font('Helvetica')
         .text(
           `   ${report.createdAt.toLocaleDateString('en-us', {
             year: 'numeric',
             month: 'numeric',
             day: 'numeric',
           })}`,
           520,
           160
         )
         .font('Helvetica-Bold')
         .underline(340, 200, 70, 2, { color: 'black' })
         .text('Subject:', 260, 190)
         .font('Helvetica')
         .text(`${report.subject.toUpperCase()}`,352,190)
         .font('Helvetica-Bold')
         .underline(518, 200, 80, 2, { color: 'black' })
         .text('Created By:', 460, 190)
         .font('Helvetica')
         .text(`${report.user.name.split(' ').map(el=> el.charAt(0).toUpperCase() + el.slice(1)).join(' ')}`,528,190);


    generateHr(pdfDoc, 210);
    
    pdfDoc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Questionare Reports:', 50, 220);
    let i,
      invoiceTableTop = 250;

       generateTableRow(
         pdfDoc,
         invoiceTableTop,
         'Category',
         'Correct',
         'Wrong',
         'Student',
         'Percentage',
         'Difficulty'
       );

       
       pdfDoc.strokeColor('#000')
         .lineWidth(2)
         .moveTo(20,270)
         .lineTo(700,270)
         .stroke();

    for (i = 0; i < report.reports.length; i++) {
      const item = report.reports[i];
      const position = invoiceTableTop + (i + 1) * 30;
      generateTableRow(
        pdfDoc,
        position,
        item.category,
        item.correct,
        item.wrong,
        item.total,
        `${item.correctPercentage.toFixed(2)}%`,
        item.difficulty,
      );
      generateHr(pdfDoc, position + 20);
    }

    pdfDoc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Report Findings:', 50, 380)
      .fontSize(11)
      .font('Helvetica')
      .text(
        `The questionare category who got the most correct is ${
          mostCorrect.category
        } with ${mostCorrect.correctPercentage.toFixed(2)} % Corrects.`,
        50,
        400
      )
      .text(
        `The questionare category who got the most error is ${
          leastCorrect.category
        } with ${leastCorrect.correctPercentage.toFixed(2)} %  Errors.`
      ,50,428);


    
    let reportPosition = 430;
    



    for (i = 0; i < report.reports.length; i++){
      const reps = report.reports[i]
      const position = reportPosition + (i + 1) * 30;
          if (reps.difficulty === 'Difficult') {
           generateFindings(pdfDoc,
             `The exam monitoring system finds that the ${
               report.level
             } students having a difficult time answering ${reps.category.toLowerCase()} category in ${
               report.subject
             } subject with only ${reps.correctPercentage.toFixed(
               2
             )}% correct percentage.`,position
           );
          }else if(reps.difficulty === 'Hard'){
            generateFindings(
              pdfDoc,
              `The exam monitoring system finds that the ${
                report.level
              } students having a hard time answering ${reps.category.toLowerCase()} category in ${
                report.subject
              } subject with only ${reps.correctPercentage.toFixed(
                2
              )}% correct percentage.`,
              position
            );
          }else if(reps.difficulty === 'Medium'){
            generateFindings(
              pdfDoc,
              `The exam monitoring system finds that the ${
                report.level
              } students have a great performance answering ${reps.category.toLowerCase()} category in ${
                report.subject
              } subject with ${reps.correctPercentage.toFixed(
                2
              )}% correct percentage.`,
              position
            );
          }else if(reps.difficulty === 'Easy'){
            generateFindings(
              pdfDoc,
              `The exam monitoring system finds that the ${
                report.level
              } students have a best performance answering  ${reps.category.toLowerCase()} category in ${
                report.subject
              } subject with ${reps.correctPercentage.toFixed(
                2
              )}% correct percentage.`,
              position
            );
          }
    }

    pdfDoc.end();

  } catch (error) {
    console.log(error)
  }
}

