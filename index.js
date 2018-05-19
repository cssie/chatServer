const mongoose = require('mongoose')
const koa = require('koa')
const app = new koa();
var server = require('http').createServer(app.callback());
var io = require('socket.io')(server);
const cors = require('koa2-cors');
const router = require('koa-router')();
const koaBody = require('koa-body')();
const session = require('koa-session');
const formidable = require("formidable");
const ip = "192.168.43.171";
app.keys = ['some secret hurr'];
const CONFIG = {
    key: 'koa:sess', /** (string) cookie key (default is koa:sess) */
    /** (number || 'session') maxAge in ms (default is 1 days) */
    /** 'session' will result in a cookie that expires when session/browser is closed */
    /** Warning: If a session cookie is stolen, this cookie will never expire */
    maxAge: 6000,
    overwrite: true, /** (boolean) can overwrite or not (default true) */
    httpOnly: true, /** (boolean) httpOnly or not (default true) */
    signed: true, /** (boolean) signed or not (default true) */
    rolling: false, /** (boolean) Force a session identifier cookie to be set on every response. The expiration is reset to the original maxAge, resetting the expiration countdown. default is false **/
};
app.use(session(CONFIG, app));
// app.use(ctx => {
//     // ignore favicon
//     if (ctx.path === '/favicon.ico') return;
//
// let n = ctx.session.views || 0;
// ctx.session.views = ++n;
// ctx.body = n + ' views';
// });
app.use(cors())
app.use(router.routes()).use(router.allowedMethods());
//socket
io.on('connection',function (socket) {
    console.log('我连上啦啦啦啦');
    socket.on('requestMessage',function (data) {
        console.log(data)
        socket.broadcast.emit('sendMessage',{fromID:data.fromID,toID:data.toID,message:data.message});
        socket.emit('sendMessage',{fromID:data.fromID,toID:data.toID,message:data.message});
    })
})
io.on('error',function (err) {
    console.log(err)
})
server.listen(3000);
//连接数据库
// mongoose.connect('mongodb://erbai:huangNan19940101@120.79.138.96:27017/nodeTest?authSource=admin');
mongoose.connect('mongodb://'+ ip + ':27017/chat');
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

//api
// router.post('/file',koaBody,function(ctx,next){
//     let id =ctx.request.body
//     ctx.body = "you post data:"+JSON.stringify({id:id});
//     console.log(ctx.request.body)
//     console.log('收到了')
// });
router.post('/file',function(ctx,next){
    var form = new formidable.IncomingForm();
    form.parse(ctx.req,async function(err,fields,files){
        if(err){throw err; return;}
        console.log(fields);//{ name: base64字符串 }
    });
    ctx.body = "end"
});
//login表
var schema = new mongoose.Schema({name:String, password: String});
var temp = mongoose.model('login', schema);
schema.virtual('userId').get(function(){
    return this._id;
});

//user表
var userSchema = new mongoose.Schema({id:Number,owner: String, friends: Array, chats: Array});
var userModel = mongoose.model('user', userSchema);
userSchema.virtual('userId').get(function(){
    return this._id;
});

//检测是否是登录状态？？
router.get('/isLogin',function (ctx) {
    let n = ctx.session.views || 0;
    ctx.session.views = ++n;
    console.log(n)
    if(n===1){
        console.log('第一次进来')
        ctx.body = false;
    }else{
        ctx.body = true;
    }
})

//检测登录密码正确与否,格式：{name:"",password:""}
router.post('/login',koaBody,async (ctx,err) => {
    const data = ctx.request.body;
    let result = {status:false,message:'该用户不存在，请先注册'};
    await temp.find(function(err,docs){
        for(let i = 0;i<docs.length;i++){
            if(docs[i].name == data.name){
                if(docs[i].password == data.password){
                    result.status = true;
                }
                result.message=''
            }
        }
    })
    ctx.body = JSON.stringify(result);
})

//注册新账号,格式：{name:"",password:""}
router.post('/regist',koaBody,async (ctx,err) => {
    const data = ctx.request.body;
    let res = {message:"",status: true};
    await temp.find(function(err,docs){
    for(let i = 0;i<docs.length;i++){
        if(docs[i].name == data.name){
            res.message = "此账号已经注册过了";
            res.status = false
        }}
    })
    let idlength = 0;
    await userModel.find(function (err,docs) {
        idlength = docs.length + 1;
    })
    const tempdoc = ({name: data.name,password:data.password});
    const userdoc = ({id: idlength,owner: data.name, friends: [{id:'000',name:'小助手'}], chats: [{
            "fromid" : "000",
            "toid" : idlength,
            "text" : "欢迎来到聊天系统，我是你的助手，你可以尝试跟我聊天哦",
            "timeStamp" : ""+ new Date().getTime(),
            "messageSucceed" : true
        }]})
    if(res.message === ""){
        await temp.create(tempdoc,function (err,doc) {
            if(err) console.log(err);
            console.log('保存成功');
        })
        await userModel.create(userdoc,function (err) {
            if(err) console.log(err,'注册不成功')
            console.log('注册成功');
            res.status = true
        })
    }
    ctx.body = JSON.stringify(res);
})


//查询用户所有信息 格式：{owner:""}
router.post('/all',koaBody,async (ctx) => {
    let data = ctx.request.body;
    let res = {};
    await userModel.find({owner:data.owner},function (err,docs) {
        if(docs.length > 0){
            res = docs[0];
        }
    })
    ctx.body = JSON.stringify(res);
})

//发送信息 格式：{fromid:"",toid:"",text:""}
router.post('/sendMessage',koaBody,async (ctx)=>{
    let data = ctx.request.body;
    let res = {status:true};
    let newChat = [];
    let toChat = [];
    await userModel.find({id:data.fromid},function(err,docs){
        if(docs.length>0){
            newChat = docs[0].chats;
            newChat.push({
                "fromid" : data.fromid,
                "toid" : data.toid,
                "text" : data.text,
                "timeStamp" : ""+ new Date().getTime(),
                "messageSucceed" : true
            })
        }
    })
    await userModel.find({id:data.toid},function(err,docs){
        if(docs.length>0){
            toChat = docs[0].chats;
            toChat.push({
                "fromid" : data.fromid,
                "toid" : data.toid,
                "text" : data.text,
                "timeStamp" : ""+ new Date().getTime(),
                "messageSucceed" : true
            })
        }
    })
    await userModel.update({id:data.fromid},{chats:newChat},function (err) {
        if(err) console.log(err,'发送信息不成功')
        console.log('发送信息成功');
        res.status = true
    })

    await userModel.update({id:data.toid},{chats:toChat},function (err) {
        if(err) console.log(err,'发送信息不成功')
        console.log('发送信息成功');
        res.status = true
    })
    ctx.body = JSON.stringify(res)
})