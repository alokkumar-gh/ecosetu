// EcoSetu Authentication Request Validators
// Canonical Reference: docs/05_API_SPECIFICATION.md Section 2

const { body } = require('express-validator');
const { ROLES } = require('../utils/constants');

const allowedRegistrationRoles = [ROLES.CITIZEN, ROLES.INFORMAL_COLLECTOR, ROLES.RECYCLER];

const registerValidator = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Must be a valid email address')
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters'),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage('Password must contain at least one letter and one number'),

  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),

  body('phone')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,15}$/)
    .withMessage('Phone must be a valid phone number format'),

  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(allowedRegistrationRoles)
    .withMessage('Role must be one of: CITIZEN, INFORMAL_COLLECTOR, RECYCLER'),
];

const loginValidator = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Must be a valid email address'),

  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

const firebaseLoginValidator = [
  body('idToken')
    .trim()
    .notEmpty()
    .withMessage('Firebase ID token is required')
    .isString()
    .withMessage('Firebase ID token must be a string'),
  body('provider')
    .optional()
    .trim()
    .isString()
    .withMessage('Provider must be a string'),
  body('role')
    .optional()
    .trim()
    .isIn(allowedRegistrationRoles)
    .withMessage('Role must be one of: CITIZEN, INFORMAL_COLLECTOR, RECYCLER'),
  body('profileData')
    .optional()
    .isObject()
    .withMessage('profileData must be an object'),
];

module.exports = {
  registerValidator,
  loginValidator,
  firebaseLoginValidator,
};

