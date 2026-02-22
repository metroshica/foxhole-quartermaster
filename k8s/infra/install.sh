#!/usr/bin/env bash
# Install or upgrade all GitOps infrastructure components via Helm.
#
# Usage:
#   ./k8s/infra/install.sh                    # Install/upgrade all components
#   ./k8s/infra/install.sh argocd             # Only ArgoCD
#   ./k8s/infra/install.sh rollouts           # Only Argo Rollouts
#   ./k8s/infra/install.sh kargo              # Only Kargo (prompts for secrets)
#
# Prerequisites:
#   - helm, kubectl configured for the target cluster
#   - Argo Helm repo added: helm repo add argo https://argoproj.github.io/argo-helm

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

install_argocd() {
  echo "==> Installing/upgrading ArgoCD..."
  helm repo add argo https://argoproj.github.io/argo-helm 2>/dev/null || true
  helm repo update argo
  helm upgrade --install argocd argo/argo-cd \
    --namespace argocd --create-namespace \
    -f "${SCRIPT_DIR}/argocd-values.yaml" \
    --wait --timeout 5m
  echo "    ArgoCD installed."
  echo "    Get admin password: kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d"
  echo ""
}

install_rollouts() {
  echo "==> Installing/upgrading Argo Rollouts..."
  helm repo add argo https://argoproj.github.io/argo-helm 2>/dev/null || true
  helm repo update argo
  helm upgrade --install argo-rollouts argo/argo-rollouts \
    --namespace argo-rollouts --create-namespace \
    -f "${SCRIPT_DIR}/argo-rollouts-values.yaml" \
    --wait --timeout 3m
  echo "    Argo Rollouts installed."
  echo ""
}

install_kargo() {
  echo "==> Installing/upgrading Kargo..."
  if [ -z "${KARGO_ADMIN_PASSWORD:-}" ]; then
    read -sp "Kargo admin password: " KARGO_ADMIN_PASSWORD
    echo ""
  fi
  if [ -z "${KARGO_TOKEN_SIGNING_KEY:-}" ]; then
    read -sp "Kargo token signing key: " KARGO_TOKEN_SIGNING_KEY
    echo ""
  fi
  helm upgrade --install kargo oci://ghcr.io/akuity/kargo-charts/kargo \
    --namespace kargo --create-namespace \
    -f "${SCRIPT_DIR}/kargo-values.yaml" \
    --set "api.adminAccount.password=${KARGO_ADMIN_PASSWORD}" \
    --set "api.adminAccount.tokenSigningKey=${KARGO_TOKEN_SIGNING_KEY}" \
    --wait --timeout 5m
  echo "    Kargo installed."
  echo ""
}

COMPONENT="${1:-all}"

case "$COMPONENT" in
  argocd)   install_argocd ;;
  rollouts) install_rollouts ;;
  kargo)    install_kargo ;;
  all)
    install_argocd
    install_rollouts
    install_kargo
    echo "==> All infrastructure components installed."
    ;;
  *)
    echo "Unknown component: $COMPONENT"
    echo "Usage: $0 [argocd|rollouts|kargo|all]"
    exit 1
    ;;
esac
