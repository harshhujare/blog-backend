const { validateToken } = require("../services/auth");

function AuthMiddleWare(req, res, next) {
  token = req.cookies?.token;
 
  if (!token) return res.status(401).json({ message: "Access_Denied" ,success:false});
  try {

users=validateToken(token);
req.user=users;

next();
  } catch (err) {
    res.status(400).json({message:"invalid token"})
  }
}

module.exports={AuthMiddleWare}