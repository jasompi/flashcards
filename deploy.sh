#!/bin/bash

# Deploy Spanish Flashcards to Raspberry Pi
# Usage: ./deploy.sh [pi@hostname-or-ip]

# Configuration
PI_HOST="${1:-pi@rpi5}"
REMOTE_PATH="/var/www/html/spanish-flashcards/"
BUILD_DIR="flashcards/build/"

echo "🔨 Building React app..."
cd flashcards
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

cd ..

echo ""
echo "📦 Deploying to $PI_HOST:$REMOTE_PATH..."

# Fix permissions before deploy
ssh "$PI_HOST" "sudo chown -R pi:www-data $REMOTE_PATH && sudo chmod -R 775 $REMOTE_PATH" 2>/dev/null

# Deploy with rsync
rsync -avz --progress --delete "$BUILD_DIR" "$PI_HOST:$REMOTE_PATH"
RSYNC_EXIT=$?

# Fix permissions after deploy
ssh "$PI_HOST" "sudo chown -R www-data:www-data $REMOTE_PATH && sudo chmod -R 755 $REMOTE_PATH"

if [ $RSYNC_EXIT -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo "🌐 Visit: https://spanish-flashcards.jpimobile.com"
elif [ $RSYNC_EXIT -eq 23 ]; then
    echo ""
    echo "⚠️  Deployment completed with warnings (some files may have had permission issues)"
    echo "🌐 Visit: https://spanish-flashcards.jpimobile.com"
else
    echo ""
    echo "❌ Deployment failed with exit code: $RSYNC_EXIT"
    exit 1
fi