const express = require('express');
const cookieParser = require('cookie-parser');
const app = express();
const httpServer = require('http').createServer(app);
const FLYIO = 'https://red-surf-7071.fly.dev/';
const LOCALIO = 'http://localhost:3000/'


const io = require('socket.io')(httpServer, {
  cors: {
    origin: LOCALIO,//'http://localhost:3000/',
    methods: ["GET", "POST"],
    transports: ['websocket'],
    credentials: true
  },
  allowEIO3: true
});
const socketEventHandlers = require('./socketEventHandler.js')
const { v4: uuidv4 } = require('uuid');
const port = process.env.PORT || 3000;             //REMOVE /* */ FROM HERE TO BE ON FLY.IO
const { MongoClient, MaxKey } = require('mongodb');
const uri = "mongodb+srv://thomaskilduff:leonard@cluster0.wns9h.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri);
var collection = client.db('Muddle').collection('Locations');

//set these values for creating fake posts here, initialise once
const fakePostLatLongValues = {
  LONG_DIFF: 0.000200,
    LAT_DIFF: 0.00054,
    BASE_LAT: 53.5366871,
    BASE_LONG: -7.3576551
}

socketEventHandlers(io, collection, uuidv4, fakePostLatLongValues);
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

//these (2 app.use lines) have to be here for some reason, or else the http route will not assign cookies
app.use(express.static('public'))   //display html file in public file
app.use('/node_modules', express.static('node_modules'));

// Start the server
httpServer.listen(port, '0.0.0.0',() => {    /*ADD THIS BACK IN '0.0.0.0',*/
    console.log(`Server is running on port 3000`);
    connectToDatabase();    // Call the connectToDatabase function to establish the connection
  });

