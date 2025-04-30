// server.js - Express server with MongoDB and OpenAI integration (ES Modules)
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import path from 'path';
import fetch from 'node-fetch';

// Setup __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Configure middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(express.json());

// Connect to MongoDB - with improved error handling
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/calorieTrackerDB')
.then(() => {
  console.log('Connected to MongoDB successfully');
})
.catch(err => {
  console.error('MongoDB connection error:', err.message);
  console.log('Make sure MongoDB is running and your connection string is correct');
});

// Define schemas and models
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  created: { type: Date, default: Date.now }
});

const mealSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  calories: { type: Number, required: true },
  protein: { type: Number },
  fat: { type: Number },
  carbs: { type: Number },
  mealType: { type: String, enum: ['breakfast', 'lunch', 'dinner', 'snack'] },
  date: { type: Date, required: true },
  imageUrl: { type: String }, // We'll store image URLs or base64 data
  analysis: { type: String },
  created: { type: Date, default: Date.now }
});

// Create models
const User = mongoose.model('User', userSchema);
const Meal = mongoose.model('Meal', mealSchema);

// Mock food database for fallback when OpenAI API is unavailable
const mockFoodDatabase = [
  {
    description: "Grilled salmon with steamed broccoli and brown rice",
    calories: 450,
    protein: 35,
    fat: 18,
    carbs: 38,
    analysis: "High in protein and healthy omega-3 fatty acids."
  },
  {
    description: "Chicken Caesar salad with croutons",
    calories: 380,
    protein: 28,
    fat: 22,
    carbs: 14,
    analysis: "Good protein source from chicken, but high in fat from dressing."
  },
  {
    description: "Vegetable stir-fry with tofu and noodles",
    calories: 420,
    protein: 18,
    fat: 15,
    carbs: 58,
    analysis: "Plant-based protein with high fiber content from vegetables."
  },
  {
    description: "Greek yogurt with berries and granola",
    calories: 320,
    protein: 22,
    fat: 10,
    carbs: 36,
    analysis: "Good protein source with probiotics from yogurt and antioxidants from berries."
  }
];

// Authentication middleware with improved JWT handling
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    console.log('Authentication failed: No token provided');
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Use the environment variable JWT_SECRET
  const jwtSecret = process.env.JWT_SECRET;
  
  if (!jwtSecret) {
    console.error('JWT_SECRET is not set in environment variables');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }
  
  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
      console.log('Authentication failed: Token verification error', err.message);
      return res.status(403).json({ error: 'Forbidden', message: err.message });
    }
    
    console.log('Authentication successful for user:', user.username);
    req.user = user;
    next();
  });
};

// Check MongoDB connection middleware
const checkMongoConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(500).json({ 
      error: 'Database connection error', 
      message: 'Not connected to MongoDB. Please try again later.'
    });
  }
  next();
};

// API Routes

