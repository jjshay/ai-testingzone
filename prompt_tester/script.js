import * as http from 'http';
import fs from 'fs'; 
import 'dotenv/config';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const MODEL_NAME = "gemini-pro";
const API_KEY = process.env.GOOGLE_AI_KEY;

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: MODEL_NAME });

async function callGemini(text) {

	const generationConfig = {
		temperature: 0.9,
		topK: 1,
		topP: 1,
		maxOutputTokens: 2048,
	};

	const safetySettings = [
		{ category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE, },
		{ category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,	threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE, },
		{ category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE, },
		{ category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE, },
	];

	const parts = [
    	{text},
  	];

	const result = await model.generateContent({
		contents: [{ role: "user", parts }],
		generationConfig,
		safetySettings,
	});

	/*
	Possible enhancement, report which safetyCategory was the highest prob
{
	"safetyRatings": [
			{
					"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
					"probability": "NEGLIGIBLE"
			},
			{
					"category": "HARM_CATEGORY_HATE_SPEECH",
					"probability": "NEGLIGIBLE"
			},
			{
					"category": "HARM_CATEGORY_HARASSMENT",
					"probability": "MEDIUM"
			},
			{
					"category": "HARM_CATEGORY_DANGEROUS_CONTENT",
					"probability": "NEGLIGIBLE"
			}
	]
}
	*/
	//console.log(JSON.stringify(result,null,'\t'));

	try {

		if(result.response.promptFeedback && result.response.promptFeedback.blockReason) {

			return { error: `Blocked for ${result.response.promptFeedback.blockReason}` };
		}
		const response = result.response.candidates[0].content.parts[0].text;
		return { response };
	} catch(e) {
		// better handling
		return {
			error:e.message
		}
	}
	
}

async function handler(req, res) {
	console.log('Entered handler.', req.method, req.url);

	if(req.method === 'GET' && req.url.indexOf('favicon.ico') === -1) {
		res.writeHead(200, { 'Content-Type':'text/html' });
		res.write(fs.readFileSync('./demo.html'));
		res.end();
	} else if(req.method === 'POST' && req.url === '/api') {

		let body = '';
		req.on('data', chunk => {
			body += chunk.toString();
		});

		req.on('end', async () => {
			body = JSON.parse(body);
			console.log('BODY:\n', JSON.stringify(body, null, '\t'));

			let result = await callGemini(body.prompt);
			//let result = 'the result '+body.prompt;
			res.writeHead(200, { 'Content-Type':'application/json' });
			res.write(JSON.stringify(result));
			res.end();

		});

	}

}

const server = http.createServer(handler);
server.listen(3000);
console.log('Listening on port 3000');