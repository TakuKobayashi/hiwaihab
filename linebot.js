var line = require('@line/bot-sdk');

var AWS = require('aws-sdk');
AWS.config.update({
  region: 'ap-northeast-1',
});
var dynamo = new AWS.DynamoDB.DocumentClient();
var underscore = require('underscore');
var underscoreString = require("underscore.string");

var applicationName = "hiwaihub_linebot";

var Pornsearch = require('pornsearch');

var lineClient;

var userStatusEnum = {
  follow: 0,
  unfollow: 1
}

var searchPornhubPromise = function(keyword) {
  var searcher = new Pornsearch(keyword);
  return searcher.videos();
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
        updated_at: timestamp
      }
      updateObject[applicationName] = userStatusEnum.follow
      return updateDynamodbPromise("users", {user_id: user_id}, updateObject);
    }else{
      var insertObject = {
        user_id: userProfileObj.userId,
        name: userProfileObj.displayName,
        icon_url: userProfileObj.pictureUrl,
        description: userProfileObj.statusMessage,
        updated_at: timestamp
      }
      insertObject[applicationName] = userStatusEnum.follow
      return createDynamodbPromise("users", insertObject);
    }
  });
}

exports.unfollow = function(user_id, timestamp) {
  var usersPromise = searchDynamodbPromise("users", {user_id: user_id});
  usersPromise.then(function(userData){
    if(userData.Item){
      var updateObject = {
        updated_at: timestamp
      }
      updateObject[applicationName] = userStatusEnum.unfollow
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
    var pornhubPromise = searchPornhubPromise(lineMessageObj.text);
    pornhubPromise.then(function(searchResult){
      var resultSamples = underscore.sample(searchResult, 10);
      var messageObj = {
        type: "template",
        altText: lineMessageObj.text + "の検索結果",
        template: {
          type: "carousel",
          columns: underscore.map(resultSamples, function(video){
            return {
              thumbnailImageUrl: video.thumb,
              title: underscoreString(video.title).prune(37).value(),
              text: "再生時間:" + video.duration.toString(),
              defaultAction: {
                type: "uri",
                label: "動画を見る",
                uri: video.url
              },
              actions: [
                {
                  type: "uri",
                  label: "動画を見る",
                  uri: video.url
                }
              ]
            }
          })
        }
      };
      callback(messageObj);
    });
  }
}