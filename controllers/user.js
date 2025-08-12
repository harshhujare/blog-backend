const user = require("../models/user");
const bcrypt = require("bcrypt");
const { CreateTokenForUser, validateToken } = require("../services/auth");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const isProd = process.env.NODE_ENV === 'production';
const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  path: '/',
  maxAge: 24 * 60 * 60 * 1000,
};

function toWebPath(p) {
  if (!p || typeof p !== 'string') return p;
  const norm = p.replace(/\\/g, '/');
  if (norm.startsWith('/public/')) return norm;
  if (norm.startsWith('public/')) return '/' + norm;
  const idx = norm.lastIndexOf('/public/');
  if (idx !== -1) return norm.slice(idx);
  return '/' + norm.replace(/^\//, '');
}

const handelSignup = async (req, res) => {
  const { fullname, email, password } = req.body;

  try {
    const User = await user.create({
      fullname,
      email,
      password,
    });
    //token creation
    const token = CreateTokenForUser(User);
    // Set cookie

    // ensure web path on fresh user
    User.profileImgUrl = toWebPath(User.profileImgUrl);
    return res
      .cookie("token", token, cookieOptions)
      .status(200)
      .json({ message: "usercreated successfully", success: true, User });
  } catch (err) {
    if (err.code === 11000 && err.keyPattern && err.keyPattern.email) {
      return res.status(400).json({
        message: "Email already exist .Plese use a different email.",
        sucess: false,
        error: "DUPLICATE_EMAIL",
      });
    } else {
      console.error("Signup failed:", err);
    }
  }
};
const handelLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const fuser = await user.findOne({ email });

    if (!fuser) {
      return res
        .status(401)
        .json({ message: "Wrong_Email_Password", sucess: false });
    }

    const isMatch = await bcrypt.compare(password, fuser.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "Wrong_Email_Password", sucess: false });
    }
    let token;
    try {
      //token creation
      token = CreateTokenForUser(fuser);

      // Set cookie with proper options
      res
        .cookie("token", token, cookieOptions)
        .status(200)
        .json({
          message: "login successful",
          success: true,
          token: token, // Also send token in response for frontend storage
        });
    } catch (tokenError) {
      console.error("Token creation failed:", tokenError);
      return res.status(500).json({
        message: "Authentication failed",
        success: false,
        error: "Token creation failed",
      });
    }
  } catch (error) {
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation_failed",
        error: error.message,
      });
    }
  }
};
//handelCheck
const handelCheck = (req, res) => {
  const token = req.cookies?.token;
  if (!token) {
    res.json({ loggedIn: false });
  } else {
    try {
      loaded = validateToken(token);
      res.json({ loggedIn: true, user: loaded });
    } catch (error) {
      res.json({ loggedIn: false });
    }
  }
};

//handelLogout
const handelLogout = (req, res) => {
  try {
    const clearOpts = { ...cookieOptions };
    delete clearOpts.maxAge;
    res.clearCookie("token", clearOpts);
    res.json({ success: true });
  } catch (error) {
    console.error("Logout failed:", error);
  }
};
const handelupdate = async (req, res) => {
  try {
    const { fullname, email, password } = req.body;
    const updatedUser = await user.findOneAndUpdate(
      { email },
      { $set: { fullname } },
      { new: true }
    );

    if (!updatedUser)
      return res.status(400).json({ message: "no user found", sucess: false });

    res.status(200).json({ sucess: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Update failed" });
  }
};
const handelgetuser = async (req, res) => {
  try {
    const { email } = req.query;
   
    const result = await user.findOne({ email });

    if (!result) {
      return res
        .status(400)
        .json({ sucess: false, error: "faild to get user" });
    }
    // normalize image path for client
    result.profileImgUrl = toWebPath(result.profileImgUrl);
    res.status(200).json({ user: result, sucess: true });
  } 
  catch(err) {
    console.error("Get user failed:", err);
  }
};

// List users (basic directory)
const handellistusers = async (req, res) => {
  try {
    const { q } = req.query;
    const query = q
      ? {
          $or: [
            { fullname: { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } },
          ],
        }
      : {};

    const users = await user
      .find(query)
      .select("fullname email profileImgUrl role isActive createdAt updatedAt");

    const normalized = users.map(u => ({
      ...u.toObject(),
      profileImgUrl: toWebPath(u.profileImgUrl),
    }));

    return res.status(200).json({ success: true, users: normalized });
  } catch (err) {
    console.error("Failed to list users", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to list users" });
  }
};
const handelupload = async (req, res) => {
  const id = req.params.userid;
  const uploadedFsPath = req.file?.path;

  if (!uploadedFsPath) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const nuser = await user.findById(id);
    if (!nuser) return res.status(404).json({ error: "User not found" });

    // Build web path (/public/...) for client consumption
    const webPath = '/' + path
      .relative(process.cwd(), uploadedFsPath)
      .replace(/\\/g, '/');

    // Delete old image if present and not default
    if (nuser.profileImgUrl && nuser.profileImgUrl !== "/public/uploads/profile/image.png") {
      const oldWebPath = nuser.profileImgUrl;
      const oldAbsPath = path.isAbsolute(oldWebPath)
        ? oldWebPath
        : path.join(process.cwd(), oldWebPath.replace(/^\//, ''));
      fs.unlink(oldAbsPath, (err) => {
        if (err) console.error("error deleting old photo", err.message || err);
      });
    }

    nuser.profileImgUrl = webPath;
    await nuser.save();
    res.status(200).json({ success: true, nuser });
  } catch (err) {
    res.status(500).json({ error: "Server error", details: err.message });
  }
};
module.exports = {
  handelSignup,
  handelLogin,
  handelCheck,
  handelLogout,
  handelupdate,
  handelgetuser,
  handellistusers,
  handelupload,
};
