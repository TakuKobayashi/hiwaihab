var LineBot = require(__dirname + '/linebot.js');

var callLambdaResponse = function(promise, context){
  promise.then((response) => {
    var lambdaResponse = {
      statusCode: 200,
      headers: { "X-Line-Status": "OK"},
      body: JSON.stringify({"result": "completed"})
    };
    context.succeed(lambdaResponse);
  }).catch(function(err){
    console.log(err);
    console.log(JSON.stringify(err.originalError.response.data));
  });
}

exports.handler = function (event, context) {
  console.log(JSON.stringify(event));
  var linebot = new LineBot(process.env.ACCESSTOKEN);
  var lineClient = linebot.lineClient;
  event.events.forEach(function(lineMessage) {
    if(lineMessage.type == "follow"){
      var followPromise = linebot.follow(lineMessage.source.userId, lineMessage.timestamp);
      var promise = followPromise.then(function(userData){
        return linebot.generateConfirmMessage();
      }).then(function(confirmObj){
        return lineClient.replyMessage(lineMessage.replyToken, confirmObj);
      });
      callLambdaResponse(promise, context);
    }else if(lineMessage.type == "unfollow"){
      linebot.unfollow(lineMessage.source.userId, lineMessage.timestamp);
    }else if(lineMessage.type == "postback"){
      var receiveData = JSON.parse(lineMessage.postback.data);
      if(receiveData.confirmed){
        linebot.updateConfirmState(lineMessage.source.userId, lineMessage.timestamp);
      }else{
        linebot.generateConfirmMessage().then(function(confirmObj){
          return lineClient.replyMessage(lineMessage.replyToken, confirmObj);
        });
      }
    }else if(lineMessage.type == "message"){
      var replyMessageObjectPromise = linebot.checkConfirmed(lineMessage.source.userId).then(function(userData){
        return linebot.searchVideoAndGenerateReplyMessageObject(lineMessage);
      }).catch(function(userData) {
        callLambdaResponse(linebot.generateConfirmMessage().then(function(confirmObj){
          return lineClient.replyMessage(lineMessage.replyToken, confirmObj);
        }), context);
      });
      if(!replyMessageObjectPromise) return;
      callLambdaResponse(replyMessageObjectPromise.then(function(messageObj){
        return lineClient.replyMessage(lineMessage.replyToken, messageObj);
      }), context);
    }
  });
};