const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt=require('bcrypt');
const jwt = require('jsonwebtoken');
const app = express();

// ✅ Enable CORS for frontend at port 5173
app.use(
  cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
  })
);

// ✅ Parse JSON body
app.use(express.json());

// ✅ Database connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'pass',
  database: 'task_assigner',
});

db.connect((err) => {
  if (err) {
    console.error('❌ Error connecting to database:', err);
  } else {
    console.log('✅ Database connected successfully');
  }
});

// ✅ Signup endpoint
app.post('/signup', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  const hashed = await bcrypt.hash(password,10)
  const query = 'INSERT INTO users (email, password) VALUES (?, ?)';
  db.query(query, [email, hashed], (err, result) => {
    if (err) {
      console.error('❌ Error inserting user:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    console.log('✅ User registered:', result.insertId);
    res.status(200).json({ message: 'User registered successfully!' });
  });
});
app.post("/login",(req,res)=>{
  const {email,password}=req.body;
  if(!email || !password){
    return res.json({message:"email and password required"})
  }
  db.query("select * from users where email = ?",[email],async(err,results)=>{
    if(err){
      console.log("err: ",err)
      return res.json({message:"some err in db"})
    }
    if(results.length===0){
      console.log("user not found")
      return res.json({message:"email not found"})
    }
    const user=results[0];
    const pass=await bcrypt.compare(password,user.password)
    if(pass){
      const token= jwt.sign({id:user.id,email:"user.email"},"secretkey",{
        expiresIn:"1h"
      })
      return res.status(200).json({message:"login sucess",token:token})
    }
    else{
      return res.json({message:"invalid pass"})
    }
  })
})

app.get('/', (req, res) => {
  res.send('Server running successfully!');
});

app.listen(5000, () => console.log('Server running on port 5000'));
