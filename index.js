const express = require('express');
const cors = require('cors');
const app = express();
const jwt = require('jsonwebtoken');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;



app.use(cors());
app.use(express.json());

// forumCommunity
// gv0QqCxPlHNmFRpE




const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_KEY}@cluster0.lyzjy.mongodb.net/?retryWrites=true&w=majority`;

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
    // Connect the client to the server	(optional starting in v4.7)
    const usersCollection = client.db('CommunityDB').collection('users');
    const postsCollection = client.db('CommunityDB').collection('posts');
    const commentsCollection = client.db('CommunityDB').collection('comments');
    


    // jwt
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '1h' });
      res.send({ token });
    })

    // middleware
    const verifyToken = (req, res, next) => {
      console.log('inside verifyToken', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorize access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorize access' });
        }
        req.decoded = decoded;
        next();
      })

    }

    // all posts 
    app.get('/details/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const results = await postsCollection.findOne(query);
      res.send(results);
    })
    app.get('/posts', async (req, res) => {
      const filter = req.query;
      const page = parseInt(req.query.page)
      const size = parseInt(req.query.size)


      const query = {};
      const options = {
        sort: {
          votes: filter.sort === 'asc' ? 1 : -1
        }
      }
      const results = await postsCollection.find(query, options).skip(page * size).limit(size).toArray();
      res.send(results);
    })

    app.post('/posts', async (req, res) => {
      const item = req.body;
      const result = await postsCollection.insertOne(item);
      res.send(result);
    })
    app.get('/postsCount', async (req, res) => {
      const count = await postsCollection.estimatedDocumentCount();
      res.send({ count });
    })
    app.get('/comments', async(req, res) => {
      const result = await commentsCollection.estimatedDocumentCount()
      res.send({result});
    })

    app.post('/comments', async (req, res) =>{
      const item = req.body;
      const result = await commentsCollection.insertOne(item);
      res.send(result);
    })
    

   



    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Forum Community')
})

app.listen(port, () => {
  console.log(`Forum community listening on port ${port}`)
})