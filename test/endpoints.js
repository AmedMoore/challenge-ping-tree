process.env.NODE_ENV = 'test'

var test = require('ava')
var servertest = require('servertest')

var server = require('../lib/server')
var redis = require('../lib/redis')
var api = require('../lib/api')

test.serial.cb('healthcheck', function (t) {
  var url = '/health'
  servertest(server(), url, { encoding: 'json' }, function (err, res) {
    t.falsy(err, 'no error')

    t.is(res.statusCode, 200, 'correct statusCode')
    t.is(res.body.status, 'OK', 'status is ok')
    t.end()
  })
})

test.serial.cb('should post a target', function (t) {
  var url = '/api/targets'
  var opts = { method: 'POST', encoding: 'json' }

  servertest(server(), url, opts, onResponse)
    .end(JSON.stringify(testClient))

  function onResponse (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')
    t.like(res.body, testClient, 'body is ok')
    t.end()
  }
})

test.serial.cb('should get all targets', function (t) {
  var url = '/api/targets'
  servertest(server(), url, { encoding: 'json' }, function (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')
    t.is(res.body.length, 1, 'body contains exactly one target')
    t.assert(Array.isArray(res.body), 'body is ok')
    t.end()
  })
})

test.serial.cb('should get target by id', function (t) {
  redis.hgetall(api.targetsKey, function (err, reply) {
    t.falsy(err, 'no error')

    var target = JSON.parse(Object.values(reply).shift())

    var url = '/api/targets/' + target.id
    servertest(server(), url, { encoding: 'json' }, function (err, res) {
      t.falsy(err, 'no error')
      t.is(res.statusCode, 200, 'correct statusCode')
      t.like(res.body, testClient, 'body is ok')
      t.end()
    })
  })
})

test.serial.cb('should update target by id', function (t) {
  redis.hgetall(api.targetsKey, function (err, reply) {
    t.falsy(err, 'no error')

    var target = JSON.parse(Object.values(reply).shift())
    var updatedTarget = Object.assign(target, { value: '12.00' })

    var url = '/api/targets/' + target.id
    var opts = { method: 'POST', encoding: 'json' }
    servertest(server(), url, opts, onResponse)
      .end(JSON.stringify(updatedTarget))

    function onResponse (err, res) {
      t.falsy(err, 'no error')
      t.is(res.statusCode, 200, 'correct statusCode')
      t.is(updatedTarget, updatedTarget, 'body is ok')
      t.end()
    }
  })
})

test.serial.cb('should post a visitor request and get rejected', function (t) {
  var url = '/route'
  var opts = { method: 'POST', encoding: 'json' }
  var visitorInfo = {
    geoState: 'la',
    publisher: 'abc',
    timestamp: '2018-07-14T23:28:59.513Z'
  }

  servertest(server(), url, opts, onResponse)
    .end(JSON.stringify(visitorInfo))

  function onResponse (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')
    t.deepEqual(res.body, { decision: 'reject' }, 'body is ok')
    t.end()
  }
})

test.serial.cb('should post a visitor request and get accepted', function (t) {
  var url = '/route'
  var opts = { method: 'POST', encoding: 'json' }
  var visitorInfo = {
    geoState: 'ca',
    publisher: 'abc',
    timestamp: '2018-07-14T14:28:59.513Z'
  }

  servertest(server(), url, opts, onResponse)
    .end(JSON.stringify(visitorInfo))

  function onResponse (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')
    t.deepEqual(res.body, { url: 'http://example.com' }, 'body is ok')
    t.end()
  }
})

test.serial.cb('should post a visitor request and get rejected due to max accepted reach', function (t) {
  var url = '/route'
  var opts = { method: 'POST', encoding: 'json' }
  var visitorInfo = {
    geoState: 'la',
    publisher: 'abc',
    timestamp: '2018-07-14T23:28:59.513Z'
  }

  servertest(server(), url, opts, onResponse)
    .end(JSON.stringify(visitorInfo))

  function onResponse (err, res) {
    t.falsy(err, 'no error')
    t.is(res.statusCode, 200, 'correct statusCode')
    t.deepEqual(res.body, { decision: 'reject' }, 'body is ok')
    t.end()
  }
})

var testClient = {
  url: 'http://example.com',
  value: '0.50',
  maxAcceptsPerDay: 1,
  accept: {
    geoState: { $in: ['ca', 'ny'] },
    hour: { $in: ['13', '14', '15'] }
  }
}
