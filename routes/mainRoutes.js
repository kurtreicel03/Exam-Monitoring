const express = require('express');

const router = express.Router();

const authController = require('../controllers/authController');
const indexController = require('../controllers/indexController');
const {
  ensureAuthenticated,
  forwardAuthenticated,
} = require('../config/protect');

router.route('/home').get(ensureAuthenticated, indexController.home);

router
  .route('/')
  .get(forwardAuthenticated, authController.login)
  .post(authController.loginPost);
router
  .route('/signup')
  .get(authController.signup)
  .post(authController.signupPost);

router.route('/logout').get(authController.logout);

router
  .route('/forgot-password')
  .get(authController.forgot)
  .post(authController.forgotPost);

router
  .route('/reset-password/:email')
  .get(authController.reset)
  .post(authController.resetPost);

router
  .route('/create')
  .get(ensureAuthenticated, indexController.create)
  .post(indexController.createPost);

router
  .route('/users')
  .get(ensureAuthenticated, authController.restrict, indexController.users);

router
  .route('/edit-report/:id')
  .get(ensureAuthenticated, indexController.editReport)
  .post(indexController.editReportPost);

router.route('/users-status/:id').post(authController.userStatus);

router.route('/delete-report/:id').post(indexController.deleteReport);

router
  .route('/account/:id')
  .get(ensureAuthenticated, indexController.account)
  .post(indexController.updateAccount);

router
  .route('/change-password/:id')
  .get(ensureAuthenticated, authController.changePassword)
  .post(authController.changePasswordPost);

router.route('/report/:id').get(ensureAuthenticated, indexController.report);

router
  .route('/create-user')
  .get(ensureAuthenticated, authController.restrict, authController.createUser)
  .post(authController.createUserPost);

router
  .route('/manage-reports')
  .get(
    ensureAuthenticated,
    authController.restrict,
    indexController.manageReports
  );

module.exports = router;
