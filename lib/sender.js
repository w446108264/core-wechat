/**
 * Wechat
 * {@Link http://qydev.weixin.qq.com/wiki/index.php}
 */
var request = require('request');
var wxToken = require('./token');
var async = require('async');
var retry = require('./retry');

/**
 * send msg with token
 * @param opts {@link http://qydev.weixin.qq.com/wiki/index.php?title=消息类型及数据格式} {@code var json = {
    "touser": "@all",
    "msgtype": "news",
    "agentid": 2,
    "msgtype": "text",
    "text": {
        "content": "test"
    },
 "safe": "0"
 }}
 * @param opts2 {@code var opts2 = {
    auth: {
        // corpID can't be null.
        corpID: "corpID",
        // token can't be null
        token: "token"
    }
 }}
 * @param callback
 */
exports.sendWithToken = function (opts, opts2, callback) {
    if (opts == null) {
        callback("msg data can't be null");
        return;
    }

    if (opts2.auth == null || opts2.auth.corpID == null || opts2.auth.token == null) {
        callback("corpID or token can't be null");
        return;
    }

    var options = {
        uri: 'https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=' + opts2.auth.token,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        json: opts
    };

    request(options, function (error, response, body) {
        var result = JSON.stringify(body);
        var errcode = body.errcode;
        if (errcode == 0) {
            return callback(null);
        }
        // token is invalid, clear and retry
        else if (errcode == 40014) {
            wxToken.removeTokenCache(opts2.auth.corpID);
            return callback("token is invalid!" + result);
        }
        // other error
        return callback("sends failure! " + result);
    });
}

/**
 * auto get token and auto send msg and auto retry when fail.
 * @param opts msg data {@link http://qydev.weixin.qq.com/wiki/index.php?title=消息类型及数据格式} {@code var json = {
    "touser": "@all",
    "msgtype": "news",
    "agentid": 2,
    "msgtype": "text",
    "text": {
        "content": "test"
    },
    "safe": "0"
 }}
 * @param opts2 {@code var opts2 = {
    auth: {
        // corpID can't be null.
        corpID: "corpID",
        // secret can't be null.
        secret: "secret"
    },
    // retry rule, if null that will use default rule.
    retry_rule: {
        interval: 1000,
        times: 3
    }
 }}
 * @param callback
 */
exports.autoSend = function (opts, opts2, callback) {
    if (opts == null) {
        callback("msg data can't be null");
        return;
    }

    if (opts2 == null || opts2.auth == null
        || opts2.auth.corpID == null || opts2.auth.secret == null) {
        callback("CorpID or Secret can't be null");
        return;
    }

    var retryRule = retry.initRetryRule(opts2);

    async.retry(retryRule, function (callback) {
        async.auto({
            check_token: function (cb) {
                // get token from cache, go to next if not null.
                var accessToken = wxToken.getTokenCache(opts2.auth.corpID);
                if (accessToken != null) {
                    cb(null, accessToken);
                    return;
                }
                // get token from net.
                wxToken.getAccessToken(opts2.auth.corpID, opts2.auth.secret, function (error, token) {
                    cb(error, token);
                });
            },
            send: ['check_token', function (results, cb) {
                opts2.auth.token = results.check_token;
                exports.sendWithToken(opts, opts2, function (error, results) {
                    cb(error, results);
                });
            }]
        }, function (error, results) {
            callback(error, results);
        });
    }, function (error, result) {
        callback(error, result);
    });
}
