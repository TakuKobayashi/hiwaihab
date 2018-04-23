var line = require('@line/bot-sdk');
var crypto = require('crypto');
var client = new line.Client({channelAccessToken: process.env.ACCESSTOKEN});

var Pornsearch = require('pornsearch');

var search = function(keyword, callback){
  var searcher = new Pornsearch(keyword);
  searcher.videos().then(videos => callback(videos));
};

exports.handler = function (event, context) {
  var signature = crypto.createHmac('sha256', process.env.CHANNELSECRET).update(event.body).digest('base64');
  var checkHeader = (event.headers || {})['X-Line-Signature'];
  var body = JSON.parse(event.body);
  if (signature === checkHeader) {
    if (body.events[0].replyToken === '00000000000000000000000000000000') { //接続確認エラー回避
      var lambdaResponse = {
        statusCode: 200,
        headers: { "X-Line-Status": "OK"},
        body: '{"result":"connect check"}'
      };
      context.succeed(lambdaResponse);
    } else {
      var text = body.events[0].message.text;
      var message = {
        'type': 'text',
        'text': text
      };
      client.replyMessage(body.events[0].replyToken, message)
      .then((response) => {
        var lambdaResponse = {
          statusCode: 200,
          headers: { "X-Line-Status" : "OK"},
          body: '{"result":"completed"}'
        };
        context.succeed(lambdaResponse);
      }).catch((err) => console.log(err));
    }
  }else{
    console.log('署名認証エラー');
  }
};