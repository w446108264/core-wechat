var request = require('request');

/**
 * this is map for access_token
 *
 * <p>add {@link .#getAccessToken @code accessTokenMap.set(Secret, accessToken);}
 * get  {@link .#getTokenCache @code accessTokenMap.get(Secret);}
 *
 * <p>when the token is timeout, it will be remove
 *
 * @type {Map} key:Secret  value:accessToken
 *
 */
global.accessTokenMap = new Map();

/**
 * get Token from cache
 * @param secret
 * @returns {*}
 */
exports.getTokenCache = function (secret) {
    if (secret == null) {
        return null;
    }
    return accessTokenMap.get(secret);
}

/**
 * get Token from wechat
 * @param corpID
 * @param secret
 * @param callback
 * @returns {*}
 * @see http://qydev.weixin.qq.com/wiki/index.php?title=%E4%B8%BB%E5%8A%A8%E8%B0%83%E7%94%A8
 */
exports.getAccessToken = function (corpID, secret, callback) {
    if (corpID == null || secret == null) {
        callback("CorpID or Secret can't be null");
        return;
    }

    if (accessTokenMap.get(secret) != null) {
        return accessTokenMap.get(secret);
    }

    var options = {
        uri: 'https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=' + corpID + '&corpsecret=' + secret,
        method: 'GET'
    };

    /**
     * <p>
     * return  success {@code
     *    {
     *      "access_token": "accesstoken000001",
     *      "expires_in": 7200
     *    }
     * }
     * </p>
     *
     * <p>
     * return  fail {@code
     *    {
     *      "errmsg": "require https",
     *      "errcode": 43003
     *    }
     * }
     * </p>
     *
     */
    request(options, function (error, response, body) {
        if (error != null) {
            return callback("getAccessToken failure! " + error);
        }
        if (response.statusCode == 200 && body != null) {
            var accessToken = JSON.parse(body).access_token;
            if (accessToken != null) {
                accessTokenMap.set(secret, accessToken);
            }
            return callback(null, accessToken);
        }
        return callback("getAccessToken failure!");
    })
};

/**
 * remove Token with Secret
 * @param Secret
 * @returns {*}
 */
exports.removeTokenCache = function (secret) {
    if (secret == null) {
        return null;
    }
    return accessTokenMap.delete(secret);
}