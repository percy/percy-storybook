export default function getOutputFormat(outputFormatString) {
  const outputFormatLowerCaseString = outputFormatString.toLowerCase();

  if (outputFormatLowerCaseString != 'text' && outputFormatLowerCaseString != 'json') {
    throw new Error(
      `Output format must be either 'text' or 'json'. Received: ${outputFormatString}`,
    );
  }

  return outputFormatLowerCaseString;
}
