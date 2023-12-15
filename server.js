const express = require('express'); 
const app = express(); 
const server = require('http').Server(app); 
const fs = require('fs'); 
server.listen(process.env.PORT || 8080);

app.use(express.static('public')); 
app.set('view engine', 'ejs'); 
app.get('/', (req, res) => { 
  res.render('login'); 
})

const { v4: uuidv4 } = require('uuid');
var un, pc;
app.get('/newroom', (req, res) => {
  un = req.query.username;
  pc = req.query.passcode;
  var roomId = uuidv4();
  fs.appendFileSync("public/meeting-log.txt", roomId + ":" + pc + "\n", "utf-8");
  res.redirect(`/${roomId}`);
})

var unJ, inJ, pcJ;
app.get('/joinroom', (req, res) => {
  unJ = req.query.username;
  inJ = req.query.invitation;
  pcJ = req.query.passcode;
  var log = fs.readFileSync("public/meeting-log.txt", "utf-8");
  var findInvitation = log.indexOf(inJ + ":" + pcJ);
  if (findInvitation != -1) {
    res.redirect(`/${inJ}`);
    un = unJ,
      pc = pcJ
  } else {
    var findInvitation = log.indexOf(inJ);
    if (findInvitation == -1) {
      res.send("Invitation non valide. Veuillez <a href=/>réessayer</a>");
    } else {
      var findPassCode = log.indexOf(inJ + ":" + pcJ);
      if (findPassCode == -1) {
        res.send("Mot de passe incorrecte. Veuillez <a href=/>réessayer</a>");
      }
    }
  }
});

app.get('/:room', (req, res) => {
  res.render('index', {
    roomId: req.params.room,
    username: un,
  });
})

const { ExpressPeerServer } = require('peer');
const peerServer = ExpressPeerServer(server, {
  debug: true
});
app.use('/peerjs', peerServer);

const io = require('socket.io')(server);
io.on('connection', socket => {
  socket.on('join-room', (roomId, peerId) => {
    socket.join(roomId);
    socket.to(roomId).emit('user-connected', peerId);

    socket.on('stop-screen-share', (peerId) => {
      io.to(roomId).emit('no-share', peerId);
    })

    socket.on('message', (message, sender, color, time) => {
      io.to(roomId).emit('createMessage', message, sender, color, time);
    })

    socket.on('leave-meeting', (peerId, peerName) => {
      io.to(roomId).emit('user-leave', peerId, peerName);
    })
  })
})

app.post('/upload', (req, res) => {
  const fileName = req.headers['file-name'];
  req.on('data', (chunk) => {
    fs.appendFileSync(__dirname + '/public/upload/' + fileName, chunk);
  })
  res.end('uploaded');
});