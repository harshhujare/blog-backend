const express=require ('express')
const router =express.Router();
const{AuthMiddleWare}=require('../middlewares/auth')
const {handelSignup, handelLogin,handelLogout,handelupdate,handelgetuser, handellistusers} =require('../controllers/user')


router.post('/signup',handelSignup);
router.post('/Login',handelLogin);
router.get('/logout',handelLogout);
router.put('/update',AuthMiddleWare,handelupdate);
router.get('/getuser',handelgetuser)
router.get('/list', handellistusers)

module.exports=router;
