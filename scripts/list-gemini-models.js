// Script to list available Gemini models
require('dotenv').config({ path: '.env.local' });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY not found in environment');
    process.exit(1);
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    console.log('Fetching available Gemini models...\n');

    const models = await genAI.listModels();

    console.log('Available models:');
    console.log('================\n');

    for await (const model of models) {
      console.log(`Name: ${model.name}`);
      console.log(`Display Name: ${model.displayName}`);
      console.log(`Description: ${model.description}`);
      console.log(`Supported Methods: ${model.supportedGenerationMethods.join(', ')}`);
      console.log('---');
    }

  } catch (error) {
    console.error('Error listing models:', error.message);
    console.error(error);
  }
}

listModels();
