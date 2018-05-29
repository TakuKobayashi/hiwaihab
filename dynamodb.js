var AWS = require('aws-sdk');
AWS.config.update({
  region: 'ap-northeast-1',
});
var dynamo = new AWS.DynamoDB.DocumentClient();

var DynamoDB = function(){
  this.getPromise = function(tablename, filterObject){
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

  this.updatePromise = function(tablename, filterObject, updateObject){
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

  this.createPromise = function(tablename, putObject){
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
}

module.exports = DynamoDB;
