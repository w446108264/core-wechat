/**
 * Wechat Core
 */
"use strict";

var events = require('events')
    , wechatSender = require('./lib/sender')
    , wechatUpload = require('./lib/upload')
    , wechatToken = require('./lib/token')

function getWechatSender() {
    return wechatSender;
}

function getWechatUpload() {
    return wechatUpload;
}

function getWechatToken() {
    return wechatToken;
}

module.exports = {
    getWechatSender: getWechatSender,
    getWechatUpload: getWechatUpload,
    getWechatToken: getWechatToken
};