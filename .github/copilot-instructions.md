<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# TikTok Funny Moments Finder - Development Instructions

This Next.js TypeScript application analyzes YouTube videos using Google's Gemini AI to identify funny moments suitable for TikTok clips.

## Key Components

1. **YouTube Input Component**: Handles URL input for video analysis
2. **Video Player Component**: Displays the YouTube video with timestamp navigation
3. **Funny Moments List Component**: Displays AI-identified funny moments with their details
4. **Gemini AI Integration**: Analyzes videos to find funny moments
5. **Remotion Integration**: Creates video clips from identified moments

## Data Structures

The application uses the following key interfaces:

```typescript
export interface FunnyMoment {
  moment_id: number;
  description: string;
  timestamp_start: string;
  timestamp_end: string;
  duration_seconds: number;
  why_its_tiktok_funny: string;
  suggested_caption_hook: string;
}

export interface GeminiResponse {
  funniest_moments_list: FunnyMoment[];
}
```

## Best Practices

1. Always use TypeScript interfaces for props and state
2. Maintain Tailwind CSS styling consistent with the current design
3. Handle error states and loading states for API calls
4. Use proper React hooks for state management (useState, useEffect)
5. Follow Next.js App Router patterns for API routes
6. Keep components modular and focused on single responsibilities
7. Ensure responsive design works on all screen sizes

## Future Enhancements

Potential areas for improvement:

1. Implement actual Remotion rendering for video clips
2. Add user authentication and saved clips library
3. Implement social sharing capabilities
4. Add customization options for TikTok clip generation
5. Enhance AI prompt to better identify funny moments in specific video genres