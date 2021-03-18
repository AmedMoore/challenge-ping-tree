process.env.NODE_ENV = 'test'

var test = require('ava')
var servertest = require('servertest')

var server = require('../lib/server')

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

var testClient = {
  url: 'http://example.com',
  value: '0.50',
  maxAcceptsPerDay: '10',
  accept: {
    geoState: { $in: ['ca', 'ny'] },
    hour: { $in: ['13', '14', '15'] }
  }
}
