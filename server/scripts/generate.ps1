$Params = @{
    OutputDir = "entity/src/entities"
    SerdeOption = "both"
    ModelExtraDerives = @("juniper::GraphQLObject")
    ModelExtraAttributes = @("'graphql(scalar=crate::extension::GqlScalarValue)'")
    EnumExtraDerives = @("juniper::GraphQLEnum")
}

$CommandParams = @(
    "generate entity",
    "-o", $Params.OutputDir,
    "--with-serde=$( $Params.SerdeOption )",
    "--model-extra-derives=$( $Params.ModelExtraDerives -join " " )"
    "--model-extra-attributes=$( $Params.ModelExtraAttributes -join " " )"
    "--enum-extra-derives=$( $Params.EnumExtraDerives -join " " )"
) -join " "

$Command = "sea-orm-cli $CommandParams"
Write-Output $Command
Invoke-Expression $Command
