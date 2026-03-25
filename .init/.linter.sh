#!/bin/bash
cd /home/kavia/workspace/code-generation/manufacturing-quality-management-system-241895-241911/express_backend
npm run lint
LINT_EXIT_CODE=$?
if [ $LINT_EXIT_CODE -ne 0 ]; then
  exit 1
fi

