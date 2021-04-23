var app = require('express')()
var server = require('http').Server(app)
var io = require('socket.io')(server)
const io_rooms = io.of('/rooms')
const nunjucks = require('nunjucks')
const bodyParser = require('body-parser')
const ytdl = require('ytdl-core');

nunjucks.configure('views', {
  autoescape: true,
  express: app
})

users = {}

function checkUrl(text) {
  let parts = text.split('v=')
  let id = parts[parts.length - 1]
  return id
}

app.use(bodyParser.json())

function getState(data, postcode){

  for(var x in data){
    if(data[x].postcode && data[x].postcode.split(",").indexOf(postcode.toString())!=-1) return data[x].state;
  }
  
  return "Not Found";
  
}

function makeId(length) {
  var result = [];
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++) {
    result.push(characters.charAt(Math.floor(Math.random() * charactersLength)));
  }
  return result.join('');
}

io_rooms.on('connection', function(socket) {


  socket.on('change', function(data) {
    io_rooms.to(data.message.room).emit('update', {
      message: {
        type: 'setId',
        video: {
          url: checkUrl(data.message.url)
        }
      }
    })
  })


  socket.on('disconnect', async function(data) {
    let socketId = socket.id
    socket.disconnect(0);
    users[socketId]['valid'] = 'no'
    io_rooms.to(users[socketId].room).emit('join', {
      message: {
        type: 'join',
        users: users
      }
    })
  });

  socket.on('auth', function(data) {
    socket.join(data.message.room)
    users[socket.id] = {
      "name": data.message.name,
      "id": socket.id,
      "room": data.message.room,
      "valid": "yes"
    }
    io_rooms.to(data.message.room).emit('join', {
      message: {
        type: 'join',
        users: users
      }
    })
  })
})

app.get('/', function(req, res) {
  res.render('index.html')
})

app.get('/room/:room', function(req, res) {
  res.render('room.html', {'roomId': req.params.room})
})

app.get('/create-room', function(req, res) {
  let id = makeId(8)
  res.redirect(`/room/${id}`)
})

function getResult(id) {
    const result = ytdl.getInfo(id)
    console.log(result)
    return result
}

function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

app.get('/api/video/:id', (req, res) => {
    console.log(req.params.id)
    getResult(req.params.id)
    .then(value => {
        console.log(value.videoDetails)
        res.send({
            url: value.formats[0].url,
            title: value.videoDetails.title,
            views: numberWithCommas(value.videoDetails.viewCount),
            author: value.videoDetails.author.name,
            uploaded: value.videoDetails.uploadDate,
            description: value.videoDetails.description,
            likes: numberWithCommas(value.videoDetails.likes),
            dislikes: numberWithCommas(value.videoDetails.dislikes)
        })
    })
});

server.listen(8080)