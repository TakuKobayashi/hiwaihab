var line = require('@line/bot-sdk');

var underscore = require('underscore');
var underscoreString = require("underscore.string");

var applicationName = "hiwaihub_linebot";

var Pornsearch = require('pornsearch');

var userStatusEnum = {
  follow: 0,
  unfollow: 1,
  confirmed: 2,
}

var DynamoDB = require(__dirname + '/dynamodb.js');
var dynamodb = new DynamoDB();

var LineBot = function(accessToken){
  this.lineClient = new line.Client({channelAccessToken: accessToken});

  this.getUserProfile = function(user_id){
    return this.lineClient.getProfile(user_id);
  }

  this.searchPornhub = function(keyword) {
    var searcher = new Pornsearch(keyword);
    return searcher.videos();
  }

  this.checkConfirmed = function(user_id) {
    return dynamodb.getPromise("users", {user_id: user_id}).then(function(userData){
      return new Promise((resolve, reject) => {
        if(userData.Item && userData.Item[applicationName] == userStatusEnum.confirmed){
          resolve(userData);
        }else{
          reject(userData);
        }
      });
    });
  }

  this.follow = function(user_id, timestamp) {
    var userProfileObj = {userId: user_id};
    return this.getUserProfile(user_id).then(function(profile){
      userProfileObj = Object.assign(userProfileObj, profile);
      return dynamodb.getPromise("users", {user_id: user_id});
    }).then(function(userData){
      if(userData.Item){
        var updateObject = {
          updated_at: timestamp
        }
        updateObject[applicationName] = userStatusEnum.follow
        return dynamodb.updatePromise("users", {user_id: user_id}, updateObject);
      }else{
        var insertObject = {
          user_id: userProfileObj.userId,
          name: userProfileObj.displayName,
          icon_url: userProfileObj.pictureUrl,
          description: userProfileObj.statusMessage,
          updated_at: timestamp
        }
        insertObject[applicationName] = userStatusEnum.follow
        return dynamodb.createPromise("users", insertObject);
      }
    });
  }

  this.unfollow = function(user_id, timestamp) {
    return dynamodb.getPromise("users", {user_id: user_id}).then(function(userData){
      if(userData.Item){
        var updateObject = {
          updated_at: timestamp
        }
        updateObject[applicationName] = userStatusEnum.unfollow
        return dynamodb.updatePromise("users", {user_id: user_id}, updateObject);
      }
    });
  }

  this.updateConfirmState = function(user_id, timestamp) {
    return dynamodb.getPromise("users", {user_id: user_id}).then(function(userData){
      if(userData.Item){
        var updateObject = {
          updated_at: timestamp
        }
        updateObject[applicationName] = userStatusEnum.confirmed
        return dynamodb.updatePromise("users", {user_id: user_id}, updateObject);
      }
    });
  }

  this.searchVideoAndGenerateReplyMessageObject = function(lineMessageObj) {
    if(lineMessageObj.message.type == "text"){
      var resultSamples = []
      return this.searchPornhub(lineMessageObj.message.text).then(function(searchResult){
        resultSamples = underscore.sample(searchResult, 10);
        var insertObject = {
          message_id: lineMessageObj.message.id,
          user_id: lineMessageObj.source.userId,
          reply_token: lineMessageObj.replyToken,
          input_text: lineMessageObj.message.text,
          applicationName: applicationName,
          response_object: resultSamples,
          created_at: lineMessageObj.timestamp
        }
        return dynamodb.createPromise("bot_messages", insertObject);
      }).then(function(searchResult){
        return new Promise((resolve, reject) => {
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
          resolve(messageObj);
        });
      });
    }
    return null;
  }

  this.generateConfirmMessage = function(){
    return new Promise((resolve, reject) => {
      var confirmObject =     {
        type: "template",
        altText: "this is a confirm template",
        template: {
          type: "confirm",
          text: "Hiwaihubへようこそ!!\nこのコンテンツはアダルト動画を検索してみることができるものです!!\nあなたは18歳以上ですか?",
          actions: [
            {
              type: "postback",
              label: "はい",
              data: JSON.stringify({confirmed: true}),
            },
            {
              type: "postback",
              label: "いいえ",
              data: JSON.stringify({confirmed: false}),
            }
          ]
        }
      }
      resolve(confirmObject);
    });
  }
}

module.exports = LineBot;