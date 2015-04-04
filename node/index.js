var app = require('express')();
var http = require('http').Server(app);
var server = require('socket.io')(http);

var knight_pool = {};
var alerted = {};
var sockets = {};

var panicking = false;

var now = function() {
  return new Date().getTime() / 1000;
};

app.get('/payload.js', function(req, res){
  res.sendFile(__dirname + '/payload.js');
});

app.get('/extension.zip', function(req, res){
  res.sendFile(__dirname + '/extension.zip');
});

server.on('connection', function(socket){
  socket.on('ping', function(msg){
    if (!msg.username) {
      return;
    }

  	// console.log('ping from ' + msg.username + ' ' + msg.valid);
    if (msg.username in alerted) {
      socket.emit('panic');
      return;
    }
    knight_pool[msg.username] = now();
    sockets[msg.username] = socket;
  });
});

http.listen(80, function(){
  console.log('listening on *:80');
});

var host = 'wss://wss.redditmedia.com/thebutton?h=900bb019d240dd0bbd0b44a79750b910219fe953&e=1428245050';

var WS = require('ws');
var button_client = new WS(host);

var defcon = 5;

function alarm_knights(num) {
  var pool_size = Object.keys(knight_pool).length;

  for (var i = 0; i < pool_size && i < num; i++) {
    var id = Math.floor(Object.keys(knight_pool).length * Math.random());
    var key = Object.keys(knight_pool)[id];
    delete knight_pool[key];
    alerted[key] = true;
    sockets[key].emit('alarm');
    console.log('alarming ' + key);
  }
}

function panic() {
  var pool = Object.keys(knight_pool);
  for (var i = 0; i < pool.length; i++) {
    var key = pool[i];
    alerted[key] = true;
    sockets[key].emit('test_alarm');
  }
  knight_pool = {};
}

button_client.on('message', function(msg) {
  msg = JSON.parse(msg);
  var time_left = msg.payload.seconds_left;
  console.log('')
  console.log(time_left);

  var s = '' + Object.keys(knight_pool).length + ': ';
  for (var i = 0; i < Object.keys(knight_pool).length; i++) {
    s += Object.keys(knight_pool)[i] + ' ';
  }
  console.log(s);

  server.emit('update', 'pool ' + Object.keys(knight_pool).length);

  // kicking idlers
  var time = now();
  var to_kick = [];
  for (var key in knight_pool) {
    var age = time - knight_pool[key];
    if (age > 10) {
      to_kick.push(key);
      console.log(key + ' should be kicked');
    }
    console.log(key + ' ' + age);
  };
  for (var i = 0; i < to_kick.length; i++) {
    delete knight_pool[to_kick[i]];
  };
  if (Object.keys(alerted).length > 0) {
    console.log('alerted ' + Object.keys(alerted));
  };

  // tiers
  // if (time_left < 52) {
  //   panic();
  // };
  if (time_left >= 30) {
    defcon = 5;
    alerted = {};
  };
  if (time_left >= 20 && time_left < 30) {
    if (defcon == 4) {
      alarm_knights(1);
    };
    defcon = 3;
  };
  if (time_left >= 10 && time_left < 20) {
    if (defcon == 3) {
      alarm_knights(3);
    };
    defcon = 2;
  };
  if (time_left < 10) {
    if (defcon == 2) {
      server.emit('alarm');
    };
    defcon = 1;
  };

  // if (Math.random() < 0.1) {
  //   console.log('ALARM');
  //   server.emit('alarm');
  // };
});