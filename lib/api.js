var cuid = require('cuid')
var body = require('body/json')
var send = require('send-data/json')

var redis = require('./redis')

var targetsKey = 'TARGETS'

module.exports = {
  targetsKey: targetsKey,
  createTarget: createTarget,
  getAllTargets: getAllTargets,
  getTarget: getTarget,
  updateTarget: updateTarget,
  createVisitorRequest: createVisitorRequest
}

function createTarget (req, res, opts, cb) {
  body(req, res, function (err, data) {
    if (err) return cb(err)

    var id = cuid()
    var val = JSON.stringify(Object.assign(data, { id: id, requests: [] }))

    redis.hset(targetsKey, id, val, function (err) {
      if (err) return cb(err)

      send(req, res, data)
    })
  })
}

function getAllTargets (req, res, opts, cb) {
  redis.hgetall(targetsKey, function (err, reply) {
    if (err) return cb(err)

    var values = Object.values(reply)
    var val = values.map(v => JSON.parse(v))

    send(req, res, val)
  })
}

function getTarget (req, res, opts, cb) {
  redis.hget(targetsKey, opts.params.id, function (err, reply) {
    if (err) return cb(err)

    send(req, res, JSON.parse(reply))
  })
}

function updateTarget (req, res, opts, cb) {
  body(req, res, function (err, data) {
    if (err) return cb(err)

    var id = opts.params.id
    redis.hget(targetsKey, id, function (err, reply) {
      if (err) return cb(err)

      var target = JSON.parse(reply)
      var val = JSON.stringify(Object.assign(target, data))

      redis.hset(targetsKey, id, val, function (err) {
        if (err) return cb(err)

        send(req, res, val)
      })
    })
  })
}

function createVisitorRequest (req, res, opts, cb) {
  body(req, res, function (err, data) {
    if (err) return cb(err)

    redis.hgetall(targetsKey, function (err, reply) {
      if (err) return cb(err)

      if (!reply) {
        return send(req, res, { decision: 'reject' })
      }

      var values = Object.values(reply)
      var targets = values.map(v => JSON.parse(v))
      var matches = getMatches(targets, data)

      if (!matches.length) {
        return send(req, res, { decision: 'reject' })
      }

      var bestMatch = matches.sort((a, b) => a.value - b.value).pop()
      var bestMatchStr = JSON.stringify(bestMatch)

      redis.hset(targetsKey, bestMatch.id, bestMatchStr, function (err) {
        if (err) return cb(err)

        send(req, res, { url: bestMatch.url })
      })
    })
  })
}

function getMatches (targets, params) {
  return targets.filter(target => {
    if (target.maxAcceptsPerDay <= target.requests.length) {
      return false
    }
    if (!target.accept.geoState.$in.includes(params.geoState)) {
      return false
    }
    var hour = new Date(params.timestamp).getUTCHours().toString()
    if (!target.accept.hour.$in.includes(hour)) {
      return false
    }
    return true
  })
}
