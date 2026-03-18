#!/bin/bash
# Ferguson Media — macOS-compatible Clean URL script
echo "Ferguson Media — Clean URL Restructure (macOS)"
echo "================================================"

# Step 1: Create folders and copy files
echo ""
echo "Step 1: Creating folder structure..."

for page in about news partner contact article privacy terms; do
  if [ -f "${page}.html" ]; then
    mkdir -p "$page"
    cp "${page}.html" "${page}/index.html"
    echo "  ✓ ${page}.html → ${page}/index.html"
  else
    echo "  ✗ ${page}.html not found — skipping"
  fi
done

# Step 2: Update internal links in all HTML files (macOS sed uses -i '')
echo ""
echo "Step 2: Updating internal links..."

for file in $(find . -name "*.html"); do
  echo "  Processing: $file"
  sed -i '' 's|href="index\.html"|href="/"|g' "$file"
  sed -i '' 's|href="about\.html"|href="/about/"|g' "$file"
  sed -i '' 's|href="news\.html"|href="/news/"|g' "$file"
  sed -i '' 's|href="partner\.html"|href="/partner/"|g' "$file"
  sed -i '' 's|href="contact\.html"|href="/contact/"|g' "$file"
  sed -i '' 's|href="article\.html"|href="/article/"|g' "$file"
  sed -i '' 's|href="privacy\.html"|href="/privacy/"|g' "$file"
  sed -i '' 's|href="terms\.html"|href="/terms/"|g' "$file"
  sed -i '' 's|href="news\.html?|href="/news/?|g' "$file"
  sed -i '' 's|href="news\.html#|href="/news/#|g' "$file"
  sed -i '' 's|href="contact\.html?|href="/contact/?|g' "$file"
  sed -i '' 's|href="article\.html?|href="/article/?|g' "$file"
done

echo ""
echo "================================================"
echo "Done! Now run:"
echo "  git add ."
echo "  git commit -m \"feat: clean URLs active\""
echo "  git push"
echo "================================================"