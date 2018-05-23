var AWS = require('aws-sdk');
AWS.config.update({
  region: 'ap-northeast-1',
});
var dynamo = new AWS.DynamoDB.DocumentClient();

var line = require('@line/bot-sdk');

var Pornsearch = require('pornsearch');

var search = function(keyword, callback){
  var searcher = new Pornsearch(keyword);
  searcher.videos().then(videos => callback(videos));
};

exports.handler = function (event, context) {
  var params = {
    TableName: "AppearWordDynamo",
    Key:{
      word: 'Itbites',
      part: 'n'
    }
  };

  dynamo.get(params, function(err, data) {
    var messageObj = {}
    if (err) {
      messageObj = err;
    } else {
      messageObj = data;
    }
    var client = new line.Client({channelAccessToken: process.env.ACCESSTOKEN});
    var message = {
      type: "text",
      text: JSON.stringify(Object.assign(event, messageObj))
    };
    client.replyMessage(event.events[0].replyToken, message).then((response) => {
      var lambdaResponse = {
        statusCode: 200,
        headers: { "X-Line-Status" : "OK"},
        body: '{"result":"completed"}'
      };
      context.succeed(lambdaResponse);
    }).catch((err) => console.log(err));
  });
};