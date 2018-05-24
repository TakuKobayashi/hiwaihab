var AWS = require('aws-sdk');
AWS.config.update({
  region: 'ap-northeast-1',
});
var dynamo = new AWS.DynamoDB.DocumentClient();

var linebot = require(__dirname + '/linebot.js');

exports.handler = function (event, context) {
/*
  var params = {
    TableName: "AppearWordDynamo",
    Key:{
      word: 'Itbites',
      part: 'n'
    }
  };
*/
//  dynamo.get(params, function(err, data) {
  var lineClient = linebot.getLineClient(process.env.ACCESSTOKEN);
  event.events.forEach(function(lineMessage) {
    if(lineMessage.type == "message"){
      linebot.generateReplyMessageObject(lineMessage.message, function(messageObj){
        console.log(messageObj);
        console.log(lineMessage.replyToken);
        lineClient.replyMessage(lineMessage.replyToken, messageObj).then((response) => {
          var lambdaResponse = {
            statusCode: 200,
            headers: { "X-Line-Status": "OK"},
            body: JSON.stringify({"result": "completed"})
          };
          context.succeed(lambdaResponse);
        }).catch((err) => console.log(err));
      });
    }
  });
//  });
};