// Register a new user
app.post('/api/users/register', checkMongoConnection, async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already in use' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const user = new User({
      username,
      email,
      password: hashedPassword
    });
    
    await user.save();
    console.log('New user registered:', username);
    
    res.status(201).json({ message: 'User created successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// User login route with proper JWT secret handling
app.post('/api/users/login', checkMongoConnection, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Find the user
    const user = await User.findOne({ username });
    if (!user) {
      console.log('Login failed: User not found -', username);
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      console.log('Login failed: Invalid password for user -', username);
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    // Ensure JWT secret is set
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET is not set in environment variables');
      return res.status(500).json({ error: 'Server misconfiguration' });
    }
    
    // Create JWT token with additional options
    const token = jwt.sign(
      { 
        id: user._id, 
        username: user.username,
        // You can add additional claims here if needed
        role: user.role || 'user',
        email: user.email
      }, 
      jwtSecret,
      { 
        expiresIn: '7d',  // Token expires in 7 days
        issuer: 'calorie-tracker-app',
        subject: user._id.toString()
      }
    );
    
    console.log('User logged in successfully:', username);
    console.log('Token generated with JWT secret');
    
    // Return token and user info to client
    res.status(200).json({ 
      token, 
      userId: user._id.toString(), 
      username: user.username,
      // You can include additional user info here if needed
      email: user.email
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Analyze food image
app.post('/api/analyze-food', async (req, res) => {
  try {
    const { image } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }
    
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.log('No OpenAI API key provided, using mock data');
      
      // Use mock data if no API key
      const mockResponse = mockFoodDatabase[Math.floor(Math.random() * mockFoodDatabase.length)];
      
      // Add some random variation to make it look realistic
      const variation = (num) => Math.max(0, Math.round(num * (0.9 + Math.random() * 0.2)));
      
      return res.status(200).json({
        description: mockResponse.description,
        calories: variation(mockResponse.calories),
        protein: variation(mockResponse.protein),
        fat: variation(mockResponse.fat),
        carbs: variation(mockResponse.carbs),
        analysis: mockResponse.analysis + " (Generated from mock data - no API key provided)"
      });
    }
    
    console.log('Sending image to OpenAI for analysis...');
    
    // Try to call OpenAI API with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30-second timeout
    
    try {
      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',  // Using GPT-4o which supports vision
          messages: [
            {
              role: 'user',
              content: [
                { 
                  type: 'text', 
                  text: 'Analyze this food image and provide the following details in JSON format:\n' +
                        '{\n' +
                        '  "description": "Brief description of the meal",\n' +
                        '  "calories": estimated number of calories,\n' +
                        '  "protein": estimated protein in grams,\n' +
                        '  "fat": estimated fat in grams,\n' +
                        '  "carbs": estimated carbs in grams,\n' +
                        '  "analysis": "Brief nutritional analysis of the meal"\n' +
                        '}'
                },
                { 
                  type: 'image_url',
                  image_url: { url: `data:image/jpeg;base64,${image}` }
                }
              ]
            }
          ],
          max_tokens: 800
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('OpenAI API error:', errorData);
        
        // Check for specific errors
        if (errorData.error && 
            (errorData.error.type === 'insufficient_quota' || 
             errorData.error.code === 'insufficient_quota' ||
             errorData.error.message.includes('quota'))) {
          
          console.log('API quota exceeded, using mock data');
          
          // Use mock data if quota is exceeded
          const mockResponse = mockFoodDatabase[Math.floor(Math.random() * mockFoodDatabase.length)];
          
          return res.status(200).json({
            description: mockResponse.description,
            calories: mockResponse.calories,
            protein: mockResponse.protein,
            fat: mockResponse.fat,
            carbs: mockResponse.carbs,
            analysis: mockResponse.analysis + " (Generated from mock data - API quota exceeded)"
          });
        }
        
        return res.status(response.status).json({ 
          error: 'Error from OpenAI API', 
          message: errorData.error?.message || 'Unknown API error',
          details: errorData 
        });
      }
      
      const data = await response.json();
      console.log('Received response from OpenAI');
      
      // Parse the response content from OpenAI (extract JSON from text)
      try {
        // Extract JSON from the response text
        const content = data.choices[0].message.content;
        console.log('Raw response content:', content);
        
        // Extract JSON from the text
        // Look for JSON object in the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          const jsonStr = jsonMatch[0];
          const parsedContent = JSON.parse(jsonStr);
          
          // Format the response for our frontend
          const formattedResponse = {
            description: parsedContent.description || 'Unknown food',
            calories: parsedContent.calories || 0,
            protein: parsedContent.protein || 0,
            fat: parsedContent.fat || 0,
            carbs: parsedContent.carbs || 0,
            analysis: parsedContent.analysis || 'No analysis available'
          };
          
          console.log('Sending formatted response to client:', formattedResponse);
          res.json(formattedResponse);
        } else {
          throw new Error('Could not extract JSON from response');
        }
      } catch (parseError) {
        console.error('Error parsing OpenAI response:', parseError);
        console.error('Response content:', data.choices[0].message.content);
        
        // If JSON parsing fails, try to extract useful information from the text
        const content = data.choices[0].message.content;
        
        // Create a simple object with default values
        const fallbackResponse = {
          description: extractDescription(content) || 'Food item',
          calories: extractNumber(content, 'calories', 'calorie') || 300,
          protein: extractNumber(content, 'protein') || 10,
          fat: extractNumber(content, 'fat') || 10, 
          carbs: extractNumber(content, 'carb', 'carbohydrate') || 30,
          analysis: 'Could not fully analyze the image. These are approximate values.'
        };
        
        console.log('Sending fallback response:', fallbackResponse);
        res.json(fallbackResponse);
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('Request timed out');
        
        // Use mock data if request times out
        const mockResponse = mockFoodDatabase[Math.floor(Math.random() * mockFoodDatabase.length)];
        
        return res.status(200).json({
          description: mockResponse.description,
          calories: mockResponse.calories,
          protein: mockResponse.protein,
          fat: mockResponse.fat,
          carbs: mockResponse.carbs,
          analysis: mockResponse.analysis + " (Generated from mock data - API request timed out)"
        });
      }
      
      console.error('Fetch error:', fetchError);
      return res.status(500).json({ 
        error: 'Error connecting to OpenAI API', 
        message: fetchError.message 
      });
    }
  } catch (error) {
    console.error('Food analysis error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Helper function to extract description from text
function extractDescription(text) {
  // Look for sentences that might describe food
  const lines = text.split(/[.!?\\n]/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 10 && trimmed.length < 100 && !trimmed.includes(':')) {
      return trimmed;
    }
  }
  return null;
}

// Helper function to extract numeric values from text
function extractNumber(text, ...keywords) {
  for (const keyword of keywords) {
    const regex = new RegExp(`${keyword}\\D*?(\\d+)`, 'i');
    const match = text.match(regex);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
  }
  return null;
}

// Save a meal (requires authentication)
app.post('/api/meals', [authenticateToken, checkMongoConnection], async (req, res) => {
  try {
    const { description, calories, protein, fat, carbs, mealType, date, imageUrl, analysis } = req.body;
    
    // Create new meal
    const meal = new Meal({
      userId: req.user.id,
      description,
      calories,
      protein,
      fat,
      carbs,
      mealType,
      date: new Date(date),
      imageUrl,
      analysis
    });
    
    await meal.save();
    console.log('New meal saved for user:', req.user.username);
    
    res.status(201).json({ message: 'Meal saved successfully', meal });
  } catch (error) {
    console.error('Save meal error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Get user's meals with optional filtering
app.get('/api/meals', [authenticateToken, checkMongoConnection], async (req, res) => {
  try {
    const { startDate, endDate, mealType } = req.query;
    
    // Build the query
    let query = { userId: req.user.id };
    
    // Add date filtering if provided
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    // Add meal type filtering if provided
    if (mealType) query.mealType = mealType;
    
    // Get meals from database
    const meals = await Meal.find(query).sort({ date: -1 });
    
    console.log(`Retrieved ${meals.length} meals for user:`, req.user.username);
    res.status(200).json(meals);
  } catch (error) {
    console.error('Get meals error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Get user's nutritional summary
app.get('/api/summary', [authenticateToken, checkMongoConnection], async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Default to today if no dates provided
    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);
    
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);
    
    // Get meals for the period
    const meals = await Meal.find({
      userId: req.user.id,
      date: { $gte: start, $lte: end }
    });
    
    // Calculate summary
    const summary = {
      totalCalories: 0,
      totalProtein: 0,
      totalFat: 0,
      totalCarbs: 0,
      mealCount: meals.length,
      byMealType: {
        breakfast: { count: 0, calories: 0 },
        lunch: { count: 0, calories: 0 },
        dinner: { count: 0, calories: 0 },
        snack: { count: 0, calories: 0 }
      }
    };
    
    // Populate summary
    meals.forEach(meal => {
      summary.totalCalories += meal.calories || 0;
      summary.totalProtein += meal.protein || 0;
      summary.totalFat += meal.fat || 0;
      summary.totalCarbs += meal.carbs || 0;
      
      if (meal.mealType && summary.byMealType[meal.mealType]) {
        summary.byMealType[meal.mealType].count++;
        summary.byMealType[meal.mealType].calories += meal.calories || 0;
      }
    });
    
    res.status(200).json(summary);
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Delete a meal
app.delete('/api/meals/:id', [authenticateToken, checkMongoConnection], async (req, res) => {
  try {
    const meal = await Meal.findById(req.params.id);
    
    // Check if meal exists and belongs to the user
    if (!meal) {
      return res.status(404).json({ error: 'Meal not found' });
    }
    
    if (meal.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    await Meal.findByIdAndDelete(req.params.id);
    console.log('Meal deleted by user:', req.user.username);
    
    res.status(200).json({ message: 'Meal deleted successfully' });
  } catch (error) {
    console.error('Delete meal error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Edit a meal
app.put('/api/meals/:id', [authenticateToken, checkMongoConnection], async (req, res) => {
  try {
    const { description, calories, protein, fat, carbs, mealType, date } = req.body;
    
    const meal = await Meal.findById(req.params.id);
    
    // Check if meal exists and belongs to the user
    if (!meal) {
      return res.status(404).json({ error: 'Meal not found' });
    }
    
    if (meal.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    // Update meal
    const updatedMeal = await Meal.findByIdAndUpdate(
      req.params.id,
      {
        description,
        calories,
        protein,
        fat,
        carbs,
        mealType,
        date: new Date(date)
      },
      { new: true }
    );
    
    res.status(200).json(updatedMeal);
  } catch (error) {
    console.error('Update meal error:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Debug endpoint for JWT
app.get('/api/debug-jwt', (req, res) => {
  try {
    // Check if JWT_SECRET is set
    const secret = process.env.JWT_SECRET || 'your_jwt_secret';
    
    // Generate a test token
    const testToken = jwt.sign(
      { id: 'test-user-id', username: 'test-user' }, 
      secret,
      { expiresIn: '1h' }
    );
    
    // Verify the token to make sure it works
    const decoded = jwt.verify(testToken, secret);
    
    res.status(200).json({
      success: true,
      testToken,
      decodedToken: decoded,
      secretFirstChars: secret.substring(0, 3) + '...',
      secretLength: secret.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Debug MongoDB connection
app.get('/api/debug-mongo', (req, res) => {
  const connectionState = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  
  res.status(200).json({
    connected: mongoose.connection.readyState === 1,
    state: connectionState[mongoose.connection.readyState],
    host: mongoose.connection.host || 'none',
    name: mongoose.connection.name || 'none',
    models: Object.keys(mongoose.models)
  });
});

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).send('Calorie Tracker API is running');
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`MongoDB connection state: ${mongoose.connection.readyState}`);
  console.log(`OpenAI API Key configured: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`);
  console.log(`JWT Secret configured: ${(process.env.JWT_SECRET || 'default') !== 'default' ? 'Yes' : 'No (using default)'}`);
});