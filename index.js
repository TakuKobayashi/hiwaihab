var AWS = require('aws-sdk');
AWS.config.update({
  region: 'ap-northeast-1',
});
var dynamo = new AWS.DynamoDB.DocumentClient();

var linebot = require(__dirname + '/linebot.js');

exports.handler = function (event, context) {
  console.log(JSON.stringify(event));
  var lineClient = linebot.initLineClient(process.env.ACCESSTOKEN);
  event.events.forEach(function(lineMessage) {
    if(lineMessage.type == "follow"){
      linebot.follow(lineMessage.source.userId, lineMessage.timestamp);
    }else if(lineMessage.type == "unfollow"){
      linebot.unfollow(lineMessage.source.userId, lineMessage.timestamp);
    }else if(lineMessage.type == "message"){
      var replyMessageObjectPromise = linebot.generateReplyMessageObjectPromise(lineMessage);
      replyMessageObjectPromise.then(function(messageObj){
        return lineClient.replyMessage(lineMessage.replyToken, messageObj);
      })
      replyMessageObjectPromise.then((response) => {
        var lambdaResponse = {
          statusCode: 200,
          headers: { "X-Line-Status": "OK"},
          body: JSON.stringify({"result": "completed"})
        };
        context.succeed(lambdaResponse);
      }).catch(function(err){
        console.log(err);
      });
    }
  });
};