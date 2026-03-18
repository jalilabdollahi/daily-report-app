import { GetParametersByPathCommand, SSMClient } from "@aws-sdk/client-ssm";

function normalizePath(value) {
  if (!value) {
    return "";
  }

  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function formatDotenvValue(value) {
  if (value.includes("\n")) {
    return JSON.stringify(value);
  }

  if (/^[A-Za-z0-9_./:@-]+$/.test(value)) {
    return value;
  }

  return JSON.stringify(value);
}

function formatShellValue(value) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

async function getAllParameters(client, path) {
  const parameters = [];
  let nextToken;

  do {
    const response = await client.send(
      new GetParametersByPathCommand({
        Path: path,
        Recursive: true,
        WithDecryption: true,
        NextToken: nextToken,
      }),
    );

    parameters.push(...(response.Parameters ?? []));
    nextToken = response.NextToken;
  } while (nextToken);

  return parameters;
}

async function main() {
  const path = normalizePath(
    process.argv[2] ?? process.env.APP_SSM_PARAMETER_PATH,
  );
  const format = process.env.SSM_EXPORT_FORMAT ?? "dotenv";
  const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION;

  if (!path) {
    throw new Error(
      "Provide an SSM parameter path as the first argument or set APP_SSM_PARAMETER_PATH.",
    );
  }

  if (!region) {
    throw new Error("Set AWS_REGION or AWS_DEFAULT_REGION before reading SSM.");
  }

  const client = new SSMClient({ region });
  const parameters = await getAllParameters(client, path);

  if (!parameters.length) {
    throw new Error(`No SSM parameters found under ${path}.`);
  }

  const envEntries = parameters
    .map((parameter) => {
      const name = parameter.Name?.slice(path.length + 1) ?? "";
      const envName = name.split("/").filter(Boolean).join("_").toUpperCase();
      return [envName, parameter.Value ?? ""] as const;
    })
    .sort(([left], [right]) => left.localeCompare(right));

  if (format === "json") {
    process.stdout.write(
      `${JSON.stringify(Object.fromEntries(envEntries), null, 2)}\n`,
    );
    return;
  }

  const lines = envEntries.map(([key, value]) =>
    format === "shell"
      ? `export ${key}=${formatShellValue(value)}`
      : `${key}=${formatDotenvValue(value)}`,
  );

  process.stdout.write(`${lines.join("\n")}\n`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
