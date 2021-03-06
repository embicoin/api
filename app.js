var async = require('async');
var http = require('http');
var redis = require('redis').createClient(6379, '127.0.0.1')
var request = require('request');

var pools = [{
    name: 'Catpool.pw'
  , url: 'http://catpool.pw'
  , type: 'mpos'
}, {
    name: 'Coinium.org'
  , url: 'http://cat.coinium.org'
  , type: 'mpos'
}, {
    name: 'Team Catcoin'
  , url: 'http://teamcatcoin.com'
  , type: 'mpos'
}, {
    name: 'Mintpool.co'
  , url: 'http://cat.mintpool.co'
  , type: 'mpos'
}, {
    name: 'Luckyminers.com'
  , url: 'http://cat.luckyminers.com'
  , type: 'mpos'
}, {
    name: 'Cryptovalley.com'
  , url: 'http://cat.cryptovalley.com'
  , type: 'mpos'
}, {
    name: 'Solidpool.org P2Pool'
  , url: 'http://solidpool.org:9333'
  , type: 'p2pool'
}, {
    name: 'P2Pool.name'
  , url: 'http://p2pool.name:9333'
  , type: 'p2pool'
}];

var getData = function (next) {
  async.mapLimit(pools, 5, function (pool, next) {
    if (pool.type === 'mpos') {
      request.get({ url: pool.url + '/index.php?page=api&action=public', json: true, timeout: 2000 }, function (e, r, data) {
        next(null, {
            name: pool.name
          , url: pool.url
          , hashrate: data && data.hashrate ? (Math.round(data.hashrate / 100) / 10) : 0
        });
      });
    } else if (pool.type === 'p2pool') {
      request.get({ url: pool.url + '/local_stats', json: true, timeout: 2000 }, function (e, r, data) {
        next(null, {
            name: pool.name
          , url: pool.url
          , hashrate: data && data.miner_hash_rates ? (Math.round(Object.keys(data.miner_hash_rates).reduce(function (p, v) { return p + data.miner_hash_rates[v] }, 0) / 100000) / 10) : 0
        });
      });
    } else {
      setImmediate(next);
    }
  }, next);
};

http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'application/json'});
  redis.get('pools', function (err, data) {
    if (data) { return res.end(data); }
    getData(function (err, data) {
      redis.set('pools', JSON.stringify(data), function () {});
      redis.expire('pools', 120);
      res.end(JSON.stringify(data));
    });
  });
}).listen(3333, '127.0.0.1');

console.log('Started Catcoin API :3');