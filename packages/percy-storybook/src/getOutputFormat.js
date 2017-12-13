export default function getOutputFormat(outputFormatString) {
  if (outputFormatString != 'text' && outputFormatString != 'JSON') {
    throw new Error(
      `Output format must be either 'text' or 'JSON'. Received: ${outputFormatString}`,
    );
  }

  return outputFormatString;
}
