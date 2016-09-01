
exports.defaultRetryRule = {
    interval: 1000,
    times: 3
}

/**
 * init retry rule.
 * @param options
 * @returns {*} when options can't be checked that will return defaultRetryRule
 */
exports.initRetryRule = function (options) {
    if (options == null || options.retry_rule == null) {
        return exports.defaultRetryRule;
    }
    if (typeof options.retry_rule.interval === 'number' && typeof options.retry_rule.times === 'number') {
        return options;
    }
    return exports.defaultRetryRule;
}