// backend/routes/auth.js
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import 'dotenv/config';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Register User (Signup)
router.post('/register', async (req, res) => {
    const { username, email, password, firstName, lastName } = req.body;
    try {
        let existingUserByEmail = await User.findOne({ email });
        if (existingUserByEmail) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }
        let existingUserByUsername = await User.findOne({ username });
        if (existingUserByUsername) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        let newUser = new User({
            username,
            email,
            password: hashedPassword,
            firstName: firstName || '',
            lastName: lastName || '',
        });

        await newUser.save();

        const payload = {
            user: {
                id: newUser.id, // Mongoose uses 'id' as a virtual for '_id'
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
                    secure: process.env.NODE_ENV === 'production', // Use 'secure' in production (HTTPS)
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Required for cross-site cookies if backend/frontend are different domains
                    maxAge: 3600 * 1000 // 1 hour in milliseconds
                }).status(201).json({ message: 'User registered successfully', token: token });
            }
        );
    } catch (err) {
        console.error('Error during registration:', err.message);
        res.status(500).send('Server Error');
    }
});

// Login User
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

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
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                    maxAge: 3600 * 1000 
                }).json({ message: 'Logged in successfully', token: token });
            }
        );
    } catch (err) {
        console.error('Error during login:', err.message);
        res.status(500).send('Server Error');
    }
});

// GET User Profile (Protected Route)
router.get('/profile', protect, async (req, res) => { // Added async as User.findById is async
    try {
        // req.user is populated by the 'protect' middleware (which already did User.findById)
        // However, the 'protect' middleware selects '-password'. 
        // If new fields were added to User schema and not present in req.user from an older token's session,
        // it might be safer to re-fetch or ensure protect middleware is robust.
        // For now, assuming req.user (from protect middleware) is sufficiently up-to-date for most fields.
        // To be absolutely sure we get the latest including new address fields if protect middleware hasn't refetched them:
        const userProfile = await User.findById(req.user.id).select('-password');
        if (!userProfile) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(userProfile);
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).json({ message: 'Server error fetching profile' });
    }
});


// PUT Update User Profile (Protected Route)
router.put('/profile', protect, async (req, res) => {
    console.log('[Update Profile] Received body:', req.body);
    
    const { 
        username, email, firstName, lastName, password, 
        shippingAddress, billingAddress 
    } = req.body;

    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update standard fields if provided
        if (username) user.username = username;
        if (email && email !== user.email) { // Handle email change carefully if it's a unique identifier
            const existingUser = await User.findOne({ email });
            if (existingUser && existingUser._id.toString() !== user._id.toString()) {
                return res.status(400).json({ message: 'Email already in use.' });
            }
            user.email = email;
        }
        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;

        // Update password if provided
        if (password && password.length > 0) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }

        // --- HANDLE ADDRESSES ---
        // Helper to update an address subdocument
        const updateAddress = (currentAddressDoc, newAddressData) => {
            if (!newAddressData) return currentAddressDoc; // No new data, keep current
            
            // Ensure currentAddressDoc is an object if it's undefined (first time setting)
            const addressToUpdate = currentAddressDoc || {};

            addressToUpdate.recipientName = newAddressData.recipientName !== undefined ? newAddressData.recipientName : addressToUpdate.recipientName;
            addressToUpdate.street1 = newAddressData.street1 !== undefined ? newAddressData.street1 : addressToUpdate.street1;
            addressToUpdate.street2 = newAddressData.street2 !== undefined ? newAddressData.street2 : addressToUpdate.street2;
            addressToUpdate.city = newAddressData.city !== undefined ? newAddressData.city : addressToUpdate.city;
            addressToUpdate.state = newAddressData.state !== undefined ? newAddressData.state : addressToUpdate.state;
            addressToUpdate.zipCode = newAddressData.zipCode !== undefined ? newAddressData.zipCode : addressToUpdate.zipCode;
            addressToUpdate.country = newAddressData.country !== undefined ? newAddressData.country : addressToUpdate.country;
            addressToUpdate.phone = newAddressData.phone !== undefined ? newAddressData.phone : addressToUpdate.phone;
            return addressToUpdate;
        };

        if (shippingAddress !== undefined) { // Check if shippingAddress key is present in body
            if (shippingAddress === null) { // Allow clearing the address
                 user.shippingAddress = undefined;
            } else {
                 user.shippingAddress = updateAddress(user.shippingAddress, shippingAddress);
            }
        }

        if (billingAddress !== undefined) { // Check if billingAddress key is present in body
            if (billingAddress === null) { // Allow clearing the address
                user.billingAddress = undefined;
            } else {
                user.billingAddress = updateAddress(user.billingAddress, billingAddress);
            }
        }
        // --- END HANDLE ADDRESSES ---

        const updatedUser = await user.save();

        // Return only necessary fields (excluding password)
        res.json({
            _id: updatedUser.id,
            username: updatedUser.username,
            email: updatedUser.email,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            shippingAddress: updatedUser.shippingAddress,
            billingAddress: updatedUser.billingAddress,
            lastContestSubmissionMonth: updatedUser.lastContestSubmissionMonth,
            monthlyVoteRecord: updatedUser.monthlyVoteRecord,
            // Do not send back the token here unless it's refreshed
        });

    } catch (error) {
        console.error('Error updating profile:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: 'Validation Error updating profile', errors: error.errors });
        }
        if (error.code === 11000) { // Duplicate key error (e.g. for username/email if changed to existing)
             return res.status(400).json({ message: 'A user with that username or email already exists.'});
        }
        res.status(500).json({ message: 'Server error updating user profile', error: error.message });
    }
});

// Logout User
router.post('/logout', (req, res) => {
    res.cookie('token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        expires: new Date(0)
    }).json({ message: 'Logged out successfully' });
});

export default router;
