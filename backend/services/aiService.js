// services/aiService.js
// Connects Node.js backend to the Python AI microservice

const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// Timeout for AI service requests (ms)
const AI_TIMEOUT = 10000;

/**
 * Call Python AI microservice to predict today's food waste
 *
 * @param {Object} payload
 * @param {Array}  payload.historicalData   - Last 7 days stats array
 * @param {Object} payload.sameDayLastYear  - Same day stats from last year (may be null)
 * @param {string} payload.today            - Today's date string YYYY-MM-DD
 * @returns {number} predicted waste value
 */
const predictWaste = async (payload) => {
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/predict-waste`,
      payload,
      {
        timeout: AI_TIMEOUT,
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (response.data && response.data.predicted_waste !== undefined) {
      return Math.max(0, Math.round(response.data.predicted_waste));
    }

    throw new Error('Invalid response from AI service');
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error('AI service is not running. Start the Python service on port 8000.');
    }
    if (error.code === 'ETIMEDOUT') {
      throw new Error('AI service timed out.');
    }
    throw error;
  }
};

/**
 * Health check for the AI microservice
 * @returns {boolean}
 */
const checkAIHealth = async () => {
  try {
    const response = await axios.get(`${AI_SERVICE_URL}/health`, { timeout: 3000 });
    return response.data?.status === 'ok';
  } catch {
    return false;
  }
};

module.exports = { predictWaste, checkAIHealth };