# AI Processing Pipeline - Product Requirements Document

**Version**: 1.0  
**Date**: 2025-10-30  
**Author**: Development Team  
**Status**: Draft for Review

## 1. Executive Summary

This PRD defines the AI processing pipeline for the Brain Dump Canvas application, specifying how different AI models will enhance user-created ideas through summarization, embedding generation, and semantic analysis. The pipeline is designed for full user control, transparency, and incremental processing.

## 2. Core Objectives

### 2.1 Primary Goals
- **User Control**: Users can enable/disable any AI processing step
- **Transparency**: Users see what AI is doing and can revert changes
- **Performance**: Non-blocking, background processing with immediate UI feedback
- **Cost Management**: Intelligent batching and selective processing to minimize API costs
- **Quality**: Consistent, high-quality AI enhancements that add real value

### 2.2 Success Metrics
- AI processing completion rate > 95%
- User satisfaction with AI-generated summaries > 80%
- Average processing time < 5 seconds per idea
- Cost per processed idea < $0.01
- User retention of AI-enhanced ideas > 90%

## 3. AI Processing Nodes & Pipeline

### 3.1 Processing Node Architecture

```
[User Input] → [Immediate UI] → [Processing Queue] → [AI Nodes] → [Database Update] → [UI Refresh]
                     ↓
               [Optimistic UI]
```

### 3.2 Individual AI Processing Nodes

#### **Node 1: Content Summarization**
- **Purpose**: Generate concise, searchable summaries
- **Model**: OpenAI GPT-4 Turbo
- **Input**: Original user text
- **Output**: 1-2 sentence summary
- **Trigger**: Automatic for text > 50 characters
- **User Control**: Can edit summary, regenerate, or disable
- **Processing Time**: 1-3 seconds
- **Cost**: ~$0.002 per idea

**API Specification**:
```typescript
interface SummarizationRequest {
  text: string
  maxLength: number         // Character limit for summary
  style: 'concise' | 'descriptive' | 'keyword-focused'
  context?: string         // Brain dump context for better summaries
}

interface SummarizationResponse {
  summary: string
  keyTopics: string[]
  confidence: number
  alternativeSummaries: string[]  // 2-3 alternatives for user choice
}
```

#### **Node 2: Vector Embedding Generation**
- **Purpose**: Enable semantic search and idea clustering
- **Model**: OpenAI text-embedding-3-small
- **Input**: Original user text
- **Output**: 1536-dimensional vector
- **Trigger**: Automatic for all processed ideas
- **User Control**: Can regenerate if text changes significantly
- **Processing Time**: 0.5-1 seconds
- **Cost**: ~$0.0001 per idea

**API Specification**:
```typescript
interface EmbeddingRequest {
  text: string
  model: 'text-embedding-3-small' | 'text-embedding-3-large'
  dimensions?: number      // Optional dimensionality reduction
}

interface EmbeddingResponse {
  embedding: number[]      // Vector array
  model: string
  dimensions: number
  usage: {
    promptTokens: number
    totalTokens: number
  }
}
```

### 3.3 Implementation Notes

- Shared AI logic (clients, model metadata, prompts, cost tracking) now lives in `src/lib/ai/`.
- Background workers and API routes call helpers such as `summarizeText` and `createEmbedding` to ensure consistent prompts, models, and logging across nodes.
- Usage statistics returned from the helpers include token counts and computed cost, enabling unified reporting in `ai_operations`.

#### **Node 3: Semantic Analysis & Tagging**
- **Purpose**: Auto-generate tags and detect themes/categories
- **Model**: OpenAI GPT-4 Turbo
- **Input**: Processed text and existing brain dump context
- **Output**: Suggested tags and category classifications
- **Trigger**: User-enabled (optional feature)
- **User Control**: Full control over tag acceptance/rejection
- **Processing Time**: 1-2 seconds
- **Cost**: ~$0.001 per idea

