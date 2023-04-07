const express = require('express');
const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');
const mongoose = require("mongoose");
const Cors = require('cors')


const User = require('./Models/User');
const Chat = require('./Models/Chat');


const myEnv = dotenv.config();
dotenvExpand.expand(myEnv);

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(Cors());


const PORT = 8080;

// DB config
const connectionParams = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  };
  try {
    async function connectDB(){
        await mongoose.connect(
            `mongodb+srv://${process.env.mongoUsername}:${process.env.mongoPassword}@cluster0.7q0morb.mongodb.net/${process.env.mongoDbname}?retryWrites=true&w=majority`,
            connectionParams
          );
          console.log("Database connected succesfully");      
    }
    connectDB()
  } catch (error) {
    console.log(error);
    console.log("Database connection failed");
  }


app.get('/ping',async(req,res)=>{
  res.json({"data":"pong"})
})


app.post('/addUser', async (req, res) => {
    try {
      const { username, email,img="" } = req.body;
      let user = await User.findOne({
        email:email,
    })
    if(!user){
       user =  User({
        username,
        email,
        img,
      });
    }
      const savedUser = await user.save();
      res.json(savedUser);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });
  
  app.post('/message', async (req, res) => {
    try {
      const { sender, receiver, message } = req.body;
      const msg = {sender,receiver,message};
      let chat = await Chat.findOne({
        users: { $all: [sender, receiver] }      
    });
      if (!chat) {
        User.findOne({
            _id: sender   
        }).then((sentUser)=>{
            sentUser.connected.push(receiver);
            sentUser.save();
        });
        User.findOne({
            _id: receiver   
        }).then((receivedUser)=>{
            receivedUser.connected.push(sender);
            receivedUser.save();
        })
            
        chat=Chat({
          users: [sender, receiver],
          messages:[],
          type: 'individual'
        });        
      }
        chat.messages.push(msg);
        await chat.save();
      
      res.json({"id":chat._id});
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  });

  app.get('/users/:id', async (req, res) => {
    try {
      const users = await User.find({ 
        _id: { $ne: req.params.id },
        connected: { $nin: [req.params.id] }
      }).sort({createdAt:-1});
      res.json({users});

    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server Error' });
    }
  });
  
  app.get('/users/:id/connected', async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      const connectedUsers = await User.find({
        _id: { $in: user.connected }
      });
      res.json({connectedUsers});
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server Error' });
    }
  });
  
  app.get('/message',async (req,res)=>{
    try {
      const { sender, receiver } = req.query;
      let chat = await Chat.findOne({
        users: { $all: [sender, receiver] }      
    });
      res.json({"messages":chat? chat.messages : [] })
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server Error' });
    }

  });


app.listen(PORT, (error) =>{
    if(!error)
        console.log("Server is listening on port "+ PORT)
    else 
        console.log("Error occurred, server can't start", error);
    }
);