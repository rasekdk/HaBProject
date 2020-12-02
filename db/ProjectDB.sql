CREATE SCHEMA IF NOT EXISTS news;

USE news;

CREATE TABLE userProfile (
	userName VARCHAR(25) NOT NULL,
	userPassword VARCHAR(255) NOT NULL,
	userEmail VARCHAR(255) NOT NULL,
    UserAvatar VARCHAR(255),
    userBio VARCHAR(255),
	PRIMARY KEY(userName)
);

CREATE TABLE community (
	communityId INT AUTO_INCREMENT,
    communityName VARCHAR(30) NOT NULL,
    PRIMARY KEY(communityId)
);

CREATE TABLE userProfile_communityFollow (
	userName VARCHAR(255) NOT NULL,
    communityId INT NOT NULL, 
    FOREIGN KEY (userName) REFERENCES userProfile(userName),
    FOREIGN KEY (communityId) REFERENCES community(communityId),
    PRIMARY KEY (userName, communityId)
);

CREATE TABLE userProfile_communityModeration (
	userName VARCHAR(255) NOT NULL,
    communityId INT NOT NULL, 
    FOREIGN KEY (userName) REFERENCES userProfile(userName),
    FOREIGN KEY (communityId) REFERENCES community(communityId),
    PRIMARY KEY (userName, communityId)
);

CREATE TABLE post (
	postId INT NOT NULL AUTO_INCREMENT,
    postTitle VARCHAR(255) NOT NULL,
    postText VARCHAR(255),
    postLink VARCHAR(255),
    postImg VARCHAR(255),
    postCommunity INT NOT NULL,
    threadId INT NOT NULL,
    FOREIGN KEY (postCommunity) REFERENCES community(communityId),
    PRIMARY KEY (postId)
);

CREATE TABLE comment (
	commentId INT NOT NULL AUTO_INCREMENT,
    commentText VARCHAR(255),
    threadId INT NOT NULL,
    PRIMARY KEY (commentId)
);

CREATE TABLE thread (
	threadId INT AUTO_INCREMENT,
    threadFather INT NOT NULL,
    FOREIGN KEY (threadFather) REFERENCES post(postId),
    FOREIGN KEY (threadFather) REFERENCES comment(commentId),
    PRIMARY KEY (threadId)
);

CREATE TABLE userProfile_threadVote (
    voteType CHAR(1), 
	userName VARCHAR(255) NOT NULL,
    threadId INT NOT NULL, 
    FOREIGN KEY (userName) REFERENCES userProfile(userName),
    FOREIGN KEY (threadId) REFERENCES thread(threadId),
    PRIMARY KEY (userName, threadId)
);

ALTER TABLE community ADD communityCreator VARCHAR(25) NOT NULL, ADD FOREIGN KEY (communityCreator) REFERENCES userProfile(userName);
ALTER TABLE post ADD FOREIGN KEY (threadId) REFERENCES thread(threadId);
ALTER TABLE comment ADD FOREIGN KEY (threadId) REFERENCES thread(threadId);