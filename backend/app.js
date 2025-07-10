// --- Backend: server.js ---

// To run this server:
// 1. In your terminal, navigate to the folder where you saved this file.
// 2. Run `npm init -y` to create a package.json file.
// 3. Run `npm install express jsonwebtoken cors dotenv axios` to install dependencies.
// 4. Create a file named `.env` in the same directory.
// 5. Add your credentials to the .env file as shown in the instructions below.
// 6. Run `node server.js` to start the server.

const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config(); // To use environment variables from .env file
const axios = require('axios');

const app = express();
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Middleware to parse JSON bodies

// --- Environment Variables ---
// IMPORTANT: Create a .env file in the same directory and add the following lines:
// JWT_SECRET=your_super_secret_key_that_is_long_and_random
// GOOGLE_API_KEY=your_google_api_key_here
// SEARCH_ENGINE_ID=your_search_engine_id_here

const JWT_SECRET = process.env.JWT_SECRET;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const SEARCH_ENGINE_ID = process.env.SEARCH_ENGINE_ID;

// --- Dummy User Data ---
// In a real application, you would fetch this from a database (e.g., MongoDB)
const users = [
    { id: 1, email: 'user@example.com', password: 'password123' }
];

// --- Authentication Middleware ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) {
        return res.status(401).json({ message: 'Authentication token is required.' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Token is invalid or has expired.' });
        }
        req.user = user;
        next();
    });
};


// --- API Endpoints ---

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return JWT
 * @access  Public
 */
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;

    // Find user in the dummy database
    const user = users.find(u => u.email === email);

    if (!user || user.password !== password) {
        return res.status(401).json({ message: 'Invalid credentials.' });
    }

    // User is valid, create JWT payload
    const payload = {
        id: user.id,
        email: user.email
    };

    // Sign the token
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' }); // Token expires in 1 hour

    res.json({
        success: true,
        message: 'Login successful!',
        token: token
    });
});

/**
 * @route   GET /api/search
 * @desc    Fetch search results from Google Custom Search API
 * @access  Private (Requires JWT)
 */
app.get('/api/search', authenticateToken, async (req, res) => {
    const { q: query } = req.query;

    if (!query) {
        return res.status(400).json({ message: 'Search query parameter "q" is required.' });
    }

    if (!GOOGLE_API_KEY || !SEARCH_ENGINE_ID) {
        return res.status(500).json({ message: 'Server is not configured for Google Search. Missing API Key or Search Engine ID.' });
    }

    const searchUrl = `https://www.googleapis.com/customsearch/v1`;

    try {
        const response = await axios.get(searchUrl, {
            params: {
                key: GOOGLE_API_KEY,
                cx: SEARCH_ENGINE_ID,
                q: query,
                num: 5 // Get top 5 results
            }
        });
        
        // Format the results to match the frontend's expectation
        const formattedResults = response.data.items.map(item => ({
            title: item.title,
            link: item.link,
            snippet: item.snippet
        }));

        res.json({ items: formattedResults });

    } catch (error) {
        console.error('Google Search API Error:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'Failed to fetch search results from Google.' });
    }
});


// --- Server Initialization ---
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    if (!JWT_SECRET) {
        console.warn('WARNING: JWT_SECRET is not set. Please add it to your .env file for security.');
    }
});
