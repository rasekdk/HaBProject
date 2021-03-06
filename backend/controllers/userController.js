'use strict';

// Requires
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const jwt = require('jsonwebtoken');
const { join } = require('path');
const { JWT_SECRET } = process.env;

// Repositories
const { userRepository, updateRepository, imageRepository } = require('../repositories');

// Register
async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    const registerSchema = Joi.object({
      name: Joi.string().regex(/^\S+$/).required(),
      email: Joi.string().email().required(),
      password: Joi.string().min(4).max(20).regex(/^\S+$/).required(),
      repeatPassword: Joi.ref('password'),
    });

    await registerSchema.validateAsync(req.body);

    const userEmail = await userRepository.getUserByEmail(email);
    const userName = await userRepository.getUserByName(name);

    if (userName) {
      const err = 'used name';
      const error = new Error(err);
      error.status = 409;

      throw error;
    }

    if (userEmail) {
      const err = 'used email';
      const error = new Error(err);
      error.status = 409;

      throw error;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = await userRepository.createUser(name, email, passwordHash, 'user');

    const user = await userRepository.getUserById(id);
    // generate jwt
    const tokenPayload = {
      id: user.userId,
      name: user.userName,
      role: user.userRole,
    };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });

    res.send({ auth: token });
  } catch (err) {
    console.log(err.message);
    if (err.name === 'ValidationError') {
      err.status = 400;
    }
    console.log('error', err);
    res.status(err.status || 500);
    res.send({ error: err.message });
  }
}

// Login
async function login(req, res) {
  try {
    const { name, password } = req.body;

    const schema = Joi.object({
      name: Joi.string().required(),
      password: Joi.string().min(4).max(20).required(),
    });

    await schema.validateAsync({ name, password });

    function validateEmail(email) {
      const re = /\S+@\S+\.\S+/;
      return re.test(email);
    }

    const loginUseEmail = validateEmail(name);

    let user;

    loginUseEmail
      ? (user = await userRepository.getUserByEmail(name))
      : (user = await userRepository.getUserByName(name));

    if (!user) {
      const error = new Error('El usuario no es correcto');
      error.code = 404;
      throw error;
    }

    // check password
    const isValidPassword = await bcrypt.compare(password, user.userPassword);

    if (!isValidPassword) {
      const error = new Error('La contraseña no es correcta');
      error.code = 401;
      throw error;
    }

    // generate jwt
    const tokenPayload = {
      id: user.userId,
      name: user.userName,
      role: user.userRole,
    };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });

    res.send({ auth: token });
  } catch (err) {
    if (err.name === 'ValidationError') {
      err.status = 400;
    }
    console.log(err);
    res.status(err.status || 500);
    res.send({ error: err.message });
  }
}

async function getUser(req, res) {
  try {
    // Params
    const userName = req.params.name;

    // Validate
    const userSchema = Joi.string().regex(/^\S+$/).required();

    await userSchema.validateAsync(userName);

    const user = await userRepository.getUserPage(userName);

    res.send(user);
  } catch (err) {
    if (err.name === 'ValidationError') {
      err.status = 400;
    }
    console.log(err);
    res.status(err.status || 500);
    res.send({ error: err.message });
  }
}

async function updateUser(req, res) {
  try {
    // Params
    const userId = req.params.name;
    const tokenUserId = req.auth.id;

    // Body
    const { userName, userEmail, userPassword, userAvatar, userBio } = req.body;
    const data = { userName, userEmail, userPassword, userAvatar, userBio };

    // Validate
    const userSchema = Joi.string().regex(/^\S+$/).required();
    const idSchema = Joi.number().positive().required();
    const dataSchema = Joi.object({
      userName: Joi.string().regex(/^\S+$/),
      userEmail: Joi.string().email(),
      userPassword: Joi.string().min(4).max(20).regex(/^\S+$/),
      userAvatar: Joi.string(),
      userBio: Joi.string(),
    });

    await dataSchema.validateAsync(data);
    await userSchema.validateAsync(userId);
    await idSchema.validateAsync(tokenUserId);

    const user = await userRepository.updateUser(tokenUserId, userId, data);

    // generate jwt
    const tokenPayload = {
      id: user.userId,
      name: user.userName,
      role: user.userRole,
    };
    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: '30d',
    });

    res.send({ user: user, auth: token });
  } catch (err) {
    if (err.name === 'ValidationError') {
      err.status = 400;
    }
    console.log(err);
    res.status(err.status || 500);
    res.send({ error: err.message });
  }
}

