# AI Tools

## Image Generation

Simple image generation tool using OpenAI's DALL-E 3.

### Usage

```typescript
import { generateImage } from '@/lib/ai'

// Basic usage
const result = await generateImage('A serene mountain landscape at sunset')

// With options
const result = await generateImage('A modern office workspace', {
  size: '1792x1024', // '1024x1024' | '1792x1024' | '1024x1792'
  quality: 'hd',      // 'standard' | 'hd'
  style: 'natural'    // 'vivid' | 'natural'
})

// Result contains
const {
  data,   // Image URL (string)
  model,  // Model config
  usage   // Cost tracking
} = result
```

### API Endpoint

Call the API endpoint:

```typescript
const response = await fetch('/api/ai/generate-image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'A beautiful sunset over the ocean',
    size: '1024x1024',
    quality: 'standard'
  })
})

const { imageUrl, cost } = await response.json()
```

### Cost

- Standard 1024x1024: $0.04 per image
- HD costs more but provides better quality
- Costs are tracked automatically in the usage object

