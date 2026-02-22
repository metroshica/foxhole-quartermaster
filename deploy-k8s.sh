#!/usr/bin/env bash
# Build and push Docker images for Kubernetes deployment.
# Same logic as GitHub Actions but run manually.
#
# Usage:
#   ./deploy-k8s.sh                  # Build and push all 3 images
#   ./deploy-k8s.sh --web-only       # Build and push only web + builder
#   ./deploy-k8s.sh --scanner-only   # Build and push only scanner
#   ./deploy-k8s.sh --dry-run        # Show what would be built (no push)

set -euo pipefail

IMAGE="metroshica/foxhole-quartermaster"
SHORT_SHA=$(git rev-parse --short=7 HEAD)

WEB_TAG="web-sha-${SHORT_SHA}"
BUILDER_TAG="builder-sha-${SHORT_SHA}"
SCANNER_TAG="scanner-sha-${SHORT_SHA}"

BUILD_WEB=true
BUILD_SCANNER=true
DRY_RUN=false

for arg in "$@"; do
  case $arg in
    --web-only)     BUILD_SCANNER=false ;;
    --scanner-only) BUILD_WEB=false ;;
    --dry-run)      DRY_RUN=true ;;
    *)              echo "Unknown arg: $arg"; exit 1 ;;
  esac
done

echo "Git SHA: ${SHORT_SHA}"
echo ""

if $DRY_RUN; then
  echo "[dry-run] Would build:"
  $BUILD_WEB && echo "  ${IMAGE}:${WEB_TAG}" && echo "  ${IMAGE}:${BUILDER_TAG}"
  $BUILD_SCANNER && echo "  ${IMAGE}:${SCANNER_TAG}"
  exit 0
fi

if $BUILD_WEB; then
  echo "Building web image: ${IMAGE}:${WEB_TAG}"
  docker build --target runner -t "${IMAGE}:${WEB_TAG}" .
  docker push "${IMAGE}:${WEB_TAG}"

  echo ""
  echo "Building builder image: ${IMAGE}:${BUILDER_TAG}"
  docker build --target builder -t "${IMAGE}:${BUILDER_TAG}" .
  docker push "${IMAGE}:${BUILDER_TAG}"
fi

if $BUILD_SCANNER; then
  echo ""
  echo "Building scanner image: ${IMAGE}:${SCANNER_TAG}"
  docker build -t "${IMAGE}:${SCANNER_TAG}" ./scanner
  docker push "${IMAGE}:${SCANNER_TAG}"
fi

echo ""
echo "Done! Images pushed:"
$BUILD_WEB && echo "  ${IMAGE}:${WEB_TAG}" && echo "  ${IMAGE}:${BUILDER_TAG}"
$BUILD_SCANNER && echo "  ${IMAGE}:${SCANNER_TAG}"
echo ""
echo "To update Kargo, the warehouse will auto-detect the new tags."
echo "Or manually set tags in values files:"
$BUILD_WEB && echo "  web.image.tag: ${WEB_TAG}"
$BUILD_SCANNER && echo "  scanner.image.tag: ${SCANNER_TAG}"
