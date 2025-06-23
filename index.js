const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const jwt = require('jsonwebtoken')
require('dotenv').config()
const app = express();
const port = process.env.port || 4000;

// use middleware
app.use(cors({
  origin:['http://localhost:5173'],
  credentials:true
}))
app.use(cookieParser())
app.use(express.json())

// const uri = "mongodb+srv://<db_username>:<db_password>@cluster0.hojma.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hojma.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
async function run() {
  try {
    // volunteerCollection
    const volunteerCollections = client.db("GlobalGivers").collection
    ('volunteers');
    // requestCollection
    const requestCollection = client.db("GlobalGivers").collection("requests");
    // auth related api
    app.post('/jwt', async(req,res) =>{
      const user = req.body
      const token = jwt.sign(user,process.env.JWT_SECRET_TOKEN,{expiresIn:"1h"})
      res.cookie('token',token,{
        httpOnly:true,
        secure:false,
      })
      .send({success:true})
    })
    // home page get limited data 
    app.get('/volunteer-needs', async(req,res) =>{
      const result = await volunteerCollections.find()
      .sort({deadline:1})
      .limit(6)
      .toArray();
      res.send(result)
    })
    // all volunteer get operation
    app.get('/all-volunteers',async(req,res) =>{
      const title = req.query.postTitle;
      if(title){
        const query = {postTitle: title}
       const result = await volunteerCollections.find(query).toArray()
       return res.send(result)
      }
      const result = await volunteerCollections.find().toArray()
      res.send(result)
    })
    // get volunteer single data by id
    app.get("/volunteers/:id", async(req,res)=>{
      const id = req.params.id;
      const query = {_id :new ObjectId(id)}
      const result = await volunteerCollections.findOne(query)
      res.send(result)
    })

    // volunteer posts save in the DB 
    app.post("/volunteer-posts",async(req,res) =>{
      const addData = req.body;
      const result = await volunteerCollections.insertOne(addData)
      res.send(result);
    })
    //  volunteer requests save in the DB
    app.post('/volunteer-requests', async(req,res)=>{
      const requestData = req.body;
      const query = {requestId:req.body.
requestId}
// check user already request or not
const userAlreadyExist = await requestCollection.findOne(query);
if(userAlreadyExist){
  return res
  .status(400)
  .send("you have already a request in this post")
}
// save the requests in another DB collection
      const result = await requestCollection.insertOne(requestData);
      const filter = {_id: new ObjectId(requestData.requestId)}
      const updatedDoc={
        $inc:{volunteersNeeded:-1}
      }
      const updateVolunteersNeeded = await volunteerCollections.updateOne(filter,updatedDoc)
        res.send(result)
    })
    // find volunteer my posts data from DB using query email
    app.get("/volunteer-need-posts", async(req,res) =>{
      const email = req.query.organizerEmail;
     console.log("jwt token:",req.cookies)
      if(!email){
        return res.status(403).send({message :"organizer email required"})
      }
      const query = {organizerEmail : email}
      const result = await volunteerCollections.find(query).toArray()
      if(result.length === 0){
        return res.status(404).send({success : false , message:'no posts found for this email'})
      }
      res.send(result)
    })
    // find be a volunteer request from DB using query email
    app.get("/my-request-volunteer", async(req,res) =>{
      const email = req.query.volunteerEmail;
      if(!email){
        return res.status(404).send({message :"volunteer email required"})
      }
      const query = {volunteerEmail : email}
      const result = await requestCollection.find(query).toArray()
      if(result.length === 0){
        return res.status(404).send({success:false, message:"no volunteer request posts available"})
      }
      res.send(result)
    })
     // get volunteer single data by id
    app.get("/volunteer-update/:id", async(req,res)=>{
      const id = req.params.id;
      const query = {_id :new ObjectId(id)}
      const result = await volunteerCollections.findOne(query)
      res.send(result)
    })
    // update a single data by id 
    app.put("/volunteer-update/:id", async(req,res) =>{
      const id = req.params.id
      const updatedPost = req.body;
      const filter = {_id : new ObjectId(id)}
      const updatedDoc ={
        $set:{
          organizerName:updatedPost.organizerName,
          organizerEmail:updatedPost.organizerEmail,
          thumbnail:updatedPost.thumbnail,
          postTitle:updatedPost.postTitle,
          location:updatedPost.location,
          category:updatedPost.category,
          deadline:updatedPost.deadline,
          volunteersNeeded:updatedPost.volunteersNeeded,
          description:updatedPost.description
        }
      }
      const result = await volunteerCollections.updateOne(filter,updatedDoc)
      res.send(result)
    })
    // delete a single document by id from requestCollections
    app.delete('/my-volunteer-request/:id', async(req,res) =>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await requestCollection.deleteOne(query)
      res.send(result)
    })
    // delete a single document by id from volunteerCollections
    app.delete("/volunteer-posts/:id", async(req,res) =>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await volunteerCollections.deleteOne(query)
      res.send(result)
    })
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get("/",(req,res) =>{
    res.send("hello globalGivers volunteer hunter server")
})
app.listen(port, () =>{
    console.log("server running port is:",port)
})