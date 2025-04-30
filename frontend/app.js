import React, { useState, useEffect } from 'react';
import { Camera, Upload, X, PlusCircle, Utensils, Clock, Calendar } from 'lucide-react';

const CalorieTracker = () => {
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [meals, setMeals] = useState([]);
  const [totalCalories, setTotalCalories] = useState(0);
  const [mealDate, setMealDate] = useState(new Date());
  const [mealType, setMealType] = useState('lunch'); // breakfast, lunch, dinner, snack
  
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
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
  };

  const analyzeImage = async () => {
    setLoading(true);
    
    try {
      // Step 1: Convert the image to base64 format
      // In a real implementation, we'd either:
      // - Upload the image to temporary secure storage and get a URL
      // - Convert to base64 to send directly in the request
      
      // For this example, we'll use the base64 data from our preview
      const imageData = previewUrl.split(',')[1]; // Extract base64 data without the prefix
      
      // Step 2: Send the image to our secure backend service
      // Our backend would then use the API key stored as an environment variable
      // This way, the API key is never exposed in frontend code
      
      // Example of how the API call would look in a real implementation:
      // const response = await fetch('/api/analyze-food', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({
      //     image: imageData
      //   })
      // });
      
      // Then our backend would make the actual OpenAI API call:
      // Backend code (Node.js example):
      // 
      // const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // Stored securely as env variable
      // 
      // app.post('/api/analyze-food', async (req, res) => {
      //   try {
      //     const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      //       method: 'POST',
      //       headers: {
      //         'Content-Type': 'application/json',
      //         'Authorization': `Bearer ${OPENAI_API_KEY}`
      //       },
      //       body: JSON.stringify({
      //         model: 'gpt-4-vision-preview',
      //         messages: [
      //           {
      //             role: 'user',
      //             content: [
      //               { type: 'text', text: 'Analyze this food image and provide nutritional estimates.' },
      //               { 
      //                 type: 'image_url',
      //                 image_url: { url: `data:image/jpeg;base64,${req.body.image}` }
      //               }
      //             ]
      //           }
      //         ],
      //         max_tokens: 500
      //       })
      //     });
      //     
      //     const data = await openaiResponse.json();
      //     res.json(data);
      //   } catch (error) {
      //     console.error('Error processing image:', error);
      //     res.status(500).json({ error: 'Failed to analyze image' });
      //   }
      // });
      
      // For demo purposes, we'll simulate the API response
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock GPT-4 Vision API response
      const mockGPTResponse = {
        description: "Grilled salmon with steamed broccoli and brown rice",
        analysis: "This meal contains a good balance of protein from the salmon, fiber from the vegetables, and complex carbohydrates from the brown rice.",
        nutrition: {
          calories: 450,
          protein: 35,
          fat: 18,
          carbs: 38,
          fiber: 6,
          sugars: 2
        },
        confidence: "high"
      };
      
      // Format the response for our app
      const formattedResults = {
        description: mockGPTResponse.description,
        calories: mockGPTResponse.nutrition.calories,
        protein: mockGPTResponse.nutrition.protein,
        fat: mockGPTResponse.nutrition.fat,
        carbs: mockGPTResponse.nutrition.carbs,
        analysis: mockGPTResponse.analysis
      };
      
      setResults(formattedResults);
    } catch (error) {
      console.error("Error analyzing image:", error);
      alert("Failed to analyze image. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const saveMeal = () => {
    if (results) {
      const newMeal = {
        id: Date.now(),
        image: previewUrl,
        date: mealDate,
        mealType: mealType,
        timestamp: new Date().toISOString(),
        ...results
      };
      
      const updatedMeals = [...meals, newMeal];
      // Sort meals by timestamp, newest first
      updatedMeals.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      setMeals(updatedMeals);
      
      // Update total calories
      const newTotalCalories = updatedMeals.reduce((sum, meal) => sum + meal.calories, 0);
      setTotalCalories(newTotalCalories);
      
      // In a real app, we would save to local storage or a database
      localStorage.setItem('savedMeals', JSON.stringify(updatedMeals));
      
      clearImage();
    }
  };
  
  // Load saved meals from localStorage on component mount
  useEffect(() => {
    const savedMeals = localStorage.getItem('savedMeals');
    if (savedMeals) {
      try {
        const parsedMeals = JSON.parse(savedMeals);
        setMeals(parsedMeals);
        
        // Calculate total calories from saved meals
        const savedTotalCalories = parsedMeals.reduce((sum, meal) => sum + meal.calories, 0);
        setTotalCalories(savedTotalCalories);
      } catch (error) {
        console.error("Error loading saved meals:", error);
      }
    }
  }, []);

  const deleteMeal = (id) => {
    const updatedMeals = meals.filter(meal => meal.id !== id);
    setMeals(updatedMeals);
    
    // Update total calories
    const newTotalCalories = updatedMeals.reduce((sum, meal) => sum + meal.calories, 0);
    setTotalCalories(newTotalCalories);
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto p-4 bg-gray-50">
      <header className="text-center mb-6">
        <h1 className="text-2xl font-bold text-blue-600">AI Calorie Tracker</h1>
        <p className="text-gray-600">Powered by GPT-40 Image Analysis</p>
      </header>
      
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Today's Summary</h2>
        <div className="text-right">
          <p className="text-sm text-gray-600">Total Calories</p>
          <p className="text-xl font-bold">{totalCalories}</p>
        </div>
      </div>
      
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
        <div className="border rounded-lg p-4 mb-6 bg-white">
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
          
          {!results ? (
            <button
              className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
              onClick={analyzeImage}
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-2"></div>
                  Analyzing with GPT-40...
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
                <div className="bg-gray-100 p-2 rounded text-center">
                  <p className="text-sm text-gray-600">Calories</p>
                  <p className="font-bold">{results.calories}</p>
                </div>
                <div className="bg-gray-100 p-2 rounded text-center">
                  <p className="text-sm text-gray-600">Protein</p>
                  <p className="font-bold">{results.protein}g</p>
                </div>
                <div className="bg-gray-100 p-2 rounded text-center">
                  <p className="text-sm text-gray-600">Fat</p>
                  <p className="font-bold">{results.fat}g</p>
                </div>
                <div className="bg-gray-100 p-2 rounded text-center">
                  <p className="text-sm text-gray-600">Carbs</p>
                  <p className="font-bold">{results.carbs}g</p>
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
      
      <div className="flex-1 overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Today's Meals</h2>
        
        {meals.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <Utensils size={32} className="mx-auto mb-2" />
            <p>No meals logged yet today</p>
          </div>
        ) : (
          <div className="space-y-4">
            {meals.map(meal => {
              // Format the date
              const mealDateObj = new Date(meal.date);
              const formattedDate = mealDateObj.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              });
              
              // Get the appropriate meal type label and color
              const mealTypeLabels = {
                breakfast: { text: 'Breakfast', color: 'bg-yellow-100 text-yellow-800' },
                lunch: { text: 'Lunch', color: 'bg-green-100 text-green-800' },
                dinner: { text: 'Dinner', color: 'bg-blue-100 text-blue-800' },
                snack: { text: 'Snack', color: 'bg-purple-100 text-purple-800' }
              };
              
              const mealTypeData = mealTypeLabels[meal.mealType] || mealTypeLabels.snack;
              
              return (
                <div key={meal.id} className="border rounded-lg overflow-hidden bg-white">
                  <div className="flex items-center p-3">
                    <img 
                      src={meal.image} 
                      alt={meal.description}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center mb-1">
                        <span className={`text-xs px-2 py-1 rounded ${mealTypeData.color} mr-2`}>
                          {mealTypeData.text}
                        </span>
                        <span className="text-xs flex items-center text-gray-500">
                          <Calendar size={12} className="mr-1" />
                          {formattedDate}
                        </span>
                      </div>
                      <p className="font-medium">{meal.description}</p>
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="font-semibold mr-2">{meal.calories} cal</span>
                        <span>P: {meal.protein}g</span>
                        <span className="mx-1">•</span>
                        <span>F: {meal.fat}g</span>
                        <span className="mx-1">•</span>
                        <span>C: {meal.carbs}g</span>
                      </div>
                    </div>
                    <button 
                      className="text-gray-400 hover:text-red-500"
                      onClick={() => deleteMeal(meal.id)}
                      aria-label="Delete meal"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {image === null && (
        <button 
          className="fixed bottom-6 right-6 bg-blue-600 text-white rounded-full p-3 shadow-lg hover:bg-blue-700"
          onClick={takePhoto}
        >
          <PlusCircle size={24} />
        </button>
      )}
    </div>
  );
};

export default CalorieTracker;