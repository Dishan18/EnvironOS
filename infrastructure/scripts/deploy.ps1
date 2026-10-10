# infrastructure/scripts/deploy.ps1
# One-shot deploy script for DrainGuard backend on Windows PowerShell.
# Usage: .\infrastructure\scripts\deploy.ps1 [-Stage dev|prod] [-Region ap-south-1]
param (
    [string]$Stage = "prod",
    [string]$Region = "ap-south-1",
    [string]$StackName = "drainguard"
)

$ErrorActionPreference = "Stop"

Write-Host "==> Building SAM application (Stage: $Stage, Region: $Region)..." -ForegroundColor Cyan
Set-Location -Path "$PSScriptRoot\.."
sam build --template template.yaml

Write-Host "==> Deploying to AWS (Stack: $StackName, Region: $Region)..." -ForegroundColor Cyan
sam deploy `
    --stack-name $StackName `
    --region $Region `
    --resolve-s3 `
    --capabilities CAPABILITY_IAM `
    --parameter-overrides "Stage=$Stage" `
    --no-confirm-changeset

Write-Host "`n==> Deployment complete. Stack Outputs:" -ForegroundColor Green
aws cloudformation describe-stacks `
    --stack-name $StackName `
    --region $Region `
    --query "Stacks[0].Outputs[*].[OutputKey,OutputValue]" `
    --output table

Write-Host "`n==> Testing /health endpoint..." -ForegroundColor Cyan
$apiUrl = (aws cloudformation describe-stacks `
    --stack-name $StackName `
    --region $Region `
    --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue" `
    --output text).Trim()

if ($apiUrl) {
    Write-Host "Endpoint: $apiUrl/health"
    $response = Invoke-RestMethod -Uri "$apiUrl/health" -Method Get
    Write-Host "Health check response: $($response | ConvertTo-Json -Compress)" -ForegroundColor Green
} else {
    Write-Host "Warning: Could not retrieve ApiEndpoint output" -ForegroundColor Yellow
}
