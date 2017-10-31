export default function getWidths(optionalWidthString) {
  if (!optionalWidthString || optionalWidthString === '') {
    return [];
  }

  // Return [int] if already single integer
  if (/^[0-9]*$/.test(optionalWidthString)) {
    return [parseInt(optionalWidthString, 10)];
  }

  // Raise error if not a list of comma seperated integers
  if (!/^[0-9,]*$/.test(optionalWidthString)) {
    throw new Error(`Widths must be comma seperated integers. Received: ${optionalWidthString}`);
  }

  return optionalWidthString.split(',').map(s => parseInt(s, 10));
}
