// src/components/CalorieTracker.js
import React, { useState, useEffect } from 'react';
import { Camera, Upload, X, PlusCircle, Utensils, Calendar, LogIn, LogOut, UserPlus, Info } from 'lucide-react';
import WeeklyCalendar from './WeeklyCalendar';
import AuthService from './services/AuthService';

const API_URL = 'http://localhost:3001/api';

const CalorieTracker = () => {
  // Core app state
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [meals, setMeals] = useState([]);
  const [totalCalories, setTotalCalories] = useState(0);
  const [mealDate, setMealDate] = useState(new Date());
  const [mealType, setMealType] = useState('lunch');
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [nutritionSummary, setNutritionSummary] = useState({
    totalCalories: 0,
    totalProtein: 0,
    totalFat: 0,
    totalCarbs: 0,
    mealCount: 0
  });
  
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [authView, setAuthView] = useState(null); // 'login', 'register', or null
  const [authForm, setAuthForm] = useState({
    username: '',
    email: '',
    password: ''
  });
  
  // Check for existing auth on component mount
  useEffect(() => {
    if (AuthService.isLoggedIn()) {
      // Check if token is expired
      if (AuthService.isTokenExpired()) {
        // Token is expired, log out
        handleLogout();
        setError("Your session has expired. Please log in again.");
        setAuthView('login');
      } else {
        // Token is valid
        const userData = AuthService.getUser();
        setIsLoggedIn(true);
        setUser(userData);
        // Load user's meals for the selected date
        fetchMealsForDate(new Date());
      }
    }
  }, []);
  
  // Update meals when selected date changes
  useEffect(() => {
    if (isLoggedIn) {
      fetchMealsForDate(selectedDate);
    }
  }, [selectedDate, isLoggedIn]);
  
  // Image handling functions
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setError(null);
      setImage(file);
      const fileReader = new FileReader();
      fileReader.onload = () => {
        setPreviewUrl(fileReader.result);
      };
      fileReader.readAsDataURL(file);
    }
  };

  const takePhoto = () => {
    // In a real implementation, this would activate the camera
    alert("Camera functionality would be activated here");
  };

  const clearImage = () => {
    setImage(null);
    setPreviewUrl(null);
    setResults(null);
    setError(null);
  };
  
  // Handle date selection from calendar
  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setMealDate(date); // Also update meal entry date
  };
  
  // Food analysis function
  const analyzeImage = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Convert the image to base64 format
      const imageData = previewUrl.split(',')[1];
      
      // Send the image to our backend service
      const response = await fetch(`${API_URL}/analyze-food`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image: imageData
        }),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `Server error: ${response.status}`;
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      setResults(data);
    } catch (error) {
      console.error("Error analyzing image:", error);
      setError(error.message || "Failed to analyze image. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  // Meal management functions
  // Replace the saveMeal function in CalorieTracker.js with this updated version
const saveMeal = async () => {
  if (!results) return;
  
  if (!isLoggedIn) {
    setError("Please log in to save meals");
    setAuthView('login');
    return;
  }
  
  try {
    // Create meal data without storing the full image URL
    const mealData = {
      description: results.description,
      calories: results.calories,
      protein: results.protein,
      fat: results.fat,
      carbs: results.carbs,
      mealType: mealType,
      date: mealDate.toISOString(),
      // Don't include imageUrl to avoid storing large image data
      analysis: results.analysis
    };
    
    const response = await fetch(`${API_URL}/meals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...AuthService.authHeader()
      },
      body: JSON.stringify(mealData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to save meal');
    }
    
    // Refresh meals list for the selected date
    fetchMealsForDate(selectedDate);
    
    // Clear the current image/results
    clearImage();
  } catch (error) {
    console.error("Error saving meal:", error);
    setError(error.message || "Failed to save meal");
  }
};
  
  const deleteMeal = async (id) => {
    if (!isLoggedIn) return;
    
    try {
      const response = await fetch(`${API_URL}/meals/${id}`, {
        method: 'DELETE',
        headers: {
          ...AuthService.authHeader()
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete meal');
      }
      
      // Refresh meals list for the selected date
      fetchMealsForDate(selectedDate);
    } catch (error) {
      console.error("Error deleting meal:", error);
      setError(error.message || "Failed to delete meal");
    }
  };
  
  const fetchMealsForDate = async (date) => {
    try {
      setLoading(true);
      
      // Format the date for the API
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      // Fetch meals for the date range using AuthService for headers
      const response = await fetch(
        `${API_URL}/meals?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`, 
        {
          headers: {
            ...AuthService.authHeader()
          }
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch meals');
      }
      
      const mealsData = await response.json();
      setMeals(mealsData);
      
      // Calculate total nutrition for the day
      calculateDailyNutrition(mealsData);
    } catch (error) {
      console.error("Error fetching meals:", error);
      setError(error.message || "Failed to fetch meals");
    } finally {
      setLoading(false);
    }
  };
  
  const calculateDailyNutrition = (mealsData) => {
    const summary = {
      totalCalories: 0,
      totalProtein: 0,
      totalFat: 0,
      totalCarbs: 0,
      mealCount: mealsData.length
    };
    
    mealsData.forEach(meal => {
      summary.totalCalories += meal.calories || 0;
      summary.totalProtein += meal.protein || 0;
      summary.totalFat += meal.fat || 0;
      summary.totalCarbs += meal.carbs || 0;
    });
    
    setTotalCalories(summary.totalCalories);
    setNutritionSummary(summary);
  };
  
  // Auth functions
  const handleAuthFormChange = (e) => {
    setAuthForm({
      ...authForm,
      [e.target.name]: e.target.value
    });
  };
  
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Use AuthService for login
      const data = await AuthService.login(authForm.username, authForm.password);
      
      // Update state
      setIsLoggedIn(true);
      setUser({
        id: data.userId,
        username: data.username,
        email: data.email
      });
      
      // Fetch user's meals for the selected date
      fetchMealsForDate(selectedDate);
      
      // Close auth modal
      setAuthView(null);
      
      // Reset form
      setAuthForm({
        username: '',
        email: '',
        password: ''
      });
    } catch (error) {
      console.error("Login error:", error);
      setError(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };
  
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Use AuthService for registration
      await AuthService.register(
        authForm.username, 
        authForm.email, 
        authForm.password
      );
      
      // Switch to login view
      setAuthView('login');
      setError("Registration successful! Please log in.");
      
      // Reset form (keep username for convenience)
      setAuthForm({
        ...authForm,
        email: '',
        password: ''
      });
    } catch (error) {
      console.error("Registration error:", error);
      setError(error.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };
  
  const handleLogout = () => {
    // Use AuthService for logout
    AuthService.logout();
    
    // Update state
    setIsLoggedIn(false);
    setUser(null);
    setMeals([]);
    setTotalCalories(0);
    setNutritionSummary({
      totalCalories: 0,
      totalProtein: 0,
      totalFat: 0,
      totalCarbs: 0,
      mealCount: 0
    });
  };
  
  // Format date for display
  const formatSelectedDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
  };
  
  // UI Components
  const renderAuthModal = () => {
    if (!authView) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {authView === 'login' ? 'Log In' : 'Create Account'}
            </h2>
            <button 
              onClick={() => setAuthView(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              <p className="text-sm">{error}</p>
            </div>
          )}
          
          <form onSubmit={authView === 'login' ? handleLogin : handleRegister}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                name="username"
                value={authForm.username}
                onChange={handleAuthFormChange}
                className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            
            {authView === 'register' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={authForm.email}
                  onChange={handleAuthFormChange}
                  className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            )}
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={authForm.password}
                onChange={handleAuthFormChange}
                className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            
            <div className="flex flex-col space-y-3">
              <button
                type="submit"
                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
                disabled={loading}
              >
                {loading ? 'Processing...' : authView === 'login' ? 'Log In' : 'Create Account'}
              </button>
              
              <button
                type="button"
                onClick={() => setAuthView(authView === 'login' ? 'register' : 'login')}
                className="w-full py-2 text-blue-600 hover:underline"
              >
                {authView === 'login' ? 'Need an account? Sign up' : 'Already have an account? Log in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };
  
  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto p-4 bg-gray-50">
      {renderAuthModal()}
      
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-blue-600">AI Calorie Tracker</h1>
        
        {isLoggedIn ? (
          <div className="flex items-center">
            <span className="text-sm text-gray-600 mr-2">
              Hi, {user.username}
            </span>
            <button 
              onClick={handleLogout}
              className="p-1 text-gray-500 hover:text-red-500"
              title="Log out"
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <div className="flex space-x-2">
            <button 
              onClick={() => setAuthView('login')}
              className="flex items-center text-sm px-3 py-1 border border-blue-500 text-blue-500 rounded-lg hover:bg-blue-50"
            >
              <LogIn size={16} className="mr-1" />
              Log In
            </button>
            <button 
              onClick={() => setAuthView('register')}
              className="flex items-center text-sm px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              <UserPlus size={16} className="mr-1" />
              Sign Up
            </button>
          </div>
        )}
      </header>
      
      {/* Weekly Calendar */}
      <div className="mb-6">
        <WeeklyCalendar onDateSelect={handleDateSelect} />
      </div>
      
      {/* Date and Nutrition Summary */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="text-xl font-semibold mb-2">
          {formatSelectedDate(selectedDate)}
        </h2>
        
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="bg-blue-50 p-3 rounded-lg text-center">
            <p className="text-sm text-gray-600 mb-1">Calories</p>
            <p className="text-xl font-bold text-blue-700">{nutritionSummary.totalCalories}</p>
          </div>
          <div className="bg-green-50 p-3 rounded-lg text-center">
            <p className="text-sm text-gray-600 mb-1">Protein</p>
            <p className="text-xl font-bold text-green-700">{nutritionSummary.totalProtein}g</p>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg text-center">
            <p className="text-sm text-gray-600 mb-1">Fat</p>
            <p className="text-xl font-bold text-yellow-700">{nutritionSummary.totalFat}g</p>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg text-center">
            <p className="text-sm text-gray-600 mb-1">Carbs</p>
            <p className="text-xl font-bold text-purple-700">{nutritionSummary.totalCarbs}g</p>
          </div>
        </div>
      </div>
      
      {/* Food Analysis Section */}
      {!image ? (
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6 mb-6 bg-white">
          <div className="flex space-x-4 mb-4">
            <button 
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              onClick={takePhoto}
            >
              <Camera size={20} className="mr-2" />
              Take Photo
            </button>
            
            <label className="flex items-center px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 cursor-pointer">
              <Upload size={20} className="mr-2" />
              Upload
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={handleImageUpload}
              />
            </label>
          </div>
          <p className="text-gray-500 text-sm text-center">
            Take a photo or upload an image of your meal to get nutritional information
          </p>
        </div>
      ) : (
        <div className="border rounded-lg p-4 mb-6 bg-white shadow">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">Image Analysis</h3>
            <button onClick={clearImage} className="text-gray-500 hover:text-red-500">
              <X size={20} />
            </button>
          </div>
          
          <div className="relative mb-4">
            <img 
              src={previewUrl} 
              alt="Food preview" 
              className="w-full h-48 object-cover rounded-lg"
            />
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              <p className="text-sm">{error}</p>
              <p className="text-xs mt-1">Try again or use a different image</p>
            </div>
          )}
          
          {!results ? (
            <button
              className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
              onClick={analyzeImage}
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                  Analyzing...
                </div>
              ) : 'Analyze with AI'}
            </button>
          ) : (
            <div>
              <h4 className="font-medium mb-2">{results.description}</h4>
              
              {results.analysis && (
                <p className="text-sm text-gray-600 mb-3 italic">
                  "{results.analysis}"
                </p>
              )}
              
              <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="bg-blue-50 p-2 rounded text-center">
                  <p className="text-sm text-gray-600">Calories</p>
                  <p className="font-bold text-blue-700">{results.calories}</p>
                </div>
                <div className="bg-green-50 p-2 rounded text-center">
                  <p className="text-sm text-gray-600">Protein</p>
                  <p className="font-bold text-green-700">{results.protein}g</p>
                </div>
                <div className="bg-yellow-50 p-2 rounded text-center">
                  <p className="text-sm text-gray-600">Fat</p>
                  <p className="font-bold text-yellow-700">{results.fat}g</p>
                </div>
                <div className="bg-purple-50 p-2 rounded text-center">
                  <p className="text-sm text-gray-600">Carbs</p>
                  <p className="font-bold text-purple-700">{results.carbs}g</p>
                </div>
              </div>
              
              <div className="mb-4">
                <div className="flex space-x-2 mb-3">
                  <div className="flex-1">
                    <label className="block text-sm text-gray-600 mb-1">Meal Type</label>
                    <select 
                      className="w-full border rounded-lg p-2 bg-white" 
                      value={mealType}
                      onChange={(e) => setMealType(e.target.value)}
                    >
                      <option value="breakfast">Breakfast</option>
                      <option value="lunch">Lunch</option>
                      <option value="dinner">Dinner</option>
                      <option value="snack">Snack</option>
                    </select>
                  </div>
                  
                  <div className="flex-1">
                    <label className="block text-sm text-gray-600 mb-1">Date</label>
                    <input 
                      type="date" 
                      className="w-full border rounded-lg p-2 bg-white"
                      value={mealDate.toISOString().split('T')[0]} 
                      onChange={(e) => setMealDate(new Date(e.target.value))}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  onClick={saveMeal}
                >
                  Save Meal
                </button>
                <button
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
                  onClick={clearImage}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Meals List */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Meals</h2>
          <span className="text-sm text-gray-500">{meals.length} {meals.length === 1 ? 'meal' : 'meals'}</span>
        </div>
        
        {meals.length === 0 ? (
  <div className="text-center py-8 bg-white rounded-lg shadow">
    <Utensils size={32} className="mx-auto mb-2 text-gray-400" />
    <p className="text-gray-500">No meals logged for this day</p>
    {!isLoggedIn && (
      <p className="text-sm text-gray-400 mt-2">
        <button
          onClick={() => setAuthView('login')}
          className="text-blue-500 hover:underline"
        >
          Log in
        </button> to track your meals
      </p>
    )}
  </div>
) : (
  <div className="space-y-4">
    {meals.map(meal => {
      // Get the appropriate meal type label and color
      const mealTypeLabels = {
        breakfast: { text: 'Breakfast', color: 'bg-yellow-100 text-yellow-800' },
        lunch: { text: 'Lunch', color: 'bg-green-100 text-green-800' },
        dinner: { text: 'Dinner', color: 'bg-blue-100 text-blue-800' },
        snack: { text: 'Snack', color: 'bg-purple-100 text-purple-800' }
      };
      
      const mealTypeData = mealTypeLabels[meal.mealType] || mealTypeLabels.snack;
      
      // Format the time
      const mealTime = new Date(meal.date).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      
      return (
        <div key={meal._id || meal.id} className="border rounded-lg overflow-hidden bg-white shadow">
          <div className="p-3">
            {/* Header with meal type and time */}
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center">
                <span className={`text-xs px-2 py-1 rounded ${mealTypeData.color} mr-2`}>
                  {mealTypeData.text}
                </span>
                <span className="text-xs text-gray-500">
                  {mealTime}
                </span>
              </div>
              <button 
                className="text-gray-400 hover:text-red-500"
                onClick={() => deleteMeal(meal._id || meal.id)}
                aria-label="Delete meal"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Meal description */}
            <p className="font-medium text-gray-800 mb-2">{meal.description}</p>
            
            {/* Nutritional information */}
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-blue-50 p-2 rounded text-center">
                <p className="text-xs text-gray-600">Calories</p>
                <p className="font-bold text-blue-700">{meal.calories}</p>
              </div>
              <div className="bg-green-50 p-2 rounded text-center">
                <p className="text-xs text-gray-600">Protein</p>
                <p className="font-bold text-green-700">{meal.protein}g</p>
              </div>
              <div className="bg-yellow-50 p-2 rounded text-center">
                <p className="text-xs text-gray-600">Fat</p>
                <p className="font-bold text-yellow-700">{meal.fat}g</p>
              </div>
              <div className="bg-purple-50 p-2 rounded text-center">
                <p className="text-xs text-gray-600">Carbs</p>
                <p className="font-bold text-purple-700">{meal.carbs}g</p>
              </div>
            </div>
          </div>
        </div>
      );
    })}
  </div>
)}
      </div>
      
      {image === null && isLoggedIn && (
        <button 
          className="fixed bottom-6 right-6 bg-blue-600 text-white rounded-full p-3 shadow-lg hover:bg-blue-700"
          onClick={takePhoto}
          title="Add a meal"
        >
          <PlusCircle size={24} />
        </button>
      )}
    </div>
  );
};

export default CalorieTracker;