var line = require('@line/bot-sdk');

var AWS = require('aws-sdk');
AWS.config.update({
  region: 'ap-northeast-1',
});
var dynamo = new AWS.DynamoDB.DocumentClient();

var Pornsearch = require('pornsearch');

var searchPornhab = function(keyword, callback) {
  var searcher = new Pornsearch(keyword);
  searcher.videos().then(videos => callback(videos));
}

exports.getLineClient = function(accessToken) {
  return new line.Client({channelAccessToken: process.env.ACCESSTOKEN});
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