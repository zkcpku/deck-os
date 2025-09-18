# Environment Configuration

This project uses environment variables for configuration. Follow these steps to set up your environment:

## 1. Setup Environment Variables

Copy the example environment file and configure your settings:

```bash
cp .env.example .env
```

## 2. Configure Your Environment

Edit `.env` and set the following variables:

### Required Configuration

```bash
# OpenRouter API Configuration (Required for AI Summary feature)
OPENROUTER_API_KEY=your-openrouter-api-key-here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

### AI Model Configuration

```bash
# AI Model Settings (Optional, with sensible defaults)
OPENROUTER_MODEL=google/gemini-2.5-pro     # AI model to use
OPENROUTER_MAX_TOKENS=1000                 # Maximum tokens in AI response
OPENROUTER_TEMPERATURE=0.7                 # AI response creativity (0.0-1.0)
```

### Optional Configuration

```bash
# Server Configuration
PORT=3017                    # Server port (default: 3017)
HOSTNAME=localhost           # Server hostname (default: localhost)

# Application Configuration  
DEFAULT_FILE_PATH=           # Default file browser path (default: user home)
NEXT_PUBLIC_DEFAULT_BROWSER_URL=https://example.com  # Default browser URL

# Development
NODE_ENV=development         # Environment mode
```

## 3. Getting OpenRouter API Key

1. Visit [OpenRouter](https://openrouter.ai/)
2. Sign up for an account
3. Generate an API key in your dashboard
4. Copy the key to your `.env` file

## 4. Security Notes

- **Never commit `.env` files** - they are already in `.gitignore`
- **Keep API keys secret** - don't share them publicly
- **Use `.env.example`** for documenting required variables
- **Client-side variables** must use `NEXT_PUBLIC_` prefix

## 5. Development

After configuring your environment:

```bash
pnpm install
pnpm dev
```

The application will be available at `http://localhost:{PORT}` (default: 3017).