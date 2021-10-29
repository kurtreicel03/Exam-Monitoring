const Report = require('../models/reportModel');

exports.createReport = async (req, res) => {
  try {
    const { title, questions, user } = req.body;

    const reports = questions.map(question => {
      let exam = {
        category: question.category,
        correct: question.correct,
        wrong: question.wrong,
        total: question.correct + question.wrong,
        correctPercentage: question.correct + question.wrong / question.correct,
      };

      if (exam.correctPercentage <= 25) {
        exam.difficulty = 'Difficult';
      } else if (exam.correctPercentage >= 26 && exam.correctPercentage <= 50) {
        exam.difficulty = 'Hard';
      } else if (exam.correctPercentage >= 51 && exam.correctPercentage <= 75) {
        exam.difficulty = 'Medium';
      } else {
        exam.difficulty = 'Easy';
      }
      return exam;
    });

    const exam = await Report.create({
      title,
      reports,
      user,
    });

    res.status(201).json({
      status: 'success',
      data: {
        exam,
      },
    });
  } catch (error) {
    console.log(error);
  }
};
