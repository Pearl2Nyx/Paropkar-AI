# Paropkar AI

Voice-First Certificate Intelligence that helps Indian citizens track, renew, and apply for government certificates before deadlines so they never lose scholarships, reservations, or welfare benefits due to expired documents.

Hackathon: AWS AI for Bharat  
Track: AI for Communities, Access & Public Impact  
Team: SoloForge AI

## Problem

Millions of Indian citizens lose scholarships, reservations, and welfare benefits because certificates expire before application deadlines.

Common issues include:

- Income certificates valid for only **1 year**
- Government processing time **10–30 days**
- Scholarship portals reject expired certificates
- No platform tracks certificate validity or renewal timing

## Solution

Paropkar AI predicts certificate expiry and tells users **exactly when to apply** for renewal.

Users can:

- Speak to the system in their language
- Upload certificate photos
- Automatically extract certificate details
- Calculate expiry and apply-by deadlines
- Receive reminders before deadlines

## Key Features

- Certificate expiry tracking
- AI deadline prediction
- Document OCR using Amazon Textract
- Voice interface using Amazon Transcribe + Polly
- Multilingual support
- Deadline reminders

## Tech Stack

### Frontend
- React
- Vite
- TailwindCSS

### Backend
- Node.js
- Express

### AI
- Llama 3.1 (Groq API)

### AWS Services
- AWS Amplify — Frontend hosting
- Amazon API Gateway — Secure API routing
- AWS Lambda — Serverless backend functions
- Amazon S3 — Certificate storage
- Amazon DynamoDB — User data and deadline tracking
- Amazon Textract — Certificate OCR
- Amazon Transcribe — Voice input
- Amazon Polly — Voice output
- AWS Translate — Multilingual responses

## Project Structure
