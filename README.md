# POD Remix MVP 🎨

Upload 1 POD design image and automatically generate 4 similar-but-different variants in under 2 minutes using Google's Gemini AI.

![POD Remix MVP](https://via.placeholder.com/800x400?text=POD+Remix+MVP)

## Features

- **Smart Analysis**: AI-powered design analysis extracting theme, style, colors, composition, and vibe
- **4 Unique Variants**: Generate 4 legally distinct designs while maintaining the winning formula
- **Fast Generation**: Parallel processing completes all variants in under 2 minutes
- **Beautiful UI**: Built with Aura Design System featuring OKLCH colors and soft shadows
- **Dark Mode**: Full dark mode support with theme persistence
- **Drag & Drop**: Modern drag-and-drop interface with image preview
- **Responsive Design**: Works seamlessly on mobile, tablet, and desktop

## Tech Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Next.js | 15.x |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| AI SDK | @google/genai | Latest |
| Fonts | Outfit & Fira Code | Google Fonts |

## AI Models Used

- **gemini-2.5-flash**: Image analysis and strategy generation
- **gemini-2.5-flash-image**: Image-to-image variant generation

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

### Installation

1. **Clone the repository** (or download the source)
   ```bash
   git clone <your-repo-url>
   cd pod-remix-mvp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Create a `.env.local` file in the root directory:
   ```bash
   GEMINI_API_KEY=your_api_key_here
   ```
   
   You can also copy from the example file:
   ```bash
   cp .env.example .env.local
   # Then edit .env.local with your actual API key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

1. **Upload**: Drag and drop or click to upload your winning POD design
2. **Generate**: Click "Generate 4 Variants" to start the AI process
3. **Wait**: The AI analyzes your design and generates 4 unique variants (30-60 seconds)
4. **Select**: Review the variants and click to select your favorite
5. **Download**: Download your selected variant or try again with a new design

## Architecture

### 3-Step API Flow

The application follows a three-step process in `/app/api/remix/route.ts`:

1. **Image Analysis** (`analyzeImage`)
   - Uses `gemini-2.5-flash` with vision
   - Extracts: theme, style, colors, composition, text, vibe
   - Returns structured JSON

2. **Strategy Generation** (`generateRemixStrategies`)
   - Uses `gemini-2.5-flash` for text generation
   - Creates 4 distinct remix strategies
   - Each strategy maintains appeal while ensuring legal distinction

3. **Variant Generation** (`generateVariantImages`)
   - Uses `gemini-2.5-flash-image` for image-to-image generation
   - Processes all 4 variants in **parallel** using `Promise.all()`
   - Critical for meeting the <2 minute requirement

### Project Structure

```
pod-remix-mvp/
├── app/
│   ├── api/
│   │   └── remix/
│   │       └── route.ts          # Main API endpoint
│   ├── globals.css               # Aura Design System CSS
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Main page with state management
├── components/
│   ├── ImageUploader.tsx         # Drag-and-drop upload
│   ├── RemixGallery.tsx         # 2x2 variant grid
│   ├── LoadingSpinner.tsx       # Loading indicator
│   └── ThemeToggle.tsx          # Dark mode toggle
├── lib/
│   └── gemini.ts                # Gemini API wrapper functions
├── package.json
├── tailwind.config.ts           # Tailwind with Aura colors
├── tsconfig.json
└── README.md
```

## Aura Design System

This project uses the **Aura Design System** for a modern, high-fidelity user experience:

### Key Features

- **OKLCH Color Space**: Perceptually uniform colors for consistent appearance
- **Soft Shadows**: Subtle elevation system with low opacity shadows
- **Typography**: Outfit (sans-serif) for UI, Fira Code (monospace) for technical content
- **Smooth Transitions**: 150ms ease-out for interactions, 300ms for state changes
- **Dark Mode**: Full support with WCAG AA/AAA contrast ratios

### Color Palette

| Color | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| Primary | `oklch(0.67 0.24 330)` | Same | CTAs, Focus States |
| Accent | `oklch(0.89 0.15 180)` | Same | Highlights, Notifications |
| Background | `oklch(0.98 0.01 240)` | `oklch(0.16 0.03 250)` | Main canvas |
| Surface | `oklch(1.00 0 0)` | `oklch(0.25 0.03 250)` | Cards, Modals |
| Destructive | `oklch(0.65 0.25 25)` | Same | Errors, Critical Actions |

## Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GEMINI_API_KEY` | Your Google Gemini API key | Yes |

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import to Vercel
3. Add `GEMINI_API_KEY` to environment variables
4. Deploy!

### Other Platforms

Ensure your platform supports:
- Node.js 18+
- Serverless functions with 5+ minute timeout
- Environment variables

## Success Criteria

✅ Upload works with drag-and-drop and file input  
✅ Completes processing in under 2 minutes  
✅ Returns 4 visually distinct, appealing variants  
✅ No crashes with robust error handling  
✅ Aura Design System fully implemented  
✅ Smooth, polished UI with transitions  
✅ Dark mode fully functional  
✅ WCAG AA accessibility compliance  
✅ Responsive design works on all devices  

## Troubleshooting

### API Errors

- **"Failed to analyze image"**: Check that your Gemini API key is correct and has proper permissions
- **"File too large"**: Reduce image size to under 10MB
- **Timeout errors**: The generation process may take up to 2 minutes; ensure your hosting platform allows sufficient timeout

### Local Development Issues

- **Port already in use**: Change the port with `npm run dev -- -p 3001`
- **Module not found**: Run `npm install` to ensure all dependencies are installed
- **TypeScript errors**: Run `npm run build` to check for type errors

## License

MIT

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Powered by [Google Gemini AI](https://ai.google.dev/)
- Designed with Aura Design System
- Fonts by [Google Fonts](https://fonts.google.com/)

---

**Need help?** Open an issue or check the [documentation](./docs/DESIGN_SYSTEM.md).














