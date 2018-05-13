const mongoose = require('mongoose')
const koa = require('koa')
const app = new koa();
var server = require('http').createServer(app.callback());
var io = require('socket.io')(server);
const cors = require('koa2-cors');
app.use(cors())
//socket
io.on('connection',function (socket) {
    console.log('我连上啦啦啦啦');
    socket.on('requestMessage',function (data) {
        console.log(data)
        socket.emit('sendMessage',{fromID:data.fromID,toID:data.toID,message:data.message});
    })
})
server.listen(3000);
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