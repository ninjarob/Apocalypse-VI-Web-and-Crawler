# Setting Up Ollama for the MUD Crawler

## What is Ollama?

Ollama lets you run AI models locally on your computer - for FREE! No API keys, no costs, no limits.

Think of it like Docker for AI models:
- Download models once
- Run them locally
- Use via simple API calls
- Works offline
- Zero cost

## Installation Steps

### 1. Install Ollama

**Windows (Choose one):**

```powershell
# Option A: Download installer
# Visit: https://ollama.com/download/windows
# Run the installer

# Option B: Using winget
winget install Ollama.Ollama
```

**Verify installation:**
```powershell
ollama --version
```

### 2. Start Ollama Service

Ollama usually starts automatically. To check:

```powershell
# Test if it's running
curl http://localhost:11434

# Should see: "Ollama is running"
```

If not running, start it:
```powershell
ollama serve
```

### 3. Download AI Model

We'll use **llama3.2:3b** (3 billion parameters) - it's fast and good for commands:

```powershell
ollama pull llama3.2:3b
```

**This will download ~2GB.** Other great models:

```powershell
# Faster, smaller (1.5GB)
ollama pull llama3.2:1b

# Better reasoning (4.7GB)
ollama pull llama3.1:8b

# Good alternative (4.1GB)
ollama pull mistral

# Microsoft's efficient model (2.3GB)
ollama pull phi3
```

### 4. Test the Model

```powershell
ollama run llama3.2:3b
```

Type a question:
```
>>> You are exploring a dark room with exits north and south. What should you do?
```

It should respond! Type `/bye` to exit.

## How the Crawler Uses Ollama

### API Calls

The crawler talks to Ollama like this:

```javascript
// POST http://localhost:11434/api/generate
{
  "model": "llama3.2:3b",
  "prompt": "You are in a dark room. What command should you type?",
  "stream": false
}

// Response:
{
  "response": "look"
}
```

### Why It's Perfect for This Project

1. **No Costs**: Run 24/7 without worrying about API bills
2. **Fast**: Local = no network latency
3. **Privacy**: Game data never leaves your machine
4. **Reliable**: No rate limits or API quotas
5. **Offline**: Works without internet (after model download)

### Performance Comparison

| Model | Size | Speed | Quality | Best For |
|-------|------|-------|---------|----------|
| llama3.2:1b | 1.5GB | ⚡⚡⚡ | ⭐⭐ | Quick testing |
| llama3.2:3b | 2GB | ⚡⚡ | ⭐⭐⭐ | **Recommended** |
| llama3.1:8b | 4.7GB | ⚡ | ⭐⭐⭐⭐ | Better reasoning |
| mistral | 4.1GB | ⚡⚡ | ⭐⭐⭐⭐ | Good balance |

**Recommendation:** Start with `llama3.2:3b` (default). If it's too slow, try `llama3.2:1b`. If you want better quality, upgrade to `llama3.1:8b`.

## Configuration

Your `.env` file:

```env
# Ollama settings
AI_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
```

**Change the model anytime:**
```env
OLLAMA_MODEL=mistral
```

Just make sure you've pulled it first: `ollama pull mistral`

## Troubleshooting

### "Cannot connect to Ollama"

```powershell
# Check if Ollama is running
curl http://localhost:11434

# Start Ollama
ollama serve
```

### "Model not found"

```powershell
# List installed models
ollama list

# Pull the model (with :3b tag!)
ollama pull llama3.2:3b
```

### Model is slow

Try a smaller model:
```powershell
ollama pull llama3.2:1b
```

Update `.env`:
```env
OLLAMA_MODEL=llama3.2:1b
```

### Want to use GPU?

Ollama automatically uses your GPU if available (NVIDIA/AMD). Check with:
```powershell
ollama ps
```

## Advanced: Custom Models

You can even create custom models trained specifically for MUD exploration!

```powershell
# Create a Modelfile
echo "FROM llama3.2:3b
SYSTEM You are a MUD game exploration expert." > MudExplorer

# Build custom model
ollama create mud-explorer -f MudExplorer

# Use it
ollama run mud-explorer
```

### Training Data Preparation

For fine-tuning with your gameplay logs, annotate your sessions with training comments:

**Use In-Game `say` Commands:**
```
say [TRAINING] STRATEGY: Exploring systematically, north first
say [TRAINING] TIMING: Waiting for HP to regenerate (currently 45/80)
say [TRAINING] COMBAT: Using bash to stun enemy before big attack
say [TRAINING] MISTAKE: Entered combat at low HP, should have rested first
```

**Benefits:**
- Captures expert decision-making process
- Explains WHY actions were taken
- Teaches cause-and-effect relationships
- Identifies anti-patterns (mistakes to avoid)
- Provides context for game state and timing

**Converting Logs to Training Format:**
```powershell
# Extract training annotations from logs
Select-String -Path "session.txt" -Pattern "\[TRAINING\]" | ForEach-Object {
  # Parse into MESSAGE user/assistant pairs
  # Game state → Decision → Action → Outcome
}
```

Then in `.env`:
```env
OLLAMA_MODEL=mud-explorer
```

## Cost Comparison

### Before (OpenAI GPT-4):
- $0.03 per 1K tokens
- 1000 commands ≈ $15-30
- Monthly: $100-500 for serious exploration

### After (Ollama):
- **$0** forever
- Unlimited commands
- One-time: 2-5GB disk space

## Next Steps

1. ✅ Install Ollama
2. ✅ Pull llama3.2:3b
3. ✅ Verify it's running
4. ✅ Start the crawler!

```powershell
cd crawler
npm run build
npm start
```

The crawler will automatically:
1. Check Ollama connection
2. Verify model is available
3. Start exploring!

## Resources

- **Ollama Website**: https://ollama.com
- **Model Library**: https://ollama.com/library
- **Documentation**: https://github.com/ollama/ollama/blob/main/docs/api.md
- **Discord Community**: https://discord.gg/ollama

Enjoy FREE unlimited AI exploration! 🚀
