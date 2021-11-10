const express = require('express')
const app = express()
require('dotenv').config()
const cors = require('cors')
const { MongoClient } = require('mongodb');
const port = process.env.PORT || 5000;


app.use(cors())
app.use(express.json())


var admin = require("firebase-admin");

var serviceAccount =JSON.parse(process.env.FIREBASE_TOKEN);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.aghhg.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1]
        console.log('token', token)
        try {
            const decodedUser = await admin.auth().verifyIdToken(token)
            console.log('decoded user', decodedUser)
            req.decodedEmail = decodedUser.email
        }
        catch {

        }
    }
    next();
}

async function run() {
    try {
        await client.connect()
        const database = client.db('doctorPortals')
        const appointmentCollection = database.collection('appointments')
        const usersCollection = database.collection('users')


        app.get('/appointments', async (req, res) => {
            const email = req.query.email;
            const date = req.query.date;
            const query = { email: email, date: date }
            console.log(date)
            const cursor = appointmentCollection.find(query)
            const result = await cursor.toArray()
            res.json(result)
        })

        app.post('/appointments', async (req, res) => {
            const appointment = req.body;
            const result = await appointmentCollection.insertOne(appointment)
            res.json(result)
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user)
            res.json(result)
        })

        app.put('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const options = { upsert: true }
            const updateDoc = { $set: user }
            const result = await usersCollection.updateOne(query, updateDoc, options)
            res.json(result)
        })

        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body;
            const requester = req.decodedEmail;
            if (requester) {
                const requseterAccount = await usersCollection.findOne({ email: requester })
                if (requseterAccount.role === 'Admin') {
                    const filter = { email: user.email }
                    const updateDoc = { $set: { role: 'Admin' } }
                    const result = await usersCollection.updateOne(filter, updateDoc)
                    res.json(result)
                }
                else {
                    res.status(403).json({ message: 'you are forbidden to visit this link.Only Admin can access.' })
                }
            }

        })


        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email: email }
            const result = await usersCollection.findOne(filter)
            let isAdmin = false;
            if (result?.role === 'Admin') {
                isAdmin = true;
            }
            res.json({ Admin: isAdmin })
        })

    }
    finally {
        // await client.close()
    }
}
run().catch(console.dir)

app.get('/', (req, res) => {
    res.send('Hello everyone')
})

app.listen(port, () => {
    console.log('This server running at the port', port)
})

