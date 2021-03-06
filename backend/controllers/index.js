'use strict';

const userController = require('./userController');
const threadController = require('./threadController');
const communityController = require('./communityController');
const topicController = require('./topicController');
const commentController = require('./commentControlle');
const postController = require('./postController');
const searchController = require('./searchController');

module.exports = {
  userController,
  threadController,
  communityController,
  topicController,
  commentController,
  postController,
  searchController,
};
