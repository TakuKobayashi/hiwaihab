var line = require('@line/bot-sdk');

var AWS = require('aws-sdk');
AWS.config.update({
  region: 'ap-northeast-1',
});
var dynamo = new AWS.DynamoDB.DocumentClient();

var Pornsearch = require('pornsearch');

var lineClient;

var userStatusEnum = {
  follow: 0,
  unfollow: 1
}

var searchPornhab = function(keyword, callback) {
  var searcher = new Pornsearch(keyword);
  searcher.videos().then(videos => callback(videos));
}

var searchDynamodbPromise = function(tablename, filterObject){
  return new Promise((resolve, reject) => {
    var params = {
      TableName: tablename,
      Key: filterObject
    };
    dynamo.get(params, function(error, data) {
      if (error) {
        reject(error);
        return;
      }
      resolve(data);
    });
  });
};

var updateDynamodbPromise = function(tablename, filterObject, updateObject){
  return new Promise((resolve, reject) => {
    var updateExpressionString = "set ";
    var updateExpressionAttributeValues = {}
    var keys = Object.keys(updateObject);
    for(var i = 0;i < keys.length;++i){
      var praceholder = ":Attr" + i.toString();
      updateExpressionString = updateExpressionString + keys[i] + " = " + praceholder;
      if(i != keys.length - 1){
        updateExpressionString = updateExpressionString + ", ";
      }
      updateExpressionAttributeValues[praceholder] = updateObject[keys[i]];
    }
    var params = {
      TableName: tablename,
      Key: filterObject,
      UpdateExpression: updateExpressionString,
      ExpressionAttributeValues: updateExpressionAttributeValues,
      ReturnValues:"UPDATED_NEW"
    };
    dynamo.update(params, function(error, data) {
      if (error) {
        reject(error);
        return;
      }
      resolve(data);
    });
  });
};

var createDynamodbPromise = function(tablename, putObject){
  var params = {
    TableName: tablename,
    Item: putObject
  };
  return new Promise((resolve, reject) => {
    var params = {
      TableName: tablename,
      Item: putObject
    };
    dynamo.put(params, function(error, data) {
      if (error) {
        reject(error);
        return;
      }
      resolve(data);
    });
  });
};

var getUserProfilePromise = function(user_id){
  return lineClient.getProfile(user_id);
}

exports.follow = function(user_id, timestamp) {
  var userProfileObj = {userId: user_id};
  var profilePromise = getUserProfilePromise(user_id);
  profilePromise.then(function(profile){
    userProfileObj = Object.assign(userProfileObj, profile);
    return searchDynamodbPromise("users", {user_id: user_id});
  }).then(function(userData){
    if(userData.Item){
      var updateObject = {
        updated_at: timestamp,
        user_state: userStatusEnum.follow
      }
      return updateDynamodbPromise("users", {user_id: user_id}, updateObject);
    }else{
      var insertObject = {
        user_id: userProfileObj.userId,
        user_state: userStatusEnum.follow,
        name: userProfileObj.displayName,
        icon_url: userProfileObj.pictureUrl,
        description: userProfileObj.statusMessage,
        updated_at: timestamp
      }
      return createDynamodbPromise("users", insertObject);
    }
  });
}

exports.unfollow = function(user_id, timestamp) {
  var usersPromise = searchDynamodbPromise("users", {user_id: user_id});
  usersPromise.then(function(userData){
    if(userData.Item){
      var updateObject = {
        updated_at: timestamp,
        user_state: userStatusEnum.unfollow
      }
      return updateDynamodbPromise("users", {user_id: user_id}, updateObject);
    }
  });
}

exports.initLineClient = function(accessToken) {
  lineClient = new line.Client({channelAccessToken: accessToken});
  return lineClient;
}

exports.generateReplyMessageObject = function(lineMessageObj, callback) {
  if(lineMessageObj.type == "text"){
    searchPornhab(lineMessageObj.text, function(searchResult){
      var messageObj = {
        type: "text",
        text: JSON.stringify(searchResult[0])
      };
      callback(messageObj);
    });
  }
}