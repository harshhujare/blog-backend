const express = require('express');
const router = express.Router();
const { AuthMiddleWare } = require('../middlewares/auth');
const { handelblog, getblog, getblogbyid, getBlogsByUserId, deleteBlog, toggleLike, addComment, deleteComment } = require("../controllers/blog");
const { upload } = require("../config/multerconfig");

// create
router.post('/upload', AuthMiddleWare, upload.single("blogimg"), handelblog);

// read
router.get('/getblog', getblog);
router.get('/getblog/:id', getblogbyid);
router.get('/user/:userid', getBlogsByUserId);

// delete
router.delete('/delete/:id', AuthMiddleWare, deleteBlog);

// likes
router.post('/:id/like', AuthMiddleWare, toggleLike);

// comments
router.post('/:id/comments', AuthMiddleWare, addComment);
router.delete('/:id/comments/:commentId', AuthMiddleWare, deleteComment);

module.exports = router;