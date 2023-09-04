const express = require('express');
const cookieParser = require('cookie-parser');
const app = express();
const httpServer = require('http').createServer(app);
const io = require('socket.io')(httpServer, {
  cors: {
    origin: "https://red-surf-7071.fly.dev",
    methods: ["GET", "POST"],
    transports: ['websocket'],
    credentials: true
  },
  allowEIO3: true
});
const socketEventHandlers = require('./socketEventHandler.js')

const { v4: uuidv4 } = require('uuid');
const port = process.env.PORT || 3000;
const { MongoClient, MaxKey } = require('mongodb');
const uri = "mongodb+srv://thomaskilduff:leonard@cluster0.wns9h.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri);
var collection = client.db('Muddle').collection('Locations');

socketEventHandlers(io, collection, uuidv4);
app.use(cookieParser());


async function connectToDatabase() {
    try {
        await client.connect();
        collection = client.db('Muddle').collection('Locations');
        console.log('Connected to the database');
    } catch (error) {
        console.error('Error connecting to the database:', error);
    }
}

app.get('/', (req, res) => {
  if (!req.cookies.userData) {
    res.cookie("userData", uuidv4());
  } 
  res.sendFile(__dirname + '/public/index.html');
});

// Handle client connections, when client connect find all confessions in DB and post to client, to create markers
io.on('connection', async (socket) => { 
  /*
    const LONG_DIFF = 0.008442649
    const LAT_DIFF = 0.00432114886
    const BASE_LAT = 53.36416607458011
    const BASE_LONG = -6.2923026417947545

    socket.on('createFakePost', (count) => {
      let lat_row = BASE_LAT
      let long_row = BASE_LONG
      let uuid = uuidv4();

      for(let i = 0; i < count; i++){
        const data = {
          time: i,
          lat: lat_row,
          long: long_row,
          confession: uuid,
          Up: [],
          Down: []
        };
        if(i % 5 == 0){
          long_row -= LONG_DIFF
          lat_row = BASE_LAT
        }
        lat_row += LAT_DIFF
        insertPostIntoLocationsCollection({messageVar: data, keyVar: uuid});
      };

      
    })*/

});


//these (2 app.use lines) have to be here for some reason, or else the http route will not assign cookies
app.use(express.static('public'))   //display html file in public file
app.use('/node_modules', express.static('node_modules'));

// Start the server
httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on port 3000`);
    connectToDatabase();    // Call the connectToDatabase function to establish the connection
  });

