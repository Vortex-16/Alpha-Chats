import genToken from "../config/token.js"
import User from "../models/user.model.js"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import crypto from "crypto"

export const signUp = async (req,res) => {
    try {
        const {userName, github, password} = req.body
        const checkUserByUserName=await User.findOne({userName})
        if(checkUserByUserName){
          return res.status(400).json({message:"User already exists"})  
        }
        const checkUserByGithub=await User.findOne({github})
        if(checkUserByGithub){
          return res.status(400).json({message:"User already exists"})  
        }
        if(password.length<6){
            return res.status(400).json({message:"Password must be atleast 6 characters"})
        }        const hashedPassword=await bcrypt.hash(password,10)
        const user=await User.create({
            userName,
            github,
            password:hashedPassword
        })

        const token=await genToken(user._id)

        res.cookie("token",token,{
            httpOnly:true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? "None" : "Lax",
            maxAge:7*24*60*60*1000, // 7 days
            path: '/'
        })

        // Also return token in response for browsers with cookie issues
        return res.status(201).json({
            ...user.toObject(),
            token: token // Include token for localStorage fallback
        })
    } catch (error) {
        return res.status(500).json({message:`Internal server Error ${error}`})
    }
}

export const login = async (req,res) => {
    try {
        const {github, password} = req.body
        const user=await User.findOne({github})
        if(!user){
          return res.status(400).json({message:"User does not exists"})  
        }
          const isMatch=await bcrypt.compare(password,user.password)
        if(!isMatch){
            return res.status(400).json({message:"Invalid credentials"})
        }

        const token=await genToken(user._id)

        res.cookie("token",token,{
            httpOnly:true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? "None" : "Lax",
            maxAge:7*24*60*60*1000, // 7 days
            path: '/'
        })

        // Also return token in response for browsers with cookie issues
        return res.status(200).json({
            ...user.toObject(),
            token: token // Include token for localStorage fallback
        })
    } catch (error) {
        return res.status(500).json({message:`Internal server Error ${error}`})
    }
}

export const logout = async (req,res) => {
    try {
        res.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? "None" : "Lax",
            path: '/'
        })
        return res.status(200).json({message:"Logged out successfully"})
    } catch (error) {
        return res.status(500).json({message:`Internal server Error ${error}`})
    }
}

// SECURE Password Reset System
export const requestPasswordReset = async (req, res) => {
    try {
        const { github, userName } = req.body;
        
        // Security: Require BOTH github and userName to prevent guessing
        if (!github || !userName) {
            return res.status(400).json({ message: "Both GitHub username and display name are required" });
        }
        
        // Find user with BOTH credentials (prevents account enumeration)
        const user = await User.findOne({ 
            github: github.trim(),
            userName: userName.trim()
        });
        
        if (!user) {
            // Security: Same response for non-existent users to prevent enumeration
            return res.status(200).json({ 
                message: "If an account with those credentials exists, a reset code has been generated." 
            });
        }
        
        // Generate secure 6-digit code (expires in 15 minutes)
        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        const resetExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        
        // Store reset code in user document (hashed for security)
        const hashedResetCode = await bcrypt.hash(resetCode, 10);
        
        await User.findByIdAndUpdate(user._id, {
            passwordResetCode: hashedResetCode,
            passwordResetExpiry: resetExpiry,
            passwordResetAttempts: 0 // Reset attempts counter
        });
        
        // In production, send this via email/SMS
        // For development, log it (REMOVE IN PRODUCTION)
        if (process.env.NODE_ENV !== 'production') {
            console.log(`🔐 Password Reset Code for ${github}: ${resetCode} (expires in 15 min)`);
        }
        
        res.status(200).json({ 
            message: "Reset code generated. In production, this would be sent to your registered email.",
            // REMOVE THIS IN PRODUCTION - only for development
            devResetCode: process.env.NODE_ENV !== 'production' ? resetCode : undefined
        });
        
    } catch (error) {
        console.error("Password reset request error:", error);
        res.status(500).json({ message: "Password reset request failed" });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { github, userName, resetCode, newPassword } = req.body;
        
        // Validate input
        if (!github || !userName || !resetCode || !newPassword) {
            return res.status(400).json({ message: "All fields are required" });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }
        
        // Find user with both credentials
        const user = await User.findOne({ 
            github: github.trim(),
            userName: userName.trim()
        });
        
        if (!user || !user.passwordResetCode || !user.passwordResetExpiry) {
            return res.status(400).json({ message: "Invalid or expired reset request" });
        }
        
        // Check if reset code has expired
        if (new Date() > user.passwordResetExpiry) {
            // Clean up expired reset data
            await User.findByIdAndUpdate(user._id, {
                $unset: { 
                    passwordResetCode: 1, 
                    passwordResetExpiry: 1, 
                    passwordResetAttempts: 1 
                }
            });
            return res.status(400).json({ message: "Reset code has expired. Please request a new one." });
        }
        
        // Check attempt limits (prevent brute force)
        if (user.passwordResetAttempts >= 5) {
            await User.findByIdAndUpdate(user._id, {
                $unset: { 
                    passwordResetCode: 1, 
                    passwordResetExpiry: 1, 
                    passwordResetAttempts: 1 
                }
            });
            return res.status(429).json({ message: "Too many failed attempts. Please request a new reset code." });
        }
        
        // Verify reset code
        const isValidCode = await bcrypt.compare(resetCode, user.passwordResetCode);
        
        if (!isValidCode) {
            // Increment failed attempts
            await User.findByIdAndUpdate(user._id, {
                $inc: { passwordResetAttempts: 1 }
            });
            
            const remainingAttempts = 5 - (user.passwordResetAttempts + 1);
            return res.status(400).json({ 
                message: `Invalid reset code. ${remainingAttempts} attempts remaining.` 
            });
        }
        
        // Reset code is valid - update password
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        
        await User.findByIdAndUpdate(user._id, {
            password: hashedPassword,
            $unset: { 
                passwordResetCode: 1, 
                passwordResetExpiry: 1, 
                passwordResetAttempts: 1 
            }
        });
        
        console.log(`✅ Password reset successful for user: ${github}`);
        
        res.status(200).json({ message: "Password reset successful. You can now login with your new password." });
        
    } catch (error) {
        console.error("Password reset error:", error);
        res.status(500).json({ message: "Password reset failed" });
    }
};
