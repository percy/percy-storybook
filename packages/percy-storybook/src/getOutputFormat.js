export default function getOutputFormat(outputFormatString) {
  const normalizedOutputFormat = outputFormatString.toLowerCase();

  if (normalizedOutputFormat != 'text' && normalizedOutputFormat != 'json') {
    throw new Error(
      `Output format must be either 'text' or 'json'. Received: ${outputFormatString}`,
    );
  }

  return normalizedOutputFormat;
}