**API Specification**:
```typescript
interface SemanticAnalysisRequest {
  text: string
  existingTags: string[]           // Tags already in brain dump
  brainDumpContext: {
    existingIdeas: Array<{
      text: string
      tags: string[]
    }>
  }
}

interface SemanticAnalysisResponse {
  suggestedTags: string[]
  categories: string[]
  themes: string[]
  relationships: Array<{
    ideaId: string
    relationshipType: 'similar' | 'contradicts' | 'builds-on'
    confidence: number
  }>
}
```

## 4. Processing Pipeline States

### 4.1 Idea Processing States
```typescript
type ProcessingState = 
  | 'pending'           // Just created, not processed
  | 'processing'        // Currently being processed
  | 'summary-complete'  // Summarization done
  | 'embedding-complete'// Embedding generated
  | 'analysis-complete' // Semantic analysis done
  | 'fully-processed'   // All steps complete
  | 'failed'           // Processing failed
  | 'user-skipped'     // User chose to skip AI processing
```

### 4.2 Database Schema Updates
```sql
-- Add to ideas table
ALTER TABLE ideas ADD COLUMN processing_state VARCHAR(20) DEFAULT 'pending';
ALTER TABLE ideas ADD COLUMN ai_metadata JSONB; -- Store AI processing metadata

-- AI processing log table
CREATE TABLE ai_processing_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID REFERENCES ideas(id) ON DELETE CASCADE,
  node_type VARCHAR(50) NOT NULL, -- 'summary', 'embedding', 'analysis'
  input_text TEXT NOT NULL,
  output_data JSONB NOT NULL,
  model_used VARCHAR(100) NOT NULL,
  tokens_used INTEGER,
  cost_usd DECIMAL(10,6),
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## 5. User Interface & Control

### 5.1 AI Processing Controls

#### **Global Settings (Settings Modal)**
```typescript
interface AISettings {
  enableSummarization: boolean
  enableEmbedding: boolean
  enableSemanticAnalysis: boolean
  
  summaryLength: 'short' | 'medium' | 'long'
  autoProcessing: boolean          // Process automatically vs manual trigger
  
  costLimit: {
    dailyLimit: number             // USD per day
    perIdeaLimit: number          // USD per idea
    alertThreshold: number        // Alert when approaching limit
  }
}
```

#### **Per-Idea Controls (Idea Modal/Panel)**
```typescript
interface IdeaAIControls {
  // Show processing status
  processingState: ProcessingState
  lastProcessed: Date
  
  // Manual controls
  actions: {
    regenerateSummary: () => void
    skipAIProcessing: () => void
  }
  
  // Show AI changes
  changes: {
    summary: string
    suggestedTags: string[]
  }
  
  // Cost tracking
  processingCost: number
}
```

### 5.2 Visual Indicators

#### **Canvas Idea Indicators**
- **🔄 Processing**: Subtle spinner animation
- **✨ AI Enhanced**: Small AI badge/icon
- **⚠️ Failed**: Warning indicator with retry option
- **📝 Original**: No special indicator

#### **Processing Queue UI**
- Live queue status in header: "Processing 3 ideas..."
- Individual progress bars for each processing step
- Cost tracker: "Today's AI usage: $0.15 / $2.00"

## 6. Technical Implementation

### 6.1 API Routes Structure

```
app/api/ai/
├── summarize/route.ts       # Summarization endpoint  
├── embeddings/route.ts      # Vector embedding generation
├── analyze/route.ts         # Semantic analysis
├── process/route.ts         # Orchestrate full pipeline
└── queue/route.ts           # Queue management
```

### 6.2 Background Job Processing

#### **Queue Management**
```typescript
interface ProcessingJob {
  id: string
  ideaId: string
  brainDumpId: string
  steps: ('summary' | 'embedding' | 'analysis')[]
  priority: 'high' | 'normal' | 'low'
  retryCount: number
  maxRetries: number
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  failedAt?: Date
  error?: string
}
```

#### **Processing Order**
1. **High Priority**: User-requested reprocessing
2. **Normal Priority**: New ideas from current session
3. **Low Priority**: Background reprocessing of old ideas

### 6.3 Error Handling & Resilience

#### **Retry Logic**
```typescript
interface RetryConfig {
  maxRetries: 3
  backoffStrategy: 'exponential'  // 1s, 2s, 4s
  retryableErrors: [
    'rate_limit_exceeded',
    'server_error',
    'timeout'
  ]
  nonRetryableErrors: [
    'invalid_api_key',
    'insufficient_quota',
    'content_policy_violation'
  ]
}
```

#### **Fallback Behaviors**
- **Summarization fails**: Generate simple truncation
- **Embedding fails**: Skip semantic features, log for manual retry
- **Analysis fails**: Skip tags and relationships

## 7. Cost Management & Optimization

### 7.1 Cost Estimation
```
Average costs per idea (USD):
- Summarization: $0.002  
- Embedding: $0.0001
- Semantic analysis: $0.001
Total per idea: ~$0.0031