async function uploadAvatar(req, res) {
  try {
    const userId = req.auth.id;

    if (!req.files) {
      res.send({
        status: false,
        message: 'No files',
      });
    }
    const { picture } = req.files;

    const fileName = await imageRepository.editSavePhoto(picture, 'users', 200, 200);

    await updateRepository.updateAvatar(fileName, userId);

    const user = await userRepository.getUserById(userId);

    // generate jwt
    const tokenPayload = {
      id: user.userId,
      name: user.userName,
      role: user.userRole,
    };
    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: '30d',
    });

    res.send({
      user: user,
      auth: token,
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      err.status = 400;
    }
    console.log(err);
    res.status(err.status || 500);
    res.send({ error: err.message });
  }
}

async function updateName(req, res) {
  try {
    // Params
    const tokenUser = req.auth;

    const newUserName = req.body.userName;

    const nameSchema = Joi.string().regex(/^\S+$/);

    await nameSchema.validateAsync(newUserName);

    const user = await userRepository.getUserByName(tokenUser.name);

    if (!user) {
      const error = new Error('no user');
      error.code = 409;
      throw error;
    }

    if (user.userId !== tokenUser.id) {
      const error = new Error('incorrect user');
      error.code = 409;
      throw error;
    }

    const newUser = await updateRepository.updateName(newUserName, tokenUser.id);

    // generate jwt
    const tokenPayload = {
      id: newUser.userId,
      name: newUser.userName,
      role: newUser.userRole,
    };
    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: '30d',
    });

    res.send({ user: newUser, auth: token });
  } catch (err) {
    if (err.name === 'ValidationError') {
      err.status = 400;
    }
    console.log(err);
    res.status(err.status || 500);
    res.send({ error: err.message });
  }
}

async function updateEmail(req, res) {
  try {
    // Params
    const tokenUser = req.auth;

    const newUserEmail = req.body.userEmail;

    const emailSchema = Joi.string().email();

    await emailSchema.validateAsync(newUserEmail);

    const user = await userRepository.getUserByName(tokenUser.name);

    if (!user) {
      const error = new Error('no user');
      error.code = 409;
      throw error;
    }

    if (user.userId !== tokenUser.id) {
      const error = new Error('incorrect user');
      error.code = 409;
      throw error;
    }

    const newUser = await updateRepository.updateEmail(newUserEmail, tokenUser.id);

    // generate jwt
    const tokenPayload = {
      id: newUser.userId,
      name: newUser.userName,
      role: newUser.userRole,
    };
    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: '30d',
    });

    res.send({ user: newUser, auth: token });
  } catch (err) {
    if (err.name === 'ValidationError') {
      err.status = 400;
    }
    console.log(err);
    res.status(err.status || 500);
    res.send({ error: err.message });
  }
}

async function updatePassword(req, res) {
  try {
    // Params
    const tokenUser = req.auth;

    const { currentPassword, userPassword, userRepeatPassword } = req.body;

    const body = { currentPassword, userPassword, userRepeatPassword };

    const passwordSchema = Joi.object({
      currentPassword: Joi.string().min(4).max(20).regex(/^\S+$/).required(),
      userPassword: Joi.string().min(4).max(20).regex(/^\S+$/).required(),
      userRepeatPassword: Joi.ref('userPassword'),
    });

    await passwordSchema.validateAsync(body);

    const passwordHash = await bcrypt.hash(userPassword, 10);

    const user = await userRepository.getUserByName(tokenUser.name);

    if (!user) {
      const error = new Error('no user');
      error.code = 409;
      throw error;
    }

    if (user.userId !== tokenUser.id) {
      const error = new Error('incorrect user');
      error.code = 409;
      throw error;
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.userPassword);

    if (!isValidPassword) {
      const error = new Error('La contraseña no es correcta');
      error.code = 401;
      throw error;
    }

    const newUser = await updateRepository.updatePassword(passwordHash, tokenUser.id);

    // generate jwt
    const tokenPayload = {
      id: newUser.userId,
      name: newUser.userName,
      role: newUser.userRole,
    };
    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: '30d',
    });

    res.send({ user: newUser, auth: token });
  } catch (err) {
    if (err.name === 'ValidationError') {
      err.status = 400;
    }
    console.log(err);
    res.status(err.status || 500);
    res.send({ error: err.message });
  }
}

async function updateAvatar(req, res) {
  try {
    // Params
    const userToken = req.auth;

    const fileName = req.body.userAvatar;

    await updateRepository.updateAvatar(fileName, userToken.id);

    const user = await userRepository.getUserById(userToken.id);

    // generate jwt
    const tokenPayload = {
      id: user.userId,
      name: user.userName,
      role: user.userRole,
    };
    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: '30d',
    });

    res.send({
      user: user,
      auth: token,
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      err.status = 400;
    }
    console.log(err);
    res.status(err.status || 500);
    res.send({ error: err.message });
  }
}

module.exports = {
  register,
  login,
  getUser,
  updateUser,
  uploadAvatar,
  updateName,
  updateEmail,
  updatePassword,
  updateAvatar,
};
