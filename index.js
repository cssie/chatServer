const mongoose = require('mongoose');
const Koa = require('koa');
const app = new Koa();
const route = require('koa-route');

const server = require('http').createServer(app.callback());
const io = require('socket.io')(server);


io.on('connection', function(socket){
  console.log('ddddd')
  socket.emit('request', {},function (res) {
    console.log(res,'我服务端出发了事件啦')
  }); // emit an event to the socket
  socket.on('reply', function(res){
    console.log(res,'好的好的我知道客户端收到信息啦')
  }); // listen to the event
  socket.on('error',function (err) {
      console.log(err)
    }
  )
});


//连接数据库
mongoose.connect('mongodb://erbai:huangNan19940101@120.79.138.96:27017/nodeTest?authSource=admin');
// 连接成功
mongoose.connection.once('open', () => {
  console.log('Mongoose connection open');
});

// 连接失败
mongoose.connection.on('error', (err) => {
  console.log('Mongoose connection error: ' + err);
});

// 断开连接
mongoose.connection.on('disconnected', () => {
  console.log('Mongoose connection disconnected');
});

// request && response
const about = ctx => {
  ctx.response.type = 'json';
  ctx.response.body = {data:'ddd'};
};

const main = ctx => {
  ctx.response.body = 'Hello World';
};

app.use(route.get('/', main));
app.use(route.get('/about', about));


server.listen(4038);
server.on('error',function (err) {
  console.log('serverError',err)
})
server.on('listening',function (listen) {
  console.log('listening',listen)
})

// app.listen(3000);