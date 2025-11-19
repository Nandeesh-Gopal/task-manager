const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt=require('bcrypt');
const jwt = require('jsonwebtoken');
const app = express();
require('dotenv').config()
app.use(cors({
  origin: 'http://3.82.35.224:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.get('/test', (req, res) => {
  res.json({ message: 'backend working!' });
});
const db = mysql.createConnection({
  host:"mydb.c8r8c4u2k0dm.us-east-1.rds.amazonaws.com",
  user:"admin",
  password:process.env.password,
  database:"mydb"
});

db.connect((err) => {
  if (err) {
    console.error('❌ Error connecting to database:', err);

  } else {
    console.log('✅ Database connected successfully');
  }
});
function verifyToken(req,res,next){
  const authHeader=req.headers.authorization;
  if(!authHeader)
    return res.json({message:"no token provided"})
  const token= authHeader.split(" ")[1]
  jwt.verify(token,"secretkey",(err,decoded)=>{
    if(err)return res.json({message:"Invalid token"})
    req.user=decoded;
   next();
  })
}
app.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }
  try {
    const hashed = await bcrypt.hash(password, 10);
    const role = "leader";
    
    const query = 'INSERT INTO users (email, password, role) VALUES (?, ?, ?)';
    db.query(query, [email, hashed, role], (err, result) => {
     

      if (err) {
        console.error('Error inserting user:', err);
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ message: 'Email already exists' });
        }
        
        return res.status(500).json({ message: 'Database error' });
      }

      console.log('✅ User registered:', result.insertId);
      res.status(201).json({ message: 'User registered successfully!' });
    });
  } catch (error) {
    console.error('Hashing error:', error);
    res.status(500).json({ message: 'Server error' });
  }
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
      const token= jwt.sign({id:user.id,email:user.email,role:user.role},"secretkey",{
        expiresIn:"1h"
      })
      return res.status(200).json({message:"login sucess",token:token})
    }
    else{
      return res.json({message:"invalid pass"})
    }
  })
})
app.post("/create-member",verifyToken,async (req,res)=>{
  const {email,password}=req.body;
  const leader_id=req.user.id;
  if(req.user.role!=="leader"){
    return res.json({message:"leader only able to create member"})
  }
  const hashed= await bcrypt.hash(password,10)
  const role= "member";

  const query="insert into users (email,password,role,leader_id) values(?,?,?,?)"
  db.query(query,[email,hashed,role,leader_id],(err)=>{
    if(err){
      return res.json({message:"some err in creating a new member"})
    }
    return res.json({message:"Team member added successfully"})
  })
})
app.get("/get-members",verifyToken,(req,res)=>{
  if(req.user.role!=="leader"){
    return res.json({message:"leader only able to get viewers"})
  }
  const query="select id , email from users where leader_id=?";
  db.query(query,[req.user.id],(err,results)=>{
    if(err){
      return res.json({message:"db error"})
    }
    res.json(results)
  })
})
app.post("/assign-task",verifyToken,(req,res)=>{
  const {title,description, member_id}=req.body;
  const leader_id=req.user.id;
  if(req.user.role !== "leader"){
    return res.json({message:"only team leaders can assign work"})
  }
  const query="insert into tasks (title,description,assigned_to,assigned_by,status) values(?,?,?,?,'pending')"
  db.query(query,[title,description,member_id,leader_id],(err)=>{
    if(err){
      console.log(err)
      return res.json({message:"some err in assigning task to member"})
    }
    return res.json({message:"task assigned successfully"})
  })
})
app.get("/get-task",verifyToken,(req,res)=>{
  const user_id=req.user.id;
  if(user_id===null){
    return res.json({message:"userid is empty"});
  }
  if(req.user.role !== "member")
    return res.json({message:"only members can view tasks"});
  const query ="select * from tasks where assigned_to =?";
  db.query(query,[user_id],(err,results)=>{
    if(err){
      return res.json({message:"Db err"});
    }
    res.json(results)
  })
  
})
app.put("/update/:id",verifyToken,(req,res)=>{
  const {status}=req.body;
  const taskId=req.params.id;
  if(req.user.role!=="member")
    return res.json({message:"Only members can update the task status"})
  const query="update tasks set status =? where id=? and assigned_to =?"
  db.query(query,[status,taskId,req.user.id],(err)=>{
    if(err){
      console.log(err)
      return res.json({message:"err in updating task"});
    }
    res.json({message:"task updated successfully"})
  })
})
app.get("/hello",(req,res)=>{
  res.send("Welcome to Task Assigner API")
});
app.listen(5000, () => console.log('Server running on port 5000'));
