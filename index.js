const express = require('express');
const cors = require('cors');
const app = express();
const jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;



app.use(cors());
app.use(express.json());






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
    const paymentCollection = client.db('CommunityDB').collection('payments')
    const announcementCollection = client.db('CommunityDB').collection('announcements')
    const feedbackCollection = client.db('CommunityDB').collection('feedbacks');
    


    // jwt
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '1h' });
      res.send({ token });
    })

    // middleware
    const verifyToken = (req, res, next) => {
      // console.log('inside verifyToken', req.headers);
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


    const veryfyAdmin = async(req, res, next) =>{
      const email = req.decoded.email;
      const query = {email: email}
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if(!isAdmin){
       return res.status(403).send({message: 'forbidden access'});
      }
      next();
   }
   
   // admin user
   app.get('/users',verifyToken,veryfyAdmin, async(req, res) => {
     const result = await usersCollection.find().toArray();
     res.send(result);
   })

   app.get('/usersData', async(req, res) => {
    const result = await usersCollection.find().toArray();
    res.send(result);
  })
   
   app.get('/users/admin/:email',verifyToken, async(req, res) => {
     const email = req.params.email;
     if(email !== req.decoded.email) {
       return res.status(403).send({message: 'forbidden access'})
     }
     const query = {email: email};
     const user = await usersCollection.findOne(query);
     let admin = false;
     if(user){
       admin = user?.role === 'admin';
     }
     res.send({admin})
   
   })
   app.post('/users', async (req, res) => {
     const user = req.body;
     const query = {email: user.email}
     const existingUser = await usersCollection.findOne(query);
     if(existingUser){
       return res.send({success: 'user already exists', insertId: null})
     }
     const result = await usersCollection.insertOne(user);
     res.send(result);
   })

   app.delete('/users/:id',verifyToken,veryfyAdmin, async (req, res) => {
    const id = req.params.id;
    const query = {_id: new ObjectId(id)}
    const result = await usersCollection.deleteOne(query);
    res.send(result);
  })

   app.patch('/users/admin/:id',verifyToken,veryfyAdmin, async(req, res) => {
    const id = req.params.id;
    const filter = {_id: new ObjectId(id)};
    const updatedDoc = {
      $set: {
        role: 'admin',
      }
    }
    const result = await usersCollection.updateOne(filter, updatedDoc);
    res.send(result);
  })

   app.delete('/posts/:id', async (req, res) => {
    const id = req.params.id;
    const query = {_id: new ObjectId(id)}
    const result = await postsCollection.deleteOne(query);
    res.send(result);
  })

    // all posts 
    app.get('/details/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const results = await postsCollection.findOne(query);
      res.send(results);
    })

    // app.get('/postsearch', async (req, res) => {
    //    const filter = req.query;
    //    console.log(filter)
    //    const query = {
    //     tagName : filter.search, 
    //    }
    //    const results = await postsCollection.find(query).toArray();
    //    console.log(results)
    //   res.send(results);
    // })

    app.get('/posts', async (req, res) => {
      const filter = req.query;
      const page = parseInt(req.query.page)
      const size = parseInt(req.query.size)

     console.log(filter)
      const query = {
        tagName : { $regex :filter.search || '',  $options: 'i'}
      };
      const options = {
        sort: {
          votes: filter.sort === 'asc' ? -1 : 1
        }
      }
      const results = await postsCollection.find(query, options).skip(page * size).limit(size).toArray();
      res.send(results);
    })

  

    app.post('/posts',verifyToken, async (req, res) => {
      const item = req.body;
      const result = await postsCollection.insertOne(item);
      res.send(result);
    })

    // app.get('/postsCount', async (req, res) => {
    //   const result = await postsCollection.estimatedDocumentCount();
    //   res.send({result});
    // })
    app.patch('/posts', async (req, res) => {
      const data = req.body;
      const id = data.userId;
      const latestVote = data.latestVote;
      const query = {_id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          votes : latestVote,
    
        }
      }
      const results = await postsCollection.updateOne(query, updateDoc);
      res.send(results)
     
    })

    app.patch('/posts', async (req, res) => {
      const data = req.body;
      const id = data.usersId;
      const latestComment = data.latestComment;
      const query = {_id: new ObjectId(id) }
      console.log(id, latestComment)
      const updateDoc = {
        $inc: {
          comments: 1  // Increment the 'comments' field by 1
        }
      }
      const results = await postsCollection.updateOne(query, updateDoc);
      res.send(results)
     
    })
   
    app.get('/postsCount', async (req, res) => {
      const count = await postsCollection.estimatedDocumentCount();
      res.send({ count });
    })

    // app.get('/comments/count/:title', async(req, res) => {
    //   const title = req.params.title;
    //   const query = { title: title}
    //   const result = await commentsCollection.find(query).toArray();
    //   res.send({result});
    // })
    
    app.get('/comments/:id', async (req, res) => {
      const id = req.params.id;
      const query = { userId :id }
      const result = await commentsCollection.find(query).toArray();
      res.send(result);
    })

    app.get('/commentDetails/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await commentsCollection.findOne(query);
      res.send(result);
    })

    // app.get('/comments', async (req, res) => {
    //   const result = await commentsCollection.find().toArray();
    //   res.send(result);
    // })


    app.post('/comments', async (req, res) =>{
      const item = req.body;

      const result = await commentsCollection.insertOne(item);
      const updateDoc = {
        $inc: {
          comments: 1  // Increment the 'comments' field by 1
        }
      }
      const query = {_id : new ObjectId(item.userId)}
      const updateResult = await postsCollection.updateOne(query, updateDoc)
      console.log(updateResult ,item)
      res.send(result);
    })

  
    
    app.get('/feedback', async (req, res) =>{
      const result = await feedbackCollection.find().toArray();
      res.send(result);
    })

    app.post('/feedback', async (req, res) =>{
      const item = req.body;
      const result = await feedbackCollection.insertOne(item);
      res.send(result);
    })

    app.get('/adminPosts', async(req, res) =>{
      const result = await announcementCollection.find().toArray();
    res.send(result);
    })

    app.post('/adminPosts', async(req, res) =>{
      const item = req.body;
      const result = await announcementCollection.insertOne(item);
      res.send(result);
    })

    // payment intent

app.post('/create-payment-intent', async (req, res) => {
  const {price} = req.body;
  const amount = parseInt(price * 100);
  // console.log(amount, 'amount inside price')
  const paymentIntent = await stripe.paymentIntents.create({
   amount: amount,
   currency: 'usd',
   payment_method_types: ['card'],
 
  })
  res.send({
   clientSecret: paymentIntent.client_secret
  })
 })
 
 app.get('/payments/:email', verifyToken, async (req, res) => {
   const query = {email: req.params.email}
   if(req.params.email !== req.decoded.email) {
     return res.status(403).send({message: 'forbidden access'})
   }
 
   const result = await paymentCollection.find(query).toArray();
   res.send(result);
 })
 
 app.post('/payments', async (req, res) =>{
   const payment = req.body;
   const paymentResult = await paymentCollection.insertOne(payment)
 
  //  console.log('payment info', payment)
   res.send({paymentResult})
 })
 

 app.get('/admin-stats', async (req, res) =>{
  const users = await usersCollection.estimatedDocumentCount();
  const allposts = await postsCollection.estimatedDocumentCount();
  const comments = await commentsCollection.estimatedDocumentCount();

  res.send({users, allposts, comments})

})
 

   



    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
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