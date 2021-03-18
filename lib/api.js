var cuid = require('cuid')
var body = require('body/json')
var send = require('send-data/json')

var redis = require('./redis')

var targetsKey = 'TARGETS'

module.exports = {
  targetsKey: targetsKey,
  createTarget: createTarget,
  getAllTargets: getAllTargets,
  getTarget: getTarget
}

function createTarget (req, res, opts, cb) {
  body(req, res, function (err, data) {
    if (err) return cb(err)

    var id = cuid()
    var val = JSON.stringify(Object.assign(data, { id: id }))

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
