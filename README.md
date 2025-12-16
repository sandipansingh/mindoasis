# MindOasis

A platform dedicated to mental well-being, providing resources, coping strategies, and support to help users navigate and overcome challenging mental health situations.

## Features

- Mental health resources and information
- Coping strategies for anxiety, depression, and stress
- Support tools and guidance
- User-friendly interface

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn

## Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/mindoasis.git
cd mindoasis
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Or create it manually with the following variables:

```env
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=nvidia/nemotron-3-nano-30b-a3b:free
PORT=3000
```

Get your API key from [OpenRouter](https://openrouter.ai/keys) and update the `.env` file with your configuration.

## Usage

1. Start the server:

```bash
npm start
# or for development
npm run dev
```

2. Open your browser and navigate to:

```
http://localhost:3000
```

## Project Structure

```
mindoasis/
├── public/           # Frontend files
│   ├── pages/       # HTML pages
│   ├── css/         # Stylesheets
│   ├── js/          # JavaScript files
│   └── assets/      # Images and icons
└── server/          # Backend server
```

## License

MIT
