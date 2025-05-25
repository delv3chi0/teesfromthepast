// backend/routes/auth.js
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js'; // Adjust path if your User model is elsewhere
import 'dotenv/config'; // Make sure .env variables are loaded
import { protect } from '../middleware/authMiddleware.js'; // Import the new middleware

const router = express.Router();

// Register User (Signup)
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body; // Ensure username is being sent from frontend
    try {
        // Check if user already exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }
        // Check if username already exists
        user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ message: 'Username already exists' });
        }


        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        user = new User({
            username,
            email,
            password: hashedPassword,
            // Optional: Initialize other fields like firstName if provided during registration
            firstName: req.body.firstName || '',
            lastName: req.body.lastName || '',
        });

        await user.save();

        // Generate JWT token
        const payload = {
            user: {
                id: user.id,
            },
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' }, // Token expires in 1 hour
            (err, token) => {
                if (err) throw err;
                res.cookie('token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
                    maxAge: 3600000 // 1 hour in milliseconds
                }).status(201).json({ message: 'User registered successfully', token: token });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Login User
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        // Check if user exists
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token
        const payload = {
            user: {
                id: user.id,
            },
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' },
            (err, token) => {
                if (err) throw err;
                res.cookie('token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    maxAge: 3600000
                }).json({ message: 'Logged in successfully', token: token });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// GET User Profile (Protected Route)
router.get('/profile', protect, (req, res) => {
    // The 'protect' middleware has already found the user and attached it to req.user
    // We just need to send it back.
    if (req.user) {
        res.status(200).json(req.user);
    } else {
        res.status(404).json({ message: 'User not found' });
    }
});

// PUT Update User Profile (Protected Route)
router.put('/profile', protect, async (req, res) => {
    console.log('[Update Profile] Received body:', req.body);
    
    try {
        const user = await User.findById(req.user.id);

        if (user) {
            // Update fields based on what the frontend is sending
            user.username = req.body.username || user.username;
            user.email = req.body.email || user.email;
            user.firstName = req.body.firstName || user.firstName;
            user.lastName = req.body.lastName || user.lastName;
            user.instagramHandle = req.body.instagramHandle || user.instagramHandle;
            user.tiktokHandle = req.body.tiktokHandle || user.tiktokHandle;
            
            // If password is provided in the body, hash and update it
            if (req.body.password) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(req.body.password, salt);
            }

            const updatedUser = await user.save();

            // Send back all relevant fields from the updated user
            res.json({
                _id: updatedUser.id,
                username: updatedUser.username,
                email: updatedUser.email,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                instagramHandle: updatedUser.instagramHandle,
                tiktokHandle: updatedUser.tiktokHandle,
            });
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(400).json({ message: 'Error updating user profile', error: error.message });
    }
});


// Logout User
router.post('/logout', (req, res) => {
    res.cookie('token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        expires: new Date(0) // Set expiry to past date to delete cookie
    }).json({ message: 'Logged out successfully' });
});

export default router;
