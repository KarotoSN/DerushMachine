# TikTok Funny Moments Finder

A Next.js application that uses Google's Gemini AI to analyze YouTube videos and identify funny moments suitable for TikTok clips.

## Features

- 🎬 Input any YouTube video URL
- 🤖 AI-powered analysis using Google's Gemini to identify funny moments
- ⏱️ Timestamps for each funny moment with descriptions
- 🎯 Explanation of why each moment would perform well on TikTok
- 📝 Suggested caption hooks for each clip
- ✂️ Create clips from the identified funny moments using Remotion

## Getting Started

### Prerequisites

- Node.js 18.x or later
- A Google Gemini API key ([Get one here](https://aistudio.google.com/app/apikey))

### Installation

1. Clone the repository or download the source code

2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file in the root directory based on the `.env.local.example` file:

```bash
cp .env.local.example .env.local
```

4. Add your Gemini API key to the `.env.local` file:

```
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
```

### Running the Application

1. Start the development server:

```bash
npm run dev
```

2. Open [http://localhost:3000](http://localhost:3000) in your browser

## How It Works

1. **Enter a YouTube URL**: Paste the URL of any YouTube video you want to analyze.
2. **AI Analysis**: The application sends the video URL to Google's Gemini AI, which analyzes the content for funny moments.
3. **View Results**: The AI returns a list of funny moments with timestamps, descriptions, and explanations of why they would perform well on TikTok.
4. **Watch Moments**: Click on any moment to watch it directly in the embedded player.
5. **Create TikTok Clips**: Generate short clips optimized for TikTok using the identified funny moments.

## Technical Details

This application is built with:

- **Next.js**: React framework with App Router
- **TypeScript**: For type safety
- **Tailwind CSS**: For styling
- **Google Gemini AI**: For video content analysis
- **React Player**: For YouTube video embedding
- **Remotion**: For video editing and clip creation

## Limitations

- The application requires a valid Gemini API key to function.
- Video analysis quality depends on the Gemini AI model's ability to understand video content from the URL.
- In the current implementation, Remotion rendering is mocked. In a production environment, you would implement actual video rendering.

## License

[MIT License](LICENSE)

## Acknowledgments

- Google's Gemini AI for providing the powerful generative AI capabilities
- Remotion for the video editing framework
- Next.js team for the excellent React framework
