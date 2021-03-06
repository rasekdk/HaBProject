'use strict';
// Require
const Joi = require('joi');

// Imports
const { postRepository, commentRepository, voteRepository, userRepository } = require('../repositories');
const { getPostById } = require('../repositories/postRepository');

// Thread
async function getThread(req, res) {
  try {
    const threadId = req.params.threadId;

    const threadIdSchema = Joi.number().positive().required();
    await threadIdSchema.validateAsync(threadId);

    const [thread] = await postRepository.getThread(threadId);

    res.send(thread);
  } catch (err) {
    console.log(err);
    if (err.name === 'ValidationError') {
      err.status = 400;
    }
    res.status(err.status || 500);
    res.send({ error: err.message });
  }
}

// Delete thread
async function deleteThread(req, res) {
  try {
    // Params
    const userId = req.auth.id;
    const threadId = req.params.threadId;

    // Validate
    const threadIdSchema = Joi.number().positive().required();
    await threadIdSchema.validateAsync(threadId);

    // SQL query
    await postRepository.deleteThread(userId, threadId);

    // Response
    res.send({ message: true });
  } catch (err) {
    console.log(err);
    if (err.name === 'ValidationError') {
      err.status = 400;
    }
    res.status(err.status || 500);
    res.send({ error: err.message });
  }
}

// Create Vote
async function addVote(req, res) {
  try {
    // Params
    const threadId = req.params.threadId;
    const vote = req.query.vote;
    const tokenUserId = req.auth.id;

    // Validate
    const schemaId = Joi.number().required();
    const schemaVote = Joi.string().min(1).max(1).required();

    await schemaId.validateAsync(threadId, tokenUserId);
    await schemaVote.validateAsync(vote);

    // Type of vote
    let voteType;

    if (vote === 'p') {
      voteType = 1;
    } else if (vote === 'n') {
      voteType = -1;
    }

    await voteRepository.addVote(tokenUserId, threadId, voteType);

    const votes = await voteRepository.voteCount(threadId);

    res.send(votes);
  } catch (err) {
    console.log(err);
    if (err.name === 'ValidationError') {
      err.status = 400;
    }
    res.status(err.status || 500);
    res.send({ error: err.message });
  }
}

async function unVote(req, res) {
  try {
    // Params
    const threadId = req.params.threadId;
    const tokenUserId = req.auth.id;

    // Validate
    const schemaId = Joi.number().required();

    await schemaId.validateAsync(threadId, tokenUserId);

    await voteRepository.unVote(tokenUserId, threadId);

    const votes = await voteRepository.voteCount(threadId);

    res.send(votes);
  } catch (err) {
    console.log(err);
    if (err.name === 'ValidationError') {
      err.status = 400;
    }
    res.status(err.status || 500);
    res.send({ error: err.message });
  }
}

module.exports = {
  getThread,
  deleteThread,
  addVote,
  unVote,
};
