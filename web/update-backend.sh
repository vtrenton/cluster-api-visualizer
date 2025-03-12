#!/bin/bash

# Build the React app
echo "Building React app..."
npm run build

# Create a directory for the React build
echo "Creating directory for React build..."
mkdir -p ../web/build

# Copy the React build to the web directory
echo "Copying React build to web directory..."
cp -r build/* ../web/build/

# Update the Go backend to serve the React app
echo "Updating Go backend to serve React app..."
sed -i '' 's|web/dist|web/build|g' ../main.go

echo "Done! The Go backend will now serve the React app."
echo "Run the Go backend with: go run main.go" 