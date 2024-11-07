$envVars = @{}

function Get-EnvValue {
	param (
		[string]$key,
		[string]$envFilePath = './.env'
	)

	if (-not (Test-Path $envFilePath)) {
		throw "Error: .env file not found at path: $envFilePath"
	}

	if ($envVars.Count -eq 0) {
		Get-Content $envFilePath | ForEach-Object {

			if ($_ -match '^\s*#') { return }
			if ($_ -match '^\s*$') { return }


			$parts = $_ -split '=', 2
			if ($parts.Length -eq 2) {
				$keyName = $parts[0].Trim()
				$value = $parts[1].Trim()
				$envVars[$keyName] = $value
			}
		}
	}

	if ($envVars.ContainsKey($key)) {
		return $envVars[$key]
	}
 else {
		throw "Error: Key '$key' not found in .env file."
	}
}

$db_url = Get-EnvValue 'DATABASE_URL'

$expr = "atlas schema apply -u $db_url --to file://schema"

Invoke-Expression -Command $expr
