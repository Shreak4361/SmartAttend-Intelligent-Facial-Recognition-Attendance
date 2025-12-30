const express=require('express');
const app= express();
const Path=require('path');
const port=3000;    
const userModel=require('./models/user');
const sessionModel=require('./models/sessions');
const jwt=require('jsonwebtoken');
const bcrypt=require('bcrypt');
const axios = require('axios');

const cloudinary=require('cloudinary').v2;
cloudinary.config({
    cloud_name:'dpxbmek4s',
    api_key:'237873467228794',
    api_secret:'l3m8W_CFk48iv248KleUJ8gn0Ms'
});
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
/* ===========================
   USER IMAGE STORAGE
=========================== */
const userImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'attendance/users',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    public_id: (req, file) => {
      return `user-${req.userId}-${Date.now()}`;
    }
  }
});


/* ===========================
   GROUP IMAGE STORAGE
=========================== */
const groupImageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'attendance/groups',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    public_id: (req, file) => {
      return `group-${Date.now()}`;
    }
  }
});

/* ===========================
   MULTER EXPORTS
=========================== */
const uploadUserImages = multer({ storage: userImageStorage });
const uploadGroupImage = multer({ storage: groupImageStorage });
const cookieParser=require('cookie-parser');
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static('public')); 
app.use(express.static(Path.join(__dirname,'public')));    
app.set('view engine','ejs');

app.get('/',(req,res)=>{
    res.render('home');
});
app.post('/submit-user', async (req, res) => {
  try {
    let { name, email, password, batch, age, year, role } = req.body;

  
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(400).send('User already exists');
    }

    const salt = await bcrypt.genSalt(10);

    const hashedPassword = await bcrypt.hash(password, salt);
    console.log(role);

    const newUser = await userModel.create({
      name,
      email,
      password: hashedPassword,
      batch,
      age,
      year,
      role
    });

   console.log(role);
    const token = jwt.sign(
      { id: newUser._id, role: newUser.role },
      'secretkeyshhh',
      { expiresIn: '2h' }
    );

    // Store token
    res.cookie('token', token, {
      httpOnly: true
    });

    res.send('Form data saved successfully!');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error saving form data.');
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

app.post('/login',async(req,res)=>{
    try{
        const{email,password}=req.body;
        const user=await userModel.findOne({email});
        if(!user){
            return res.status(400).send('User not found');
        }           

        const isMatch=await bcrypt.compare(password,user.password);
        if(!isMatch){
            return res.status(400).send('Invalid credentials');
        }
        let token=jwt.sign({id:user.id},'secretkeyshhh');
        res.cookie('token',token);
        res.redirect('/login/profile');
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
app.post(
  '/sessiondetailsupload',
  isAdmin,
  uploadGroupImage.single('groupPhoto'),
  async (req, res) => {
    try {
      const { date, topic, conductedBy } = req.body;
      const imageUrl = req.file.path;

      // 1️⃣ Create session
      const newSession = await sessionModel.create({
        sessionDate: new Date(date),
        topic,
        conductedBy,
        image: imageUrl
      });

      // 2️⃣ Call FastAPI
      const response = await axios.post('http://localhost:8000/mark-attendance', {
        image_url: imageUrl,
        session_date: date
      });

      const matchedEmails = response.data.matched_users;

      // 3️⃣ Convert emails → ObjectIds
      const users = await userModel.find(
        { email: { $in: matchedEmails } },
        { _id: 1 }
      );

      const userIds = users.map(u => u._id);

      // 4️⃣ Assign ObjectIds
      newSession.attendedby = userIds;
      for (const userId of userIds) {
        const user=await userModel.findById(userId);
        user.attendance[0].sessions_attended.push(newSession._id)
      }

      // 5️⃣ Save updated session
      await newSession.save();

      res.send('Session details uploaded successfully');
    } catch (err) {
      console.error(err);
      res.status(500).send('Server error');
    }
  }
);

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


function isLoggedIn(req,res,next){
    try{
        const token=req.cookies.token;  
        if(!token){
            return res.redirect('/signin');
        }
        const decoded=jwt.verify(token,'secretkeyshhh');
        req.userId=decoded.id;
        next();
    }

    catch(err){
        console.error(err);
        res.redirect('/signin');
    }       
}

function isAdmin(req,res,next){
    try{
        const token=req.cookies.token;
        if(!token){
            console.log(token);
            return res.redirect('/signin');
        }
        const decoded=jwt.verify(token,'secretkeyshhh');
        if(decoded.role!=='admin'){
            return res.redirect('/signin');
        }
        req.userId=decoded.id;
        next();
    }
    catch(err){
        console.error(err);
        res.redirect('/signin');
    }
} 






app.listen(port,()=>{
    console.log(`server is running at http://localhost:${port}`)
    
})            