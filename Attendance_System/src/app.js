const express = require('express');
const app = express();
const path = require('path');
const cookieParser = require('cookie-parser');

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');

const userModel = require('./models/user.model');
const sessionModel = require('./models/session.model');

const { isLoggedIn, isAdmin } = require('./middlewares/auth.middleware');
const { uploadGroupImage, uploadUserImage } = require('./middlewares/upload.middleware');

app.get('/',(req,res)=>{
    res.render('home');
});

app.post('/submit-user', async (req, res) => {
  try {
    const { name, email, password, batch, age, year, role } = req.body;

    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(409).send('User already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userModel.create({
      name,
      email,
      password: hashedPassword,
      batch,
      age,
      year,
      role: role || 'User'
    });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.status(201).send('Registered successfully');
  } catch (err) {
    console.error(err);
    res.status(500).send('Registration failed');
  }
});
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await userModel.findOne({ email });
    if (!user) return res.status(404).send('User not found');

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).send('Invalid credentials');

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '2h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.redirect('/login/profile');
  } catch (err) {
    console.error(err);
    res.status(500).send('Login failed');
  }
});

//from home page
app.get('/register',(req,res)=>{
    res.render('newuserregister');
});
app.get('/signin',(req,res)=>{
    res.render('login');
});

app.get('/adminlogin',(req,res)=>{

    res.render('adminlogin');
});
// from admin login page
app.post('/adminlogin',async(req,res)=>{
    try{
        const{email,password}=req.body;
        const user=await userModel.findOne({email});
        if(!user || user.role!=='admin'){
            return res.status(400).send('Admin not found');
        }   
        const isMatch=await bcrypt.compare(password,user.password);
        if(!isMatch){
            return res.status(400).send('Invalid credentials');
        }   
        let token=jwt.sign({id:user.id,role:user.role},'secretkeyshhh');
        res.cookie('token',token);
        res.redirect('/adminlogin/dashboard');  
    }catch(err){
        console.error(err);
        res.status(500).send('Server error');
    }
});
app.get('/adminlogin/dashboard',isAdmin,async(req,res)=>{
    try{
        res.render('admindashboard');
    }catch(err){
        console.error(err);
        res.status(500).send('Server error');
    }
});

    
app.get('/login/profile',isLoggedIn,async(req,res)=>{
     try {
    const user = await userModel.findById(req.userId);
    const totalSessions = await sessionModel.countDocuments();

    const attended = user.attendance?.[0]?.dayspresent || 0;
    const percentage =
      totalSessions === 0 ? 0 : (attended / totalSessions) * 100;

    res.render('dashboard', {
      name: user.name,
      totalSessions,
      attended,
      percentage
    });
  } catch (err) {
    console.error(err);
    res.redirect('/signin');
  }
});

app.post('/admin/grant',isAdmin,async(req,res)=>{

  try {
    const { email, password } = req.body;
 
    // 🔹 Logged-in admin
    const adminUser = await userModel.findById(req.userId);
    
    if (!adminUser || adminUser.role !== 'admin') {
      return res.status(403).json({ message: "Only admins can grant access" });
     
  
    // 🔹 Verify ADMIN password
    const isAdminPwdCorrect = await bcrypt.compare(password, adminUser.password);
    if (!isAdminPwdCorrect) {
      return res.status(401).json({ message: "Invalid admin password" });
    }
      }


    // 🔹 Target user
    const targetUser = await userModel.findOne({ email });
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    targetUser.role = 'admin';
    await targetUser.save();
    console.log('targetuserupdated');

    res.json({ message: "Admin access granted successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});
app.get('/profile/details',isLoggedIn,async(req,res)=>{
    try{
        const user=await userModel.findById(req.userId);
        let sessions=[];
        if(user.attendance && user.attendance.length>0){
          const sessionIds=user.attendance[0].sessions_attended;
          sessions=await sessionModel.find({_id:{$in:sessionIds}});
        }
        res.render('viewsessions',{user,sessions});
    }catch(err){
        console.error(err);
        res.status(500).send('Server error');
    }   
});
app.post(
  '/sessiondetailsupload',
  isAdmin,
  uploadGroupImage.single('groupPhoto'),
  async (req, res) => {
    try {
      const { date, topic, conductedBy } = req.body;
      const imageUrl = req.file.path;

      const newSession = await sessionModel.create({
        sessionDate: date,
        topic,
        conductedBy,
        image: imageUrl
      });

      // Call FastAPI attendance service
      const response = await axios.post(
        'http://localhost:8000/mark-attendance',
        {
          image_url: imageUrl,
          session_date: date
        }
      );

      const matchedEmails = response.data.matched_users;

      const users = await userModel.find(
        { email: { $in: matchedEmails } },
        { _id: 1 }
      );

      const userIds = users.map(u => u._id);

      newSession.attendedby = userIds;
      await newSession.save();

      res.send('Session details uploaded successfully');
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
  }
);

app.post('/:sessionId/like',isLoggedIn,async(req,res)=>{
  try{
    const session=await sessionModel.findById(req.params.sessionId);
    const user=await userModel.findById(req.userId);
    session.likes.push(user._id);
    await session.save();
    res.status(200).send('Liked');
  } catch(err){
    console.error(err);
    res.status(500).send('Server error');
  }   
});

app.post('/:sessionId/review',isLoggedIn,async(req,res)=>{  
  try{
    const session=await sessionModel.findById(req.params.sessionId);
    const user=await userModel.findById(req.userId);
    session.comment.push({user:user._id,text:req.body.review});
    await session.save();
    res.status(200).send('Review added');
  } catch(err){ 
    console.error(err);
    res.status(500).send('Server error');
  }

});


app.post('/uploaduserimage',isLoggedIn,uploadUserImages.array('UserPhotos',10),async(req,res)=>{
  try{
    const user = await userModel.findById(req.userId);
    const imageUrls = req.files.map(file => file.path); 
    user.photo_links.push(...imageUrls);
    await user.save();
   await axios.post('http://localhost:8000/update-encodings', {
  email: user.email
});
    res.send('User images uploaded successfully');
  } catch(err){ 
    console.error(err);
    res.status(500).send('Server error');
  }
});


module.exports = app;