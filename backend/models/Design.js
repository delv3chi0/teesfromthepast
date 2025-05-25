// backend/models/Design.js

import mongoose from 'mongoose'; // This is our helper tool for talking to the database

// This is our blueprint for each "Design" page in our photo album
const designSchema = new mongoose.Schema({
    user: { // This spot is to remember WHO created this design
        type: mongoose.Schema.Types.ObjectId, // It will store the special ID of the User
        required: true,                       // We MUST know who the user is
        ref: 'User'                           // This links it to our 'User' blueprint
    },
    prompt: { // This spot is for the idea (the text) the user typed
        type: String,
        required: true                        // The idea text is also very important
    },
    imageDataUrl: { // This spot is for the picture itself
        type: String,                         // We'll save it as a long string of text for now
        required: true                        // We definitely need the picture!
    }
    // We can add more things later, like "Is this for a T-shirt or a Mug?"
}, {
    timestamps: true // This automatically writes down: "When was this saved?" and "When was it last changed?"
});

// Now we tell our Mongoose helper: "Okay, this blueprint is for things we'll call 'Design' in our database album"
const Design = mongoose.model('Design', designSchema);

// This makes our 'Design' blueprint available for other backend files to use
export default Design;
