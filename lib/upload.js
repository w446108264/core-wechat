/**
 * upload manage
 * @see http://qydev.weixin.qq.com/wiki/index.php?title=上传永久素材
 */
var request = require('request');
var extend = require('extend')
var async = require('async');
var fs = require('fs');

var baseCore = require('core-base')
var fileUtil = baseCore.getFileUtil();
var download = baseCore.getDownload();
var wxToken = require('./token');
var retry = require('./retry');

/**
 * updaload media file to wechat
 * @param options  @{code var opts = {
    auth: {
        token: null
    },
    // 媒体文件类型，分别有图片（image）、语音（voice）、视频（video），普通文件(file)
    type: "image",
    // the file path which will be uploaded
    file_path: null
}}
 * @param callback
 * @returns {*}
 * @see http://qydev.weixin.qq.com/wiki/index.php?title=%E4%B8%8A%E4%BC%A0%E5%AA%92%E4%BD%93%E6%96%87%E4%BB%B6
 */
exports.uploadWXWithFilePathWithToken = function (options, callback) {
    if (options.auth == null || options.auth.token == null) {
        return callback("token can't be null when upload media!");
    }
    if (options.type == null) {
        return callback("type can't be null when upload media!");
    }

    var file = fs.createReadStream(options.file_path);
    if (file == null) {
        return callback("can't find the file on" + options.file_path);
    }
    request.post({
        url: "https://qyapi.weixin.qq.com/cgi-bin/media/upload?access_token=" + options.auth.token + "&type=" + options.type,
        json: true,
        formData: {
            media: file,
            nonce: ''
        }
    }, function (error, response, body) {
        if (error != null) {
            return callback("upload failure! " + error);
        }
        if (response.statusCode == 200 && body != null) {
            var result = JSON.stringify(body);

            // token is invalid, clear and retry
            var errcode = body.errcode;
            if (errcode == 40014) {
                wxToken.removeTokenCache(secret);
                return callback("token is invalid!" + result);
            }

            // upload successfully
            var media_id = body.media_id;
            if (media_id != null) {
                return callback(null, media_id);
            }

            // other error
            return callback("upload failure! " + result);
        }
        // other error
        return callback("upload failure!");
    });
}

/**
 * auto check token and auto upload, the cool is that will auto retry when fail.
 * @param options  @{code var opts = {
    auth: {
        corpID: "",
        secret: ""
    },
    // 媒体文件类型，分别有图片（image）、语音（voice）、视频（video），普通文件(file)
    type: "image",
    // the file path which will be uploaded
    file_path: null,
    // retry rule, if null that will use default rule.
    retry_rule: {
        interval: 1000,
        times: 3
    }
}}
 * @param callback
 * @returns {*}
 * @see http://qydev.weixin.qq.com/wiki/index.php?title=%E4%B8%8A%E4%BC%A0%E5%AA%92%E4%BD%93%E6%96%87%E4%BB%B6
 */
exports.autoUpload = function (options, callback) {
    if (options == null || options.file_path == null) {
        callback("filePath can't be null");
        return;
    }

    if (options.auth == null || options.auth.corpID == null || options.auth.secret == null) {
        callback("CorpID or Secret can't be null");
        return;
    }

    var retryRule = retry.initRetryRule(options);

    async.retry(retryRule, function (parentcb) {
        async.waterfall([
            // get token
            function (asyncCallback) {
                // get token from cache, go to next if success
                var accessToken = wxToken.getTokenCache(options.auth.secret);
                if (accessToken != null) {
                    asyncCallback(null, accessToken);
                    return;
                }
                // get token from net and auto retry when fail.
                async.retry(retryRule, function (cb) {
                    wxToken.getAccessToken(options.auth.corpID, options.auth.secret, function (error, token) {
                        if (error == null) {
                            cb(null, token);
                            return;
                        }
                        cb(error, token);
                    });
                }, function (err, token) {
                    if (err != null) {
                        return asyncCallback("can't get token! " + err);
                    }
                    if (token == null) {
                        return asyncCallback("token is null!");
                    }
                    asyncCallback(null, token);
                });
            },
            // upload
            function (token, asyncCallback) {
                if (options.auth == null) {
                    options.auth = {};
                }
                options.auth.token = token;
                exports.uploadWXWithFilePathWithToken(options, function (error, media_id) {
                    if (error != null) {
                        return asyncCallback("upload failure! " + error);
                    }
                    return asyncCallback(null, media_id);
                });
            }
        ], function (err, results) {
            parentcb(err, results);
        });
    }, function (err, results) {
        callback(err, results);
    });
}