Expected monthly usage (100 active users, 50 ideas/user):
- Total ideas: 5,000
- Total cost: ~$15.50/month
```

### 7.2 Optimization Strategies
- **Batch processing**: Group multiple embeddings in single API call
- **Caching**: Cache embeddings for identical text
- **Smart triggering**: Only reprocess if text changes significantly (>20%)
- **User limits**: Per-user daily/monthly processing caps

## 8. Privacy & Data Handling

### 8.1 Data Flow
- **Stored locally**: All original text remains in your database
- **Sent to OpenAI**: Only text content (no user IDs or metadata)
- **OpenAI retention**: 30 days (per OpenAI policy)
- **Opt-out**: Users can disable all AI processing

### 8.2 Compliance
- **GDPR**: Users can request deletion of AI processing logs
- **Content policies**: Filter out inappropriate content before AI processing
- **Audit trail**: Complete log of all AI processing activities

## 9. Implementation Phases

### Phase 1: Core Pipeline (Week 1)
- [ ] Summarization API endpoint
- [ ] Basic queue processing
- [ ] Database schema updates
- [ ] User settings for enable/disable

### Phase 2: Enhanced Features (Week 2)
- [ ] Embedding generation
- [ ] Vector similarity search
- [ ] Processing status UI
- [ ] Cost tracking and limits

### Phase 3: Advanced Features (Week 3)
- [ ] Semantic analysis and tagging
- [ ] Batch processing optimization
- [ ] Advanced retry logic
- [ ] Analytics and monitoring

### Phase 4: Polish & Optimization (Week 4)
- [ ] Performance optimization
- [ ] Advanced user controls
- [ ] A/B testing framework
- [ ] Documentation and onboarding

## 10. Testing Strategy

### 10.1 Unit Tests
- Test each AI node independently
- Mock OpenAI API responses
- Test error handling and retry logic
- Validate cost calculations

### 10.2 Integration Tests
- End-to-end pipeline processing
- Queue management under load
- User preference application
- Database consistency

### 10.3 User Testing
- A/B test different summary styles
- Measure user satisfaction with AI enhancements
- Test cost limit effectiveness
- Validate accessibility of AI controls

## 11. Monitoring & Analytics

### 11.1 Key Metrics
- Processing success rate by node type
- Average processing time per node
- Cost per processed idea
- User engagement with AI features
- API error rates and types

### 11.2 Alerts
- Processing queue backup (>100 jobs)
- High error rate (>5%)
- Cost threshold exceeded
- API rate limit approaching

---

## Appendix A: OpenAI API Integration Details

### A.1 Authentication
```typescript
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
});
```

### A.2 Rate Limiting
- **GPT-4 Turbo**: 10,000 TPM (tokens per minute)
- **Embeddings**: 1,000,000 TPM
- **Batch processing**: Use OpenAI Batch API for non-urgent processing

### A.3 Model Selection
- **Primary**: GPT-4 Turbo (latest) for text processing
- **Fallback**: GPT-3.5 Turbo if GPT-4 unavailable
- **Embeddings**: text-embedding-3-small (cost-effective)

---

This PRD provides the foundation for a robust, user-controlled AI processing pipeline. Each component is designed to be independently implementable and testable, giving you full control over the development process.