var baseCore = require('core-base')
var testConfig = require('./testconfig')

var corpID = testConfig != null ? testConfig.corpID : null;
var secret = testConfig != null ? testConfig.secret : null;

var wechatCore = require('../index');
var wechatSender = wechatCore.getWechatSender();

/**
 * send test
 */
var json = {
    "touser": "@all",
    "msgtype": "news",
    "agentid": 2,
    "msgtype": "text",
    "text": {
        "content": "test"
    },
    "safe": "0"
}

var opts2 = {
    auth: {
        corpID: corpID,
        secret: secret,
        token: null
    }
}
wechatSender.autoSend(json, opts2, function (err, result) {
    console.log(err, result);
});

/**
 * upload and send test
 */
var wechatUpload = wechatCore.getWechatUpload();
var opts = {
    auth: {
        corpID: corpID,
        secret: secret,
        token: null
    },
    uri: "http://ww2.sinaimg.cn/large/610dc034gw1f7bm1unn17j20u00u00wm.jpg",
    type: "image",
    file_save_path: "../../../temp",
    file_name: null,
    retry_rule: {
        interval: 1000,
        times: 3
    }
}

wechatUpload.autoDownloadAndPushToWechat(opts, function (err, results) {
    if (err == null && results != null && results.media_id != null) {
        console.log("上传成功" + "  " + results + "  " + results.media_id);

        var imageJson = {
            "touser": "@all",
            "msgtype": "news",
            "agentid": 2,
            "msgtype": "image",
            "image": {
                "media_id": results.media_id
            },
            "safe": "0"
        }
        wechatSender.autoSend(imageJson, opts, function (err, result) {
            console.log(err, result);
        });
    } else {
        console.log("上传失败" + err);
    }
});