/**
 * download image and push file to wechat, but will not send msg.
 * @param options {@code var opts = {
    auth: {
        corpID: "wxd7efa8af27ff6c75",
        secret: "JdVqukg6_aqFGDu_yPqwArg5CT5m0twFCJIG2eZec3IT-ZJzsj_i8HgFvgZDy9tP",
        token: null
    },
    // a url which we will download from.
    uri: "http://ww2.sinaimg.cn/large/610dc034gw1f7bm1unn17j20u00u00wm.jpg",
    // 媒体文件类型，分别有图片（image）、语音（voice）、视频（video），普通文件(file)
    type: "image",
    // a path which the download file will be saved in
    file_save_path: "../../../temp",
    // the download file will be named by fileName. if null the download file will be named by spit url String
    file_name: null,
    // retry rule, if null that will use default rule.
    retry_rule: {
           interval: 1000,
           times: 3
    }
 }}
 * @param callback if success that will return object {@code {
           media_id: "1bHLl3Cgui6vQnZKoSbIwPMANde7f3wgvTLMRRXyIZifcPQar6Nn6FqqLTcb4WCA--Mwl6gIW1wyojU0pAKwqwQ"
    }}
 * @see http://qydev.weixin.qq.com/wiki/index.php?title=%E4%B8%8A%E4%BC%A0%E5%AA%92%E4%BD%93%E6%96%87%E4%BB%B6
 */
exports.autoDownloadAndPushToWechat = function (options, callback) {
    if (typeof options === 'function') {
        callback = options
    }

    var params = {}
    if (typeof options === 'object') {
        extend(params, options);
    } else {
        throw new Error('undefined is not a valid options object.')
    }

    params.callback = callback || params.callback

    /**
     * @see  http://qydev.weixin.qq.com/wiki/index.php?title=%E4%B8%8A%E4%BC%A0%E5%AA%92%E4%BD%93%E6%96%87%E4%BB%B6
     */
    if (options.uri == null || options.type == null) {
        callback("url or type can't be null");
        return;
    }

    var autoUpload;

    if (options.auth == null) {
        callback("auth can't be null");
        return;
    }
    /**
     * upload with corpID and secret, it will auto retry when fail.
     */
    else if (options.auth.corpID != null && options.auth.secret != null) {
        autoUpload = function (results, cb) {
            exports.autoUpload(options, function (err, media_id) {
                if (media_id != null) {
                    results.media_id = media_id;
                }
                cb(err, results);
            });
        };
    }
    /**
     * upload with token, it will not auto retry when fail.
     */
    else if (options.auth.token != null) {
        autoUpload = function (results, cb) {
            exports.uploadWXWithFilePathWithToken(options, function (error, media_id) {
                if (media_id != null) {
                    results.media_id = media_id;
                }
                cb(error, media_id);
            });
        };
    } else {
        callback("auth error. token or cropID and secret can't be null!");
        return;
    }

    var retryRule = retry.initRetryRule(options);

    async.auto({
        check_name: function (cb) {
            options.file_name = options.file_name == null
                ? options.uri.substring(options.uri.lastIndexOf("/") + 1, options.uri.length)
                : options.file_name;
            cb(null);
        },
        make_folder: ['check_name', function (results, cb) {
            fileUtil.mkdirs(options.file_save_path, function (err) {
                if (err != null) {
                    return cb(err);
                }
                cb(null);
            });
        }],
        download: ['make_folder', async.retryable(retryRule, function (results, cb) {
            download.downloadAndSave(options.uri, options.file_save_path, options.file_name, function (err, filePath) {
                if (err == null && filePath != null) {
                    options.file_path = filePath;
                    cb(null, filePath);
                } else {
                    cb(filePath == null ? "download is not success" : err, filePath);
                }
            });
        })],
        autoUpload: ['download', autoUpload]
    }, function (err, results) {
        callback(err, results);
    });
}
