const jwt=require('jsonwebtoken');require('dotenv').config();
function sign(user){return jwt.sign({id:user.id,email:user.email,role:user.role,name:user.name},process.env.JWT_SECRET||'dev-secret',{expiresIn:'7d'});}
function optional(req,res,next){const h=req.headers.authorization||'';if(h.startsWith('Bearer ')){try{req.user=jwt.verify(h.slice(7),process.env.JWT_SECRET||'dev-secret')}catch{}}next()}
function requireAuth(req,res,next){optional(req,res,()=>req.user?next():res.status(401).json({message:'Please sign in first.'}))}
function requireAdmin(req,res,next){requireAuth(req,res,()=>req.user.role==='admin'?next():res.status(403).json({message:'Admin access required.'}))}
module.exports={sign,optional,requireAuth,requireAdmin};
