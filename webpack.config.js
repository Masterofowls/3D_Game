import path from 'path';
import { fileURLToPath } from 'url';

// If you're using __dirname in your config
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  entry: './src/index.js', // or your entry file
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  mode: 'development', // or production based on your needs
  // Add other configuration options as needed
};
