export default function getWidths(optionalWidthString) {
  if (!optionalWidthString || optionalWidthString === '') {
    return [];
  }

  if (!(/^[0-9,]*$/.test(optionalWidthString))) {
    throw new Error(
      `Widths must be comma seperated integers. Received: ${optionalWidthString}`,
    );
  }

  return optionalWidthString.split(',').map(s => parseInt(s, 10));
}
